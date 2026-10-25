/** Check the ISO-BMFF file-type box, not just an AVIF extension or manifest claim. */
export function isAvif(bytes) {
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
  const size = bytes.readUInt32BE(0);
  if (size < 16 || size > bytes.length || size % 4 !== 0) return false;
  const brands = [bytes.toString('ascii', 8, 12)];
  for (let offset = 16; offset < size; offset += 4) brands.push(bytes.toString('ascii', offset, offset + 4));
  return brands.includes('avif');
}
