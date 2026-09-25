import crypto from 'node:crypto';

// Fingerprint the previously published value so it can be rejected even when
// someone pastes it without a key. Do not put the value itself in public code.
const retiredAccountFingerprint = 'cf3e69b7acb34249ad9ba6dec9f4d9c825b2ba55a7d38b2d7e92eac1b01e5198';
const accountAssignment = /\b(?:CLOUDFLARE_ACCOUNT_ID|account[_-]?id|accountId|Cloudflare account ID)\b["']?\s*[:=]\s*["']?([a-f0-9]{32})\b/gi;
const hex32 = /\b[a-f0-9]{32}\b/gi;

export function findCloudflareAccountIds(text) {
  const positions = new Set();
  accountAssignment.lastIndex = 0;
  for (const match of text.matchAll(accountAssignment)) {
    positions.add(match.index + match[0].lastIndexOf(match[1]));
  }
  hex32.lastIndex = 0;
  for (const match of text.matchAll(hex32)) {
    const fingerprint = crypto.createHash('sha256').update(match[0].toLowerCase()).digest('hex');
    if (fingerprint === retiredAccountFingerprint) positions.add(match.index);
  }
  return [...positions].sort((a, b) => a - b);
}
