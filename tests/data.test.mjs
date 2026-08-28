import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDataset,
  validateDataset,
  joinProducts,
  joinCatalogCandidates,
  freshness,
  maxClearance,
  clearanceLabel,
  clearanceLongLabel,
  supportsStandardFramesetBuild
} from '../src/lib/data.mjs';

const data = loadDataset();
const products = joinProducts(data);
const catalogCandidates = joinCatalogCandidates(data);

test('dataset validates without errors', () => {
  assert.deepEqual(validateDataset(data), []);
});

test('buyer-hidden images cannot mask an active replacement', () => {
  const fixture = structuredClone(data);
  const visibleCandidateImage = fixture.images.find((item) => item.candidate_id === 'pardus-uragano-sport' && item.role === 'primary' && item.buyer_visibility !== 'omit');
  fixture.images.unshift({ ...visibleCandidateImage, id: 'hidden-candidate-primary', buyer_visibility: 'omit' });
  assert.notEqual(joinCatalogCandidates(fixture).find((item) => item.candidate.id === 'pardus-uragano-sport').image.id, 'hidden-candidate-primary');

  const visibleProductImage = fixture.images.find((item) => item.platform_id === 'twitter-gravel-v3' && item.role === 'primary' && item.buyer_visibility !== 'omit');
  fixture.images.unshift({ ...visibleProductImage, id: 'hidden-product-primary', buyer_visibility: 'omit' });
  assert.notEqual(joinProducts(fixture).find((item) => item.platform.id === 'twitter-gravel-v3').image.id, 'hidden-product-primary');
});

test('XHS and Taobao sources use identity-safe canonical public URLs', () => {
  const xhs = structuredClone(data);
  xhs.sources.push({
    id: 'privacy-test-xhs-source',
    type: 'community-post',
    title: 'Exact public post',
    publisher: 'Public source',
    accessed_at: '2026-08-27',
    url: 'https://www.xiaohongshu.com/explore/68ef9e81000000000503afd8',
    reliability: { identity: 'medium', specification: 'low', price: 'low' },
    notes: 'Synthetic validation fixture.'
  });
  assert.deepEqual(validateDataset(xhs), []);
  xhs.sources.at(-1).url += '?xsec_token=private-share-context&xsec_source=pc_share';
  assert.ok(validateDataset(xhs).some((error) => error.includes('identity-safe canonical post URL')));
  xhs.sources.at(-1).url = 'https://edith.xiaohongshu.com/api/sns/web/v1/feed?xsec_token=private-share-context';
  assert.ok(validateDataset(xhs).some((error) => error.includes('identity-safe canonical post URL')));

  const taobao = structuredClone(data);
  taobao.sources.push({
    id: 'privacy-test-taobao-source',
    type: 'retailer-listing',
    title: 'Exact public listing',
    publisher: 'Public seller',
    accessed_at: '2026-08-27',
    url: 'https://item.taobao.com/item.htm?id=1234567890',
    reliability: { identity: 'high', specification: 'medium', price: 'medium' },
    notes: 'Synthetic validation fixture.'
  });
  assert.deepEqual(validateDataset(taobao), []);
  taobao.sources.at(-1).url += '&spm=private-referral-context';
  assert.ok(validateDataset(taobao).some((error) => error.includes('identity-safe canonical item URL')));
  taobao.sources.at(-1).url = 'https://s.taobao.com/search?q=bike&spm=private-referral-context';
  assert.ok(validateDataset(taobao).some((error) => error.includes('identity-safe canonical item URL')));
});

test('publication gates reject incomplete builds and category-mismatched framesets', () => {
  const incompleteBuild = structuredClone(data);
  delete incompleteBuild.variants.find((item) => item.id === 'twitter-v3-wheeltop-eds').drivetrain;
  assert.ok(validateDataset(incompleteBuild).some((error) => error.includes('complete bike needs an exact drivetrain')));

  const placeholderBuild = structuredClone(data);
  placeholderBuild.variants.find((item) => item.id === 'twitter-v3-wheeltop-eds').drivetrain.brand = 'Unknown';
  assert.ok(validateDataset(placeholderBuild).some((error) => error.includes('drivetrain brand must identify one exact build')));

  const ambiguousLayout = structuredClone(data);
  ambiguousLayout.variants.find((item) => item.id === 'twitter-v3-wheeltop-eds').drivetrain.layout = 'single-or-double';
  assert.ok(validateDataset(ambiguousLayout).some((error) => error.includes('drivetrain layout must be single or double')));

  const dropBarMtb = structuredClone(data);
  const mtbPlatform = dropBarMtb.platforms.find((item) => item.id === 'twitter-gravel-v3');
  mtbPlatform.category = 'mtb-xc';
  mtbPlatform.category_details = { suspension: {} };
  delete mtbPlatform.tire_clearance;
  assert.ok(validateDataset(dropBarMtb).some((error) => error.includes('MTB platform must use a flat handlebar')));

  const mtbFrameset = structuredClone(data);
  const framePlatform = mtbFrameset.platforms.find((item) => item.id === 'lightcarbon-lcg071s-pro');
  framePlatform.category = 'mtb-xc';
  framePlatform.handlebar = 'flat';
  framePlatform.category_details = { suspension: {} };
  delete framePlatform.tire_clearance;
  assert.ok(validateDataset(mtbFrameset).some((error) => error.includes('fixed frameset build allowance is not approved')));
});

test('public dataset has the expected coverage', () => {
  assert.equal(data.brands.length, 36);
  assert.equal(data.platforms.length, 36);
  assert.equal(data.variants.length, 38);
  assert.equal(data.prices.length, 50);
  assert.equal(data.images.length, 187);
  assert.equal(data.groupsets.length, 11);
  assert.equal(data.buildParts.length, 10);
  assert.equal(data.videos.length, 12);
  assert.ok(data.sources.length >= 304);
  assert.equal(data.candidates.length, 204);
  assert.equal(data.exclusions.length, 14);
  assert.equal(data.research.length, 1);
  assert.equal(data.researchAttempts.length, 549);
  assert.equal(products.length, data.variants.length);
});

