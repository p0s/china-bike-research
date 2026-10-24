import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { findCloudflareAccountIds } from './cloudflare-account-privacy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const textExtensions = new Set(['.md','.json','.jsonc','.mjs','.js','.css','.svg','.yml','.yaml','.toml','.cff','.txt','.html','.xml','.example']);
const thirdPartyBinaryExtensions = new Set(['.avif','.gif','.heic','.jpeg','.jpg','.mov','.mp4','.png','.webp']);
const ignoredDirectories = new Set(['.git','.research','.wrangler','node_modules','dist','.cache']);
const ignoredFiles = new Set(['scripts/check-privacy.mjs']);
const projectOwnedBinaries = new Map([
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-640.webp', '43045d75a9dfa358b3250c661b3a73bb4d52e3446127e0718c4767d40fc55267'],
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-1600.webp', '98f0b70014937bf50e2df07463e2da1ca440dc9e5c88188c218cec7604d9608b'],
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-1200.jpg', '53af075475464e2ebab7b13a87450d3080cabda1f643ce674944fd08e4cfb929'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-640.webp', '3907da96cdbee11420cdabbc1218cf93c43e6f6f6058d721cfdf6a4aad63ffb5'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-1600.webp', 'b62c6e3c11fa95a49f79ec4cb10dd5e1471837a99df32d52c73f6ed9e8a4f186'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-1200.jpg', '27c91b990691870f257cf71a98adc2f83dd6b487ec6032d3f88b79678243d280'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-640.webp', 'ebef84a1ee13318062955e8728043bedce3b1ac96c8e933ffc946b3e7d97455d'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-1600.webp', '02e63cb57c3dd81bab39f262272e434d20e6057c9d333c73b961aa2ecca66932'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-1200.jpg', '2289dddf1216efaf10f12c63021db6d11879157029d328456f2cf5d75fef82eb'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-640.webp', '9746b9c8ec9d077e2a1b3ac73a8b5fd8c44e17e82205da8632250676f4489ae7'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-1600.webp', 'dd14d8f31762d64d78395dc9b92a7654ff264cf30179569757659967a0729e26'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-1200.jpg', '276ea5f79f09879eac3b5b0f811ba690c013f5495bf171875f0bcaf42c2764ac'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-640.webp', '912027ce82ee6dd8e9847ae610c033c3844af4d847aad0687a797db3742495e5'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-1600.webp', '6ceee95feb41de3730ebf2089c5cefe5686c814bdd66dec0580648f70b3985a5'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-1200.jpg', '1fff1daeeca9709f133c0dddeecf3ce74379fe9021f31cecd02b90bf32a6c748'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-640.webp', 'e6c6947fb321f53f9a7eb00844e7982c82b992fff444a37cdeb48ac7f5368922'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-1600.webp', 'd0c38f5c198af471e1487a72422aeb80a93e2a800e9be67484c554b04f928f48'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-1200.jpg', '80de96009066b710201861c948587ee184840e20114c361c43cf5f543f616512'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-640.webp', '56651512788519cdfb18b0ae0340ddfae26249c741a642ccf439fea71272c57d'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-1600.webp', '71568e9f61d5b726aa390ea0d26bff2d1273f78f2ba70ce271ebab2e53cdce95'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-1200.jpg', '70905ab4f31899b2347e9f38288c5e2c5665e9aa51ed7665d81641b5f9a84057'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-640.webp', '6ca7d9713621d945dd8f4fc412a0c3f142ac7ce7ea2dd2e7c34da9701dd5d1d9'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-1600.webp', 'f0a8e652854459a600b62b4a94055afd41e2885b4a7e350c1880e17730252102'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-1200.jpg', '211746d4a160b4fc571047c7fdfab042dfb66e06a27916037690769c26760d29'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-640.webp', 'c3e1e0da7edc624643858983151274becc6d3d0b3bb3f182c1ba4fcb24500a91'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-1600.webp', 'bb1eb903dd2df472da150dd1cf2505210df3b956c030f03097e1924846f36aae'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-1200.jpg', 'c6a37bc27fb412fd8876283567d306b483608d76dad765f7a580e8d5af9a7bbe'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-640.webp', 'a49294f6cd4e893876dd39cb7e1333f0eb6830dc1e85c480e0f757a05a551222'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-1600.webp', '0273309262314857a61e0a98be07c394cfaec9cc24369dcfd66199d3fec4a1fd'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-1200.jpg', 'f78e70f197f8c50947a025f86680c71c65e18086d0ce8dfd56ffd6ecea8e640a'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-640.webp', 'd2b9d38f4ad6531a6d8a9baf0dc07d70df5d327ac57c0e113dd696328cc616f7'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-1600.webp', 'f6478ce4ad823a8f6e58bf7fdb694d0fb312c5b823634e3dcf864bea14740d60'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-1200.jpg', 'a0700819f03c041af34d6c36f0457fbaddcda8a29dbccdc309a3b5aea28f8baa'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-640.webp', 'b2de17227c63dde8a68d613a65fe799428e5fdbbfba88e2a2caffdd6f6d9c1b7'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-1600.webp', 'eea4a5c2c40d90b88adf14f1106a6aeac24ec0d2ba4719da9922c4977892c51d'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-1200.jpg', '8a642a534c32ae1b495a9872fced822e232a51863c61f54e953d06494ba8d1e7'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-640.webp', '6af485f7d6c5f3da6b07ad9f11979434aad68db07b8b9c73a41b51177557cdd0'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-1600.webp', 'e105a99ee34d50093a379a29e1dcc0ade061d54f71ae5a915c2885b6ea26ea51'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-1200.jpg', '11945432892a415392cf9e8cbabccb3de6b66fd4f7e34eba1fc0f323fae230da'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-640.webp', '7af6fdb1ef89354c92bbcbe87ebdcae1a86a0067740f0aee5be303a2644b7109'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-1600.webp', 'a8f35610ebe1b48617466b698e6a0cc2fd0e76f54903c1a4047a1c5d0d43cdc0'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-1200.jpg', 'aadb1f1d02c78ff64575cbebea54622ab3c9545e8ff8aa6d691086c0e2302151'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-640.webp', '99cb267bf6440704c72c8b1b2274460a366712a20f09dc047949082c729a7455'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-1600.webp', 'f8cbd3484aee6be7079e85f79423cf75ce04100497d0b6a5a29487660aebd8e7'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-1200.jpg', 'cffb3285662a7b3897bffe1516e3ecd457397133627307ae123887fe57889cd0'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-640.webp', '38c6d4833afbc277ce38dbaad7c42b2565bc5ef611ceeeda029f7a871233b327'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-1600.webp', '56e202e657411c08246fb25ef18e28362557c25f73d4737a70111d6312ebf273'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-1200.jpg', 'c149b3034e7158fbda69242d50ff6ca31fb9e307a41359c99fbcbb807b51c13e'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-640.webp', 'c54e14dbfe8b5a1987ebcf3ab1758861975cb96a151a0956adad21dd9e625696'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-1600.webp', 'ee64831aab31dc1f244993d0b7da0dd90dc637c0e8992dc0fba003bce34b26c9'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-1200.jpg', 'ca048662324bb234f2cc6a5296a620534ac82bb7e656a2597d7dad60dec7de1e'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-640.webp', 'cc316d73a1e6cdc388ab9970de06042601f1728c8b74500cdb79315d5ac2f0df'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-1600.webp', '7288c301d4e83652730df426f648316dc8f78d702cff40775d6ee27ff91c1a8e'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-1200.jpg', '58d378d6e40b5108597241c1abf32212fc9c8e8070dec5500ed28c1481098da3'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-640.webp', '86b35c8afe5e0652318ffdc39c1a4fba809080bdbbfcbd588d60331051708837'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-1600.webp', 'b33e4713374770466a512b3e74764b5683f8f11edb8c89ab1ec26be4b4038f7b'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-1200.jpg', 'e168717425960708137eb3899d3a3345f477fc58b458a90d938b1a51d98a6b87'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-640.webp', '4030363a165b02493fa321ec77caf4b2a9c1ec651190c35146154798e1d81c63'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-1600.webp', 'bb2ee3c12fcf34cf833ea96594898febdeb5e24ad7477ba7c79d8e9f82ff6f1d'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-1200.jpg', 'ae45c23590cdb96c29983801ce3dbdaf7a26ca1c8d7fa6c114efd516b3812a95'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-640.webp', '213a779bc5623198401fefb4100a312e5d41391b1c3c177e678f97a0e040d5ff'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-1600.webp', '6440254310cc0dd3870fe718b21a6125ffd26f28faf8cbae7cadabcee8c9a5bc'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-1200.jpg', 'b42bfbcf6d6db2ee22dc6c5a44655771c39bca15c952df231bc8a77b0e49bb12'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-640.webp', '09bb54db06c5f16732725bcdc76af08423752ad44a3e2ffb868917b215d1aac6'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-1600.webp', 'd521382cee9b641cc53d58417c83d13a15db72f8c4df7f5d1e4880dee2452fc8'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-1200.jpg', '80396eb5ce74dd84133135de824b537721507142b5ac8c172235a961bb36048a'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-640.webp', '510b0b2e37ff0eff36b871540f7ed3fdda23f1ecd0f8a95d1c86a1f650f5f26a'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-1600.webp', '6f0da32074de7c5aca94526df24e1e28dbab96b5be8f55780e1fe846ff4fcfd6'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-1200.jpg', 'db2ab8500fd17611b31b6828c416189bb543364b0cc13d1e49808e4f250f478c'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-640.webp', 'c88347a7a3fc88e609ddd6076255d77d8b36c76090d0af6dd61ce9b36e338ea5'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-1600.webp', '8d0bf75e286812fcc8493c2182eada00d36786940da8468f949cec4362b844c5'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-1200.jpg', '03cbecf909405e16076f71f64c8d44dfa15f5d55ccfd779dcd78bfe7c5921323'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-640.webp', '27b5f6e8e2c77ab799c81785f8efcece71170e00575294f1fa19ebf8ba7a95f0'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-1600.webp', '82113a429262b265156ca4446223949098c2e4dd7401069f6fed08e7425e4b14'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-1200.jpg', 'f7539575986fe8a39328c01b2922e278978d0c4c7fa6d454e1d985f45df471e9'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-640.webp', 'b0cf434274ca85b9de4d37baedd7a484a89d184207220fc7b4a00d29e7ba3cfd'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-1600.webp', '1c3bf5af69087f6040586a3363abcb6cbe0528341854bfa9a37ff6ee9597f199'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-1200.jpg', '51345f331c8016b745e4ef266dbcbc2f9c4149609d9741a0096c1b5b63c7d214'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-640.webp', 'd6919ae57003cfb626e1c8e610600560ab016ec9befeb654029528f6fe67c377'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-1600.webp', '2f878a004238caeeca9c0591c74c15bf511a04f0369bdbef6631a9f73cfc6a9f'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-1200.jpg', 'e48ec3c257633d97a4f99b8c171e5a48345a233474d2e12f680fb0f01166af20'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-640.webp', '65c3b6222d9de7464889a06791adf69d80df2f35e7a7c5d1c48464c8964242d5'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-1600.webp', 'df11c4bbade09d4cc5edc7919da7f898eb0563888340556de69ca03907c25cc9'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-1200.jpg', '7dac015959ca17028fa1d277b5a8403191c31d6d90cb7510234f3fb57111a561'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-640.webp', '92aa01240f370e27026a4e4766a94870be70c09ace40c7b2943b0d3e6478eadb'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-1600.webp', 'bacbb2d603409a2210dee21484cbacdf2e68fe1fea856eaadb8cb0133c76c63f'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-1200.jpg', 'fce97896e3adda04a514df2857796aca541a1375e42e27d98ff6063e780fdac1'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-640.webp', '01248089627e551b57b869a69f1f42aa51a6e9b189cacc4d34d05190e8b15280'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-1600.webp', '824e9ef97291de9f731180b4cf51d6a15ea8b47ee5dc9d6d7164098ecf341ed2'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-1200.jpg', '691732c0a2bcd56192608b5ebc53365c11e6153cb527214683c748a67a63f340'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-640.webp', '217e756c8cd84bbd1bf475a7cec94a975e88e7406fe651627df1bf27a5ed4979'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-1600.webp', '81640320f4e4b6243ea85f67b2b7d7d82455216fe553381c3e7af5a2b9070db8'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-1200.jpg', '8f134b0bcc35543e18faefc03a82bfe682828b677616e8a1635d5294b83d980a'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-640.webp', '3fb40eb80d909308af3c9e583f258cd946c31e93124224ae31db87dcb8f452a8'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-1600.webp', '77ee69650076a651ace94b6348e40cd7a0b43b0fce340738664a71625a70b8eb'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-1200.jpg', '54cfe73cd006e9667d2a667a0e370c7b02a975b114858e7c8e0e9a0b95730a4a'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-640.webp', '7cf3f44d2824322d4f847f58980602cee2e561b391ce359566255fd493a00084'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-1600.webp', '29bc0ac7b4b50dc8c3d1fc751ceb897ca2b63a8fb3b81a92c0b4804d93ed811f'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-1200.jpg', '53fe4ba345b922a07b6e744eebe563b7c87e0f6dace58b0cf763261d2cfe0ba4'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-640.webp', 'c116871f8bd208e3ad860b10a3bcd418a901ec22e57dd05b025f9c43b2555190'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-1600.webp', '4e525898c7c1d80e9444768bb0bde24775d14ac36f944bb38041bbadc7177b85'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-1200.jpg', '9a10fdd2404776ef3b4b8b4ab829781d38b63e5c9931c71a09fdf6ac9bec0a47'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-640.webp', '1f3ea90007a2576bf85af65dee2f12bcd3d4dc6e78136bae362d973cee28370f'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-1600.webp', '42a0df7e964ccc33a37563a69caf549279486f7ec395fdb4dd9ce05aed170bfd'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-1200.jpg', 'f0e0c81e20a001c6f9fbbfd1b681d26734d1afdda40aaf9feb611f605b85a867'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-640.webp', '50e47f8817639284289394a417823168c5c09cb7b2cc300961431daf3246cac6'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-1600.webp', 'af71c8d1116ba41e5adb6126829669633506a582fed5a346a9cc93ba64eac602'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-1200.jpg', 'aca6271e7479ec63ffa8b1f9f0bc30bd2dadb756b312a828ac1ee4ac139c2df5'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-640.webp', '253ca3063c26f859ae110cf840ed93f69ef87a474f69b5e147fe278cb6ddb307'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-1600.webp', '416d31042177cb22ad0396cb9372b969fbc5401a4ec76d44c0e35239301a9c9c'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-1200.jpg', '5f5efb74ea157e9c4f7372487255cf782e0f444d2c97205447f109a3fe584399'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-640.webp', '32acc27515634992642fde5059dce0836ad0e13907ebf193f3592f9d3284fc76'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-1600.webp', 'fa2f8d66efc96a1df8601385115443a0080a062537ee07f27843b278bbc88505'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-1200.jpg', 'e8b70f5c777ecbbcf541d4d8cb21a66f98b7bf0a53478d7a26180255d64b1865'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-640.webp', 'a7fd186e55bebe690537470fa51a7862100559f1cddc0d3756c1ca88e11164ed'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-1600.webp', '0b0f303976558273cd554132df885403ec99fad8b63e91717ce1080014878b33'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-1200.jpg', '17f23f28665151d90d6c4dff9931882f2de5aeb312f0948537d94cc24865ef14'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-640.webp', 'd9547661639e495782ad9a47fa25dba7a6a2a37d3a36f3fedb6bf14439d07a95'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-1600.webp', 'c53afcc6080e9ca5b782fa8487b05e1be9dbeae7b607156c8319ae8872d3c27a'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-1200.jpg', '0ea3c3f30bce41229d20c6980bec5e182addc2f6d94268d9926a83070a52edfa'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-640.webp', 'a93ed23f46c9e74b997eae5a0f928540157a4441e55aeccad47f6e9fea238459'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-1600.webp', 'a5ecb1679f0401e5bbf4be898e263734789b65b25653b8e7d2fbfbb60aa64d7d'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-1200.jpg', '60405a02b2e51cb9b7adda858589fc57b74058aa0fb90a7963d8f06ef4b537c0'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-640.webp', 'd8efbb60d8b0eb65086e5c5cb6ab6babb088563587994034b10a5ad2bd165766'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-1600.webp', '227ebd9de77e0a7dc06213ecd6236cc027b24e25c8de28f87bbed370c7622cfb'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-1200.jpg', 'aae7a7074087cd927bfb101f53de9edab950872b92f12817cc3670a9efc88fe3'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-640.webp', '53d9461b34b40a8b20ad947221e52d5b0d04b135a1363eacad37febef700dafb'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-1600.webp', '6897d3965e2ca488e59c93143dcb37330d2a4cbb16fdbf5c94038988a92eb0e0'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-1200.jpg', '1157a0d48e54cc1f06cc986b16a5653dea5c113625b84cdffbe6e2b36a88f517'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-640.webp', 'c2d42c4d7891b62abdf65cbd9c9e36d09b07a93e7ab8787fcdc900c991f0fed1'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-1600.webp', '4b1442bcaf5b1bb70965f49c29c886f3e49e9b2c1650563b551813f26c23e016'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-1200.jpg', '8e744ee88c265c16f05773198d3b61f28500b9d64e69c484be1c79a121f64034'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-640.webp', '25ca95104b35aeac1324354b3c4148d7ac90c4264ccd1992ab329bfa10d232e2'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-1600.webp', 'fc96c038f95114149c57276d14d2103773da357bc5c0e2ba3b31e241ebeeaec0'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-1200.jpg', 'eed82f7184af97655e291280677b3d4caec4b4088a5531e30c6407e4b32c9b71'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-640.webp', 'd4d90bd534d558e7a113d3cb01e1f932ac465bfc58f935945375e64b85082786'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-1600.webp', 'b2c5b076c271d3aef4ac2c674134fcc4abbd7e8d7c25f68937dbbb07befbfd37'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-1200.jpg', '5fe04966dd44b447100dd9a5b495050d41edb07a07921e4771d7cd559890f85b'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-640.webp', '4233fcd27a1796307bb285c92b990e9cda0c20bb89432dbedf6cf03b8015e168'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-1600.webp', '3dbe820d2a8e17f3aa96fbcb86c14480301357b24a205f7a09e0696e0b365535'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-1200.jpg', 'b67d955b82f19b65209b0669f3b7b109608b10983317c6e0578c1ccc43e074d1'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-640.webp', 'd06600f66ced78cd904c8db44862690ad3fca98a3ed2d39ea44d5587ae99941a'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-1600.webp', 'cc3c840358e1449427162abfaf8ff5094b91c7da5cef0e51b3a7183fbd619991'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-1200.jpg', '6b1344f93ee70ff861c0e56f20112ab2a0548b6bf3b94e71193febee8b6de36b'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-640.webp', 'b641c486f2c468b40225aba94db44615a27b36b9d3b0cd4bd02ae4fa42e581a2'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-1600.webp', '994dbd564058508dfbbee27e1d5b4ecb1c7b9bcd6c37a387e88b1506f3cb3fe3'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-1200.jpg', '30db8281d7268a41c880eb5d9e79f2f4e1a789d9d37ee41e42dca98f6d629d33'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-640.webp', '12c60d7764a010fe4696cbe3d8420aae8805f0673d2776e4945039aeeea9097a'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-1600.webp', '6f82727854aa47508871a09e2fff7dba363adf9f8ffdead5607f42f6bed8df0b'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-1200.jpg', 'a1131ec880b26c4f7086521a83a3c444b0b660809c6c2e58a630dd007c80b57b'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-640.webp', '7eeace3218c0957f5e2eeae812701f2ea87b77c450504a746ede6321add10008'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-1600.webp', 'a073122f26d10f39cd94291b1844328b9aada04d8bb9af6aca29eaa3013ebf84'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-1200.jpg', '6d3bbd67cab3a762b6c1c03a12a4a48583810590fb78484559c18e1d71caa23f'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-640.webp', '9870bd655433097a289cf45d562d5b003af50fc7d3de58b0a363f76c7b4513df'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-1600.webp', '718e23bad7a593de680c850cdc003103881e586b96e00fca68f26aa8c6ede0a3'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-1200.jpg', '24f60c7a11df7e34a6a4078e55808dbb1c757d4067bfb01f034a3465ed324dbe'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-640.webp', 'd22c31f13996f2807fdcd3a37b4ba67921c7680f132552ce28923c434b4dcb5f'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-1600.webp', 'afd2d2ddcd85bc7d33bdfa7d68fd66056485e9b4031fab4bed95843e68591753'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-1200.jpg', '21792717a4e951bef47fe34f41ae26c961d1f03d2f50583c6720d96ac81bdb29'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-640.webp', '954f740c0df57c96e767d0329f4c2639d0893f18bc3db8c4ed03526a3f5e7a27'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-1600.webp', '7a65f7b5d2e5bb541281be42ccfe428832b87269052dc9e7c81a76084c46067b'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-1200.jpg', '75bd04e078eba081af3e9e41dc0d7aeb220295d1cd3dced969b3644bc371ae39'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-640.webp', 'e5baf87cc90818e9694ddc099ad68782a510f95d9e68242a6984bb5ca4d0ea2a'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-1600.webp', 'c5ab235704bb60d739f109c151c6ea9a16c2896add4eab425a7e1071aaf54668'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-1200.jpg', 'b4b028bbd38663522bf1845d0defee9fe0eb7cd2e3c581ca83e92dad85e22f9d'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-640.webp', 'ef7b978ef4682135e60b98b67f191fd000f8c09ba58ad276a4c67f4bb4b95e62'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-1600.webp', '8e22b10341c98cb577b228b75207a6421d8b82b6e8b7c60fc5cf1ac46a9464ca'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-1200.jpg', '361545099620c316de1e02d5e2e69eaaefbf463336fe3400ec4ac580311f29b0'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-640.webp', 'ceba5f2ff8578aa3e3aa1f679564a1db9f4cc3d9eb005bbef4aa64039501b1fd'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-1600.webp', '5978e4be73c2c88ebd2cf437ed94c49d82b2d7fbd22bf6fdb06628b8124bcc34'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-1200.jpg', '409bf695f917931bd0c6e05da90000a26d774583d5968dc2d39fde3309adccb3'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-640.webp', 'a0ab389da33e111e0e0a5e601208fa7faf2dd49586c667ffaa59f84cbc6d1be8'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-1600.webp', '402786b75cb925e2c3946cd1de21b602e0bdd4f9757b4a45f62d601fceea28cb'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-1200.jpg', 'a6e0ed37a6bbd3adf63e52768fd053b762fe803c392aeda3524ced06841b927f'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-640.webp', '2c1855448fb3f30fcb951c6fb871deb1a2245cbcbd5e3073f8751f8e708c4793'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-1600.webp', '8c2acad1c305cbc542b101daa7a52bd0ff8b933f1e8f924f67f1bde12e537197'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-1200.jpg', 'c34ab4261a0db5a1cd44be4e36526962ab8cd074bd2397e8d4866312d442ba71'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-640.webp', '613f4963fdd3f2299adbdddbfa3799e8780dee7a459b2bd51864c2508f7e65b1'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-1600.webp', '149c3e9bc3a98ac701f5002d20c68a9a806a3487b0e5f40e16ee673829b4047d'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-1200.jpg', '8f645021f10c34aed2fbe891604221fc1845c7514c9c97fc96819ec02f438d7c'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-640.webp', 'e28179aed7e67457d95be140fa3b24b03fb78604f28cedd08eafe220d0d0d370'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-1600.webp', 'b120b37664128d96d97281e3fd47d8cb958a6fa0315d65178be0dd8397968103'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-1200.jpg', '796aad5cf19868f530f63ce5bd4ebd4398b3c1cdcfd145750d617f09af83ada9'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-640.webp', '7c7c4a6039403bdd826066b994cd1d65d9e51c552ee8114ff49c2a64b8d41871'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-1600.webp', '3bb0e53afe77a90bc98edcfc339da8b0dc6a9684f76a90f03f2c1e2f19346cae'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-1200.jpg', 'd1e1d7160d510a966e3bbdb60649b94b0bf9c7ba70e7d93c0bcca08cea758a9f'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-640.webp', 'a46cbd64c9b6035d962eafaf3def2331b3288a4af4773fbac7836c3179c1aee9'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-1600.webp', '2d195f9c1b52a289ddc1cd93b6fff483ba2f72454eb920ccaf3047ce70f1f379'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-1200.jpg', '32c3deef93bbc882998c514fbf1e63403c8b6fec778c1b3f3d848d99a9401dba'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-640.webp', '464655ff312fb8d32a76519dc3bd4243f92ae65f4608a0050217573b95388262'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-1600.webp', 'b949bba0e64ab2f2b385e5a931002d90f606f3936641a50aedd8cd815e736331'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-1200.jpg', '3e3913be6d00e87fba32681ff717a6aa143b69578c45556ca3d7b24d3816f9fd'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-640.webp', '55f323b5816c0053b77893b70e132c436bd79ba63582c0800cc9bbd184731664'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-1600.webp', '45d2e528acc9053b595f91c538b1fa5197ef8e8c1d7ae0700daf4a545cedd4ff'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-1200.jpg', 'cdbe73c5b3b208cc8ee0ac2a9f93fd2bf648e2f3d00945051efdf4c67510e031'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-640.webp', '37f22b63b8824acff24fcf36a5cd8f07ca74c5857e0f727ce9201493cbe30b50'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-1600.webp', '6ac2d8a0207f679ecea988d06438dde78b423dde6d3391a2e68a5ed06b9cf3b5'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-1200.jpg', 'f4bc62009fbf7df19ca9f6c2d046c7830160e46b31f779d97b30c3ba141eed8d'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-640.webp', 'edf601ec9367e0742615f34eb2e2d70943ec5c7536645331a40a315e7c6dab8c'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-1600.webp', '03e9e753f205ec07d3e47fcc2f48cab9fb52df0678280d35027493d27df106a9'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-1200.jpg', 'ee7885005efe434ce48dbd3e8a7a93ca938fa2b72826c60a76cc9234115c9f4b'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-640.webp', 'd79cc0d73982a697c016e3269e53544af060a7eafe6e2c8e1816e9baec50baa1'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-1600.webp', '60f3be9960485360c4401eb4339380845956ef5623cf8ec0ebafb420087df5f5'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-1200.jpg', 'db5f4dc75253f921792bd0ae3dc164f610ba88bb3134bead63bf2bc47f95f811'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-640.webp', 'b2b182d9d208bc93829c9381008d792f6463027f0f838c14ee5d66b1837e1caa'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-1600.webp', '2976dc4a9c5c42235bc6c15dce8b570ca3c99755ae16bfcc1b008ce57b119fd1'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-1200.jpg', '581390fdf3dc038f277257c718ee46e889c5a6fed6b22e56cdebff7720f61f99'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-640.webp', 'c6e78c70621a8170359b0cccaf2fd1efc74fe36a2d0a372e56177e49dbbfc75d'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-1600.webp', '2ac138a25477628ba22f0b10465ef6fb047f48532e408347ed2e11eab483af14'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-1200.jpg', '37e50cd0a595969c05036c80b8c35a6f24199768d92b55568dc9987dbe7dc01c'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-640.webp', '6f275f139bf74e423d54fb5a79afd1f7ecbdef2393b86251de0a8a6ec4702981'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-1600.webp', 'fa8b6864f51870da4e115dcf7fea87bf9bdd6de46b275bb2cc3305e4a42e457e'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-1200.jpg', '2f122445228d592c165a658fd64f09dfdf28ef30ebe3d7073aa10ea0de2aa453'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-640.webp', '7a53858c60c9cd825109938f1ab477e12544a0cd6504b49c2e33edfbc83d6ae7'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-1600.webp', '978ad039c97e11448506e59ee09a18c2f521bddb170cf1470333921cc313b6c9'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-1200.jpg', 'c378f18eb27b1f05a9d2c13489059df3677e3225b905f12bdaffa513059a1f2a'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-640.webp', 'bec0e73db2c6342132f02a2f7f3a435dd29080f3e314e297c6d8c099b12759a8'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-1600.webp', 'b46c1be0558967f7729bacd66a3ef32632364e21003ffe7c635cec0414b89046'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-1200.jpg', '456a8adfdfb9f7c79770772b2d492cdfab5526f2a222e2f504a6dd1609c76366'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-640.webp', 'aa71be3404cee4a7457739dd1b3663bf3bf95f9e3384a0163ff8b15767a2c4da'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-1600.webp', '275249223f18222aa7a39c79fdda8a799d19222e25e9bb0e40b8ff7da4fa2a14'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-1200.jpg', '7475dfaa8ef3d5e8c39a2e5daa863c82c35766feaacd9c802d869352ab0effeb'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-640.webp', 'f6e7b7c5cbd6fa867c2b3561b6e36ca48dabc5a666c7571823a26f1f83c4528b'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-1600.webp', '5f29ad564ddecf50a3a203e9969694baebf9e924203a62c3b00e3c0ea925b78c'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-1200.jpg', '444feaf1dfc0036bfc45caac33c46de9c989a52712cc7f365dc6ad96d74090d3'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-640.webp', '079f7355912246efe45cd6e3428d57667e4c7a987985a875371db56cd957790d'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-1600.webp', 'a95327f5414d5f66861c2c11e284cb878ec4bcdfa89564d2521205199b801c07'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-1200.jpg', '4d9ac55796b47be37419be58e339e842de8677e5f934cc8ef763e51aec8bc823'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-640.webp', 'bc12bb2b52f7688c7b0473387ee561fcbe6a6046481dcb0eff2f6d790a3ee5c6'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-1600.webp', '96958686e70ace682d97bdc968bc999d271da7c05606b09f108cb214bee834c8'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-1200.jpg', '99a50911186e417409a8448b4390d9272fe8889b46250d4a407a5d24ee41c38f'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-640.webp', '34549771446177bb078ff5ca604b0a6a7819aaff62c4f8041efddf7512397cf2'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-1600.webp', 'f57e97898e7134f38d669d544502792793a81fe35ac4880c9335b6acf7f38c80'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-1200.jpg', 'cf5fdde7c3a4347ebe3a8f034310281d74c18cbe9c2e99a296c6d89395dd01ce'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-640.webp', '2f733802078d5b88ff0f50ca344505f64b8c7124f4aa318ec361dacb134c69b5'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-1600.webp', '0658bd0b6556d5f160009cff1eba1ea9e6035b87afb993f3e68222ce5cfa4194'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-1200.jpg', 'e753f60ce41e9687edb01db638ea0b62fa4ae9e9210f6021d769be11bac376d9'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-640.webp', 'f300c4daaa7ec6bbf34fb672b594a8c8e53a5a3bcd96b2ba6a7e98c2cd195c02'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-1600.webp', '1b8c55f1e462babe24cdd9447f926ceb9f18ed140e32fea6e1180bf63185cac4'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-1200.jpg', '87c1d4cb8571b15425b8f23817b462c227c45efc94ef158db4f053150bf77153'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-640.webp', '9a87cf9b0fbd5900f1b1ebee1c9f41ea2a335b7fc7467008b1ab089754080d10'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-1600.webp', 'bf3604bd71915a237f2ecfb6f3e094036b3f9d5a02cdc1886f1bae2a0e38a4bc'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-1200.jpg', 'd594cc7ae03510c0f6c2fccc6ebad6e5625ecdef29c41c6694fdd5797c796694'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-640.webp', '1512c442d9f01116990399a0b90b3da6f117b643a8980c64f2ae2f9c876ab6b8'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-1600.webp', '4960965d541d9192b10e40e699bf8b1c86879231555d3bb766042445a502f83d'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-1200.jpg', '1828146a93eebd28dec85981da2b15268b77fae786dd935975cac02ec431e8e9'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-640.webp', 'd96ce9429bdd5a73ed9f2fdb0aadfb817325acccf1349e4a9fc3eee08d47f871'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-1600.webp', '103ca7db4d54476aae6c42d9f548d725eee09245bc74fd92956ded148515cbc1'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-1200.jpg', 'e7c669cdb311a738b5c55153c06bb4ae8ecf9a4d91ad8d83b58925b7287b3178'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-640.webp', 'ab3ef66169ce5883c4d165ada13470a902f7b680d881229a8ae84e294d6266a7'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-1600.webp', 'da8e28311810118583fb2e1767bdcc2db1140540d289c7e1aba1d35dfa9666ba'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-1200.jpg', 'dee7de924fddc9ec048b395b25ff3fc2a5ddba1eac1e1c398a42cd8062f1379d'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-640.webp', '8bc05b6c292e758432a2a68d3e6cdb6509dfc890e86462baf870b23611485e59'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-1600.webp', '25a4504a9cac4171b394ff84cc77d8e8733d5ff74da8958d79c42ae9baaf7de7'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-1200.jpg', 'bdcca380d1b353c3ca0f233056b13a3416de293b2769d5ae4e034c4ae4394341'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-640.webp', '04b606a7d9c9f0a2176be94895f7ea364a941b5495e1ebce3b876da3d3775c07'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-1600.webp', 'b6492a4095d325917d8de20c285374faf625cbb1538d20af6765d8b2bf1e5f58'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-1200.jpg', '06cba5551efff536ff0b7a5f2fcb8b74d98b183aa2a263450828f3decaa1ebe8'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-640.webp', '59c9ca8abf5d505427098ccf68fbd69588dad005ef1a3fa736265edafb8fbcae'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-1600.webp', '00031c42d9d08570ace27778c297f1c5fd2d8e7560fba2ade54196b362da5909'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-1200.jpg', 'c521ee2268a56ddb64305aaa81ec8f977200bd23d617c581fd3a04e4ff537103'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-640.webp', '0f359bcea391343a1aa78354f9eda26c47013e246ff348cd7ac4fcc0d1b08de5'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-1600.webp', 'f56e78c7e0665c2d8f12fa4e19b31cb8deb52f8039524db0f50ea83bf5b34dab'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-1200.jpg', 'dd2d54623f4c698da7fde460c3d8d6ffd4f171f77bdbf7f2c5349fe50567e8a6'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-640.webp', 'ba147befdf4e7810ed49931d1b3336fd55d674ab09dae8c870b1205c35378da6'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-1600.webp', 'e0cfd120a6d0b647f34f676790730feb53a3e1ae31a100642d2f0551f62bb22f'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-1200.jpg', 'e9269b0d99d4f501396308616cce02d6ec193751f80075ed880c9d5e0c9b7145'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-640.webp', 'ed9151885b99ecb51a0f67c9f1d2ae844260ee19a498a4fb19011d8d2963eb30'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-1600.webp', 'de4bd08ed4904b4ffbd9f62c8d5b343a0eebca0b165859aefa0ca5c138dab390'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-1200.jpg', '9c07e9f6243eec08dfcb3befdc1d5abf63fa27b41cac4d22196227310bed39b6'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-640.webp', 'ed8b8e4c53c974bdcd316cec19da7442606de0abe4d420bf16d2e7044870a9aa'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-1600.webp', 'd9ea5cc0db774cbd7f06e7080f7f2b1323e4fdd002e022ece566187917b32fb7'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-1200.jpg', '2212da72115756822614146407e5d1b96e5cc23abfa547bd20b4b0d6a3e42490'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-640.webp', '3ec2beebb9ea7a6ad9d1649ca191c8fb7bb34c73dc31c2d50c726d05e3bd223c'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-1600.webp', '14dbb9bea19284d3d181b3d65932f78a7fe5297f7f3729c74607e15b71aa6333'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-1200.jpg', 'd98dbb6c2c9d5c8e45658f47ebbfba6c2df48e1d7829439996322b291019e12d'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-640.webp', '1de08ccfae67a35d550f3b46f142f396a23713e6e7d045f2e762f994bddac3aa'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-1600.webp', '22fac07549feb82408102280f999178c14063ebc12fc44c36682259e419d588b'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-1200.jpg', '17631e58aa43ea57d53b5e07c9f7ca03891da784d4819b8bd8d00f48d039d70e'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-640.webp', '7ff3c971583454d7d0afabd9f82dc0b45d00d4d4cb5f6a61ff755ca016c0b6e9'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-1600.webp', 'bf24badf1259a5c0717209b6bedc5ca3d9d7b501f750ca4e80fe169ceb1bfb04'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-1200.jpg', '7249ff9d596140192a9392cb74ee4b5526699e8846e659b73d1ebd93e1b49e4f'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-640.webp', '593cde4da15a2af51a37165f8d24ad58f37be8775aaeaa90a630020cb0716958'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-1600.webp', 'aead7f2469a88a4436554492296ee19489a78b0a6e34369701398c3ea123c692'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-1200.jpg', '3f943da815e0bb38f5ea33e3535de5ed8e30a741b215c16ab1b53c206d97d8b0'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-640.webp', 'be80681b41423103832e7b4bc6030f6868f75bdc68e2f0fd32f92ef6b3ab59c4'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-1600.webp', 'a6da87535f0a56e718a79e75287c9791007429075be090679df8ac56236f8671'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-1200.jpg', '10605bae998a2f6be74f70f85dc90bdee08b8df3b572fe5f1bc77e94ab675069'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-640.webp', '6f8beaae456df439b39f75258931a95ea1f4907b9921febcfe93c1dfe191e905'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-1600.webp', '1e07968a79b6dbee7d4716258d59e954a1661488809673d80563e8152d37eec1'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-1200.jpg', 'f3bec2983053bb717e6e65369ed36cace037ff146ab29360aa5bff29a6bdf335'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-640.webp', '38751d5eb2c7ddbdcf40fcece3a7a5017d57cbf5c9fca7d67ee1370b28cb16fd'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-1600.webp', '03824ae38c6be03653a4079f334aba5ad9c74ce49f2c59a6fd181d42103709d2'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-1200.jpg', 'b04e5bae4637daf5fb7ccb17600503068d055a967d55e236818804f032667436'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-640.webp', '681405467572d1696fa8b4b473d543b8c9bde8ed5e734a86daa3018565a7a190'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-1600.webp', 'e363bebbe8d031c05b38a9cb69134cb40cacfa92f168491d16a9adbe525d4565'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-1200.jpg', 'c7ccb8d729076016318d18148782baf998d5e36724e2d29914f37cf3c42debc0'],
  ["assets/branding/panda-rider-3b-256.webp", "55b7f962809c8fb2bb9951728d3563fc403a8aaa8d88acc3aa5397c064780175"],
  ["assets/branding/favicon-32.png", "80d1ce9715dc112ae33664e41c4d276070afdf96443e719252719e6b5968c645"],
  ["assets/branding/apple-touch-icon.png", "b717d115151d144911468ff586ac3ab54d09bb31cce82d6897531c818be6180f"],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-640.webp', 'c5f9dcf13260e39c2113225097786b3d2c194676db0552df7399a3f761e48352'],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-1600.webp', '474b0ab2ef37a8c727236117a4c3e30a9afc70237bfc864b3bf3ea75cb56e7d9'],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-1200.jpg', '39a11414a21744763335c1b7045b97adb29c357766346f151af555b89dfa2bc8'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-640.webp', 'e0c733278a38f03f7241020b0caf0f3224e967d5b0cbd3aad1b392fd39d39227'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-1600.webp', '5fd3669f8ba208cdd751150dba9f6599d4606d5e832a9649838f61de86723837'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-1200.jpg', 'd9bb3a22ba2e4113687b035131c90aed76dd424522cc9c3b189c5dc4b989d15e'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-640.webp', '70a59b42590ff9ac70d12da6c98db0061255e10e5814e3e41170b61dd6c61613'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-1600.webp', '8995738f3c899c08ce815237d5142304af1880217f166355614eb64a30179f24'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-1200.jpg', '653b4cf48467b54280a25bd0ad6e84665be98b5736cef236a19bda80beea5807'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-640.webp', '10dedcacfa583d0fe27b191b37d134f6d2e4fd628c1c59be9f65ed80ccce5830'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-1600.webp', '09712595f28ff011d80d896cb1ea51b1f7e1235544e918b2b02e37318d5d30d7'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-1200.jpg', 'f4ebff892ccb9fac0a84cae734ec4317cbe4b854ca682ec15d1813ec6c81b058'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-640.webp', '10830e5214bda55788412f9454fcbf5ab97078f95d46452fe8311fc22bd9f6bd'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-1600.webp', '94a003b5870e07e0b68ab38069230e47b3c9a3d5b68e1ac36f6ef435ee66a37e'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-1200.jpg', '9511df1dd615364c43d44533945ae65c58047e663f61469623b452c239b4b17a'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-640.webp', 'c39f45cd7f2061aebb6014f18723cc2ac1406ace506a23da9233598a6b2a6918'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-1600.webp', 'e1231989d1b7be98c9f8eeef9a8c2d90eaa172ad3b8f0fcfcaf7037a1ec9fe4e'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-1200.jpg', '5b1e127c277b15b9f68a9f91b90fdbe3be0751a59076ae07f16a761628580a37'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-640.webp', '591128a80f0f33b1ac87fab82a73282efe354308870427e818c9b0d4cce1c37d'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-1600.webp', '07f0a18171c8a653b2a17d8e4a24e6165122a646f0a27b6ece0dfa81ceb9ce57'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-1200.jpg', '2aed4f900905363b5efb47ecb61b9e853406cefe38c18bdcd282721af907b02d'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-640.webp', 'f6a6015a8455f77ce3d4fb578ac7dd7d102975f9355f0ca9f01ba41cccd452a0'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-1600.webp', '21505df38b4fa451a5aef97c41c29b1ad720d99e3f256ddc91ed565dd469f98e'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-1200.jpg', '60f93550498324a46dfb245f3393c011c179d93b025f246a8fd2d7877da58e39'],
  ['assets/blog/europe-bike-delivery-640.webp', '2e6fcadf7f506c4ffdff4a4e7aa1ab3440ef6586a8a67d0ce45f5f4bc4a17e22'],
  ['assets/blog/europe-bike-delivery-1600.webp', '4ec87a888ab899abd5acf2fe861510d87ee441ab16c7232bb9f3047fbfaf4e92'],
  ['assets/blog/europe-bike-delivery-1200.jpg', 'a4a2a0512b51059054320666a11bc19b382c907d60e81637ed11a9a4c8680502'],
  ['assets/blog/north-america-bike-delivery-640.webp', '77d5e00913d8ed283de62050e8c193771f32d27c914c7ff5676fb3b94b7357ac'],
  ['assets/blog/north-america-bike-delivery-1600.webp', '675e9ac5c2f47c3000005f5431ebfb1063240485b894dd023aa1353849015849'],
  ['assets/blog/north-america-bike-delivery-1200.jpg', 'ac41f8ccbeb2b54d3fc4f3a24880dc6ef1ec20fec05c4633a2f57664085acd67'],
  ['assets/blog/cycling-guides-banner-scene-v2-640.webp', 'eb8f02e079677678a0c49589f7f15654a549b3e3e7dfbcb79ccc5fbff4e59eff'],
  ['assets/blog/cycling-guides-banner-scene-v2-1600.webp', '01a3fbcf0274e387bded7f6fe8621df50ca29a2fc90d77b29ee5899aa89c849d'],
  ['assets/blog/cycling-guides-banner-scene-v2-1200.jpg', 'f60e4c63aaa44f9f7a3f9461e74da7b3d5c13415f52ab7d8a424d9f76c3b9783'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-640.webp', '91bfbf59e430f8690f0179da882e6ab71e7715da4bafbbeecac1f53fb3e413ce'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-1600.webp', 'b52f4900595d0017647c04278ac0b25315e61fa9ebf3d3eb545d89515e86af29'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-1200.jpg', '0aa9a88fff82f1177df7dbdd0b9fe3f2564654bbd9856629d07a1ee673e27176'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-640.webp', '8722fdf1d4baa26e1693af66465f87d9c513e6d24c2ad9d2b209836ff87e9bc5'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-1600.webp', 'f313ad78096683a8df98adf7cf52479950acf79483a66ec67a8ff1474924849d'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-1200.jpg', 'c4bace0a3779dcfdcb786491f0399a363b54a89efc409fd79991f1a4d5b51584'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-640.webp', '5ed59eede7170f7d045e246fb61a688d2020b13a34772f8e0d9ffb4b2104f70d'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-1600.webp', '76b2bd2098609b2c4c17d7a7644c6c7a450e4c57a75e98d1d8b6f4668c7e9d9c'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-1200.jpg', '432af6140625c22619ae9d244cf831a2406f431ef45aa65f396b9aaf6234e5b6'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-640.webp', 'f15622ecaaa47e50fac9f6bfaa824b09ab719092f73eb74e22a56f9ad7d06ea7'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-1600.webp', '413774abc63ffda58c5af9a5587eb46990cccfe43a04099089008d6d38c94e24'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-1200.jpg', '4a865774b5710f21b6328ec3cf4892f7512d2a43f02fb2fe8964e515b3a2e4dd'],
  ['assets/blog/cycling-guides-banner-mascot-480.webp', '6ab144689a81927aded163005cf15a8b0e681b797b92646cc86221b67bbe1fc5'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-480.webp', '98d260e0d522d27a8d6a530568dcc5e6ee6585122a13944dcdc5378fccc4f775'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-480.webp', '32b34047da4f152d3082fde3ecebdcee85a516ac2408cd124f8e3b4e328612d0'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-480.webp', '53ec362199ca5d86dee53a12affd13f912c39eb36b7360df5370fb6ef37fdf56'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-480.webp', 'd6938593bb2e80fad4982fb375f44491bdeef2ae6160390f5c37ca629f83d390'],
  ['assets/social-preview.png', '6fd7276fc98792a925df1dc4ef5a2efa151608267b7ac80cb55b079828d7ad87']
]);
const findings = [];
const referencedSourcedMedia = new Set();

