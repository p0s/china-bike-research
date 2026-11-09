// Agent Skills for the public site: the SKILL.md format (https://agentskills.io/specification)
// published through the Agent Skills Discovery RFC v0.2.0 index
// (https://github.com/cloudflare/agent-skills-discovery-rfc) and listed in one AI Catalog /
// ARD manifest. Each skill is reviewed text under content/agent-skills/; the build publishes its
// exact bytes, so every digest describes the file agents download. No service is implied.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const SKILLS_DIRECTORY = 'content/agent-skills';
export const SKILLS_ROUTE = '/.well-known/agent-skills/';
export const DISCOVERY_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
// ARD v0.91 publishes /.well-known/ard.json; the AI Catalog, which MCP server cards also
// use for domain discovery, names /.well-known/ai-catalog.json. Both serve the same document.
export const CATALOG_ROUTES = ['/.well-known/ard.json', '/.well-known/ai-catalog.json'];
export const SKILL_MEDIA_TYPE = 'application/agent-skills+md';
const SITE_NAME = 'Chinese Bikes';
// Skills describe the production site, so their links name its canonical origin.
const SITE_LINK = /https:\/\/chinesebikes\.xyz(?:\/[^\s"'`<>()|]*)?/g;
const NAME = /^(?=.{1,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD = /^([a-z][a-z-]*): ("(?:[^"\\]|\\.)*")$/;
const METADATA_FIELD = /^ {2}([a-z][a-z0-9_-]*): ("(?:[^"\\]|\\.)*")$/;
const FIELDS = new Set(['name', 'description', 'license', 'compatibility']);
const MAX_BODY_LINES = 500;

const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

// A strict reader for the YAML subset the skills use: double-quoted scalars plus one metadata
// map of double-quoted strings. Anything else is an error rather than a guess.
export function parseSkill(text, directoryName) {
  const errors = [];
  const fail = (message) => ({ errors: [`${directoryName}: ${message}`] });
  if (!text.startsWith('---\n')) return fail('SKILL.md must start with YAML front matter');
  const end = text.indexOf('\n---\n', 3);
  if (end < 0) return fail('SKILL.md front matter is not closed');
  const fields = {};
  let metadata = null;
  let inMetadata = false;
  for (const line of text.slice(4, end).split('\n')) {
    let match;
    if (inMetadata && (match = METADATA_FIELD.exec(line))) {
      if (Object.hasOwn(metadata, match[1])) errors.push(`${directoryName}: duplicate metadata key ${match[1]}`);
      metadata[match[1]] = JSON.parse(match[2]);
      continue;
    }
    inMetadata = false;
    if (line === 'metadata:' && metadata === null) {
      metadata = {};
      inMetadata = true;
    } else if ((match = FIELD.exec(line)) && FIELDS.has(match[1]) && !Object.hasOwn(fields, match[1])) {
      fields[match[1]] = JSON.parse(match[2]);
    } else {
      errors.push(`${directoryName}: unsupported front matter line ${JSON.stringify(line)}`);
    }
  }
  const { name = '', description = '', compatibility } = fields;
  if (!NAME.test(name)) errors.push(`${directoryName}: name must be 1-64 lowercase letters, digits and single hyphens`);
  if (name !== directoryName) errors.push(`${directoryName}: name must match its directory`);
  if (!description.trim() || description.length > 1024) errors.push(`${directoryName}: description must have 1-1024 characters`);
  if (compatibility !== undefined && (!compatibility.trim() || compatibility.length > 500)) errors.push(`${directoryName}: compatibility must have 1-500 characters`);
  const body = text.slice(end + 5);
  if (!body.trim()) errors.push(`${directoryName}: SKILL.md needs instructions after its front matter`);
  if (body.split('\n').length > MAX_BODY_LINES) errors.push(`${directoryName}: keep SKILL.md under ${MAX_BODY_LINES} lines`);
  return { name, description, metadata: metadata ?? {}, body, errors };
}

// Reads every skill with its discovery listing (display name, tags, sample queries).
// A skill is one SKILL.md file, published as type "skill-md"; supporting files would need an archive.
export function loadAgentSkills(root) {
  const directory = path.join(root, SKILLS_DIRECTORY);
  if (!fs.existsSync(directory)) return { skills: [], errors: [] };
  const listings = JSON.parse(fs.readFileSync(path.join(directory, 'discovery.json'), 'utf8')).skills ?? {};
  const skills = [];
  const errors = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const directoryName of entries) {
    const files = fs.readdirSync(path.join(directory, directoryName));
    if (files.length !== 1 || files[0] !== 'SKILL.md') errors.push(`${directoryName}: a skill directory holds only SKILL.md`);
    if (!files.includes('SKILL.md')) continue;
    const bytes = fs.readFileSync(path.join(directory, directoryName, 'SKILL.md'));
    const skill = parseSkill(bytes.toString('utf8'), directoryName);
    errors.push(...skill.errors);
    const listing = listings[directoryName];
    const queries = listing?.representative_queries;
    if (!listing?.display_name?.trim()) errors.push(`${directoryName}: discovery.json needs a display_name`);
    if (!Array.isArray(queries) || queries.length < 2 || queries.length > 5 || !queries.every((query) => typeof query === 'string' && query.trim())) {
      errors.push(`${directoryName}: discovery.json needs 2-5 representative_queries`);
    }
    if (!Array.isArray(listing?.tags) || !listing.tags.every((tag) => typeof tag === 'string' && tag.trim())) errors.push(`${directoryName}: discovery.json tags must be strings`);
    skills.push({
      name: skill.name, description: skill.description, body: skill.body ?? '', bytes, digest: sha256(bytes),
      displayName: listing?.display_name ?? '', tags: listing?.tags ?? [], representativeQueries: queries ?? []
    });
  }
  for (const name of Object.keys(listings)) if (!entries.includes(name)) errors.push(`${name}: discovery.json lists a skill without a directory`);
  return { skills, errors };
}

export function skillsIndex(skills, { base = '' } = {}) {
  return {
    $schema: DISCOVERY_SCHEMA,
    skills: skills.map(({ name, description, digest }) => ({ name, type: 'skill-md', description, url: `${base}${SKILLS_ROUTE}${name}/SKILL.md`, digest }))
  };
}

// AI Catalog document (specVersion 1.0, host for a discoverable catalog) whose entries also carry
// the terms an ARD entry requires. It lists only the published skills.
export function agentCatalog(skills, { siteUrl, base = '' }) {
  const host = new URL(siteUrl).hostname;
  return {
    specVersion: '1.0',
    host: { displayName: SITE_NAME, identifier: host, documentationUrl: `${siteUrl}${base}/llms.txt` },
    entries: skills.map(({ name, displayName, description, digest, tags, representativeQueries }) => ({
      identifier: `urn:air:${host}:skill:${name}`,
      displayName,
      type: SKILL_MEDIA_TYPE,
      url: `${siteUrl}${base}${SKILLS_ROUTE}${name}/SKILL.md`,
      digest,
      description,
      tags,
      representativeQueries,
      publisher: { identifier: host, displayName: SITE_NAME, identityType: 'dns' }
    }))
  };
}

// Static asset headers (Cloudflare `_headers`): the discovery files are public and read-only,
// so any origin may read them. Only exact skill paths name the Markdown charset, so the 404
// page under a wildcard keeps its own HTML type.
export function agentDiscoveryHeaders(skills, { base = '' } = {}) {
  const open = ['  Access-Control-Allow-Origin: *', '  X-Content-Type-Options: nosniff'];
  return [
    '# Public, read-only agent discovery files; see SPEC.md.',
    `${base}${SKILLS_ROUTE}*`, ...open,
    ...skills.flatMap(({ name }) => [`${base}${SKILLS_ROUTE}${name}/SKILL.md`, '  Content-Type: text/markdown; charset=utf-8']),
    ...CATALOG_ROUTES.flatMap((route) => [`${base}${route}`, ...open]),
    ''
  ].join('\n');
}

// Every site URL a skill names must exist in the build, so a renamed page fails the build
// instead of leaving agents a broken instruction.
export function skillLinkErrors(skills, exists) {
  const errors = [];
  for (const skill of skills) {
    for (const [match] of skill.bytes.toString('utf8').matchAll(SITE_LINK)) {
      const url = match.replace(/[.,;:]+$/, '');
      if (!exists(new URL(url).pathname)) errors.push(`${skill.name}: ${url} is not a published page or file`);
    }
  }
  return errors;
}