test('build parts preserve package, weight, price and compatibility boundaries', () => {
  const defaultsBySlot = new Map();
  for (const part of data.buildParts.filter((item) => item.default)) {
    defaultsBySlot.set(part.slot, (defaultsBySlot.get(part.slot) ?? 0) + 1);
  }
  assert.ok([...defaultsBySlot.values()].every((count) => count === 1));

  const drivetrain = data.buildParts.find((item) => item.id === 'shimano-105-r7170-large-package');
  assert.equal(drivetrain.groupset_id, 'shimano-105-r7170');
  assert.deepEqual(drivetrain.covers, ['brakes', 'crankset', 'cassette', 'chain']);
  assert.equal(drivetrain.price_observation.amount_cny, 4150);
  assert.equal(drivetrain.weight.status, 'unknown');
  assert.match(drivetrain.price_observation.package_basis, /without bottom bracket or brake rotors/);

  const wheelset = data.buildParts.find((item) => item.id === 'elitewheels-marvel-g35-wheelset');
  assert.equal(wheelset.weight.grams, 1460);
  assert.deepEqual(wheelset.compatibility.freehubs, ['hg-road']);
  const pedals = data.buildParts.find((item) => item.id === 'shimano-pd-rs500-pedals');
  assert.equal(pedals.price_observation.amount_cny, 368);
  assert.equal(pedals.weight.grams, 320);
  assert.ok(data.buildParts.every((part) => part.source_ids.length > 0));
});

test('wide-clearance research records carry exact weight bases and current source reviews', () => {
  const grow = data.platforms.find((item) => item.id === 'tavelo-grow');
  assert.equal(grow.tire_clearance.published_front_max_mm, 55);
  assert.equal(grow.tire_clearance.published_rear_max_mm, 50);
  assert.equal(grow.frame.claimed_frame_weight_g, 830);
  assert.match(grow.frame.claimed_frame_weight_basis, /830–960 g ±25 g/);
  assert.equal(grow.frame.material_grade, 'Toray T800 carbon');
  assert.match(grow.frame.construction, /Directional carbon lay-up/);
  assert.match(grow.frame.stiffness_evidence, /manufacturer-authored/);

  const seka = data.platforms.find((item) => item.id === 'seka-exaero-gr');
  assert.equal(seka.frame.material_grade, 'Toray T1100G + M46J carbon fiber');
  assert.match(seka.frame.construction, /True one-piece monocoque/);
  assert.match(seka.frame.stiffness_evidence, /360 W/);

  const g3 = data.candidates.find((item) => item.id === 'missing-china-price-winspace-g3');
  assert.equal(g3.facts.complete_weight_g, 8750);
  assert.equal(g3.facts.tire_clearance_mm, 50);
  assert.equal(g3.official_price.original_amount, 4099);
  const g3Image = data.images.find((item) => item.candidate_id === g3.id);
  assert.equal(g3Image.subject_accuracy, 'exact-variant');

  const voicevelo = data.candidates.find((item) => item.id === 'voicevelo-g-major');
  assert.equal(voicevelo.observed_price.amount_cny, 12800);
  assert.equal(voicevelo.observed_price.observed_at, '2023-11-13');
  assert.match(voicevelo.facts.frame_material, /VG1 is a paint designation/);
  assert.match(voicevelo.facts.stiffness_evidence, /slightly weak lateral/);

  const rinasclta = data.candidates.find((item) => item.id === 'rinasclta-q-aero-gr');
  assert.match(rinasclta.facts.frame_material, /Toray T800 \+ T1000/);
  assert.match(rinasclta.facts.stiffness_evidence, /no exact-model deflection protocol/);

  const trek = data.candidates.find((item) => item.id === 'missing-china-price-trek-checkpoint');
  assert.equal(trek.facts.complete_weight_g, 9500);
  assert.equal(trek.facts.drivetrain, 'SRAM Apex XPLR AXS electronic 1×12, 40T crank and 11–44T cassette');

  for (const id of ['missing-china-price-winspace-g5', 'missing-china-price-seka-exaero-gr', 'missing-china-price-tavelo-grow']) {
    assert.equal(data.candidates.find((item) => item.id === id).status, 'merged-into-exact-record');
    assert.equal(catalogCandidates.some((entry) => entry.candidate.id === id), false);
  }
});

