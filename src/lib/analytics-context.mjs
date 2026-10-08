// Public catalog context only. The Worker resolves IDs against this build output;
// browsers never supply arbitrary event properties or destination URLs.
export function productLinkContext(source) {
  const type = String(source?.type ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!/(?:^|-)(?:manufacturer|official|brand|retailer|dealer|distributor|marketplace|seller|supplier|authorized)(?:-|$)/.test(type)
    || !/(?:^|-)(?:product-page|product-listing|marketplace-listing|seller-listing)(?:-|$)/.test(type)
    || /(?:^|-)(?:mirror|snapshot)(?:-|$)/.test(type)) return null;
  try {
    const target = new URL(source.url);
    if (!['http:', 'https:'].includes(target.protocol)
      || ['chinesebikes.xyz', 'www.chinesebikes.xyz'].includes(target.hostname.toLowerCase())) return null;
    return {
      destination_host: target.hostname.toLowerCase(),
      link_type: /(?:^|-)(?:marketplace|seller)(?:-|$)/.test(type) ? 'marketplace'
        : /(?:^|-)(?:manufacturer|official|brand)(?:-|$)/.test(type) ? 'manufacturer' : 'retailer'
    };
  } catch { return null; }
}

export function publicActionManifest(products, candidates, { offers = [], sources = [] } = {}) {
  const models = [...products.map((item) => ({ id: item.variant.id, brand: item.brand, sources: item.sources })),
    ...candidates.map((item) => ({ id: item.candidate.id, brand: item.brand, sources: item.sources }))];
  const manifest = Object.fromEntries(models.map((item) => [`/models/${item.id}/`, {
    model_id: item.id,
    ...(item.brand?.id ? { brand_id: item.brand.id } : {}),
    sources: Object.fromEntries(item.sources.flatMap((source) => {
      const context = productLinkContext(source);
      return context ? [[source.id, context]] : [];
    }))
  }]));
  if (offers.length) {
    const offerSources = new Map(sources.map(source => [source.id, source]));
    const productIds = new Set(products.map(item => item.variant.id));
    manifest.offers = Object.fromEntries(offers.flatMap(offer => {
      const model = manifest[`/models/${offer.productId}/`];
      const source = productLinkContext(offerSources.get(offer.sourceId));
      return model && productIds.has(offer.productId) && source && offer.analyticsOfferId === offer.id ? [[offer.id, {
        model_id: model.model_id, ...(model.brand_id ? { brand_id: model.brand_id } : {}), ...source
      }]] : [];
    }));
  }
  return manifest;
}
