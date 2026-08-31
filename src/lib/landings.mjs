export const MIN_BRAND_PRODUCTS = 2;
export const MIN_PRICE_PRODUCTS = 3;

export const PRICE_BANDS = [
  {
    id: 'under-5000',
    route: '/prices/under-5000/',
    title: 'Bikes under ¥5,000',
    linkLabel: 'Under ¥5,000',
    description: 'Publication-ready bikes whose full recorded complete-bike price or frameset-build estimate stays at or below ¥5,000.',
    includes: ({ high }) => Number.isFinite(high) && high <= 5_000
  },
  {
    id: '5000-to-10000',
    route: '/prices/5000-to-10000/',
    title: 'Bikes from ¥5,000 to ¥10,000',
    linkLabel: '¥5,000–10,000',
    description: 'Publication-ready bikes whose full recorded complete-bike price or frameset-build estimate stays between ¥5,000 and ¥10,000.',
    includes: ({ low, high }) => Number.isFinite(low) && Number.isFinite(high) && low >= 5_000 && high <= 10_000
  },
  {
    id: 'over-10000',
    route: '/prices/over-10000/',
    title: 'Bikes from ¥10,000',
    linkLabel: '¥10,000 and above',
    description: 'Publication-ready bikes whose full recorded complete-bike price or frameset-build estimate starts at ¥10,000.',
    includes: ({ low }) => Number.isFinite(low) && low >= 10_000
  }
];

function byPriceThenName(left, right) {
  return left.allInPrice.midpoint - right.allInPrice.midpoint
    || `${left.brand.name} ${left.variant.name}`.localeCompare(`${right.brand.name} ${right.variant.name}`);
}

function groupedBrands(products) {
  const groups = new Map();
  for (const product of products) {
    if (!groups.has(product.brand.id)) groups.set(product.brand.id, []);
    groups.get(product.brand.id).push(product);
  }
  return [...groups.entries()]
    .map(([id, entries]) => ({ id, brand: entries[0].brand, products: entries.sort(byPriceThenName) }))
    .filter((entry) => entry.products.length >= MIN_BRAND_PRODUCTS)
    .sort((left, right) => left.brand.name.localeCompare(right.brand.name));
}

function activePriceProduct(product) {
  return product.platform.status !== 'superseded'
    && product.platform.china_availability !== 'discontinued-superseded'
    && !product.platform.superseded_by
    && !product.latestPrice?.status?.startsWith('historical-');
}

export function buildLandingPages({ products }) {
  const exactProducts = [...products].sort(byPriceThenName);
  const brands = groupedBrands(exactProducts);
  const brandPages = brands.map(({ id, brand, products: brandProducts }) => ({
    kind: 'brand',
    id,
    route: `/brands/${id}/`,
    title: `${brand.name} bikes in China`,
    description: `${brand.name} publication-ready complete bikes and framesets documented for riders in China, with dated prices and model-level sources.`,
    brand,
    products: brandProducts,
    trail: [{ name: 'Brands', path: '/brands/' }]
  }));
  const brandsHub = {
    kind: 'brand-hub',
    route: '/brands/',
    title: 'Bike brands with comparable models',
    description: 'Brands with multiple publication-ready configurations and visible model-level evidence in the China Bikes catalog.',
    brands: brandPages,
    products: brandPages.flatMap((entry) => entry.products)
  };

  const completeProducts = exactProducts.filter((product) => product.variant.kind === 'complete-bike');
  const framesetProducts = exactProducts.filter((product) => product.variant.kind === 'frameset');
  const typePages = [
    {
      kind: 'type',
      id: 'complete-bikes',
      route: '/complete-bikes/',
      title: 'Complete bikes in China',
      description: 'Publication-ready complete-bike configurations with exact drivetrains, dated prices, and source-linked buying facts.',
      products: completeProducts
    },
    {
      kind: 'type',
      id: 'framesets',
      route: '/framesets/',
      title: 'Framesets for builds in China',
      description: 'Publication-ready framesets with dated frame-package prices, build-critical specifications, and transparent complete-build estimates.',
      products: framesetProducts
    }
  ];

  const priceCandidates = exactProducts.filter(activePriceProduct);
  const pricePages = PRICE_BANDS.map((band) => ({
    kind: 'price',
    id: band.id,
    route: band.route,
    title: band.title,
    linkLabel: band.linkLabel,
    description: band.description,
    band,
    products: priceCandidates.filter((product) => band.includes(product.allInPrice)),
    trail: [{ name: 'Price ranges', path: '/prices/' }]
  })).filter((entry) => entry.products.length >= MIN_PRICE_PRODUCTS);
  const pricesHub = {
    kind: 'price-hub',
    route: '/prices/',
    title: 'Browse bikes by recorded price',
    description: 'Strict non-overlapping price ranges built from dated publication-ready records and transparent frameset-build estimates.',
    pricePages,
    products: pricePages.flatMap((entry) => entry.products)
  };

  return {
    brandsHub,
    brandPages,
    typePages,
    pricesHub,
    pricePages,
    pages: [brandsHub, ...brandPages, ...typePages, pricesHub, ...pricePages]
  };
}