test('electronic groupset references preserve package and price boundaries', () => {
  const ltwoo = data.groupsets.find((item) => item.id === 'ltwoo-erx-er9');
  const wheeltop = data.groupsets.find((item) => item.id === 'wheeltop-eds-tx');
  const magene = data.groupsets.find((item) => item.id === 'magene-qed-pes');
  const r7170 = data.groupsets.find((item) => item.id === 'shimano-105-r7170');
  const r8170 = data.groupsets.find((item) => item.id === 'shimano-road-di2-r8170-r9270');
  const rx825 = data.groupsets.find((item) => item.id === 'shimano-grx-rx825');
  const gex = data.groupsets.find((item) => item.id === 'wheeltop-eds-gex');
  const egr = data.groupsets.find((item) => item.id === 'ltwoo-egr');
  assert.equal(ltwoo.shifting.cassette_speeds, '10-12');
  assert.equal(ltwoo.shifting.max_rear_sprocket_teeth, null);
  assert.match(ltwoo.china_price_status, /boxed alloy-labelled eR9 shift-and-brake kit at ¥3,480/);
  assert.deepEqual(ltwoo.price_observations.filter((item) => item.headline).map((item) => item.amount), [3480]);
  assert.equal(ltwoo.price_observations.filter((item) => item.price_type === 'component-option').length, 8);
  assert.equal(wheeltop.shifting.max_rear_sprocket_teeth, 36);
  assert.deepEqual(wheeltop.price_observations.filter((item) => item.headline).map((item) => item.amount), [2369, 2624, 2879, 3219]);
  const wheelTopOfficialReference = wheeltop.price_observations.find((item) => item.currency === 'EUR');
  assert.equal(wheelTopOfficialReference.amount, 659);
  assert.match(wheelTopOfficialReference.conditions, /not checked/);
  assert.deepEqual(magene.variants.map((item) => item.disc_core_weight_g), [1150, 1250]);
  assert.match(magene.package_summary, /Core rim-brake kit/);
  assert.deepEqual(r7170.price_observations.filter((item) => item.headline).map((item) => item.amount), [4150, 4200]);
  assert.equal(r7170.price_observations[0].source_id, 'smzdm-shimano-di2-market-observations-2026-08-24');
  assert.equal(r7170.compatibility.freehub, 'HG road for the supported 11T-start cassettes');
  assert.equal(r8170.shifting.max_rear_sprocket_teeth, 34);
  assert.equal(r8170.price_observations.find((item) => item.headline).amount, 6050);
  assert.equal(rx825.shifting.max_rear_sprocket_teeth, 36);
  assert.equal(gex.shifting.max_rear_sprocket_teeth, 52);
  assert.deepEqual(gex.price_observations.filter((item) => item.headline).map((item) => item.amount), [2369, 2369, 2369]);
  assert.equal(egr.shifting.max_rear_sprocket_teeth, 46);
  assert.ok(data.groupsets.every((item) => item.compatibility.brake_fluid));
  const imagedGroupsets = data.groupsets.filter((item) => item.image);
  assert.equal(imagedGroupsets.length, 10);
  assert.ok(imagedGroupsets.every((item) => item.image.remote_url.startsWith('https://')));
  assert.ok(imagedGroupsets.every((item) => item.image.rights.status === 'official-page-embed'));
  assert.ok(imagedGroupsets.every((item) => item.source_ids.includes(item.image.source_id)));
  assert.equal(r8170.image, undefined);
  assert.deepEqual(data.meta.frameset_build_assumption.presets.map((preset) => preset.amount_cny ?? null), [6000, 7900, null]);
  assert.equal(data.meta.frameset_build_assumption.presets.find((preset) => preset.default).id, 'shimano-105-r7170');
});

test('groupset images require exact official-source and rights metadata', () => {
  const invalidUrl = structuredClone(data);
  invalidUrl.groupsets.find((item) => item.id === 'shimano-105-r7170').image.remote_url = 'http://example.com/105.jpg';
  assert.ok(validateDataset(invalidUrl).some((error) => error.includes('image.remote_url must use HTTPS')));

  const invalidSource = structuredClone(data);
  invalidSource.groupsets.find((item) => item.id === 'wheeltop-eds-tx').image.source_id = 'missing-source';
  assert.ok(validateDataset(invalidSource).some((error) => error.includes('missing image source')));

  const invalidFeaturedVariant = structuredClone(data);
  delete invalidFeaturedVariant.groupsets.find((item) => item.id === 'magene-qed-pes').image.featured_variant;
  assert.ok(validateDataset(invalidFeaturedVariant).some((error) => error.includes('featured image needs featured_variant')));
});

test('Taobao groupset snapshots preserve readable option prices without implying checkout', () => {
  const ids = [
    'taobao-wheeltop-eds-tx-options-2026-08-24',
    'taobao-wheeltop-gex-options-2026-08-24',
    'taobao-ltwoo-er9-options-2026-08-24',
    'taobao-sram-gx-axs-transmission-options-2026-08-24',
    'taobao-ltwoo-erx-tt-options-2026-08-24'
  ];
  const sources = ids.map((id) => data.sources.find((source) => source.id === id));
  assert.ok(sources.every(Boolean));
  assert.ok(sources.every((source) => source.type === 'marketplace-screenshot' && source.checkout_verified === false));
  assert.ok(sources.flatMap((source) => source.observations).every((observation) => observation.option_label_zh && observation.amount_cny > 0));
  assert.deepEqual(sources.filter((source) => source.adjacent_system).map((source) => source.adjacent_system.discipline).sort(), ['MTB', 'Time trial / triathlon']);

  const invalid = structuredClone(data);
  invalid.sources.find((source) => source.id === ids[0]).checkout_verified = true;
  assert.ok(validateDataset(invalid).some((error) => error.includes('marketplace screenshot must remain checkout-unverified')));
});

