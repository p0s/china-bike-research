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
  ['assets/blog/integrated-cockpit-before-you-buy-mascot-cover-c4ee050488-640-fd115a4cf1.avif', 'fd115a4cf106d5e3d4569b9674d289273f9f19912fe5c6de2c14c0d9cd2ff465'],
  ['assets/blog/integrated-cockpit-before-you-buy-mascot-cover-c4ee050488-1600-90acb01d15.avif', '90acb01d15767e9811c8f94deb9fdc2fff85da8c79b21aaf1c19c17e045ceed2'],
  ['assets/blog/integrated-cockpit-before-you-buy-mascot-cover-c4ee050488-1200.jpg', 'a989423e27424fc126cc94c8d9b4016447ba66a662c30472a59860c12ab2fed7'],
  ['assets/blog/damage-in-transit-bike-claim-mascot-cover-389fe5d251-640-633d74c27b.avif', '633d74c27b14b33bb922a5f632479e626284e3cc57051e42fb4a9300bedbf415'],
  ['assets/blog/damage-in-transit-bike-claim-mascot-cover-389fe5d251-1600-67ced8c73d.avif', '67ced8c73d16e9e4c9a7f195aa03d808d367e174717b41f430654194e3d586d2'],
  ['assets/blog/damage-in-transit-bike-claim-mascot-cover-389fe5d251-1200.jpg', '71d6ab2037b0a5d3fdae38353f7d8688303f0b02f20e48d17f8c0a5aec12b6cd'],
  ['assets/blog/warranty-evidence-before-service-mascot-cover-f34f932af4-640-d5eaf1bd81.avif', 'd5eaf1bd81864182ba2ec546c8cdc2d5b111fe5da2331e95f92d093fd82c5a98'],
  ['assets/blog/warranty-evidence-before-service-mascot-cover-f34f932af4-1600-80fe6ec427.avif', '80fe6ec42761264625a43dfff65dd2459a2cbfeed1b307c3a53c45cf0cf62fa9'],
  ['assets/blog/warranty-evidence-before-service-mascot-cover-f34f932af4-1200.jpg', '2736105f04afcdabd46483f352795f08b73ae839a47cd1939a85cd17fc2ba9dc'],
  ['assets/blog/bike-sizing-email-template-mascot-cover-c53e87239d-640-eba1ae9339.avif', 'eba1ae933937954f6548e6cf95a7384779294248ac4d67684e2ac1ef83db0a53'],
  ['assets/blog/bike-sizing-email-template-mascot-cover-c53e87239d-1600-9bf9ac5c2b.avif', '9bf9ac5c2bcedd7f2112ffeec78c9196c947b994cffa73e2da336aa96bcf4826'],
  ['assets/blog/bike-sizing-email-template-mascot-cover-c53e87239d-1200.jpg', 'fb8e83a5be4e14a2d5c877451ec7dcc07f3f2358cc342492c2acc2451a4d0299'],
  ['assets/blog/bike-order-component-substitutions-mascot-cover-5afcd5a55a-640-1b51d20e87.avif', '1b51d20e87532d4f894980712c71abe5a5fff1fc6e42377d7e56fc02842c2c5b'],
  ['assets/blog/bike-order-component-substitutions-mascot-cover-5afcd5a55a-1600-08e912e805.avif', '08e912e80564d73478f17d8ae112709018a93538018cb50c62086fbedfe0359d'],
  ['assets/blog/bike-order-component-substitutions-mascot-cover-5afcd5a55a-1200.jpg', 'e14e381da2b6c3138a53d7f17c416570fb55cd9bb699f598f8e8aa9a881f7f87'],
  ['assets/blog/bike-preorders-and-production-windows-mascot-cover-6b7073caa2-640-802ad935e2.avif', '802ad935e2e84046175eb783b14d421590794517196b00e2c16f9142e820b64e'],
  ['assets/blog/bike-preorders-and-production-windows-mascot-cover-6b7073caa2-1600-837d46ccc4.avif', '837d46ccc45e1ca62fe45b86b9906550d05fa0d4787379a5ba130a44f5b078a5'],
  ['assets/blog/bike-preorders-and-production-windows-mascot-cover-6b7073caa2-1200.jpg', '4f4919f2061b2dc6a61348406af44e4fe5f05e54d1d7a3e1d7db7b9afe7713e2'],
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-640-a51c421b18.avif', 'a51c421b189a3a3158958d4fd78e1ddefc40391020070fc8c690ac87e2e78709'],
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-1600-e6cbf32574.avif', 'e6cbf32574986835654892bddd205b996784c437fd6016da8410557221397e48'],
  ['assets/blog/compare-brand-dealer-and-marketplace-mascot-cover-e5e9dc1752-1200.jpg', '53af075475464e2ebab7b13a87450d3080cabda1f643ce674944fd08e4cfb929'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-640-6cdc9ece96.avif', '6cdc9ece96017fb4fcc9390e709b6c369b0d51be4d344228e3625747cbca2a69'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-1600-b3880b2178.avif', 'b3880b2178bcedeb144d5bcd856eaccb06f4354a6dd3fdaac4a61d68107e4eaf'],
  ['assets/blog/frameset-import-vs-complete-bike-cost-mascot-cover-258f81bc81-1200.jpg', '27c91b990691870f257cf71a98adc2f83dd6b487ec6032d3f88b79678243d280'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-640-495bc24d3c.avif', '495bc24d3ce6fed57949f116a155f3212465e1594874fa9c7198ec92190af69f'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-1600-e30b6d81c8.avif', 'e30b6d81c8d09ed052eb5399a20e449cf992ad9e0b3112914472eec2cef7d6b1'],
  ['assets/blog/currency-conversion-bike-quotes-mascot-cover-6c60bc3139-1200.jpg', '2289dddf1216efaf10f12c63021db6d11879157029d328456f2cf5d75fef82eb'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-640-32d857b4d9.avif', '32d857b4d9050165a0d3c12a59ebad902ca917ea323dd41540d3a5c65af7be23'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-1600-9d64269d3e.avif', '9d64269d3e52b5d43d3337d68d2a16c5c50e835f562317a6e8b389911c532231'],
  ['assets/blog/ddp-vs-dap-bike-delivery-mascot-cover-e0169132e4-1200.jpg', '276ea5f79f09879eac3b5b0f811ba690c013f5495bf171875f0bcaf42c2764ac'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-640-72233878f3.avif', '72233878f376728677260a50e2acce94618a9e41b38d4b7d1543d2499bcf5602'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-1600-b15af6f63a.avif', 'b15af6f63aaf321fbbc38a5a5e5adba418083b3edb085aef89f1e10527333fd0'],
  ['assets/blog/eu-bike-price-vat-shipping-worksheet-mascot-cover-a0539bd823-1200.jpg', '1fff1daeeca9709f133c0dddeecf3ce74379fe9021f31cecd02b90bf32a6c748'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-640-179f0534b9.avif', '179f0534b91ed43b72577906fcb11abfd53d00773c5394447a154bae33983e53'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-1600-297ebb89fa.avif', '297ebb89faab9e3c7e7ca1eb4507e11785f7833bc47faba247ccc0015ae055c4'],
  ['assets/blog/yearly-service-budget-carbon-bike-mascot-cover-8bd1b60934-1200.jpg', '80de96009066b710201861c948587ee184840e20114c361c43cf5f543f616512'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-640-ecd0804f9b.avif', 'ecd0804f9b613803a7b9aabf72de2e3dda459ea2c1ce40e60129b50f6b45583e'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-1600-7559b10427.avif', '7559b10427b8148fca995ef1747fabcfa19b3df265ad54a33aa251735453f391'],
  ['assets/blog/after-first-ride-bolt-check-mascot-cover-8b2f55dc28-1200.jpg', '70905ab4f31899b2347e9f38288c5e2c5665e9aa51ed7665d81641b5f9a84057'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-640-74773f58fd.avif', '74773f58fd4372156741fd9613f8d5f9d201bb6867e3b8224b881392812e5caf'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-1600-a790f5465a.avif', 'a790f5465a179c175124a31211b319a7bb7d94e326b5343b6ac06c6eee0568f7'],
  ['assets/blog/creaking-carbon-bike-diagnosis-mascot-cover-0ab1ab9f9c-1200.jpg', '211746d4a160b4fc571047c7fdfab042dfb66e06a27916037690769c26760d29'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-640-ee4746a1c9.avif', 'ee4746a1c953bc8c23b09ac8b22f863116987608c3a1e741fe656b096aa0453b'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-1600-3b8c8adddc.avif', '3b8c8adddcbd59bb26093e4da276e3102a0ccf72548a54d79e1372c70070b558'],
  ['assets/blog/frame-paint-finish-inspection-mascot-cover-2fbf26cf2d-1200.jpg', 'c6a37bc27fb412fd8876283567d306b483608d76dad765f7a580e8d5af9a7bbe'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-640-6d4b007571.avif', '6d4b007571435effddc20bd0fca1f57c08d6ca5959c66305d85b8e599752f1cd'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-1600-de8192e6af.avif', 'de8192e6af09b9d9f34f397eb6aec7b9990cd0d5d40fafbb98d6529394cc507b'],
  ['assets/blog/buy-lightcarbon-frame-mascot-cover-58118767b6-1200.jpg', 'f78e70f197f8c50947a025f86680c71c65e18086d0ce8dfd56ffd6ecea8e640a'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-640-a8387abdcc.avif', 'a8387abdcc1e45e8a3cc7fe39cab070e6d8d2abff4f8a9d5be9819c9ea150798'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-1600-3ce984b3ec.avif', '3ce984b3ecf4a5e22a1192a49b11085e8c5de9e44784f568dbe1bf3649fa6cf3'],
  ['assets/blog/local-bike-shop-for-imported-frame-mascot-cover-a082b5af0a-1200.jpg', 'a0700819f03c041af34d6c36f0457fbaddcda8a29dbccdc309a3b5aea28f8baa'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-640-862fa85eea.avif', '862fa85eea38b1d19ec48bb0d0dadb7449a8d681cde9476fa689f091d2f5d240'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-1600-66b714db0d.avif', '66b714db0d0b30829fe4b67d861bf00796af2cc85ecc3a1492dfb0e74b168940'],
  ['assets/blog/first-bike-build-tool-budget-mascot-cover-f4e6f5b337-1200.jpg', '8a642a534c32ae1b495a9872fced822e232a51863c61f54e953d06494ba8d1e7'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-640-26cb71584c.avif', '26cb71584ce49befb57ed8b62c9d1ca7bea9bfc2e2fdf4a8f8267167d9a51a9b'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-1600-093164e63d.avif', '093164e63dcbef209be986777c0659ab91da8a4b7cca61ecaa421651145ffc3b'],
  ['assets/blog/cutting-steerer-who-should-do-it-mascot-cover-0f6eac9313-1200.jpg', '11945432892a415392cf9e8cbabccb3de6b66fd4f7e34eba1fc0f323fae230da'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-640-0a548f7077.avif', '0a548f7077e59beed537771cbe3ac1041a184f40cea7903eb47fb4a2d3072659'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-1600-cb54c06f0c.avif', 'cb54c06f0c3154a0c737d02b2fb8b121fcb8f87e1640d0fbffb6d254d3a61330'],
  ['assets/blog/torque-wrench-bike-build-mascot-cover-74ec573368-1200.jpg', 'aadb1f1d02c78ff64575cbebea54622ab3c9545e8ff8aa6d691086c0e2302151'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-640-e75e854b98.avif', 'e75e854b98d1c48e503696be601b164a6ec9bf8a2a0670197d0d7a12dd6fda3d'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-1600-1a77e8b082.avif', '1a77e8b08231285756d336b5ebc25b456c1559d9f059430511497dee5748fa8b'],
  ['assets/blog/carbon-assembly-paste-torque-mascot-cover-90e3e43f8a-1200.jpg', 'cffb3285662a7b3897bffe1516e3ecd457397133627307ae123887fe57889cd0'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-640-8bf164967d.avif', '8bf164967db8a54fff487da85337b916ec9143b4bdf52d55c8e8bf62e3fc529b'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-1600-d51ba0a2cc.avif', 'd51ba0a2cc6602eb10a049f2ab7a4bda520d0aeb9360979a27ea2ba383399361'],
  ['assets/blog/thru-axle-thread-length-mascot-cover-95bfe48884-1200.jpg', 'c149b3034e7158fbda69242d50ff6ca31fb9e307a41359c99fbcbb807b51c13e'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-640-3ae166e24e.avif', '3ae166e24e92dbccd079d846823fb40991908bb00ede247ff424e082c0b516f9'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-1600-ab25daec09.avif', 'ab25daec0935f06873b96e7fd2452465179781c8bdd79636f8d485ce044b585a'],
  ['assets/blog/udh-frame-vs-traditional-hanger-mascot-cover-6577a73aa4-1200.jpg', 'ca048662324bb234f2cc6a5296a620534ac82bb7e656a2597d7dad60dec7de1e'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-640-7e86488ed1.avif', '7e86488ed1b30eda6103557d9c73ce1adb54a9c0725a4facc9746aa8517ce854'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-1600-cbcfa5ee04.avif', 'cbcfa5ee04d7fe8592ae7568f88f30f490c5fea5b2a1c2a0058aa71d49effaf4'],
  ['assets/blog/spare-derailleur-hanger-order-mascot-cover-07e50fcc67-1200.jpg', '58d378d6e40b5108597241c1abf32212fc9c8e8070dec5500ed28c1481098da3'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-640-8ddf558d49.avif', '8ddf558d4909121cb8f46c03c1e6146e65141d7e02cb8e9453b5156eeb1d5f1f'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-1600-8e4b1e9fed.avif', '8e4b1e9fed6a0a586d412a9449f2e2bca98f1b55d4c771eca57276890783a5ea'],
  ['assets/blog/buying-headset-bearings-mascot-cover-e4891eb00e-1200.jpg', 'e168717425960708137eb3899d3a3345f477fc58b458a90d938b1a51d98a6b87'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-640-b2db1e20d6.avif', 'b2db1e20d6644d1cf3c9c5143eebd886edbdbf067386709f378f22e16b6d53b3'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-1600-e57d57382b.avif', 'e57d57382bdedd2de31625757c21b13fe0457db0060e8758b1f56e131e6c1534'],
  ['assets/blog/bb86-bb92-t47-identify-mascot-cover-3867a06cda-1200.jpg', 'ae45c23590cdb96c29983801ce3dbdaf7a26ca1c8d7fa6c114efd516b3812a95'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-640-c7c75c4349.avif', 'c7c75c43490507077d5614d4e2fb721e508036a95b4fdf2c568ec4f489027b39'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-1600-c48c50f814.avif', 'c48c50f814d7ed9bc84d7e6989e18ad6bb470b30079c26d0be1666e58ca900c2'],
  ['assets/blog/threaded-vs-pressfit-bottom-brackets-mascot-cover-1a208afd5d-1200.jpg', 'b42bfbcf6d6db2ee22dc6c5a44655771c39bca15c952df231bc8a77b0e49bb12'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-640-480b3431db.avif', '480b3431db8bb19a32b72192565b1ddcd8b6f91a0aecdf28d35c0566ffe5567f'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-1600-e5e73a0e49.avif', 'e5e73a0e49bcd3f444b5fa85a64c038bfe1da306c86bb27b81aa2b77c697c01c'],
  ['assets/blog/winter-tire-choice-road-gravel-mascot-cover-511062b2ba-1200.jpg', '80396eb5ce74dd84133135de824b537721507142b5ac8c172235a961bb36048a'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-640-ed1a0331d9.avif', 'ed1a0331d95a7b93a1b81766447098b12d3004db978bcd16cdc1cfb56b03f288'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-1600-cd06d9729b.avif', 'cd06d9729bd1a1f7bfd2a2f6be26930d57b241db40cc37f25f9fedcc43f6326a'],
  ['assets/blog/puncture-kit-tubeless-rides-mascot-cover-b0c777769d-1200.jpg', 'db2ab8500fd17611b31b6828c416189bb543364b0cc13d1e49808e4f250f478c'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-640-3dc8747dd2.avif', '3dc8747dd20d98dd084c5359612ade0aaf7d9d6d57937f5c4154cc0d376b1908'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-1600-bfd7d98baa.avif', 'bfd7d98baaab55098e91104dd9ce02763de14a49dc60b9197316b2ac676ac3b0'],
  ['assets/blog/tire-clearance-mud-and-fenders-mascot-cover-6dbdcc711c-1200.jpg', '03cbecf909405e16076f71f64c8d44dfa15f5d55ccfd779dcd78bfe7c5921323'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-640-fd68cbd06c.avif', 'fd68cbd06c8ba988265cd863a36469a848c9b9c121a0ee923de3a4f0671aff53'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-1600-d57ddca559.avif', 'd57ddca5596b1a08bc9c3a84d7ef90ecceed3e35d8992a27125abdfd84e96591'],
  ['assets/blog/buying-a-groupset-for-frame-build-mascot-cover-77815deef3-1200.jpg', 'f7539575986fe8a39328c01b2922e278978d0c4c7fa6d454e1d985f45df471e9'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-640-693c918f90.avif', '693c918f90ef792c760d38fd45f28cef7020a3d5fc4320d019c7d1d4103abf8e'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-1600-fd86e5b21c.avif', 'fd86e5b21ca49fdde49021f44da4cec48dab6b911154bfda50cd57829363478a'],
  ['assets/blog/spare-spokes-hubs-before-buying-mascot-cover-608533b018-1200.jpg', '51345f331c8016b745e4ef266dbcbc2f9c4149609d9741a0096c1b5b63c7d214'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-640-05f56f0763.avif', '05f56f0763b275618c69b5a7f82f397c5734fab4c1c53b9da01c7b0a1b2b2567'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-1600-ade19a48be.avif', 'ade19a48be19110ae153bc22828090f17833e24c7149b91c40b18ed478e40eaf'],
  ['assets/blog/wheelset-system-weight-limit-mascot-cover-1d58ca5c13-1200.jpg', 'e48ec3c257633d97a4f99b8c171e5a48345a233474d2e12f680fb0f01166af20'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-640-4c194b2273.avif', '4c194b227323e266c48247710e8725365a3ef88b82d9b474ee9ffb89669bdb7d'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-1600-5bce4c8445.avif', '5bce4c844589517687acd9a9a034b9026935bc9bddf1e2e3149d365108ebca61'],
  ['assets/blog/650b-vs-700c-mascot-cover-8162b7725d-1200.jpg', '7dac015959ca17028fa1d277b5a8403191c31d6d90cb7510234f3fb57111a561'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-640-57b3221a0c.avif', '57b3221a0c77469fb0ccf6314804e7f1629d0d4cfe2eec120f32466af17ad9f8'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-1600-c499348538.avif', 'c499348538afa92f4c29453099845ddf474ecb3a316958fb7acd72fcb9b941ef'],
  ['assets/blog/two-wheelsets-rotor-cassette-alignment-mascot-cover-049437d26d-1200.jpg', 'fce97896e3adda04a514df2857796aca541a1375e42e27d98ff6063e780fdac1'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-640-84b09357ff.avif', '84b09357ff47e29a45e937ad0a4f69ce535ac42cbb6c4ed57d3e3b598b957298'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-1600-498f272417.avif', '498f272417a6d91c263583b31deb9ba1fcd5e86d511dde89e4d5d377460c5ddc'],
  ['assets/blog/carbon-wheel-weight-vs-depth-mascot-cover-12fc446441-1200.jpg', '691732c0a2bcd56192608b5ebc53365c11e6153cb527214683c748a67a63f340'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-640-49ef2a8e50.avif', '49ef2a8e502821779e33f6c576d3528215a758e35b1aef434b8402b6b4017f4e'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-1600-d2bd98fab7.avif', 'd2bd98fab781a81ec94191bb9583f41399e21e765e69914f0a84117886eb04f5'],
  ['assets/blog/deep-wheels-crosswinds-mascot-cover-7c5b276c54-1200.jpg', '8f134b0bcc35543e18faefc03a82bfe682828b677616e8a1635d5294b83d980a'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-640-6ff7bf02d2.avif', '6ff7bf02d23287c99ee7a1a37040618f91dd90854b7232ad16ab67b5de02a80d'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-1600-f2f6682aa7.avif', 'f2f6682aa7d391ebbb10d1464d0098e403a1bc5af46c8df99fe6a0fd629823fb'],
  ['assets/blog/slick-tires-on-gravel-bike-mascot-cover-225aba10da-1200.jpg', '54cfe73cd006e9667d2a667a0e370c7b02a975b114858e7c8e0e9a0b95730a4a'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-640-d51c54384d.avif', 'd51c54384dfca35358d4c0aa095ea3ec2206d3f72956b8a3f363f1b4a4fd018e'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-1600-5ed488a0bb.avif', '5ed488a0bb60b83e7a85ee78b524406723ab42dcb9ba6004570a2649b3d2cbbe'],
  ['assets/blog/gravel-tire-tread-mascot-cover-fc39dddc19-1200.jpg', '53fe4ba345b922a07b6e744eebe563b7c87e0f6dace58b0cf763261d2cfe0ba4'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-640-9d553cb26b.avif', '9d553cb26b2f8a3223ec3f7ae1eb5e62f0ad506b668215398f8a90579aa0e094'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-1600-503b1d3a08.avif', '503b1d3a08e1fd570ea41056e90a77098a418deef880b0f84664b1712f60e5d1'],
  ['assets/blog/tubeless-road-pressure-mascot-cover-a3d5cbe675-1200.jpg', '9a10fdd2404776ef3b4b8b4ab829781d38b63e5c9931c71a09fdf6ac9bec0a47'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-640-06499be062.avif', '06499be0620a73b715472b96b15034c8997b361e3067422d48ba60fecfb00c4d'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-1600-a2ce2da429.avif', 'a2ce2da42993ec21cbc8e79cea44e2537be97001e19bd6be9591239510e4e8d4'],
  ['assets/blog/tubeless-or-tubes-for-first-build-mascot-cover-93c03ca2f2-1200.jpg', 'f0e0c81e20a001c6f9fbbfd1b681d26734d1afdda40aaf9feb611f605b85a867'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-640-cd4c1d268d.avif', 'cd4c1d268daf8a1815ae2a569414ea2c5b942bd698a4fe2aa82edb7abfd9b648'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-1600-88972383db.avif', '88972383db38dc4c7e6577de862eefd720f073a25af12be438f98a898e99eef2'],
  ['assets/blog/buy-ican-bike-mascot-cover-d445a8d44d-1200.jpg', 'aca6271e7479ec63ffa8b1f9f0bc30bd2dadb756b312a828ac1ee4ac139c2df5'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-640-b2e93c33e6.avif', 'b2e93c33e694573b8d10af50eb9fc355c42fbe254197b174135ad33a1fa1f6d8'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-1600-55d95924bc.avif', '55d95924bca43849c178e945fca37afa34232fb704a9aef009a4b9fa4686e327'],
  ['assets/blog/hooked-vs-hookless-gravel-mascot-cover-34eb1008f1-1200.jpg', '5f5efb74ea157e9c4f7372487255cf782e0f444d2c97205447f109a3fe584399'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-640-d015e108b9.avif', 'd015e108b97c62afbd1f19d90aa4010243319b2d52f7a2ecef8f60198e7406e3'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-1600-59cf02ff87.avif', '59cf02ff87b80d2e0643a00fd305ff74fac1bfeca67b06211223a40adf70d263'],
  ['assets/blog/tire-width-on-wide-rims-mascot-cover-9d62c32634-1200.jpg', 'e8b70f5c777ecbbcf541d4d8cb21a66f98b7bf0a53478d7a26180255d64b1865'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-640-57ddbaae1f.avif', '57ddbaae1f768851a5ef49cf406308f3e4759847059c2ff257299695f7abaecc'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-1600-9096758062.avif', '909675806225a2ffc8f3da3acf5555a125b8be307690e3a4342964f980bf183a'],
  ['assets/blog/power-meter-build-planning-mascot-cover-1201dc54c6-1200.jpg', '17f23f28665151d90d6c4dff9931882f2de5aeb312f0948537d94cc24865ef14'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-640-fcb2e7e7ce.avif', 'fcb2e7e7ce489a166e33fe63c240451bede888c431c85ab67bc581949710dc3b'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-1600-4fca636f5b.avif', '4fca636f5b521c343d86254898467fb00fedf0676b9349128fd003089dad317d'],
  ['assets/blog/gravel-clutch-derailleur-mascot-cover-a646640037-1200.jpg', '0ea3c3f30bce41229d20c6980bec5e182addc2f6d94268d9926a83070a52edfa'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-640-ad865deaac.avif', 'ad865deaacdf88c2beafdedcde802848ae9925e0562b2cf74846dbc1a60cde7e'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-1600-418b088c58.avif', '418b088c5846dc5ee8c3f5bf6f83ee02f6e176dd4447a101ec93fd26544976ff'],
  ['assets/blog/chain-length-before-changing-gearing-mascot-cover-0dfd7a3aaf-1200.jpg', '60405a02b2e51cb9b7adda858589fc57b74058aa0fb90a7963d8f06ef4b537c0'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-640-145b591925.avif', '145b5919253d3d2a7bfe6d4d74938009cb226e28961c041cd1d9af5703ca2d31'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-1600-96f106711f.avif', '96f106711f2ea2cf142ce78e27634715aa695e8e2755fbb38b8722a9b4546479'],
  ['assets/blog/chain-wear-and-expensive-cassettes-mascot-cover-b18970f8b9-1200.jpg', 'aae7a7074087cd927bfb101f53de9edab950872b92f12817cc3670a9efc88fe3'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-640-a2322c9f77.avif', 'a2322c9f77545d08b278cbb7b53228dcdf68fcf1a9f803eded7e153c590e7ec0'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-1600-46c36db2e9.avif', '46c36db2e99e7d9669b64d5599d987bd219e4e4cb45f8d3fdfdd190b525e0e36'],
  ['assets/blog/brake-hose-routing-and-service-cost-mascot-cover-99f38673ed-1200.jpg', '1157a0d48e54cc1f06cc986b16a5653dea5c113625b84cdffbe6e2b36a88f517'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-640-4f44a16234.avif', '4f44a16234b7e35be106dd6dc4aa90707d40b81df6420105c62ad4bb344d598a'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-1600-d2b7ae7f4d.avif', 'd2b7ae7f4d230ba551c2f68191aa8cbd26d54684ed2ae3290b3e2c7a6ce7a358'],
  ['assets/blog/disc-brake-rub-new-bike-mascot-cover-ea167ad258-1200.jpg', '8e744ee88c265c16f05773198d3b61f28500b9d64e69c484be1c79a121f64034'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-640-566949b214.avif', '566949b21483e21b62b0118b02aa5f8d1dc20b8409a1218a5bc622b47ea1a5f6'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-1600-36c3d2e663.avif', '36c3d2e663edc682044c729c944a3a37d2a0ee00b89a341031f93c1d78681fb6'],
  ['assets/blog/bedding-in-disc-brakes-mascot-cover-d4a31d35ce-1200.jpg', 'eed82f7184af97655e291280677b3d4caec4b4088a5531e30c6407e4b32c9b71'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-640-d654b8a53d.avif', 'd654b8a53dafd98bfb2cb170a2f22e0d0cbd73417af9a3b60f3e5180336f1926'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-1600-fe19eb39e0.avif', 'fe19eb39e0b2084e6653f823b1527a539e2f7c89d6fc4b7bff20a147fdd3a929'],
  ['assets/blog/hydraulic-vs-mechanical-disc-brakes-mascot-cover-828fcacd42-1200.jpg', '5fe04966dd44b447100dd9a5b495050d41edb07a07921e4771d7cd559890f85b'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-640-3e970c1610.avif', '3e970c1610e821f439db95e1e0860d4cb1206086514339d345eb65ea8c25095a'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-1600-8b6bbf6cd2.avif', '8b6bbf6cd21486a4d06b18d2ec18f40fae1230374eee2b985b0311ec42edc816'],
  ['assets/blog/centerlock-vs-sixbolt-mascot-cover-2a17495694-1200.jpg', 'b67d955b82f19b65209b0669f3b7b109608b10983317c6e0578c1ccc43e074d1'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-640-0e1b90dbe5.avif', '0e1b90dbe535232a832f336e59c2b64a3f0aee6042f13b2d18fc6cb145700a7d'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-1600-b8203fd3b0.avif', 'b8203fd3b09b9a79b563dd3e1d26922a297555efca95108e5614e632caf67a96'],
  ['assets/blog/brake-rotor-size-and-frame-approval-mascot-cover-645bf1bb34-1200.jpg', '6b1344f93ee70ff861c0e56f20112ab2a0548b6bf3b94e71193febee8b6de36b'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-640-307975299b.avif', '307975299b918e4db3dd1effea5c266adca3808bb5a74f31cc7e108f7331034c'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-1600-b57bb0b86c.avif', 'b57bb0b86c30ca0037030c67497fc77f6f7807aaa19f3aea8faff95af52a9b6f'],
  ['assets/blog/freehub-body-hg-xdr-microspline-mascot-cover-f432f7e73c-1200.jpg', '30db8281d7268a41c880eb5d9e79f2f4e1a789d9d37ee41e42dca98f6d629d33'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-640-7f71c8cd47.avif', '7f71c8cd4769aa3aad8f0bac4317320a1a3ae8ac510fca49278da90c03a0619a'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-1600-896f97d69e.avif', '896f97d69e09f5fc47148c1fdbdb6b4aa75b10de1a3691b122922173f55f00a0'],
  ['assets/blog/chinese-frameset-order-checklist-mascot-cover-2f72d63c20-1200.jpg', 'a1131ec880b26c4f7086521a83a3c444b0b660809c6c2e58a630dd007c80b57b'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-640-f65acbe4e5.avif', 'f65acbe4e5cfb4e3fdccb61af075a098cd6cbfb7af64eb5cf8cee0d1808aa24c'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-1600-cfcc3c8465.avif', 'cfcc3c8465f245fc53a39530b611b040a37acf7a12ad1db30fd45c37e0749b40'],
  ['assets/blog/mixing-shimano-and-sram-components-mascot-cover-9921a1555e-1200.jpg', '6d3bbd67cab3a762b6c1c03a12a4a48583810590fb78484559c18e1d71caa23f'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-640-86bf33d888.avif', '86bf33d88829492c3508bcd98f0efd6f4105333ba2b21ef23febb754d324efb2'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-1600-093e8c6b46.avif', '093e8c6b46a3670187e256ca21d9253e5cb7dc9d0ec4783e906f4d8a2ebec360'],
  ['assets/blog/wheeltop-sensah-shimano-choice-mascot-cover-8290629bd2-1200.jpg', '24f60c7a11df7e34a6a4078e55808dbb1c757d4067bfb01f034a3465ed324dbe'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-640-cb578bac47.avif', 'cb578bac4701074506d2c503735d50d5e4d767a127e0a14404336fb0cfba22d2'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-1600-4e9829bdaa.avif', '4e9829bdaa3b943f588dd0c7735dcfd4e388dfa2dde6bd4ae51882a7219fb2ea'],
  ['assets/blog/electronic-shifting-battery-travel-mascot-cover-4400e053b5-1200.jpg', '21792717a4e951bef47fe34f41ae26c961d1f03d2f50583c6720d96ac81bdb29'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-640-f046ed24ba.avif', 'f046ed24baf49da646b373a1fa8860081662eb7cfed81e497695ab7bc5f348da'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-1600-79fda62106.avif', '79fda621066b1bef87326dbfcbaa8be06e0565427f823c7c52cb951a8aa37e9b'],
  ['assets/blog/mechanical-vs-electronic-shifting-mascot-cover-ff30f617ab-1200.jpg', '75bd04e078eba081af3e9e41dc0d7aeb220295d1cd3dced969b3644bc371ae39'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-640-0c0532ce50.avif', '0c0532ce50175c9f55f444389ac2c658f0745e3f97493d2d553d527573ebec3a'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-1600-940017d173.avif', '940017d1732c913f3f68c9f5d538ed6f53181a48df1530dc4be7ce889527a75a'],
  ['assets/blog/subcompact-vs-compact-road-gearing-mascot-cover-764a7ea6a3-1200.jpg', 'b4b028bbd38663522bf1845d0defee9fe0eb7cd2e3c581ca83e92dad85e22f9d'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-640-7d490fd6a2.avif', '7d490fd6a21dabd0e191a55ea29a8169d80533c6e1839687a540dbef64a364b0'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-1600-682996f304.avif', '682996f30463e117e75441f8caf927fed3811fc5fe8471776a2a2c75aa528aba'],
  ['assets/blog/chainring-size-for-mixed-riding-mascot-cover-5e2b38cbfd-1200.jpg', '361545099620c316de1e02d5e2e69eaaefbf463336fe3400ec4ac580311f29b0'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-640-87d52b65ae.avif', '87d52b65aed7b7f5094f8d77b9616dc02f4b7bf664c77ed99df0c77962230f3f'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-1600-3fbfea17f8.avif', '3fbfea17f81d911c89360822771babc70bbdad9b3446ba5799900cb5fbab1f49'],
  ['assets/blog/cassette-range-vs-gear-jumps-mascot-cover-508fa1ffdf-1200.jpg', '409bf695f917931bd0c6e05da90000a26d774583d5968dc2d39fde3309adccb3'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-640-81c74a0101.avif', '81c74a0101c0586e7c5e520759a00e9cd1726285ab48b9485f95baa597c2c028'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-1600-86bfc3225e.avif', '86bfc3225e2ef8d680ba0847f8246ad17c734d33bc853ed26a85da82e764ff3d'],
  ['assets/blog/gear-ratios-gravel-climbing-mascot-cover-735d57e3f2-1200.jpg', 'a6e0ed37a6bbd3adf63e52768fd053b762fe803c392aeda3524ced06841b927f'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-640-ae4b881374.avif', 'ae4b881374f52cb18e835b8b35738ca14d053ec9f53f75a1007f2df104d4414e'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-1600-d1b7ac4808.avif', 'd1b7ac4808b24a622569c6f78b27698d7b4dc4469005272449aa4e15831c769c'],
  ['assets/blog/one-by-vs-two-by-gravel-mascot-cover-645c215930-1200.jpg', 'c34ab4261a0db5a1cd44be4e36526962ab8cd074bd2397e8d4866312d442ba71'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-640-d7cb85ba96.avif', 'd7cb85ba96096caa86d1e053a04a012d30369087109674da396c48555414a545'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-1600-3ddf194842.avif', '3ddf1948428dcd5f3e4568ba6f50500a35ce523e39432ee5f86e4c6697f08e46'],
  ['assets/blog/buy-yoeleo-bike-mascot-cover-e350d9c640-1200.jpg', '8f645021f10c34aed2fbe891604221fc1845c7514c9c97fc96819ec02f438d7c'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-640-fc6eb1331e.avif', 'fc6eb1331edfeda623b093a3d61ab5412e56835d59e0179730e2868fe8e7ef81'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-1600-f5c02cbccb.avif', 'f5c02cbccb20e5f1c24f3fad7256e2b3001dac3735eb030b2e6543945b027961'],
  ['assets/blog/making-bike-fit-appointment-useful-mascot-cover-b38366d38b-1200.jpg', '796aad5cf19868f530f63ce5bd4ebd4398b3c1cdcfd145750d617f09af83ada9'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-640-8bfc10395d.avif', '8bfc10395d5e01001d6af10f1bdacccffb4ad4f7e8ea98e3daeebd7e0ecc7c01'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-1600-ae22fa9fec.avif', 'ae22fa9fec213a60d875b96071e9dfbe3e5c2c59e271b7654d3ab7f3677e2962'],
  ['assets/blog/why-wheelbase-does-not-tell-whole-story-mascot-cover-928f4b89df-1200.jpg', 'd1e1d7160d510a966e3bbdb60649b94b0bf9c7ba70e7d93c0bcca08cea758a9f'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-640-a07787b6d9.avif', 'a07787b6d9deabe1c3dc2a626a0f2680ed69edc9971f1a07236356a7e1391411'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-1600-13689d0962.avif', '13689d096289319490f9a30191a3d454a412f2c6e6d08c24886c9e99bab4dc73'],
  ['assets/blog/incolor-speedster-sr-vs-sr-plus-mascot-cover-970248db0e-1200.jpg', '32c3deef93bbc882998c514fbf1e63403c8b6fec778c1b3f3d848d99a9401dba'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-640-babb6c9e1d.avif', 'babb6c9e1de28f8d33a2bb2c832c83f1cf955a25485d7b69a4bc3ec55f6a5e29'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-1600-0d4184fcb5.avif', '0d4184fcb5e2a968f708fdd5b1fd6cbf6bbc6af231f979a088746437eecffc07'],
  ['assets/blog/when-geometry-chart-does-not-add-up-mascot-cover-78d85422ca-1200.jpg', '3e3913be6d00e87fba32681ff717a6aa143b69578c45556ca3d7b24d3816f9fd'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-640-f246cbb6c9.avif', 'f246cbb6c943dd774ee308e5e05dc96a384101e61681841ea3128c8f953ba5a5'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-1600-398874fa25.avif', '398874fa25470e64bf16d7754474e04c3afa38be591fb60cc4f6a5b5afdaab81'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-cover-fd45ce1059-1200.jpg', 'cdbe73c5b3b208cc8ee0ac2a9f93fd2bf648e2f3d00945051efdf4c67510e031'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-640-aed59c889c.avif', 'aed59c889c58543bf50e4476c0d5dedcd0628574bc474d4e5fd2e0c10bbc2ffb'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-1600-ce0c4b32e8.avif', 'ce0c4b32e8e123dfee5f2c2cc1a81b70d167d06cdfe1d33d5ccb48bd8e527352'],
  ['assets/blog/seatpost-offset-and-saddle-rails-mascot-cover-db39a6133a-1200.jpg', 'f4bc62009fbf7df19ca9f6c2d046c7830160e46b31f779d97b30c3ba141eed8d'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-640-bfabebdbb5.avif', 'bfabebdbb5182aed44a5b6437e4157f4c2f95e279f075d3abe975d95389dbc4e'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-1600-5b924c7ce1.avif', '5b924c7ce170465d4b6675736867032825da9672eb5637eb8d70167afdf8cc2c'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-cover-86ced7337b-1200.jpg', 'ee7885005efe434ce48dbd3e8a7a93ca938fa2b72826c60a76cc9234115c9f4b'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-640-803ff633ef.avif', '803ff633eff01c347b0201497d83aa614cbbf614cfe8d14f8c28eacc10541ce3'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-1600-dd8c2096d0.avif', 'dd8c2096d0a47a350d009a3afb2a9432a7b879714d8e4d33600cecbae24c4cee'],
  ['assets/blog/front-end-height-on-road-bike-mascot-cover-7a46c23a45-1200.jpg', 'db5f4dc75253f921792bd0ae3dc164f610ba88bb3134bead63bf2bc47f95f811'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-640-5a5da51d5a.avif', '5a5da51d5a94c081bb74867c7ef00b86d135bceb987520c64a086e4b58169662'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-1600-f904d8afd0.avif', 'f904d8afd0a53397d100f2ba9aa47c3166a0bdc6ce28d850569cad78bdf3285d'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-cover-66a76afafe-1200.jpg', '581390fdf3dc038f277257c718ee46e889c5a6fed6b22e56cdebff7720f61f99'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-640-3a0daa7eb8.avif', '3a0daa7eb81355e1f096cba4794d47fb833ec1fab97db9f29790e642e5908765'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-1600-0e9b2c0460.avif', '0e9b2c046086c9d19eb4f285d8b8890d9d0352e1c2b0abcd59ab91ddc378b08b'],
  ['assets/blog/standover-bikepacking-bags-mascot-cover-09f4ce83ba-1200.jpg', '37e50cd0a595969c05036c80b8c35a6f24199768d92b55568dc9987dbe7dc01c'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-640-b17592790c.avif', 'b17592790ca35a641cbd3e4cbab4799e3d5f3dc05963a569b5dc2fa5595ad788'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-1600-d9d7c63765.avif', 'd9d7c637650a892f6b52306b47bf685015eff8f56c3ea5b818f9994d893dc914'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-cover-e463bf31fc-1200.jpg', '2f122445228d592c165a658fd64f09dfdf28ef30ebe3d7073aa10ea0de2aa453'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-640-95da47c2bf.avif', '95da47c2bf0d7486c86f2f4412060f3557faa78ef0952616766bf269362d6724'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-1600-ecdff6a226.avif', 'ecdff6a226c76454fdd5e512742a84a39f3ef66fd90a5078ffe547ba068a8fa6'],
  ['assets/blog/toe-overlap-small-gravel-bike-mascot-cover-a099f61f1b-1200.jpg', 'c378f18eb27b1f05a9d2c13489059df3677e3225b905f12bdaffa513059a1f2a'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-640-8331ff0fbf.avif', '8331ff0fbf912186d80ed36ab4ceba9e5171046db1c6b0c836bb8cc162b6a04c'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-1600-78eacb4d75.avif', '78eacb4d7551a015565280c1d1de0070253dac8eca09173ac2c488fe08b90866'],
  ['assets/blog/buy-chinese-bikes-europe-mascot-cover-86b94913b2-1200.jpg', '456a8adfdfb9f7c79770772b2d492cdfab5526f2a222e2f504a6dd1609c76366'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-640-d2866595c1.avif', 'd2866595c1327f86cae2767fc9f28e7fbfb26671b01d78d49a6852cafeeac555'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-1600-53225afd26.avif', '53225afd26023f18d7e9cd75d27c3c148452a4a4c79bd2aaa02adedbe4e17f3f'],
  ['assets/blog/spacer-stack-and-aero-cockpits-mascot-cover-15619ff2ec-1200.jpg', '7475dfaa8ef3d5e8c39a2e5daa863c82c35766feaacd9c802d869352ab0effeb'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-640-56f5bbf26b.avif', '56f5bbf26b117a3081142bcfaa4a60a8edec7597c577ad05fa94c3c0f50fa13d'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-1600-8fabb1572b.avif', '8fabb1572bcfc27f27db55baa5699100a5400d3d2a47f8d6c2ef4824d46b755b'],
  ['assets/blog/buy-chinese-bikes-us-canada-mascot-cover-677d361141-1200.jpg', '444feaf1dfc0036bfc45caac33c46de9c989a52712cc7f365dc6ad96d74090d3'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-640-fc56131379.avif', 'fc56131379498e28d941fcf2b63d87a96d4d27847e0833ae2ffbfe90bf7384d5'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-1600-b0382ee828.avif', 'b0382ee8286059ead88af8e21117bfbe0bdbffe5c8bdf7957c035c91d4c99548'],
  ['assets/blog/saddle-setback-vs-seat-tube-angle-mascot-cover-a0fe9899ae-1200.jpg', '4d9ac55796b47be37419be58e339e842de8677e5f934cc8ef763e51aec8bc823'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-640-7bfa984621.avif', '7bfa9846212e5951582a955ab3acdb3df96d59685ba80722cf81511c7624c5e1'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-1600-a4f93e485b.avif', 'a4f93e485b324602075be8df24d7ca1955cda74048a2472bafaf1d8fa3dccd99'],
  ['assets/blog/road-or-gravel-first-carbon-bike-mascot-cover-eae8c1ee14-1200.jpg', '99a50911186e417409a8448b4390d9272fe8889b46250d4a407a5d24ee41c38f'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-640-98d7ec58a7.avif', '98d7ec58a79a2efe03129673aab55bf730dab4a3b2c09fd19c9e58432034b1ce'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-1600-de86a6f466.avif', 'de86a6f466ce6ce6e8b3c64471ca8f5761180b732b754a32fc850f743afe3854'],
  ['assets/blog/saddle-height-marking-before-new-bike-mascot-cover-d4d4dfac80-1200.jpg', 'cf5fdde7c3a4347ebe3a8f034310281d74c18cbe9c2e99a296c6d89395dd01ce'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-640-bc26362054.avif', 'bc263620541038e151fc472c20228a6822cb8b11ef8c470a7ac483cd6713a611'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-1600-66d960bf81.avif', '66d960bf81c2271893bbcd47de1fded0093d3ccc92ab871b6074362ceb964914'],
  ['assets/blog/one-bike-road-and-gravel-two-wheelsets-mascot-cover-e5dd01900f-1200.jpg', 'e753f60ce41e9687edb01db638ea0b62fa4ae9e9210f6021d769be11bac376d9'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-640-5e8d36c71c.avif', '5e8d36c71c4a712c2dadae0088cb0a814fbc4af45182cee8e47f4b2a1e893484'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-1600-61c6375480.avif', '61c63754800c39f9f55c0f215eb0a7b6b0ecd10fe60d7476c885b8e290db4e8f'],
  ['assets/blog/shorter-cranks-bike-fit-mascot-cover-1832e8e7ec-1200.jpg', '87c1d4cb8571b15425b8f23817b462c227c45efc94ef158db4f053150bf77153'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-640-033e839a10.avif', '033e839a10b7bc4a39e59151eddf091269e1ff7eff0c336d8ea9e587ca0585e5'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-1600-6dcc983f44.avif', '6dcc983f447dc8909b33651c9b39ae944e7f8e7e487aa1211dd21d4fe8ca6464'],
  ['assets/blog/gravel-bike-as-winter-road-bike-mascot-cover-50460c4e28-1200.jpg', 'd594cc7ae03510c0f6c2fccc6ebad6e5625ecdef29c41c6694fdd5797c796694'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-640-0e2ab7bcae.avif', '0e2ab7bcaefb15defe7b349e03dc0ef23bf9e432cf185932dbc296343bed42f0'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-1600-622b3b080e.avif', '622b3b080eb5b48d499fa2f5bcae65f2ef5ff450277d4ebc67cc3e295860f51f'],
  ['assets/blog/handlebar-width-and-flare-mascot-cover-409d4c79fe-1200.jpg', '1828146a93eebd28dec85981da2b15268b77fae786dd935975cac02ec431e8e9'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-640-966ec1ec9f.avif', '966ec1ec9faa75885760bae8aeb771c6f84d3a4e48d01ff2e21bf06bdb9f1f67'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-1600-78236c0dbc.avif', '78236c0dbc62c94ae7c992855174ec4da29a89c585139925fda572f673ef8935'],
  ['assets/blog/endurance-or-aero-frame-mascot-cover-037754eed3-1200.jpg', 'e7c669cdb311a738b5c55153c06bb4ae8ecf9a4d91ad8d83b58925b7287b3178'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-640-5bb64776ba.avif', '5bb64776ba22489b316c1d016f1183d46c08c38803713981fd8d819063d34641'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-1600-b3c3610c9a.avif', 'b3c3610c9a4c9c815a6217ac05c708f6f11b96b08f9f25b55ca194d5871ae33a'],
  ['assets/blog/chinese-bike-shipping-times-mascot-cover-fdbaad6759-1200.jpg', 'dee7de924fddc9ec048b395b25ff3fc2a5ddba1eac1e1c398a42cd8062f1379d'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-640-fc513a0d53.avif', 'fc513a0d53a446689433e671647ae7b2669e00495780658e2b7e3d7ca5d1f088'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-1600-a3fbb112dd.avif', 'a3fbb112dd51c3337547bc42e3634b6367665bf02736bc659650957f0ec82fd6'],
  ['assets/blog/buy-winspace-bike-mascot-cover-08a7644393-1200.jpg', 'bdcca380d1b353c3ca0f233056b13a3416de293b2769d5ae4e034c4ae4394341'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-640-c5fdd4b85f.avif', 'c5fdd4b85f59b1d62e30655a2fc37ef688cd228ac43db696fbae276a60b06401'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-1600-b345700096.avif', 'b3457000962114524a5c242a93b5d845d72ecf35ca368648df4c12b81b4db763'],
  ['assets/blog/stem-length-with-integrated-handlebar-mascot-cover-cb384a02af-1200.jpg', '06cba5551efff536ff0b7a5f2fcb8b74d98b183aa2a263450828f3decaa1ebe8'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-640-8b24c7fbf4.avif', '8b24c7fbf4853a0adce392ec398769f8bf38893b6833428e57bd410324ed3301'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-1600-c13372b89c.avif', 'c13372b89c19e3a896fb525bb6d57e29a7ae73949975906903b507b02ac7b14f'],
  ['assets/blog/carbon-or-aluminium-value-mascot-cover-ef812c8770-1200.jpg', 'c521ee2268a56ddb64305aaa81ec8f977200bd23d617c581fd3a04e4ff537103'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-640-73fbd7358f.avif', '73fbd7358fe22a1782bcb4ac2888fcb004f20e9970c6ceae2eb3379ca084305f'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-1600-50bbb290cd.avif', '50bbb290cd94401d8a38831c29e3cdb96938d93d8c4a67eb08ba36de14073f82'],
  ['assets/blog/comparing-two-geometry-charts-mascot-cover-290c35c3e3-1200.jpg', 'dd2d54623f4c698da7fde460c3d8d6ffd4f171f77bdbf7f2c5349fe50567e8a6'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-640-c1cf9a2cd1.avif', 'c1cf9a2cd1707ce06b1bd6a16bf2374ecd84fbd72caa5da7dd908f00912f2f74'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-1600-69d0ef3d5c.avif', '69d0ef3d5c26e286c187f6642de72ac4578c5b2d08f0956bcd671c169d6c100a'],
  ['assets/blog/first-carbon-bike-budget-mascot-cover-d80403d806-1200.jpg', 'e9269b0d99d4f501396308616cce02d6ec193751f80075ed880c9d5e0c9b7145'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-640-6b7029c359.avif', '6b7029c359bd6945b59d0b2b3fed3dc6e97d160d9a58a5fe900515a1c050456b'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-1600-32c2764878.avif', '32c2764878120fb91e0dc5c9b1f630cbcd7655b9a1f30367a44930b1e0f906bc'],
  ['assets/blog/stack-reach-vs-frame-size-mascot-cover-7a179e4061-1200.jpg', '9c07e9f6243eec08dfcb3befdc1d5abf63fa27b41cac4d22196227310bed39b6'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-640-729eadf26b.avif', '729eadf26b455285f476be0aae7ea87b8af9a263d2591e46352d4209bb1085a0'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-1600-782709e5b8.avif', '782709e5b819773f3f5ba2bd7367059670075e68843a3384a3f2a1a9a71a09d8'],
  ['assets/blog/chinese-road-bike-for-long-rides-mascot-cover-206519753c-1200.jpg', '2212da72115756822614146407e5d1b96e5cc23abfa547bd20b4b0d6a3e42490'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-640-03cfb37965.avif', '03cfb3796554e3c8afa7d482c91c5fc92fd691ba497208ed3751f755e696e432'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-1600-930e5ab0d6.avif', '930e5ab0d64992c4c5d8bda0618cd7e4b0461b1410bdc2fa7a88118dbafcb53d'],
  ['assets/blog/choosing-bike-when-specs-unknown-mascot-cover-003b73890a-1200.jpg', 'd98dbb6c2c9d5c8e45658f47ebbfba6c2df48e1d7829439996322b291019e12d'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-640-8496e159d7.avif', '8496e159d74ea12447edd6a44b5476a59f746e551ba27aaa95bb38995e3906a8'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-1600-d2615fc3aa.avif', 'd2615fc3aa0db85e3b41a0f4c516a37dcaaf8310af6aa16214b8b8a74b00a735'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-c5efb5ce82-1200.jpg', '17631e58aa43ea57d53b5e07c9f7ca03891da784d4819b8bd8d00f48d039d70e'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-640-362ff75c6e.avif', '362ff75c6ec56a12a34c727d27555421360e2c7868dd203d8a820c193eb5a27b'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-1600-68a315e791.avif', '68a315e7916b680290949d8420a8b84acb8f11696980d25902ad1fee5ac96f3f'],
  ['assets/blog/chinese-gravel-bike-for-commuting-mascot-cover-68f8cd9114-1200.jpg', '7249ff9d596140192a9392cb74ee4b5526699e8846e659b73d1ebd93e1b49e4f'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-640-4c2beb5876.avif', '4c2beb587626010125f1fb60ca84dd61e3223850ae8b459045af59c6f6ce346d'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-1600-711a7d1dc0.avif', '711a7d1dc0b5570dccf855f085d965640e5c4e50fc3e5108d10271fdb8da0f9c'],
  ['assets/blog/everyday-road-bike-with-fenders-mascot-cover-6410e6e765-1200.jpg', '3f943da815e0bb38f5ea33e3535de5ed8e30a741b215c16ab1b53c206d97d8b0'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-640-d96f767306.avif', 'd96f7673065ddf67eac1147c964931a30ac8a6b5801120441058c2c2234aefcf'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-1600-8c04fe9444.avif', '8c04fe944497f47ecf6acb700f59ea8923aecf1e433f79403add949709d034d0'],
  ['assets/blog/chinese-bike-for-bikepacking-mounts-mascot-cover-690fae6bd6-1200.jpg', '10605bae998a2f6be74f70f85dc90bdee08b8df3b572fe5f1bc77e94ab675069'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-640-4c6d05fbe9.avif', '4c6d05fbe92ef168dcb5720a3fbcee90988b5a0edc8c1bf954c37343b8d6701c'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-1600-e4f5aedcab.avif', 'e4f5aedcab27833ce12e3609cf4c7e5ad61d48dbc1860c1304d2055a7e502790'],
  ['assets/blog/bike-build-for-hilly-rides-mascot-cover-782e5bae78-1200.jpg', 'f3bec2983053bb717e6e65369ed36cace037ff146ab29360aa5bff29a6bdf335'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-640-1b8a5e8850.avif', '1b8a5e885014613ba3b42be1d99597f3708cc220f2df5812c6e291cae5a3838b'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-1600-b8b0938bb1.avif', 'b8b0938bb1028ad0ac8ed80f3182dcf016d2522dff22f0d85a8bef931782060a'],
  ['assets/blog/chinese-bike-frame-sizing-mascot-cover-c7f1ec7607-1200.jpg', 'b04e5bae4637daf5fb7ccb17600503068d055a967d55e236818804f032667436'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-640-6f8e6d1134.avif', '6f8e6d1134d944f02b18c05e9379d3de65a077ff60628ac835755f8257fb3051'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-1600-42a855e566.avif', '42a855e5668af467a70deee8fdf8a1edfc556a6479497ffd22c8f0e0921ce66f'],
  ['assets/blog/budget-road-bike-upgrades-in-order-mascot-cover-1fbb19efc3-1200.jpg', 'c7ccb8d729076016318d18148782baf998d5e36724e2d29914f37cf3c42debc0'],
  ["assets/branding/panda-rider-3b-256-6c271fa41e.avif", "6c271fa41eb8857e85ceab114495dda61656dffdc0dd78b4cf4015585e199320"],
  ["assets/branding/favicon-32.png", "80d1ce9715dc112ae33664e41c4d276070afdf96443e719252719e6b5968c645"],
  ["assets/branding/apple-touch-icon.png", "b717d115151d144911468ff586ac3ab54d09bb31cce82d6897531c818be6180f"],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-640-5c42683704.avif', '5c426837046cc9e1b7b92f6bc4c1828799a4adf8c20be0fdeedcbb6135a34a0d'],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-1600-dba4c80d7a.avif', 'dba4c80d7af0cf5ebac87ea7898c40c2d6bec2dbb6394121afd2d3f0571555a1'],
  ['assets/blog/gravel-racing-bike-vs-adventure-bike-mascot-cover-6b1117e59b-1200.jpg', '39a11414a21744763335c1b7045b97adb29c357766346f151af555b89dfa2bc8'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-640-3e43185384.avif', '3e43185384936a80041cbb2cf4099b038dd01dd0393047c6404ef7b0c4d965b9'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-1600-e7a84d2589.avif', 'e7a84d2589ace24de18ec29ed863a133e2e7814fe5b686fb4467d92d944c67fe'],
  ['assets/blog/spend-on-tires-or-wheels-mascot-cover-7ecc297f0f-1200.jpg', 'd9bb3a22ba2e4113687b035131c90aed76dd424522cc9c3b189c5dc4b989d15e'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-640-67e881ac82.avif', '67e881ac82f77bdcbfb08c79cb59298f10eea95e8c2b3d3ab143f7ae6d3227d0'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-1600-4cafc1a2ce.avif', '4cafc1a2ce1d65b62be26b58f50dc216c3f1e00bb2dd4b6b620c42c8d380f3a1'],
  ['assets/blog/used-chinese-carbon-bike-mascot-cover-d81b39999f-1200.jpg', '653b4cf48467b54280a25bd0ad6e84665be98b5736cef236a19bda80beea5807'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-640-909e191a82.avif', '909e191a822d7e8909540f9c3c0ab431a99a22377a8ec08d50d2433d013f716d'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-1600-2af3042fb2.avif', '2af3042fb24d1058dc2615d48a94eb44433d1ca93121a6f97f75ad8930f89c8e'],
  ['assets/blog/buy-elves-bike-mascot-cover-fa6dbcf6c7-1200.jpg', 'f4ebff892ccb9fac0a84cae734ec4317cbe4b854ca682ec15d1813ec6c81b058'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-640-bc411d7030.avif', 'bc411d7030285edba9c402cbad64e1f16289c81f7cf2d858fc540aec927c74e2'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-1600-fd51e93817.avif', 'fd51e93817da0d29a9287d18ae3a51c8255c51f62a74f6200fedfc608634ffa4'],
  ['assets/blog/race-bike-for-heavy-riders-mascot-cover-05138de05f-1200.jpg', '9511df1dd615364c43d44533945ae65c58047e663f61469623b452c239b4b17a'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-640-91117cedfc.avif', '91117cedfc9935e353134e37732c2fe5dc2814084144b6177852a62b5605f71e'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-1600-eecff66075.avif', 'eecff66075e9251f07e29cb359edc1999ef22e91fa7d430b5ca9d58a3d0ef086'],
  ['assets/blog/second-bike-or-wheel-upgrade-mascot-cover-fa163f2cdd-1200.jpg', '5b1e127c277b15b9f68a9f91b90fdbe3be0751a59076ae07f16a761628580a37'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-640-52dbc1f124.avif', '52dbc1f124f82783b9261bbe7664950145de7e31c60648549f2198c0484a0a53'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-1600-47afef5017.avif', '47afef501777e90147a349a078be39ee877380c060873a938dade9be9cba903d'],
  ['assets/blog/bike-fit-without-test-ride-mascot-cover-2f0bacfcdf-1200.jpg', '2aed4f900905363b5efb47ecb61b9e853406cefe38c18bdcd282721af907b02d'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-640-4ecc00ca0c.avif', '4ecc00ca0ca4978addeda80a6836d8deaedee98564281c2ca0ef4ab3dbc5b31e'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-1600-016ba0b6bf.avif', '016ba0b6bf392acd4457374428104ba1e07c254d4f4f9b7ece7d1f1400d2c733'],
  ['assets/blog/small-rider-bike-shopping-mascot-cover-1f31547409-1200.jpg', '60f93550498324a46dfb245f3393c011c179d93b025f246a8fd2d7877da58e39'],
  ['assets/blog/europe-bike-delivery-640-1eae855eb7.avif', '1eae855eb7ce9b52b045b293e4efbae20965f478a4a73a8fc85df424995121e0'],
  ['assets/blog/europe-bike-delivery-1600-fde997996f.avif', 'fde997996f5efeb01cb3d55d037e9680fe80e86bf1659feb6c6646a5fe443f59'],
  ['assets/blog/europe-bike-delivery-1200.jpg', 'a4a2a0512b51059054320666a11bc19b382c907d60e81637ed11a9a4c8680502'],
  ['assets/blog/north-america-bike-delivery-640-02ab779432.avif', '02ab7794323c8343a60cf96db4e86264997f616bc2b25d039a4dfa2817dd3cab'],
  ['assets/blog/north-america-bike-delivery-1600-e0a7e287f3.avif', 'e0a7e287f310e457b3ef2ab0ecded3fcb9b5fbfc34ec875f12c0efb49138016c'],
  ['assets/blog/north-america-bike-delivery-1200.jpg', 'ac41f8ccbeb2b54d3fc4f3a24880dc6ef1ec20fec05c4633a2f57664085acd67'],
  ['assets/blog/cycling-guides-banner-scene-v2-640-d4b868e333.avif', 'd4b868e333daf12bd44cc04a44c1c74145b249845bf6d0515a112334ca593f4b'],
  ['assets/blog/cycling-guides-banner-scene-v2-1600-d58b22adb2.avif', 'd58b22adb289a1852fc94abe3d4a18a4fd077ee6ecf81dc6b40042d5208b2ffe'],
  ['assets/blog/cycling-guides-banner-scene-v2-1200.jpg', 'f60e4c63aaa44f9f7a3f9461e74da7b3d5c13415f52ab7d8a424d9f76c3b9783'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-640-40a3c7434b.avif', '40a3c7434beaa50ce668da4571fe3ad204533af7a3bd29fb46c06ae05717b8a7'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-1600-872fa166ea.avif', '872fa166eaa76324eae63f4d5632214ac272eeef45e4f63f5ee040335a35adb2'],
  ['assets/blog/gravel-bikes-around-5000-yuan-scene-1200.jpg', '0aa9a88fff82f1177df7dbdd0b9fe3f2564654bbd9856629d07a1ee673e27176'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-640-1659af7cd8.avif', '1659af7cd839c29b071a0d3a16d96d5bfb1aaeb2cee46097e22294a50e5317af'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-1600-ff91f00041.avif', 'ff91f000419b77035d0329a90a49a237b36ef3c9053e47745a7893495b537748'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-scene-1200.jpg', 'c4bace0a3779dcfdcb786491f0399a363b54a89efc409fd79991f1a4d5b51584'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-640-e7058b166d.avif', 'e7058b166dc9acfa0b48958c750670924392285d3ab2ac9c7675e61f55e6e06e'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-1600-2ddf754d2b.avif', '2ddf754d2b86496e1368a086150a7866111f87b91a911d2f0248f9ded8e32c76'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-scene-1200.jpg', '432af6140625c22619ae9d244cf831a2406f431ef45aa65f396b9aaf6234e5b6'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-640-e85a480ad3.avif', 'e85a480ad30bb66a37835cd08d442289baa9c83d3530e5ad3158947f8d274c7c'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-1600-e44cbc3e43.avif', 'e44cbc3e43666d8914b86412d8d067f2e9afa22b59df6996600fcc13ab6d6d53'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-scene-1200.jpg', '4a865774b5710f21b6328ec3cf4892f7512d2a43f02fb2fe8964e515b3a2e4dd'],
  ['assets/blog/cycling-guides-banner-mascot-480-dbff22b04c.avif', 'dbff22b04ca1c175de8784db262758ccb708c114f77a6ddb389100fbc9a695df'],
  ['assets/blog/gravel-bikes-around-5000-yuan-mascot-480-3427aa665e.avif', '3427aa665e5c2817ac54680a9326f0ef24200c3de5ec24ab6d2aa961d73cc700'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-mascot-480-a2ea11d518.avif', 'a2ea11d5181e5ce646cc15ea729b39b6b16aa1c6cd09f706e45f865dbcc1edbd'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-mascot-480-c9699ca11c.avif', 'c9699ca11cdf86342eb1f005b4dd4414a0c015fed9233fbc8a4c0a41781ab162'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-mascot-480-ab2c6205b2.avif', 'ab2c6205b28e04038000ed2529477c28c9246064eb88658d783e0705ee09e85b'],
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
        const validSourcedPath = /^assets\/images\/sourced\/(?:xhs|taobao|xianyu|official|retailer)\/[a-z0-9][a-z0-9-]*\/[a-f0-9]{16}-(?:card|detail)-w\d+\.avif$/.test(relative);
        if (!isExactProjectAsset && !(extension === '.avif' && validSourcedPath && referencedSourcedMedia.has(relative))) {
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
