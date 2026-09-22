import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const textExtensions = new Set(['.md','.json','.mjs','.js','.css','.svg','.yml','.yaml','.cff','.txt','.html','.xml','.example']);
const thirdPartyBinaryExtensions = new Set(['.avif','.gif','.heic','.jpeg','.jpg','.mov','.mp4','.png','.webp']);
const ignoredDirectories = new Set(['.git','.research','node_modules','dist','.cache']);
const ignoredFiles = new Set(['scripts/check-privacy.mjs']);
const projectOwnedBinaries = new Map([
  ['assets/blog/cycling-guides-banner-640.webp', 'a838a080060871f79a3c398655606fdac66881f5bf8485510807e9bedc3a9c70'],
  ['assets/blog/cycling-guides-banner-1600.webp', 'fc8847cd5b41abff29c2adcc9077446c596d8271cd270e78513e5213079304b1'],
  ['assets/blog/cycling-guides-banner-1200.jpg', '847b37f011164b2a43bf81ee0f93a01ba422bbd894b7c518cf98e1ffbd155d87'],
  ['assets/blog/gravel-bikes-around-5000-yuan-640.webp', 'ca914bd271dee0c99e3e16a0fc5aa5f7cb8d58cf2217ab4f78528ea3f2d6e8ac'],
  ['assets/blog/gravel-bikes-around-5000-yuan-1600.webp', '0b785f03a9538e89ddbd08c8b551c7c4eda89bac5d4331a6fdbd72efcb944e67'],
  ['assets/blog/gravel-bikes-around-5000-yuan-1200.jpg', '5cf2b281f7b86a0faeb6a0485b52492a592d303d07432a2a8f6b53074f82f314'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-640.webp', 'da3b69710d8e681b427c7d923b44b3a2c389a52f7734700ff95aa3ebaffcccbf'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-1600.webp', '41f613bf72801d389f6051638dc73522d049c38825c1460236e236a03d21dc2b'],
  ['assets/blog/38mm-tires-on-aero-road-bikes-1200.jpg', 'bbe8af0717db0f5805be378cb21d62bf92a917bc7da49c297933c1f45698fefa'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-640.webp', '7590b35d848b7a2b553a656bc174ca3fa5293cb3ce29d3853cb0a54827810ec0'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-1600.webp', 'bfe93a934bc379af463c096a6b83454feac5eaa10e73227f5c76911314713d5d'],
  ['assets/blog/frameset-vs-complete-bike-cost-in-china-1200.jpg', 'f0e29a9cc4f4d7a60628818ee62413ddec474194819b422a01a163250474e2ae'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-640.webp', 'b45ed33483a8770374f5a23cf9f1e2596f36d3a9668de39d648117726e97e5c8'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-1600.webp', 'cec14417ab9f4904b7e3f11cbe0590cafbf6d8a658a690df3b22300c932174c4'],
  ['assets/blog/chinese-bike-prices-for-international-buyers-1200.jpg', 'bb372f132abb4d72b5db821f0407937579f4da13eae0af676266f132973df3c6'],
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