test('candidate catalog keeps the focused view useful without losing discovery', () => {
  assert.equal(catalogCandidates.length, 193);
  assert.equal(catalogCandidates.filter((entry) => entry.defaultVisible).length, 167);
  assert.ok(catalogCandidates.every((entry) => !entry.candidate.existing_record_id || entry.candidate.catalog_distinct_reason));
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'missing-china-price-elves-mori-aerox'), false);
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'pardus-uragano-evo-community-lead'), false);

  const pardus = catalogCandidates.find((entry) => entry.candidate.id === 'pardus-spark-sport-pes');
  assert.equal(pardus.defaultVisible, true);
  assert.equal(pardus.priceKind, 'observed');
  assert.equal(pardus.priceMidpoint, 8597.25);

  const gt350 = catalogCandidates.find((entry) => entry.candidate.id === 'xds-gt350');
  assert.equal(gt350.image.candidate_id, 'xds-gt350');
  assert.equal(gt350.image.subject_accuracy, 'exact-platform');
  assert.equal(gt350.imageSource.id, 'xds-gt350-retailer-2026-08-08');

  const oldTwitterCarbon = catalogCandidates.find((entry) => entry.candidate.id === 'twitter-gravel-v3-2024-rs-carbon-wave');
  assert.equal(oldTwitterCarbon.candidate.status, 'superseded');
  assert.equal(oldTwitterCarbon.image.subject_accuracy, 'exact-platform');
  assert.equal(oldTwitterCarbon.image.hosting.mode, 'remote');
  assert.equal(oldTwitterCarbon.imageSource.id, 'twitter-gravel-v3-2024-public-listing-image-2026-08-21');
  assert.deepEqual(oldTwitterCarbon.galleryImages.map((image) => image.label), [
    'Alternate-color full-bike view',
    'Mechanical cockpit detail',
    'Hydraulic caliper detail'
  ]);
  assert.ok(oldTwitterCarbon.galleryImages.every((image) => image.source.id === 'twitter-gravel-v3-2024-public-listing-image-2026-08-21'));

  const exactAirwolfLead = catalogCandidates.find((entry) => entry.candidate.id === 'airwolf-yfr068');
  assert.equal(exactAirwolfLead.defaultVisible, true);
  const unclearModel = catalogCandidates.find((entry) => entry.candidate.id === 'twitter-carbon-road-gravel-unknown');
  assert.equal(unclearModel.defaultVisible, false);
  const genericBuild = catalogCandidates.find((entry) => entry.candidate.id === 'gito-carbon-aero-entry');
  assert.equal(genericBuild.defaultVisible, false);
  const unidentifiedBxt = catalogCandidates.find((entry) => entry.candidate.id === 'bxt-gravel-complete');
  assert.equal(unidentifiedBxt.defaultVisible, false);

  const basso = catalogCandidates.find((entry) => entry.candidate.id === 'basso-venta-disc');
  assert.deepEqual(basso.brand, { id: 'candidate-brand-basso', name: 'BASSO' });
  const vanRysel = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-van-rysel-rcr');
  assert.deepEqual(vanRysel.brand, { id: 'candidate-brand-van-rysel', name: 'Van Rysel' });
  const quickEr = catalogCandidates.find((entry) => entry.candidate.id === 'quick-pro-er-one');
  assert.equal(quickEr.kind, 'complete-bike');
  assert.equal(quickEr.price.amount_cny, 33900);
  assert.equal(quickEr.price.price_type, 'reference-conversion');
  assert.equal(quickEr.candidate.facts.drivetrain, 'Shimano Ultegra R8170 Di2 2×12');
  assert.equal(quickEr.candidate.facts.complete_weight_g, 7100);
  assert.equal(quickEr.image.subject_accuracy, 'exact-variant');
  assert.match(quickEr.image.hosting.remote_url, /ERONE___SHIMANO_UT_DI2/);
  const gt8 = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-x-lab-xds-gt8');
  assert.equal(gt8.price.amount_cny, 21980);
  assert.equal(gt8.candidate.facts.complete_weight_g, 8780);
  assert.equal(gt8.image.subject_accuracy, 'exact-variant');
  const trek = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-trek-madone-gen-8');
  assert.equal(trek.price.amount_cny, 21800);
  assert.equal(trek.image.subject_accuracy, 'exact-variant');
  const specialized = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-specialized-tarmac-sl8');
  assert.equal(specialized.price.amount_cny, 30990);
  assert.equal(specialized.image.subject_accuracy, 'exact-variant');
  const defy = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-giant-defy-advanced');
  assert.equal(defy.price.amount_cny, 14800);
  assert.equal(defy.candidate.facts.tire_clearance_mm, 38);
  assert.equal(defy.image.subject_accuracy, 'exact-platform');
  const reacto = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-merida-reacto');
  assert.equal(reacto.price.amount_cny, 23800);
  assert.equal(reacto.candidate.facts.drivetrain, 'Shimano 105 Di2 2×12');
  assert.equal(reacto.image.subject_accuracy, 'exact-variant');
  const scultura = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-merida-scultura');
  assert.equal(scultura.price.amount_cny, 16800);
  assert.equal(scultura.candidate.facts.complete_weight_g, 8200);
  const domane = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-trek-domane');
  assert.equal(domane.price.amount_cny, 20800);
  const hawkeye = catalogCandidates.find((entry) => entry.candidate.id === 'sava-f20-hawkeye');
  assert.equal(hawkeye.price.amount_cny, 12893);
  assert.equal(hawkeye.candidate.facts.complete_weight_g, 8700);
  assert.equal(hawkeye.image.subject_accuracy, 'exact-variant');
  const sprint = catalogCandidates.find((entry) => entry.candidate.id === 'bianchi-sprint-icr');
  assert.equal(sprint.image.subject_accuracy, 'exact-variant');
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'xlab-gt8'), false);
  const winspaceComplete = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-winspace-g3');
  assert.equal(winspaceComplete.kind, 'complete-bike');
  assert.equal(winspaceComplete.price.amount_cny, 27830);
  assert.match(winspaceComplete.candidate.catalog_distinct_reason, /frameset-only/);
  const roubaix = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-specialized-roubaix-sl8');
  assert.equal(roubaix.price.amount_cny, 15990);
  const quickTr = catalogCandidates.find((entry) => entry.candidate.id === 'quick-pro-tr-one');
  assert.equal(quickTr.price.amount_cny, 21800);
  assert.equal(quickTr.priceKind, 'observed');
  const meridaEndurance = catalogCandidates.find((entry) => entry.candidate.id === 'merida-scultura-endurance-4000-community-lead');
  assert.equal(meridaEndurance.price.price_type, 'official-mainland-list');
  const canyonGrail = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-canyon-grail');
  assert.equal(canyonGrail.price.price_type, 'official-conflict');
  assert.equal(canyonGrail.candidate.source_ids.includes('canyon-grail-cf7-promotional-crawl-2026-08-17'), true);
  const tsbPioneer = catalogCandidates.find((entry) => entry.candidate.id === 'tsb-titan-super-bond-pioneer-one');
  assert.equal(tsbPioneer.price.price_type, 'official-mainland-retail');
  assert.equal(tsbPioneer.candidate.source_ids.includes('titanium-laget-pioneer-one-official'), true);
  const quickXrFrame = catalogCandidates.find((entry) => entry.candidate.id === 'quick-pro-xr-one-frameset-aelous-gravel');
  assert.equal(quickXrFrame.kind, 'frameset');
  assert.equal(quickXrFrame.price.amount_cny, 10998);
  assert.equal(quickXrFrame.image.subject_accuracy, 'same-platform');
  const speed7Complete = catalogCandidates.find((entry) => entry.candidate.id === 'lightcarbon-speed7-complete');
  const speed7Frame = catalogCandidates.find((entry) => entry.candidate.id === 'lightcarbon-speed7-frameset');
  assert.equal(speed7Complete.price.amount_cny, 11399);
  assert.equal(speed7Frame.price.amount_cny, 5599);
  assert.notEqual(speed7Complete.kind, speed7Frame.kind);
  assert.ok(catalogCandidates.every((entry) => entry.brand?.id && entry.brand?.name));
  const brandLabels = new Map();
  for (const entry of catalogCandidates) {
    const labels = brandLabels.get(entry.brand.id) ?? new Set();
    labels.add(entry.brand.name);
    brandLabels.set(entry.brand.id, labels);
  }
  assert.ok([...brandLabels.values()].every((labels) => labels.size === 1));
});

