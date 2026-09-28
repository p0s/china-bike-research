export const reviewBasisNotice = 'Source-based editorial review; no hands-on testing.';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const noteText = (value) => value.trim().replace(/[.;]+$/, '');

// An explicit editorial decision enables review markup; ordinary catalog records
// and price observations never become reviews or offers automatically.
export function editorialReviewIssues(editorial = {}) {
  if (editorial?.review === undefined) return [];
  const issues = [];
  if (editorial.review?.author !== 'China Bikes') issues.push('review author must be China Bikes');
  if (editorial.review?.basis !== 'source-research') issues.push('review basis must be source-research');
  if (!nonempty(editorial.verdict)) issues.push('review needs a visible editorial verdict');
  for (const field of ['strengths', 'caveats']) {
    if (!Array.isArray(editorial[field]) || !editorial[field].length || !editorial[field].every((item) => nonempty(item) && noteText(item))) {
      issues.push(`review needs nonempty ${field}`);
    }
  }
  const notes = [...(Array.isArray(editorial.strengths) ? editorial.strengths : []), ...(Array.isArray(editorial.caveats) ? editorial.caveats : [])]
    .filter(nonempty).map((item) => noteText(item).toLowerCase());
  if (new Set(notes).size !== notes.length) issues.push('review notes must be distinct');
  return issues;
}

export function sourceEditorialReview(editorial = {}) {
  if (editorial?.review === undefined) return null;
  const issues = editorialReviewIssues(editorial);
  if (issues.length) throw new Error(issues.join('; '));
  return {
    author: editorial.review.author,
    body: editorial.verdict.trim(),
    positives: editorial.strengths.map(noteText),
    negatives: editorial.caveats.map(noteText)
  };
}