for (const entry of fs.readdirSync(path.join(root, 'data/images'))) {
  if (!entry.endsWith('.json')) continue;
  const image = JSON.parse(fs.readFileSync(path.join(root, 'data/images', entry), 'utf8'));
  if (image.hosting?.mode !== 'local' || image.rights?.status !== 'source-attributed-rehost') continue;
  for (const value of [image.hosting.local_path, ...(image.hosting.variants ?? []).map((variant) => variant.url)]) {
    if (typeof value === 'string') referencedSourcedMedia.add(value.replace(/^\//, ''));
  }
}
for (const entry of fs.readdirSync(path.join(root, 'data/groupsets'))) {
  if (!entry.endsWith('.json')) continue;
  const image = JSON.parse(fs.readFileSync(path.join(root, 'data/groupsets', entry), 'utf8')).image;
  if (image?.local_path) {
    for (const value of [image.local_path, ...(image.variants ?? []).map((variant) => variant.url)]) {
      if (typeof value === 'string') referencedSourcedMedia.add(value.replace(/^\//, ''));
    }
  }
}
for (const photo of JSON.parse(fs.readFileSync(path.join(root, 'content/blog-images.json'), 'utf8')).model_photos) {
  const image = photo.external?.image;
  if (image?.hosting?.mode === 'local') {
    for (const value of [image.hosting.local_path, ...(image.hosting.variants ?? []).map((variant) => variant.url)]) {
      if (typeof value === 'string') referencedSourcedMedia.add(value.replace(/^\//, ''));
    }
  }
}

const patterns = [
  ['working-container path', /\/(?:mnt\/data|home\/oai)(?:\/[^\s"'<>]*)?/g],
  ['macOS user path', /\/Users\/[A-Za-z0-9._-]+(?:\/[^\s"'<>]*)?/g],
  ['Windows user path', /[A-Za-z]:\\Users\\[^\\\s"']+/g],
  ['email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['private IPv4 address', /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g],
  ['credential token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[A-Z0-9]{16})\b/g],
  ['secret assignment', /\b(?:api[_-]?key|access[_-]?token|password|secret|private[_-]?key)\s*[:=]\s*["'][^"'\n]{8,}["']/gi],
  ['order or tracking identifier', /\b(?:order|tracking|shipment)[ _-]?(?:id|number|no)\s*[:=]\s*[A-Z0-9-]{6,}\b/gi],
  ['chat export marker', /\[(?:Message sent|Assistant|User) at [^\]]+\]|WeChat ID\s*:/gi]
];
const allowedEmailDomains = new Set(['example.com','example.org','example.net','users.noreply.github.com']);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    // Atomic build output is already gitignored. Only skip the builder's exact
    // root-level temporary names; explicit outgoing-file scans still inspect it.
    if (directory === root && entry.isDirectory() && /^\.dist-(?:stage|previous)-[A-Za-z0-9]{6}$/.test(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    if (entry.isDirectory()) walk(absolute);
    else {
      const extension = path.extname(entry.name).toLowerCase();
      if (thirdPartyBinaryExtensions.has(extension)) {
        const expectedProjectHash = projectOwnedBinaries.get(relative);
        const isExactProjectAsset = expectedProjectHash
          ? crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') === expectedProjectHash
          : false;
        const validSourcedPath = /^assets\/images\/sourced\/(?:xhs|taobao|xianyu|official|retailer)\/[a-z0-9][a-z0-9-]*\/[a-f0-9]{16}-(?:card|detail)-w\d+\.webp$/.test(relative);
        if (!isExactProjectAsset && !(extension === '.webp' && validSourcedPath && referencedSourcedMedia.has(relative))) {
          findings.push(`${relative}: third-party media binary is outside the validated sourced-image contract`);
        }
      }
      else if (!ignoredFiles.has(relative) && (textExtensions.has(extension) || entry.name === 'LICENSE' || entry.name === 'LICENSE-DATA')) scan(absolute, relative);
    }
  }
}
function scan(file, relative) {
  const text = fs.readFileSync(file, 'utf8');
  scanText(text, relative);
}
function scanText(text, relative) {
  for (const index of findCloudflareAccountIds(text)) {
    const line = text.slice(0, index).split('\n').length;
    findings.push(`${relative}:${line}: Cloudflare account ID`);
  }
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (label === 'email address') {
        const domain = match[0].split('@')[1].toLowerCase();
        if (allowedEmailDomains.has(domain)) continue;
      }
      const line = text.slice(0, match.index).split('\n').length;
      findings.push(`${relative}:${line}: ${label}`);
    }
  }
}

if (process.argv.includes('--stdin')) scanText(fs.readFileSync(0, 'utf8'), '<stdin>');
else walk(root);
if (findings.length) {
  console.error(`Privacy scan found ${findings.length} possible issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Privacy scan passed: no common personal-data, local-path, credential, Cloudflare account-ID, private-network, order-ID, chat-export, or unvalidated media-binary patterns found.');