test('candidate facts and foreign-price reference estimates reject malformed evidence', () => {
  const invalidFacts = structuredClone(data);
  invalidFacts.candidates.find((item) => item.id === 'quick-pro-er-one').facts.complete_weight_g = -1;
  assert.ok(validateDataset(invalidFacts).some((error) => error.includes('invalid facts.complete_weight_g')));

  const invalidRate = structuredClone(data);
  invalidRate.candidates.find((item) => item.id === 'quick-pro-er-one').official_price.conversion_rate_date = 'today';
  assert.ok(validateDataset(invalidRate).some((error) => error.includes('reference conversion needs conversion_rate_date')));

  const invalidSourceUrl = structuredClone(data);
  invalidSourceUrl.candidates.find((item) => item.id === 'quick-pro-er-one').source_url = 'http://example.com/not-https';
  assert.ok(validateDataset(invalidSourceUrl).some((error) => error.includes('source_url must use HTTPS')));

  const invalidVariantWeight = structuredClone(data);
  invalidVariantWeight.variants.find((item) => item.id === 'elves-falath-r7170').claimed_frame_weight_g = 0;
  assert.ok(validateDataset(invalidVariantWeight).some((error) => error.includes('invalid claimed_frame_weight_g')));

  const invalidDistinct = structuredClone(data);
  delete invalidDistinct.candidates.find((item) => item.id === 'missing-china-price-winspace-g3').existing_record_id;
  assert.ok(validateDataset(invalidDistinct).some((error) => error.includes('catalog_distinct_reason requires')));
});

test('rechecked screenshot prices preserve their corrected digit grouping', () => {
  const meinier = data.candidates.find((item) => item.id === 'meinier-superlight-2');
  const rollingStone = data.candidates.find((item) => item.id === 'rolling-stone-comp');
  assert.equal(meinier.observed_price.amount_cny, 2100);
  assert.equal(rollingStone.observed_price.amount_cny, 1500);
  assert.match(meinier.observed_price.correction_note, /not ¥21,000/);
  assert.match(rollingStone.observed_price.correction_note, /not ¥15,000/);
});

test('Twitter Gravel V3 generations and configurations remain separate', () => {
  const currentVariants = data.variants.filter((item) => item.platform_id === 'twitter-gravel-v3');
  const oldVariants = data.variants.filter((item) => item.platform_id === 'twitter-gravel-v3-2024');
  assert.deepEqual(currentVariants.map((item) => item.id).sort(), ['twitter-v3-rs-sensah', 'twitter-v3-wheeltop-eds']);
  assert.deepEqual(oldVariants.map((item) => item.id), ['twitter-v3-2024-rs-sensah-alloy']);
  assert.equal(data.platforms.filter((item) => item.id === 'twitter-gravel-v3').length, 1);
  assert.equal(data.platforms.filter((item) => item.id === 'twitter-gravel-v3-2024').length, 1);
  assert.equal(data.platforms.find((item) => item.id === 'twitter-gravel-v3').frame.bottom_bracket, 'T47');
  const oldPlatform = data.platforms.find((item) => item.id === 'twitter-gravel-v3-2024');
  assert.match(oldPlatform.frame.bottom_bracket, /BB92.*press-fit/);
  assert.equal(oldPlatform.status, 'superseded');
  assert.equal(oldPlatform.successor.platform_id, 'twitter-gravel-v3');
});

test('2024 Twitter historical alloy price stays scoped to its exact option', () => {
  const alloy = data.variants.find((item) => item.id === 'twitter-v3-2024-rs-sensah-alloy');
  const listingProfile = data.candidates.find((item) => item.id === 'twitter-gravel-v3-2024-rs-carbon-wave');
  const price = data.prices.find((item) => item.id === 'twitter-v3-2024-rs-alloy-2026-08-21');
  assert.equal(alloy.wheels.rim_material, 'aluminum');
  assert.equal(alloy.claimed_complete_weight_g, 9900);
  assert.equal(listingProfile.name, 'TWITTER 骓特 Gravel V3 2024 RS 2×12');
  assert.equal(listingProfile.observed_price, undefined);
  assert.equal(listingProfile.facts.complete_weight_g, 9500);
  assert.match(listingProfile.facts.wheels, /photographs do not establish which package is shown/i);
  assert.match(listingProfile.facts.wheels, /neither selection is treated as standard/i);
  assert.equal(price.amount_cny, 3991);
  assert.equal(price.status, 'historical-superseded');
  assert.equal(listingProfile.status, 'superseded');
  assert.match(listingProfile.availability_note, /no longer sold new.*superseded by the 2025 Gravel V3/i);
  assert.match(price.conditions, /alloy-wheel/);
  assert.match(price.conditions, /Do not apply this price.*other wheel selections/);
});

