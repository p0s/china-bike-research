import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const repositorySourcedRoots = [
  path.join(repositoryRoot, 'assets/images/sourced/xhs'),
  path.join(repositoryRoot, 'assets/images/sourced/taobao')
];

export const DEFAULT_VARIANTS = Object.freeze([
  Object.freeze({ purpose: 'card', maxWidth: 480, minimumWidth: 360, maxBytes: 40_000 }),
  Object.freeze({ purpose: 'detail', maxWidth: 1200, minimumWidth: 800, maxBytes: 88_000 })
]);

export function isWithin(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function validateSlug(value) {
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(value ?? '')) {
    throw new Error('slug must be 3-80 lowercase kebab-case characters');
  }
  return value;
}

export function qualitySteps(start = 72, minimum = 40, step = 4) {
  if (![start, minimum, step].every(Number.isInteger) || start < minimum || minimum < 1 || step < 1) {
    throw new Error('invalid quality range');
  }
  const values = [];
  for (let quality = start; quality >= minimum; quality -= step) values.push(quality);
  if (values.at(-1) !== minimum) values.push(minimum);
  return values;
}

export function widthSteps(maximum, minimum, sourceWidth, step = 160) {
  const first = Math.min(maximum, sourceWidth);
  const floor = Math.min(first, minimum);
  const values = [];
  for (let width = first; width >= floor; width -= step) values.push(width);
  if (values.at(-1) !== floor) values.push(floor);
  return [...new Set(values)];
}

export function immutableFileName({ purpose, width, sha256 }) {
  if (!['card', 'detail'].includes(purpose)) throw new Error(`unsupported variant purpose: ${purpose}`);
  if (!Number.isInteger(width) || width < 1) throw new Error('variant width must be a positive integer');
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('variant sha256 must be lowercase hexadecimal');
  return `${sha256.slice(0, 16)}-${purpose}-w${width}.webp`;
}

