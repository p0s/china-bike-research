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

export function publicActionManifest(products, candidates) {
  const models = [...products.map((item) => ({ id: item.variant.id, brand: item.brand, sources: item.sources })),
    ...candidates.map((item) => ({ id: item.candidate.id, brand: item.brand, sources: item.sources }))];
  return Object.fromEntries(models.map((item) => [`/models/${item.id}/`, {
    model_id: item.id,
    ...(item.brand?.id ? { brand_id: item.brand.id } : {}),
    sources: Object.fromEntries(item.sources.flatMap((source) => {
      const context = productLinkContext(source);
      return context ? [[source.id, context]] : [];
    }))
  }]));
}