test('observed Twitter prices are retained exactly and anonymously', () => {
  const eds = data.prices.find((item) => item.id === 'twitter-eds-2026-08-05');
  const currentEds = data.prices.find((item) => item.id === 'twitter-eds-2026-08-08');
  const rs = data.prices.find((item) => item.id === 'twitter-rs-2026-08-05');
  assert.equal(eds.amount_cny, 5191);
  assert.equal(currentEds.amount_cny, 4951);
  assert.equal(currentEds.price_basis, 'coupon');
  assert.equal(rs.amount_cny, 3991);
  assert.equal(eds.channel, 'china-market');
  assert.equal(eds.source_ids.includes('market-snapshot-2026-08-05'), true);
  assert.equal(currentEds.source_ids.includes('taobao-snapshot-2026-08-08'), true);
});

test('XHS community reports remain privacy-safe candidate leads', () => {
  const ids = [
    'xhs-winspace-slc3-200km-2026-08-10',
    'xhs-winspace-slc3-review-lead-2026-08-10',
    'xhs-pardus-spark-sport-pes-1200km-2026-08-10',
    'xhs-pardus-spark-sport-pes-review-lead-2026-08-10'
  ];
  const sources = ids.map((id) => data.sources.find((source) => source.id === id));
  assert.ok(sources.every(Boolean));
  for (const source of sources) {
    assert.equal(source.type, 'community-report');
    assert.equal(source.claim_class, 'community report');
    assert.equal(source.publisher, 'Xiaohongshu');
    assert.match(source.url, /^https:\/\/www\.xiaohongshu\.com\/explore\/[a-f0-9]{24}$/);
    assert.equal(Object.hasOwn(source, 'creator'), false);
    assert.equal(Object.hasOwn(source, 'creator_name'), false);
  }
  const winspace = data.candidates.find((candidate) => candidate.id === 'missing-china-price-winspace-slc3');
  const pardus = data.candidates.find((candidate) => candidate.id === 'pardus-spark-sport-pes');
  assert.ok(ids.slice(0, 2).every((id) => winspace.source_ids.includes(id)));
  assert.ok(ids.slice(2).every((id) => pardus.source_ids.includes(id)));
  const publishedSourceIds = new Set([
    ...data.platforms.flatMap((item) => item.source_ids ?? []),
    ...data.variants.flatMap((item) => item.source_ids ?? []),
    ...data.prices.flatMap((item) => item.source_ids ?? [])
  ]);
  assert.ok(ids.every((id) => !publishedSourceIds.has(id)));
});

test('freshness uses explicit age buckets', () => {
  const now = new Date('2026-08-06T12:00:00Z');
  assert.equal(freshness('2026-08-05', now).key, 'current');
  assert.equal(freshness('2026-05-01', now).key, 'historical');
  assert.equal(freshness('2025-01-01', now).key, 'old');
});

test('all framesets use one transparent full-bike build allowance', () => {
  assert.equal(supportsStandardFramesetBuild('triathlon'), true);
  assert.equal(data.meta.frameset_build_assumption.amount_cny, 6000);
  const frame = products.find((item) => item.variant.id === 'lightcarbon-lcg071s-pro-frameset');
  assert.deepEqual([frame.allInPrice.low, frame.allInPrice.high], [9200, 10900]);
  assert.equal(frame.allInPrice.estimated, true);
  const complete = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  assert.deepEqual([complete.allInPrice.low, complete.allInPrice.high], [4951, 4951]);
  assert.equal(complete.allInPrice.estimated, false);
});

test('wide-clearance products preserve the narrower rear limit', () => {
  const product = products.find((item) => item.variant.id === 'seka-exaero-gr-frameset');
  assert.equal(maxClearance(product.platform), 52);

  const camp = products.find((item) => item.variant.id === 'camp-gx700-grx820');
  assert.equal(maxClearance(camp.platform), 45);
  assert.equal(clearanceLabel(camp.platform), '45 mm stock');
  assert.equal(clearanceLongLabel(camp.platform), '45 mm stock fit; maximum unverified');
});

test('every platform and variant resolves a primary visual', () => {
  const platformImages = data.images.filter((image) => image.platform_id);
  const primaryPlatformImages = platformImages.filter((image) => image.role === 'primary');
  assert.equal(primaryPlatformImages.length, data.platforms.length);
  const imagedPlatforms = new Set(platformImages.filter((image) => image.role === 'primary').map((image) => image.platform_id));
  assert.deepEqual([...imagedPlatforms].sort(), data.platforms.map((platform) => platform.id).sort());
  for (const product of products) {
    assert.ok(product.image, product.variant.id);
    assert.ok(product.imageSource, product.variant.id);
  }
});