export function parseArguments(argv) {
  if (argv.includes('--help')) return { help: true };
  const supported = new Set(['--input', '--output', '--slug']);
  const values = {};
  let repositoryLocal = false;
  for (let index = 0; index < argv.length;) {
    const flag = argv[index];
    if (flag === '--repository-local') {
      repositoryLocal = true;
      index += 1;
      continue;
    }
    const value = argv[index + 1];
    if (!supported.has(flag) || !value || value.startsWith('--')) {
      throw new Error(`invalid argument near ${flag ?? '(end)'}`);
    }
    values[flag.slice(2)] = value;
    index += 2;
  }
  for (const name of ['input', 'output', 'slug']) {
    if (!values[name]) throw new Error(`missing --${name}`);
  }
  return { input: values.input, output: values.output, slug: validateSlug(values.slug), repositoryLocal };
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`${command} exited ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function requireTool(command, versionArguments) {
  const result = run(command, versionArguments, { allowFailure: true });
  if (result.status !== 0) throw new Error(`${command} is required but unavailable`);
}

function dimensions(file) {
  const result = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file
  ]);
  const stream = JSON.parse(result.stdout).streams?.[0];
  if (!Number.isInteger(stream?.width) || !Number.isInteger(stream?.height)) {
    throw new Error(`could not read image dimensions: ${file}`);
  }
  return { width: stream.width, height: stream.height };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function verifyNoEmbeddedMetadata(file) {
  const info = run('webpmux', ['-info', file]).stdout;
  if (/Features present:[\s\S]*(?:EXIF metadata|XMP metadata|ICC profile)/i.test(info)) {
    throw new Error(`embedded metadata remains in ${path.basename(file)}`);
  }
}

function encodeVariant({ input, temporaryDirectory, specification, sourceWidth }) {
  for (const width of widthSteps(specification.maxWidth, specification.minimumWidth, sourceWidth)) {
    for (const quality of qualitySteps()) {
      const temporaryFile = path.join(temporaryDirectory, `.${specification.purpose}-w${width}-q${quality}.webp`);
      run('cwebp', [
        '-quiet', '-mt', '-m', '6', '-sharp_yuv', '-metadata', 'none',
        '-q', String(quality), '-resize', String(width), '0', input, '-o', temporaryFile
      ]);
      const bytes = fs.statSync(temporaryFile).size;
      if (bytes <= specification.maxBytes) {
        verifyNoEmbeddedMetadata(temporaryFile);
        const measured = dimensions(temporaryFile);
        const digest = sha256(temporaryFile);
        const file = immutableFileName({ purpose: specification.purpose, width: measured.width, sha256: digest });
        fs.renameSync(temporaryFile, path.join(temporaryDirectory, file));
        return {
          purpose: specification.purpose,
          file,
          width: measured.width,
          height: measured.height,
          bytes,
          sha256: digest,
          format: 'image/webp',
          quality
        };
      }
      fs.unlinkSync(temporaryFile);
    }
  }
  throw new Error(`${specification.purpose} variant could not meet ${specification.maxBytes} bytes without dropping below ${specification.minimumWidth}px or quality 40`);
}

export function optimizeImage({ input, output, slug, repositoryLocal = false, variants = DEFAULT_VARIANTS, now = new Date() }) {
  const inputPath = path.resolve(input);
  const outputRoot = path.resolve(output);
  validateSlug(slug);
  if (isWithin(inputPath, repositoryRoot)) throw new Error('source media must stay outside the public repository');
  const outputIsRepositoryLocal = isWithin(outputRoot, repositoryRoot);
  const allowedRepositoryOutput = repositorySourcedRoots.some((allowed) => path.resolve(outputRoot) === allowed);
  if (outputIsRepositoryLocal && (!repositoryLocal || !allowedRepositoryOutput)) {
    throw new Error('repository-local output requires --repository-local and an approved sourced-image root');
  }
  if (!outputIsRepositoryLocal && repositoryLocal) throw new Error('--repository-local requires an approved repository output root');
  if (!fs.statSync(inputPath, { throwIfNoEntry: false })?.isFile()) throw new Error(`input is not a file: ${inputPath}`);
  requireTool('cwebp', ['-version']);
  requireTool('ffprobe', ['-version']);
  requireTool('webpmux', ['-version']);

  fs.mkdirSync(outputRoot, { recursive: true });
  const finalDirectory = path.join(outputRoot, slug);
  if (fs.existsSync(finalDirectory)) throw new Error(`refusing to overwrite existing output: ${finalDirectory}`);
  const temporaryDirectory = fs.mkdtempSync(path.join(outputRoot, `.optimize-${slug}-`));
  if (!isWithin(temporaryDirectory, outputRoot)) throw new Error('unsafe optimizer temporary path');

  try {
    const sourceDimensions = dimensions(inputPath);
    const source = {
      bytes: fs.statSync(inputPath).size,
      width: sourceDimensions.width,
      height: sourceDimensions.height,
      sha256: sha256(inputPath)
    };
    const optimized = variants.map((specification) => encodeVariant({
      input: inputPath,
      temporaryDirectory,
      specification,
      sourceWidth: source.width
    }));
    const manifest = {
      schema_version: 1,
      slug,
      generated_at: now.toISOString(),
      source,
      variants: optimized
    };
    if (!repositoryLocal) fs.writeFileSync(path.join(temporaryDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporaryDirectory, finalDirectory);
    return { directory: finalDirectory, manifest };
  } catch (error) {
    if (isWithin(temporaryDirectory, outputRoot) && fs.existsSync(temporaryDirectory)) {
      fs.rmSync(temporaryDirectory, { recursive: true });
    }
    throw error;
  }
}

function usage() {
  return `Usage: npm run media:optimize -- --input /absolute/source --output /absolute/staging/media/xhs --slug model-slug [--repository-local]

The source must be outside the repository. Repository-local output additionally requires
--repository-local and must target assets/images/sourced/xhs or assets/images/sourced/taobao.
The command creates immutable, metadata-free WebP card and detail variants plus a manifest.`;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = optimizeImage(options);
    console.log(JSON.stringify(result.manifest, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
