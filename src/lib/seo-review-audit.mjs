import { reviewBasisNotice } from './editorial-review.mjs';
import { translate } from '../../assets/i18n.js';

function text(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ').replaceAll('&quot;', '"').replaceAll('&#039;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ').trim();
}

export function auditProductReview(product, html, { pageUrl, locale = 'en', noindex = false } = {}) {
  const errors = [];
  const review = product.review;
  const story = html.match(/<section class="model-story"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
  const reading = html.match(/<section class="model-reading"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
  const visible = text(`${story} ${reading}`);
  if (noindex || !/\/models\/[^/]+\/$/.test(pageUrl ?? '') || !story.includes('id="editorial-review"')) errors.push('Product requires an indexable editorial model page');
  if (product.offers || product.aggregateRating || review?.reviewRating) errors.push('Source-based reviews must not invent offers or ratings');
  if (review?.['@type'] !== 'Review' || review.url !== `${pageUrl}#editorial-review` || review['@id'] !== review.url) errors.push('Product needs its linked editorial Review');
  if (!story.includes('data-review-basis="source-research"') || !visible.includes(translate(reviewBasisNotice, locale))) errors.push('Review research basis must be visible');
  const author = review?.author;
  let authorPath = '';
  try { authorPath = new URL(author?.url).pathname; } catch { /* Report malformed URLs with other attribution errors. */ }
  if (author?.['@type'] !== 'Organization' || author.name !== 'China Bikes' || !author.url?.endsWith('/methodology/') || !authorPath || !story.includes(`href="${authorPath}"`) || !visible.includes(author?.name ?? '\0')) errors.push('Review needs its visible editorial author and methodology link');
  if (typeof review?.name !== 'string' || !review.name.trim() || !visible.includes(review.name.trim())) errors.push('Review name must match its visible heading');
  if (typeof review?.reviewBody !== 'string' || !review.reviewBody.trim() || !visible.includes(review.reviewBody.trim())) errors.push('Review body must match its visible verdict');
  if (review?.inLanguage !== locale) errors.push('Review language must match the page');
  const allNotes = [];
  for (const field of ['positiveNotes', 'negativeNotes']) {
    const list = review?.[field];
    const notes = list?.itemListElement;
    if (list?.['@type'] !== 'ItemList' || !Array.isArray(notes) || !notes.length) {
      errors.push(`Review needs ${field}`);
      continue;
    }
    for (const [index, note] of notes.entries()) {
      if (note['@type'] !== 'ListItem' || note.position !== index + 1 || typeof note.name !== 'string' || !note.name.trim() || !text(reading).includes(note.name.trim())) errors.push(`${field} must match visible ordered review notes`);
      allNotes.push(note.name);
    }
  }
  if (new Set(allNotes).size !== allNotes.length) errors.push('Review notes must be distinct');
  return errors;
}
