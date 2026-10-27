// Normalize only buyer-facing material search terms; preserve source data and IDs.
export function normalizeMaterialSearch(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/碳纤维|碳纖維|kohlefaser|kohlenstofffaser/gu, 'carbon');
}

// This is a search key only. Display names, recorded facts and URLs stay intact.
export function normalizeCatalogSearch(value) {
  return String(value ?? '').normalize('NFKD').toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/×/gu, 'x')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function createCatalogSearchIndex(value) {
  const text = String(value ?? '').normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '');
  // Keep both parts and joined punctuation: X-LAB, Velo-Build and similar names
  // work without a brand-specific alias list.
  const parts = [...new Set([
    ...text.split(/[^\p{L}\p{N}]+/u),
    ...text.split(/\s+/u).map(normalizeCatalogSearch),
    // Recorded component names can touch numbers or Chinese text: Shimano105.
    ...(text.match(/[a-z]+/g) ?? []).filter((part) => part.length >= 4),
  ].filter(Boolean))];
  const tokens = parts.filter((token) => /^[a-z]{3,64}$/.test(token));
  const words = text.split(/\s+/u).map(normalizeCatalogSearch).filter(Boolean);
  const joined = new Set();
  for (let i = 0; i < words.length; i += 1) {
    for (const count of [2, 3]) {
      const phrase = words.slice(i, i + count).join('');
      if (phrase.length <= 64) joined.add(phrase);
    }
  }
  return { parts, tokens, joined };
}

export function compileCatalogQuery(query) {
  const terms = String(query ?? '').split(/\s+/u).map(normalizeCatalogSearch).filter(Boolean);
  // "Gen 2", "RS 9" and "AD 7" name one model code, so a lone digit cannot
  // match a different generation or model number elsewhere in the row.
  return terms.reduce((compiled, term) => {
    const previous = compiled.at(-1);
    if (/^\d+$/.test(term) && /^[a-z]{1,3}$/.test(previous ?? '')) compiled[compiled.length - 1] = `${previous}${term}`;
    else compiled.push(term);
    return compiled;
  }, []);
}

// Bounded optimal-string-alignment distance: insertions, deletions,
// substitutions and adjacent transpositions. Only short alphabetic tokens enter.
function editDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  let beforePrevious;
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
    }
    if (Math.min(...current) > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length];
}

// Zero means every term matched directly; a positive score means a close match.
// Infinity means at least one requested term was absent. Numeric model codes,
// short abbreviations and Chinese text remain exact; no bike facts are corrected.
export function scoreCatalogSearch(index, terms) {
  let score = 0;
  for (const term of terms) {
    // Match within a real token, or a complete joined phrase. Flattening a row
    // would mistake "X-LAB Shimano" for an exact "xlabs" match.
    const short = /^[a-z]{1,3}$/.test(term);
    const direct = index.parts.some((token) => short ? token.startsWith(term) : token.includes(term))
      || index.joined.has(term);
    if (direct) continue;
    if (!/^[a-z]{4,64}$/.test(term)) return Infinity;
    const limit = term.length >= 8 ? 2 : 1;
    let best = limit + 1;
    for (const token of index.tokens) {
      best = Math.min(best, editDistance(term, token, limit));
      if (best === 1) break;
    }
    if (best > limit) return Infinity;
    score += best;
  }
  return score;
}

export function matchesCatalogSearch(index, query) {
  return Number.isFinite(scoreCatalogSearch(index, compileCatalogQuery(query)));
}
