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
