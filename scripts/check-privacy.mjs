import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const textExtensions = new Set(['.md','.json','.mjs','.js','.css','.svg','.yml','.yaml','.cff','.txt','.html','.xml','.example']);
const thirdPartyBinaryExtensions = new Set(['.avif','.gif','.heic','.jpeg','.jpg','.mov','.mp4','.png','.webp']);
const ignoredDirectories = new Set(['.git','.research','node_modules','dist','.cache']);
const ignoredFiles = new Set(['scripts/check-privacy.mjs']);
const projectOwnedBinaries = new Map([
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
        const validSourcedPath = /^assets\/images\/sourced\/(?:xhs|taobao|xianyu)\/[a-z0-9][a-z0-9-]*\/[a-f0-9]{16}-(?:card|detail)-w\d+\.webp$/.test(relative);
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

walk(root);
if (findings.length) {
  console.error(`Privacy scan found ${findings.length} possible issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Privacy scan passed: no common personal-data, local-path, credential, private-network, order-ID, chat-export, or unvalidated media-binary patterns found.');