test('image records preserve exactness, source, rights, and fallback-safe hosting', () => {
  const allowedRights = new Set([
    'project-owned', 'contributor-owned', 'permission-granted', 'brand-media-license',
    'cc-licensed', 'public-domain', 'official-page-embed', 'retailer-page-embed', 'public-post-embed',
    'public-post-quotation', 'source-attributed-rehost'
  ]);
  for (const image of data.images) {
    assert.ok(image.alt.length >= 10, image.id);
    assert.ok(image.credit.length >= 3, image.id);
    assert.ok(allowedRights.has(image.rights.status), image.id);
    if (image.hosting.mode === 'remote') assert.match(image.hosting.remote_url, /^https:\/\//, image.id);
    if (image.hosting.mode === 'local') assert.match(image.hosting.local_path, /^\/assets\/images\//, image.id);
  }
  const unresolvedImagePlatforms = [
    'elves-falath-r7170',
    'lightcarbon-speedz'
  ];
  assert.equal(data.images.filter((image) => image.hosting.mode === 'remote').length, 178);
  assert.equal(data.images.filter((image) => image.candidate_id).length, 106);
  assert.equal(data.images.filter((image) => image.rights.status === 'source-attributed-rehost').length, 7);
  assert.equal(data.images.filter((image) => image.subject_accuracy === 'illustrative').length, unresolvedImagePlatforms.length);
  assert.deepEqual(
    data.images
      .filter((image) => image.hosting.mode === 'local' && image.rights.status !== 'source-attributed-rehost')
      .map((image) => image.platform_id)
      .sort(),
    unresolvedImagePlatforms.sort()
  );

  const malformedTarget = structuredClone(data);
  malformedTarget.images.find((image) => image.candidate_id).platform_id = data.platforms[0].id;
  assert.ok(validateDataset(malformedTarget).some((error) => error.includes('target must identify exactly one platform or candidate')));

  const platformGallery = structuredClone(data);
  const gallery = platformGallery.images.find((image) => image.role === 'gallery' && image.candidate_id);
  const targetVariant = platformGallery.variants[0];
  delete gallery.candidate_id;
  gallery.platform_id = targetVariant.platform_id;
  gallery.variant_ids = [targetVariant.id];
  assert.deepEqual(validateDataset(platformGallery), []);

  gallery.variant_ids = [platformGallery.variants.find((item) => item.platform_id !== targetVariant.platform_id).id];
  assert.ok(validateDataset(platformGallery).some((error) => error.includes('belongs to another platform')));
});

test('published products expose ordered exact-model gallery images', () => {
  const quick = products.find((item) => item.variant.id === 'quick-gr-one-frameset');
  assert.deepEqual(quick.galleryImages.map((image) => image.label), [
    'Ice Crack Silver',
    'Diamond Black',
    'Fresh Grass Green'
  ]);
  assert.ok(quick.galleryImages.every((image) => image.source?.id === 'quick-gr-one-official'));
});

test('public-post embeds remain remote while sourced rehosts use the bounded local contract', () => {
  const remote = structuredClone(data);
  const image = remote.images.find((item) => item.id === 'quick-pro-er-one-primary-image');
  image.media_type = 'community-post-photo';
  image.rights.status = 'public-post-embed';
  assert.deepEqual(validateDataset(remote), []);

  image.hosting = { mode: 'local', local_path: '/assets/images/placeholders/complete-bike.svg' };
  assert.ok(validateDataset(remote).some((error) => error.includes('third-party remote image cannot be stored locally')));

  const rehosted = data.images.find((item) => item.rights.status === 'source-attributed-rehost');
  assert.ok(rehosted, 'expected a sourced local image fixture');
  assert.equal(rehosted.hosting.mode, 'local');
  assert.match(rehosted.hosting.local_path, /^\/assets\/images\/sourced\/xhs\//);
});

test('public-post quotations require bounded immutable media and a completed privacy review', () => {
  const quoted = structuredClone(data);
  const image = quoted.images.find((item) => item.id === 'giant-defy-advanced-sl1-public-primary-image');
  const cardHash = 'a'.repeat(64);
  const detailHash = 'b'.repeat(64);
  image.rights.status = 'public-post-quotation';
  image.rights.usage_note = 'One compressed editorial quotation is hosted externally; no license is asserted.';
  image.hosting = {
    mode: 'remote',
    remote_url: `https://china-bike-media.161-97-123-19.sslip.io/media/xhs/giant-defy-advanced-sl1/${detailHash.slice(0, 16)}-detail-w1040.webp`,
    variants: [
      {
        purpose: 'card',
        url: `https://china-bike-media.161-97-123-19.sslip.io/media/xhs/giant-defy-advanced-sl1/${cardHash.slice(0, 16)}-card-w480.webp`,
        width: 480,
        height: 320,
        bytes: 39000,
        sha256: cardHash,
        format: 'image/webp'
      },
      {
        purpose: 'detail',
        url: `https://china-bike-media.161-97-123-19.sslip.io/media/xhs/giant-defy-advanced-sl1/${detailHash.slice(0, 16)}-detail-w1040.webp`,
        width: 1040,
        height: 693,
        bytes: 87000,
        sha256: detailHash,
        format: 'image/webp'
      }
    ]
  };
  image.editorial_quotation = {
    purpose: 'editorial-identification-and-commentary',
    scope: 'one-compressed-public-post-photo',
    source_link_required: true,
    no_license_asserted: true,
    removal_route: 'https://github.com/p0s/china-bike-research/issues'
  };
  image.privacy_review = {
    reviewed_at: '2026-08-20',
    embedded_metadata: 'stripped',
    faces: 'none-visible',
    vehicle_registration: 'none-visible',
    account_identifiers: 'none-visible',
    location_identifiers: 'none-visible'
  };
  assert.deepEqual(validateDataset(quoted), []);

  image.hosting.variants[0].bytes = 40001;
  delete image.privacy_review.faces;
  const errors = validateDataset(quoted);
  assert.ok(errors.some((error) => error.includes('card variant exceeds its byte budget')));
  assert.ok(errors.some((error) => error.includes('incomplete privacy review')));
});

test('curated videos stay exact, disclosed, and separate from publication evidence', () => {
  const publishedVideos = data.videos.filter((video) => video.target.platform_id || video.target.variant_id);
  const candidateVideos = data.videos.filter((video) => video.target.candidate_id);
  assert.equal(publishedVideos.length, 4);
  assert.equal(candidateVideos.length, 8);
  assert.ok(publishedVideos.every((video) => video.match === 'exact-platform'));
  assert.ok(candidateVideos.every((video) => video.match === 'exact-model-lead'));
  assert.ok(data.videos.every((video) => video.disclosure.length >= 20));
  assert.equal(products.find((product) => product.platform.id === 'yoeleo-altera-g21').videos[0].channel_name, 'China Cycling');
  assert.equal(products.find((product) => product.platform.id === 'winspace-g3').videos.length, 0);

  const malformed = structuredClone(data);
  malformed.videos[0].url = 'https://www.youtube.com/watch?v=wrong-id';
  assert.ok(validateDataset(malformed).some((error) => error.includes('URL must match its YouTube video ID')));

  const mismatchedTarget = structuredClone(data);
  mismatchedTarget.candidates.find((candidate) => candidate.id === 'incolor-ssr').video_ids = ['china-cycling-quick-pro-er-one'];
  assert.ok(validateDataset(mismatchedTarget).some((error) => error.includes('targets another record')));
});

test('category-specific facts stay scoped to the categories that use them', () => {
  const gravel = data.platforms.find((item) => item.id === 'sava-gelaro-s8');
  const triathlon = data.platforms.find((item) => item.id === 'twitter-t3-tt');
  const mtb = data.candidates.find((item) => item.id === 'icanian-p9');
  const fatBike = data.candidates.find((item) => item.id === 'icanian-sn04');
  const eRoad = data.candidates.find((item) => item.id === 'cosmosworks-carbon-e-road');
  const folding = data.candidates.find((item) => item.id === 'qingsha-carbon-folding');

  assert.ok(gravel.tire_clearance);
  assert.equal(triathlon.tire_clearance, undefined);
  assert.equal(triathlon.category_details.discipline, 'triathlon/time-trial');
  assert.equal(data.platforms.some((item) => item.category.startsWith('mtb-')), false);
  assert.equal(mtb.status, 'publication-gate-not-met');
  assert.match(mtb.why_interesting, /150 mm rear-travel.*160 mm fork.*flat MTB bar/i);
  assert.match(fatBike.why_interesting, /120 mm full-suspension fat-bike/i);
  assert.equal(eRoad.category, 'e-road');
  assert.equal(folding.category, 'folding');
});

test('research ledger reconciles every bundle group and preserves backlog status', () => {
  const ledger = data.research.find((item) => item.id === 'taobao-2026-08-08');
  assert.equal(ledger.model_group_count, 133);
  assert.equal(ledger.group_dispositions.length, 133);
  assert.equal(ledger.priority_additions.length, 35);
  assert.equal(ledger.titanium_additions.length, 13);
  assert.equal(ledger.missing_china_price_targets.length, 35);
  assert.equal(ledger.group_dispositions.filter((item) => item.disposition.disposition === 'published-variant').length, 15);
  assert.equal(ledger.group_dispositions.filter((item) => item.disposition.disposition === 'candidate').length, 108);
  assert.equal(ledger.group_dispositions.filter((item) => item.disposition.disposition === 'exclusion').length, 10);
});

test('X-LAB model records keep one coherent reference trim and separate alternative builds', () => {
  const ad8 = data.candidates.find((item) => item.id === 'xlab-ad8');
  const ad9 = data.candidates.find((item) => item.id === 'xlab-ad9');
  const rs9 = data.candidates.find((item) => item.id === 'xlab-rs9');
  assert.equal(ad8.facts.complete_weight_g, 7600);
  assert.equal(ad8.official_price.amount_cny, 26980);
  assert.equal(ad8.alternative_builds.find((build) => build.id === 'taobao-standard-astana-105').price.amount_cny, 21980);
  assert.equal(ad9.facts.drivetrain, 'Shimano Dura-Ace R9270 Di2 2×12');
  assert.equal(ad9.facts.tire_clearance_mm, 32);
  assert.equal(ad9.alternative_builds.find((build) => build.id === 'xhs-custom-hybrid-l').complete_weight_g, 7435);
  assert.equal(rs9.observed_price.amount_cny, 49980);
  assert.match(rs9.facts.tire_clearance_basis, /fitted 32C/i);
  assert.equal(rs9.alternative_builds[0].complete_weight_g, 6800);
});

test('candidate reference price can keep an exact documented trim coherent', () => {
  const cloned = structuredClone(data);
  const candidate = cloned.candidates.find((item) => item.id === 'pardus-uragano-evo');
  candidate.reference_price_kind = 'official';
  candidate.official_price = { amount_cny: 23999, currency: 'CNY', price_type: 'historical-official-retail', observed_at: '2023-11-29' };
  const entry = joinCatalogCandidates(cloned).find((item) => item.candidate.id === candidate.id);
  assert.equal(entry.priceKind, 'official');
  assert.equal(entry.price.amount_cny, 23999);
});

test('shared frame images do not masquerade as exact component builds', () => {
  const eds = products.find((item) => item.variant.id === 'twitter-v3-wheeltop-eds');
  const rs = products.find((item) => item.variant.id === 'twitter-v3-rs-sensah');
  const oldRs = products.find((item) => item.variant.id === 'twitter-v3-2024-rs-sensah-alloy');
  const pardus = products.find((item) => item.variant.id === 'pardus-super-sport-gen2-egr');
  assert.equal(eds.image.display_accuracy, 'exact-variant');
  assert.equal(rs.image.display_accuracy, 'same-platform');
  assert.equal(oldRs.image.display_accuracy, 'same-model-different-market-build');
  assert.equal(pardus.image.display_accuracy, 'same-platform');
});

test('published images stay credited while incomplete builds remain candidates', () => {
  const ican = products.find((product) => product.platform.id === 'ican-gra04');
  const trinx = data.candidates.find((candidate) => candidate.id === 'trinx-gtr-c6');
  assert.equal(ican.image.hosting.mode, 'remote');
  assert.equal(ican.image.display_accuracy, 'exact-variant');
  assert.equal(ican.image.rights.status, 'official-page-embed');
  assert.equal(trinx.status, 'exact-trim-unproven');
  assert.ok(trinx.missing.some((item) => /new publishable variant record/i.test(item)));
});
