process.env.PUBLIC_BASE_PATH = '';
process.env.PUBLIC_SITE_URL = 'https://chinesebikes.xyz';
process.env.PUBLIC_REPOSITORY_URL = 'https://github.com/p0s/china-bike-research';
await import('./build.mjs');
