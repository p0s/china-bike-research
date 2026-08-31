export function moveSelectionId(values, id, offset) {
  const next = Array.isArray(values) ? [...values] : [];
  const from = next.indexOf(id);
  const to = from + Number(offset);
  if (from < 0 || !Number.isInteger(to) || to < 0 || to >= next.length) return next;
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
