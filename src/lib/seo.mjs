import { url } from './html.mjs';

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function absoluteUrl(siteUrl, base, pathname = '/') {
  return `${siteUrl}${url(base, pathname)}`;
}

export function absoluteMediaUrl(siteUrl, value = '') {
  if (!value) return '';
  return value.startsWith('https://') ? value : `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

function websiteId(siteUrl, base) {
  return `${absoluteUrl(siteUrl, base, '/')}#website`;
}

function breadcrumb({ siteUrl, base, path, name }) {
  const pageUrl = absoluteUrl(siteUrl, base, path);
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bikes and framesets', item: absoluteUrl(siteUrl, base, '/') },
      { '@type': 'ListItem', position: 2, name, item: pageUrl }
    ]
  };
}

export function websiteStructuredData({ siteUrl, base, description }) {
  const home = absoluteUrl(siteUrl, base, '/');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(siteUrl, base),
    url: home,
    name: 'China Bike Research',
    description,
    inLanguage: 'en'
  };
}

export function productPageStructuredData({
  siteUrl,
  base,
  path,
  name,
  model,
  brand,
  description,
  category,
  image = '',
  properties = [],
  includeProduct = true
}) {
  const pageUrl = absoluteUrl(siteUrl, base, path);
  const breadcrumbData = breadcrumb({ siteUrl, base, path, name });
  const page = {
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    description,
    isPartOf: { '@id': websiteId(siteUrl, base) },
    breadcrumb: { '@id': breadcrumbData['@id'] },
    inLanguage: 'en'
  };
  const graph = [page, breadcrumbData];
  if (includeProduct) {
    const productId = `${pageUrl}#product`;
    page.mainEntity = { '@id': productId };
    graph.push({
      '@type': 'Product',
      '@id': productId,
      name,
      model,
      description,
      url: pageUrl,
      ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
      ...(category ? { category } : {}),
      ...(image ? { image: [absoluteMediaUrl(siteUrl, image)] } : {}),
      ...(properties.length ? {
        additionalProperty: properties.map(([propertyName, value]) => ({
          '@type': 'PropertyValue',
          name: propertyName,
          value
        }))
      } : {})
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function collectionStructuredData({ siteUrl, base, path, name, description, items }) {
  const pageUrl = absoluteUrl(siteUrl, base, path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name,
        description,
        isPartOf: { '@id': websiteId(siteUrl, base) },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name
          }))
        },
        inLanguage: 'en'
      },
      breadcrumb({ siteUrl, base, path, name })
    ]
  };
}

export function webApplicationStructuredData({ siteUrl, base, path, name, description }) {
  const pageUrl = absoluteUrl(siteUrl, base, path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${pageUrl}#application`,
        name,
        description,
        url: pageUrl,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name,
        description,
        isPartOf: { '@id': websiteId(siteUrl, base) },
        mainEntity: { '@id': `${pageUrl}#application` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
        inLanguage: 'en'
      },
      breadcrumb({ siteUrl, base, path, name })
    ]
  };
}

export function latestDate(values, fallback) {
  return [...new Set(values.flat().filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value))))]
    .sort()
    .at(-1) ?? fallback;
}

export function sitemapXml({ siteUrl, base, pages, fallbackLastmod }) {
  const entries = [...pages.entries()]
    .filter(([, info]) => info.includeInSitemap)
    .map(([route, info]) => `  <url><loc>${xml(absoluteUrl(siteUrl, base, route))}</loc><lastmod>${xml(info.lastmod ?? fallbackLastmod)}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
