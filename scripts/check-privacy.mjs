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
