import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CATALOG_ROUTES, DISCOVERY_SCHEMA, SKILLS_DIRECTORY, agentCatalog, agentDiscoveryHeaders, loadAgentSkills, parseSkill, skillLinkErrors, skillsIndex } from '../src/lib/agent-skills.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const siteUrl = 'https://chinesebikes.xyz';
const { skills, errors } = loadAgentSkills(root);
const digest = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const skill = (frontMatter, body = '\n# Skill\n\nDo the task.\n') => `---\n${frontMatter}\n---\n${body}`;

test('published skills follow the Agent Skills format and have a discovery listing', () => {
  assert.deepEqual(errors, []);
  assert.deepEqual(skills.map(({ name }) => name), ['compare-chinese-bikes']);
  for (const { name, description, body, bytes, displayName, representativeQueries } of skills) {
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(name.length <= 64 && description.length <= 1024, name);
    assert.ok(fs.existsSync(path.join(root, SKILLS_DIRECTORY, name, 'SKILL.md')), name);
    assert.ok(body.split('\n').length < 500, `${name} stays under 500 lines`);
    // The format recommends under 5,000 tokens of instructions; about four bytes per token.
    assert.ok(bytes.length < 20_000, `${name} stays a short activation load`);
    assert.ok(displayName && representativeQueries.length >= 2 && representativeQueries.length <= 5, name);
  }
});

test('the discovery index names each skill by the digest of its served bytes', () => {
  for (const base of ['', '/china-bike-research']) {
    const index = skillsIndex(skills, { base });
    assert.deepEqual(Object.keys(index), ['$schema', 'skills']);
    assert.equal(index.$schema, DISCOVERY_SCHEMA);
    assert.deepEqual(index.skills, skills.map(({ name, description, bytes }) => ({
      name, type: 'skill-md', description, url: `${base}/.well-known/agent-skills/${name}/SKILL.md`, digest: digest(bytes)
    })));
    for (const entry of index.skills) assert.match(entry.digest, /^sha256:[0-9a-f]{64}$/);
  }
});

test('the AI Catalog and ARD manifest lists only the real skills with the required terms', () => {
  assert.deepEqual(CATALOG_ROUTES, ['/.well-known/ard.json', '/.well-known/ai-catalog.json']);
  const catalog = agentCatalog(skills, { siteUrl });
  assert.equal(catalog.specVersion, '1.0');
  assert.deepEqual(catalog.host, { displayName: 'Chinese Bikes', identifier: 'chinesebikes.xyz', documentationUrl: `${siteUrl}/llms.txt` });
  assert.equal(catalog.entries.length, skills.length);
  catalog.entries.forEach((entry, index) => {
    const { name, bytes } = skills[index];
    assert.match(entry.identifier, /^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/);
    assert.equal(entry.identifier, `urn:air:chinesebikes.xyz:skill:${name}`);
    assert.equal(entry.type, 'application/agent-skills+md');
    assert.equal(entry.url, `${siteUrl}/.well-known/agent-skills/${name}/SKILL.md`);
    assert.equal(Object.hasOwn(entry, 'data'), false, 'exactly one of url or data');
    assert.equal(entry.digest, digest(bytes));
    assert.ok(entry.displayName && entry.description);
    assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
    assert.deepEqual(entry.publisher, { identifier: 'chinesebikes.xyz', displayName: 'Chinese Bikes', identityType: 'dns' });
  });
  assert.equal(agentCatalog(skills, { siteUrl: 'https://example.invalid', base: '/china-bike-research' }).entries[0].url,
    'https://example.invalid/china-bike-research/.well-known/agent-skills/compare-chinese-bikes/SKILL.md');
});

test('discovery files are readable from any origin and only real skill paths name the Markdown charset', () => {
  const headers = agentDiscoveryHeaders(skills);
  for (const route of ['/.well-known/agent-skills/*', ...CATALOG_ROUTES]) {
    assert.ok(headers.includes(`\n${route}\n  Access-Control-Allow-Origin: *\n  X-Content-Type-Options: nosniff\n`), route);
  }
  assert.ok(headers.includes('\n/.well-known/agent-skills/compare-chinese-bikes/SKILL.md\n  Content-Type: text/markdown; charset=utf-8\n'));
  assert.equal(headers.match(/Content-Type:/g).length, skills.length, 'a missing skill keeps the 404 page type');
  assert.match(agentDiscoveryHeaders(skills, { base: '/china-bike-research' }), /^\/china-bike-research\/\.well-known\/ard\.json$/m);
});

test('the front matter reader accepts only the supported subset', () => {
  const valid = parseSkill(skill('name: "demo-skill"\ndescription: "Do a demo."\nmetadata:\n  updated: "2026-11-03"'), 'demo-skill');
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.metadata, { updated: '2026-11-03' });
  const cases = [
    ['# no front matter\n', /must start with YAML front matter/],
    [skill('name: "Demo"\ndescription: "Do a demo."'), /lowercase letters/],
    [skill('name: "demo--skill"\ndescription: "Do a demo."'), /lowercase letters/],
    [skill('name: "other"\ndescription: "Do a demo."'), /match its directory/],
    [skill(`name: "demo-skill"\ndescription: "${'x'.repeat(1025)}"`), /1-1024 characters/],
    [skill('name: "demo-skill"\ndescription: Do a demo: plain scalar'), /unsupported front matter line/],
    [skill('name: "demo-skill"\nname: "demo-skill"\ndescription: "Do a demo."'), /unsupported front matter line/],
    [skill('name: "demo-skill"\ndescription: "Do a demo."', '\n'), /needs instructions/]
  ];
  for (const [text, message] of cases) assert.match(parseSkill(text, 'demo-skill').errors.join('\n'), message, text.slice(0, 60));
});

test('every site URL a skill names must be published', () => {
  const fixture = [{ name: 'demo', bytes: Buffer.from('Read https://chinesebikes.xyz/index.md. Then https://chinesebikes.xyz/models/x/ and (https://chinesebikes.xyz/).') }];
  assert.deepEqual(skillLinkErrors(fixture, (pathname) => pathname !== '/models/x/'), ['demo: https://chinesebikes.xyz/models/x/ is not a published page or file']);
  assert.deepEqual(skillLinkErrors(fixture, () => true), []);
});

test('skills describe only public resources and keep the evidence rules', () => {
  for (const { name, bytes } of skills) {
    const text = bytes.toString('utf8');
    for (const [href] of text.matchAll(/https?:\/\/[^\s"'`<>()|]+/g)) {
      assert.match(href, /^https:\/\/(?:chinesebikes\.xyz\/|creativecommons\.org\/licenses\/by\/4\.0\/|github\.com\/p0s\/china-bike-research\/issues$)/, `${name}: ${href}`);
    }
    assert.doesNotMatch(text, /\/Users\/|~\/|file:|account[_ -]?id|[0-9a-f]{32}|@[\w.-]+\.[a-z]{2,}/i, name);
    for (const rule of ['unknown', 'not live offers', 'Partial profiles', 'Delivered', 'no universal score', 'CC BY 4.0', 'robots.txt', 'keep their own rights']) {
      assert.ok(text.includes(rule), `${name} keeps: ${rule}`);
    }
  }
});
