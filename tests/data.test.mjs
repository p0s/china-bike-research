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

test('verified Chinese brand renderings remain source-faithful', () => {
  const names = Object.fromEntries(data.brands.map((brand) => [brand.id, brand.name_zh]));
  assert.deepEqual(
    {
      cervelo: names.cervelo,
      incolor: names.incolor,
      lightcarbon: names.lightcarbon,
      pinarello: names.pinarello,
      scott: names.scott
    },
    {
      cervelo: '赛沃洛',
      incolor: '英凯路',
      lightcarbon: '轻碳',
      pinarello: '皮纳瑞罗',
      scott: '斯科特'
    }
  );
});

test('current Incolor framesets keep exact evidence and official frame galleries', () => {
  assert.equal(data.candidates.some((candidate) => candidate.id === 'incolor-ssr'), false);

  const ssr = products.find((product) => product.variant.id === 'incolor-ssr-frameset');
  assert.equal(ssr.platform.frame.material_grade, '80T pitch-based + T1100 carbon');
  assert.equal(ssr.latestPrice.amount_cny, 23800);
  assert.equal(ssr.latestPrice.status, 'available');
  assert.equal(ssr.image.id, 'incolor-ssr-official-primary-image');

  const voyager = products.find((product) => product.variant.id === 'incolor-voyager-frameset');
  assert.equal(voyager.platform.frame.material_grade, 'T800 carbon');
  assert.match(voyager.platform.frame.stiffness_evidence, /190 N\/mm/);
  assert.equal(voyager.latestPrice.id, 'incolor-voyager-taobao-2026-08-29');
  assert.equal(voyager.image.id, 'incolor-voyager-official-primary-image');

  const galleryIds = new Set(data.images.filter((image) => image.role === 'gallery').map((image) => image.id));
  for (const id of [
    'incolor-ssr-side-gallery',
    'incolor-ssr-front-rear-gallery',
    'incolor-speedster-sr-side-gallery',
    'incolor-speedster-sr-front-rear-gallery',
    'incolor-speedster-sr-plus-side-gallery'
  ]) assert.equal(galleryIds.has(id), true, id);
});

test('batch 020 keeps exact findings separate from exhausted unknowns', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  assert.match(candidates.get('viqi-r8000').facts.drivetrain, /Ultegra R8000 mechanical 2x11/);
  assert.equal(candidates.get('viqi-integrated-road-unknown').facts, undefined);

  const vook = candidates.get('vook-v8e-pro');
  assert.equal(vook.facts.complete_weight_g, 6700);
  assert.match(vook.facts.complete_weight_basis, /size XS/);
  assert.equal(vook.facts.tire_clearance_mm, 32);

  assert.match(candidates.get('west-biking-sl-one').facts.drivetrain_options, /R7120.*R7170/);
  assert.match(candidates.get('west-biking-team-road').facts.drivetrain_options, /R7120.*R8170/);

  const bxt = candidates.get('bxt-gravel-complete');
  assert.match(bxt.facts.listing_identity, /BXT-135/);
  assert.equal(bxt.facts.complete_weight_g, 7850);
  assert.match(bxt.facts.tire_clearance_conflict, /45C and 47C/);

  const colnago = candidates.get('colnago-y1rs');
  assert.equal(colnago.type, 'frameset');
  assert.equal(colnago.facts.tire_clearance_mm, 32);
  assert.equal(colnago.facts.complete_weight_g, undefined);
  assert.equal(colnago.facts.drivetrain, undefined);

  const bianchi = products.find((product) => product.variant.id === 'bianchi-oltre-race');
  assert.equal(bianchi.platform.frame.geometry.sizes.length, 8);
  assert.deepEqual(
    bianchi.platform.frame.geometry.sizes.map(({ size, reach_mm, stack_mm }) => [size, reach_mm, stack_mm]),
    [['44', 376, 481], ['47', 379, 490], ['50', 387, 499], ['53', 385, 525], ['55', 390, 541], ['57', 395, 557], ['59', 397, 576], ['61', 398, 595]]
  );
  assert.equal(bianchi.platform.tire_clearance.published_max_mm, 28);
  assert.equal(bianchi.image.id, 'bianchi-oltre-race-ytb8d-primary-image-2026-08-30');
  assert.equal(bianchi.image.subject_accuracy, 'exact-variant');
  assert.match(bianchi.image.hosting.remote_url, /OltreRace-FQ_Ph-scaled\.jpg$/);
});

test('batch 024 preserves selected-trim, generation, and tire-maximum boundaries', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const m6 = candidates.get('winspace-m6');
  assert.match(m6.facts.complete_weight_references, /8\.6 kg.*8\.1 kg.*7\.8 kg/);
  assert.match(m6.facts.drivetrain_options, /105 R7120.*105 R7170.*Ultegra R8170/);
  assert.equal(m6.facts.complete_weight_g, undefined);
  assert.equal(m6.facts.drivetrain, undefined);
  assert.equal(m6.facts.tire_clearance_mm, 32);

  const t1600 = candidates.get('winspace-t1600');
  assert.match(t1600.facts.complete_weight_references, /8\.0 kg.*7\.6 kg.*7\.2 kg/);
  assert.match(t1600.facts.drivetrain_options, /105 R7170.*Ultegra R8170.*Dura-Ace R9270/);
  assert.equal(t1600.facts.complete_weight_g, undefined);
  assert.equal(t1600.facts.drivetrain, undefined);
  assert.equal(t1600.facts.tire_clearance_mm, 32);
  assert.match(t1600.source_note, /T1600 Ultra data is excluded/);

  const ad350 = candidates.get('xds-ad350-2026');
  assert.equal(ad350.facts.complete_weight_g, 9280);
  assert.match(ad350.facts.complete_weight_basis, /does not expose size, pedals, accessories or measurement protocol/);
  assert.match(ad350.facts.drivetrain, /L-TWOO RX hydraulic 2x12/);
  assert.equal(ad350.facts.tire_clearance_mm, undefined);
  assert.match(ad350.source_note, /2025 1x12 generation is excluded/);

  assert.match(candidates.get('upland-r80').facts.frame_material, /T700\+T800.*T800 carbon fork/);
  assert.match(candidates.get('upland-taylor').facts.frame_material, /T1100\+T800/);
  assert.equal(candidates.get('viqi-integrated-road-unknown').facts, undefined);
  assert.match(candidates.get('viqi-r8000').facts.frame_material, /carbon-fiber gravel-road frame/);
  assert.match(candidates.get('vook-v8e-pro').facts.frame_material, /690 g.*345 g.*EPS molding/);
  assert.match(candidates.get('west-biking-sl-one').facts.frame_material, /full-carbon/);
  assert.match(candidates.get('west-biking-team-road').facts.frame_material, /T800-carbon/);
});

test('batch 025 preserves regional and option conflicts without inventing maxima', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const ad500 = candidates.get('xds-ad500-2025');
  assert.match(ad500.facts.complete_weight_references, /8\.9 kg.*9\.23 kg.*10\.2 kg/);
  assert.match(ad500.facts.drivetrain, /L-TWOO ER9 electronic hydraulic 2x12/);
  assert.match(ad500.facts.frame_material, /X6 aluminum frame.*carbon and aluminum forks/);
  assert.equal(ad500.facts.tire_clearance_mm, undefined);

  const ad7 = candidates.get('xds-ad7');
  assert.match(ad7.facts.complete_weight_references, /8\.2 kg.*8\.5 kg/);
  assert.match(ad7.facts.drivetrain, /Shimano 105 Di2.*2x12/);
  assert.match(ad7.facts.frame_material, /T700\+T800 carbon/);
  assert.equal(ad7.facts.tire_clearance_mm, undefined);

  const hongfu = candidates.get('hongfu-gravel');
  assert.match(hongfu.facts.current_model_options, /FM188.*FM279/);
  assert.match(hongfu.facts.tire_clearance_references, /700x45 mm.*700x42 mm/);
  assert.match(hongfu.facts.frame_weight_references, /1,070-1,190±40 g/);
  assert.equal(hongfu.facts.tire_clearance_mm, undefined);

  const propel = candidates.get('giant-propel-gen4-community-lead');
  assert.equal(propel.facts.mainland_suggested_price_cny, 54800);
  assert.match(propel.facts.complete_weight_reference, /6\.8 kg.*size S.*Japan/);
  assert.match(propel.facts.drivetrain, /Ultegra Di2.*2x12/);
  assert.equal(propel.facts.frame_pedaling_stiffness_n_per_mm, 84);
  assert.equal(propel.facts.frame_torsional_stiffness_n_per_degree, 124);
  assert.equal(propel.facts.fork_stiffness_n_per_mm, 60);

  const spark = candidates.get('pardus-spark-rs-community-lead');
  assert.match(spark.facts.complete_weight_references, /8\.5 kg.*8\.0 kg.*7\.8 kg/);
  assert.match(spark.facts.current_factory_price_reference, /CNY 11,999.*not the custom/);
  assert.equal(spark.facts.tire_clearance_mm, undefined);
});

test('batch 026 preserves exact disc-frame evidence and unresolved build boundaries', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  for (const id of [
    'upland-r80',
    'upland-taylor',
    'viqi-integrated-road-unknown',
    'viqi-r8000',
    'vook-v8e-pro',
    'west-biking-sl-one',
    'west-biking-team-road'
  ]) assert.equal(candidates.get(id).facts?.stiffness_evidence, undefined, id);

  const bianchi = products.find((product) => product.variant.id === 'bianchi-oltre-race');
  assert.match(bianchi.platform.frame.stiffness_evidence, /No controlled numeric exact Oltre Race/);
  assert.match(bianchi.variant.claimed_complete_weight_basis, /8\.70 kg in size 53 and 8\.4 kg in size 57/);

  const elves = products.find((product) => product.variant.id === 'elves-falath-r7170');
  assert.equal(elves.platform.name, 'Falath Pro Disc R7170 build');
  assert.match(elves.platform.frame.material_grade, /Toray T800.*T1000 reinforcement/);
  assert.equal(elves.platform.frame.geometry.sizes.length, 7);
  assert.deepEqual(
    elves.platform.frame.geometry.sizes.map(({ size, reach_mm, stack_mm }) => [size, reach_mm, stack_mm]),
    [['44', 359, 491], ['46', 367.8, 500.6], ['49', 369.1, 523.2], ['52', 377.2, 530.6], ['54', 380.8, 536.6], ['56', 382, 556.9], ['59', 388.8, 576.1]]
  );
  assert.equal(elves.variant.claimed_frame_weight_g, 1080);
  assert.match(elves.variant.claimed_frame_weight_basis, /size 46/);
  assert.equal(elves.variant.wheels, undefined);
  assert.equal(elves.image.subject_accuracy, 'illustrative');
  assert.equal(elves.image.reviewed_at, '2026-08-30');
  assert.equal(elves.variant.source_ids.includes('elves-falath-pro-official-2026-08-17'), true);
  assert.equal(data.sources.find((source) => source.id === 'elves-falath-pro-official-2026-08-17').url, 'https://www.elvesbike.com/more.php?id=93&lm=8');
});

test('batch 027 records exact construction evidence and preserves exhausted stiffness unknowns', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const bxt = candidates.get('bxt-gravel-complete');
  assert.match(bxt.facts.frame_material, /T700\+T800 carbon frame.*T700 carbon fork/);
  assert.equal(bxt.facts.stiffness_evidence, undefined);

  const colnago = candidates.get('colnago-y1rs');
  assert.match(colnago.facts.frame_material, /model-specific, area-tuned lay-up/);
  assert.match(colnago.facts.stiffness_evidence, /3\.5% stiffer.*manufacturer-relative/);

  const deRosa = candidates.get('de-rosa-new-838');
  assert.match(deRosa.facts.frame_material, /High-module carbon frame and fork/);
  assert.match(deRosa.facts.stiffness_evidence, /elliptical bottom-bracket area.*qualitative manufacturer evidence/);

  const felt = candidates.get('felt-ia-2');
  assert.match(felt.facts.frame_material, /FRD 12K Carbon Light.*UD Carbon Standard/);
  assert.match(felt.facts.stiffness_evidence, /FRD and PRO 12K construction.*retained trim is unresolved/);

  const irefox = candidates.get('irefox-by446');
  assert.match(irefox.facts.frame_material, /retained exact seller card.*carbon-frame IREFOX BY446/);
  assert.equal(irefox.facts.stiffness_evidence, undefined);

  const java = candidates.get('java-fuoco-2025');
  assert.match(java.facts.frame_material, /Toray T700 carbon frame and fork/);
  assert.equal(java.facts.stiffness_evidence, undefined);

  const legit = candidates.get('legit-ac1');
  assert.match(legit.facts.frame_material, /T700 carbon frame/);
  assert.equal(legit.facts.stiffness_evidence, undefined);

  const look = candidates.get('look-765-electronic');
  assert.match(look.facts.frame_material, /multi-fiber lay-up.*carbon and glass-fiber/);
  assert.match(look.facts.stiffness_evidence, /20% more compliance.*lateral efficiency/);

  const canyon = candidates.get('missing-china-price-canyon-grail');
  assert.equal(canyon.facts.complete_weight_g, 9260);
  assert.match(canyon.facts.drivetrain, /GRX mechanical 2×12.*RX610.*RD-RX820.*11–34/);
  assert.equal(canyon.facts.tire_clearance_mm, 42);
  assert.equal(canyon.facts.stiffness_evidence, undefined);

  const pardus = candidates.get('pardus-robin-sport-pes');
  assert.match(pardus.facts.frame_material, /HS-EPS\+.*FLEX AIR.*HS-HPT/);
  assert.match(pardus.facts.stiffness_evidence, /vibration absorption and stiffness.*qualitative manufacturer evidence/);
});

test('batch 028 resolves exact facts and gives every frozen unknown fifty distinct approaches', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  assert.match(candidates.get('pardus-spark').facts.frame_material, /HS-EPS\+.*HS-HPT/);
  assert.match(candidates.get('pardus-spark').facts.stiffness_evidence, /20% greater pedaling stiffness.*manufacturer-relative/);
  assert.match(candidates.get('winspace-m6').facts.frame_material, /T700\+T800\+M40\+M60/);
  assert.equal(candidates.get('winspace-m6').facts.stiffness_evidence, undefined);
  assert.match(candidates.get('winspace-t1600').facts.frame_material, /T1000\+T1100.*Kevlar/);
  assert.match(candidates.get('winspace-t1600').facts.stiffness_evidence, /engineered for stiffness and power transfer/);
  assert.match(candidates.get('xds-ad350-2026').facts.frame_material, /X6 ultra-light aluminum.*carbon-fiber fork/);
  assert.equal(candidates.get('xds-ad350-2026').facts.stiffness_evidence, undefined);

  const revolt = candidates.get('missing-china-price-giant-revolt-advanced');
  assert.equal(revolt.facts.complete_weight_g, undefined);
  assert.equal(revolt.facts.tire_clearance_mm, 45);
  assert.match(revolt.facts.tire_clearance_basis, /2x drivetrain.*53 mm applies only to a 1x/);
  assert.doesNotMatch(revolt.required_before_dashboard, /numeric clearance/);

  const tcr = candidates.get('missing-china-price-giant-tcr-advanced');
  assert.equal(tcr.facts.complete_weight_g, undefined);
  assert.equal(tcr.facts.tire_clearance_mm, undefined);
  assert.match(tcr.source_note, /disc-generation and historic sibling values are excluded/);

  const reacto = candidates.get('missing-china-price-merida-reacto');
  assert.equal(reacto.facts.complete_weight_g, undefined);
  assert.equal(reacto.facts.tire_clearance_mm, 32);
  assert.match(reacto.facts.tire_clearance_basis, /fifth-generation.*CF3\/CF5/);
  assert.doesNotMatch(reacto.required_before_dashboard, /Tire clearance/);

  const carbonda = candidates.get('carbonda-cfr707');
  assert.equal(carbonda.facts.frame_weight_g, 1300);
  assert.match(carbonda.facts.frame_weight_basis, /size M.*±50 g.*including alloy parts/);
  assert.equal(carbonda.facts.tire_clearance_mm, 50);
  assert.match(carbonda.facts.frame_material, /T700\+T800.*EPS molding/);
  assert.equal(carbonda.observed_price, undefined);

  const dengfu = candidates.get('dengfu-gravel');
  assert.equal(dengfu.model_id, 'dengfu-r20');
  assert.equal(dengfu.name, 'Dengfu R20 Disc Gravel Bike Frame');
  assert.equal(dengfu.facts.frame_weight_g, undefined);
  assert.equal(dengfu.facts.tire_clearance_mm, undefined);
  assert.equal(dengfu.facts.frame_material, undefined);
  assert.match(dengfu.support_note, /exact R20 coverage and terms remain unconfirmed/);

  const twitter = candidates.get('twitter-t10-pro');
  assert.match(twitter.facts.drivetrain, /SENSAH HRD6900.*WheelTop EDS TX.*Shimano 105 R7120.*2x12/);
  assert.equal(twitter.facts.tire_clearance_mm, undefined);

  const foundFields = new Set([
    'candidate:pardus-spark:frame-material',
    'candidate:pardus-spark:frame-stiffness',
    'candidate:winspace-m6:frame-material',
    'candidate:winspace-t1600:frame-material',
    'candidate:winspace-t1600:frame-stiffness',
    'candidate:xds-ad350-2026:frame-material',
    'candidate:missing-china-price-giant-revolt-advanced:tire-clearance',
    'candidate:missing-china-price-merida-reacto:tire-clearance',
    'candidate:carbonda-cfr707:frame-weight',
    'candidate:carbonda-cfr707:tire-clearance',
    'candidate:carbonda-cfr707:frame-material',
    'candidate:twitter-t10-pro:drivetrain'
  ]);
  const frozenFields = [
    ['pardus-spark', 'frame-material'], ['pardus-spark', 'frame-stiffness'],
    ['winspace-m6', 'frame-material'], ['winspace-m6', 'frame-stiffness'],
    ['winspace-t1600', 'frame-material'], ['winspace-t1600', 'frame-stiffness'],
    ['xds-ad350-2026', 'frame-material'], ['xds-ad350-2026', 'frame-stiffness'],
    ['missing-china-price-giant-revolt-advanced', 'complete-weight'], ['missing-china-price-giant-revolt-advanced', 'tire-clearance'],
    ['missing-china-price-giant-tcr-advanced', 'complete-weight'], ['missing-china-price-giant-tcr-advanced', 'tire-clearance'],
    ['missing-china-price-merida-reacto', 'complete-weight'], ['missing-china-price-merida-reacto', 'tire-clearance'],
    ['carbonda-cfr707', 'price'], ['carbonda-cfr707', 'frame-weight'], ['carbonda-cfr707', 'tire-clearance'], ['carbonda-cfr707', 'frame-material'],
    ['dengfu-gravel', 'price'], ['dengfu-gravel', 'frame-weight'], ['dengfu-gravel', 'tire-clearance'], ['dengfu-gravel', 'frame-material'],
    ['twitter-t10-pro', 'drivetrain'], ['twitter-t10-pro', 'tire-clearance']
  ];
  for (const [recordId, field] of frozenFields) {
    const key = 'candidate:' + recordId + ':' + field;
    const attempt = data.researchAttempts.find((record) => record.target.record_type === 'candidate' && record.target.record_id === recordId && record.field === field);
    assert.ok(attempt, key);
    const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
    assert.equal(applications.length, 50, key);
    assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
    assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
  }
});

test('batch 029 resolves exact clearances and preserves exhausted unknowns across fifty distinct areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));

  assert.equal(candidates.get('hi-light-g0').facts.tire_clearance_mm, 50);
  assert.equal(candidates.get('hi-light-r9-2025').facts.tire_clearance_mm, 28);
  assert.equal(candidates.get('laget-aero-one').facts.tire_clearance_mm, 30);
  assert.equal(candidates.get('laget-pioneer').facts.tire_clearance_mm, 32);
  assert.equal(candidates.get('laget-pioneer-one').facts.tire_clearance_mm, 32);

  const roubaix = candidates.get('specialized-roubaix-sl8-comp-105');
  assert.equal(roubaix.facts.complete_weight_g, 8970);
  assert.match(roubaix.facts.complete_weight_basis, /size 56.*vary by size, color and component variation/);
  assert.equal(roubaix.facts.tire_clearance_mm, 40);
  assert.match(roubaix.facts.drivetrain, /105 Di2 2x12 electronic/);

  const pardus = candidates.get('pardus-robin-evo-community-lead');
  assert.equal(pardus.facts.tire_clearance_mm, undefined);
  assert.match(pardus.source_note, /no exact-build mainland price or manufacturer maximum tire clearance/);

  const gravel = candidates.get('twitter-gravel-v3-2024-rs-carbon-wave');
  assert.equal(gravel.facts.tire_clearance_mm, 40);
  assert.equal(gravel.observed_price, undefined);
  assert.match(gravel.source_note, /CNY 3,991 alloy-wheel option.*not transferred/);

  assert.equal(platforms.get('twitter-cyclone-gen3-et').tire_clearance, undefined);
  assert.equal(candidates.get('generic-custom-carbon-road').facts?.tire_clearance_mm, undefined);

  const foundFields = new Set([
    'candidate:hi-light-g0:tire-clearance',
    'candidate:hi-light-r9-2025:tire-clearance',
    'candidate:laget-aero-one:tire-clearance',
    'candidate:laget-pioneer:tire-clearance',
    'candidate:laget-pioneer-one:tire-clearance',
    'candidate:specialized-roubaix-sl8-comp-105:complete-weight',
    'candidate:specialized-roubaix-sl8-comp-105:tire-clearance',
    'candidate:twitter-gravel-v3-2024-rs-carbon-wave:tire-clearance'
  ]);
  const frozenFields = [
    ['candidate', 'hi-light-g0', 'tire-clearance'],
    ['candidate', 'hi-light-r9-2025', 'tire-clearance'],
    ['candidate', 'laget-aero-one', 'tire-clearance'],
    ['candidate', 'laget-pioneer', 'tire-clearance'],
    ['candidate', 'laget-pioneer-one', 'tire-clearance'],
    ['candidate', 'specialized-roubaix-sl8-comp-105', 'complete-weight'],
    ['candidate', 'specialized-roubaix-sl8-comp-105', 'tire-clearance'],
    ['candidate', 'pardus-robin-evo-community-lead', 'price'],
    ['candidate', 'pardus-robin-evo-community-lead', 'tire-clearance'],
    ['candidate', 'twitter-gravel-v3-2024-rs-carbon-wave', 'tire-clearance'],
    ['candidate', 'twitter-gravel-v3-2024-rs-carbon-wave', 'price'],
    ['platform', 'twitter-cyclone-gen3-et', 'tire-clearance'],
    ['candidate', 'generic-custom-carbon-road', 'tire-clearance']
  ];
  for (const [recordType, recordId, field] of frozenFields) {
    const key = `${recordType}:${recordId}:${field}`;
    const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
    assert.ok(attempt, key);
    const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
    assert.equal(applications.length, 50, key);
    assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
    assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
  }

  const legacyPrice = data.researchAttempts.find((record) => record.id === 'candidate-pardus-robin-evo-community-lead-price-2026-08-17');
  const preservedQueries = new Set(legacyPrice.required_channels.flatMap((channel) => legacyPrice.channels[channel].attempts).map((attempt) => attempt.query));
  assert.ok(preservedQueries.has('PARDUS Robin EVO 价格'));
  assert.ok(preservedQueries.has('Pardus Robin EVO China price'));
  assert.ok(preservedQueries.has('Pardus Robin EVO JD price'));
  assert.ok(preservedQueries.has('Pardus Robin EVO foreign price'));
});

test('batch 030 resolves exact frameset facts without transferring sibling or conflicted values', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const kontax = candidates.get('kontax-power-evo');
  assert.equal(kontax.name, 'KONTAX 超探 RS80 POWER EVO');
  assert.match(kontax.facts.listing_identity, /RS80 POWER EVO/);
  assert.equal(kontax.facts.frame_weight_g, undefined);
  assert.equal(kontax.facts.tire_clearance_mm, undefined);

  const koseea = candidates.get('koseea-pioneer-slr-plus');
  assert.match(koseea.facts.frame_material, /Toray T1000 reinforcement/);
  assert.equal(koseea.facts.frame_weight_g, 985);
  assert.match(koseea.facts.frame_weight_basis, /excluding hardware and paint/);
  assert.equal(koseea.facts.tire_clearance_mm, undefined);
  assert.match(koseea.source_note, /Conflicting 30C and 32 mm/);

  const java = candidates.get('java-tt-frame-hydraulic');
  const myWay = candidates.get('my-way-custom-carbon-frame');
  const quick = candidates.get('quick-t10');
  assert.equal(java.facts, undefined);
  assert.equal(myWay.facts, undefined);
  assert.equal(quick.facts, undefined);
  assert.match(java.source_note, /multiple plausible TT products/);
  assert.match(myWay.source_note, /no technical value is inferred/);
  assert.match(quick.source_note, /TT:ONE is a distinct named product/);

  const foundFields = new Set([
    'candidate:kontax-power-evo:identity-source',
    'candidate:koseea-pioneer-slr-plus:frame-weight',
    'candidate:koseea-pioneer-slr-plus:frame-material',
    'candidate:koseea-pioneer-slr-plus:identity-source'
  ]);
  const targetIds = [
    'java-tt-frame-hydraulic',
    'kontax-power-evo',
    'koseea-pioneer-slr-plus',
    'my-way-custom-carbon-frame',
    'quick-t10'
  ];
  const fields = ['tire-clearance', 'frame-weight', 'frame-material', 'identity-source', 'frame-stiffness'];
  for (const recordId of targetIds) {
    for (const field of fields) {
      const key = `candidate:${recordId}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === 'candidate' && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }
});

test('batch 031 resolves current platform facts while preserving build and generation conflicts', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const sava = candidates.get('sava-r9');
  assert.equal(sava.facts.tire_clearance_mm, 32);
  assert.match(sava.facts.frame, /T800.*T1000/);
  assert.match(sava.facts.complete_weight_references, /7\.27 kg.*7\.39 kg/);
  assert.equal(sava.facts.complete_weight_g, undefined);

  const bianchi = candidates.get('bianchi-sprint-icr');
  assert.equal(bianchi.facts.tire_clearance_mm, 32);
  assert.match(bianchi.facts.complete_weight_references, /8\.5 kg.*9\.0 kg/);
  assert.equal(bianchi.facts.complete_weight_g, undefined);

  const speed7Complete = candidates.get('lightcarbon-speed7-complete');
  const speed7Frameset = candidates.get('lightcarbon-speed7-frameset');
  assert.match(speed7Complete.facts.frame, /LCR017-D/);
  assert.equal(speed7Complete.facts.tire_clearance_mm, 32);
  assert.equal(speed7Complete.facts.complete_weight_g, undefined);
  assert.match(speed7Frameset.facts.listing_identity, /Speed7\/速7.*LCR017-D/);
  assert.equal(speed7Frameset.facts.frame_weight_g, 870);
  assert.match(speed7Frameset.facts.frame_weight_basis, /size 52.*±30 g/);
  assert.equal(speed7Frameset.facts.tire_clearance_mm, 32);

  assert.equal(candidates.get('missing-china-price-giant-revolt-advanced').official_price.observed_at, '2026-09-01');
  assert.equal(candidates.get('missing-china-price-giant-tcr-advanced').official_price.observed_at, '2026-09-01');
  const reacto = candidates.get('missing-china-price-merida-reacto');
  assert.equal(reacto.official_price.observed_at, '2026-09-01');
  assert.match(reacto.facts.stiffness_evidence, /same molds.*same stiffness targets/);

  const hiLight = candidates.get('hi-light-g0');
  assert.match(hiLight.facts.frame_material, /Titanium.*carbon fork/);
  assert.equal(hiLight.facts.frame_weight_g, undefined);
  assert.match(hiLight.facts.stiffness_evidence, /3D-printed head section.*increased rigidity/);
  assert.match(candidates.get('carbonda-cfr707').facts.frame_stiffness_status, /No controlled numeric/);

  const foundFields = new Set([
    'candidate:sava-r9:tire-clearance',
    'candidate:sava-r9:frame-material',
    'candidate:bianchi-sprint-icr:tire-clearance',
    'candidate:lightcarbon-speed7-complete:tire-clearance',
    'candidate:lightcarbon-speed7-frameset:tire-clearance',
    'candidate:lightcarbon-speed7-frameset:frame-weight',
    'candidate:lightcarbon-speed7-frameset:identity-source',
    'candidate:missing-china-price-giant-revolt-advanced:price',
    'candidate:missing-china-price-giant-tcr-advanced:price',
    'candidate:missing-china-price-merida-reacto:price',
    'candidate:missing-china-price-merida-reacto:frame-stiffness',
    'candidate:hi-light-g0:frame-material',
    'candidate:hi-light-g0:price',
    'candidate:hi-light-g0:frame-stiffness'
  ]);
  const conflictedFields = new Set([
    'candidate:sava-r9:complete-weight',
    'candidate:bianchi-sprint-icr:complete-weight'
  ]);
  const targetFields = new Map([
    ['sava-r9', ['complete-weight', 'tire-clearance', 'frame-material', 'frame-stiffness']],
    ['bianchi-sprint-icr', ['complete-weight', 'tire-clearance', 'frame-stiffness']],
    ['lightcarbon-speed7-complete', ['complete-weight', 'tire-clearance', 'frame-stiffness']],
    ['lightcarbon-speed7-frameset', ['tire-clearance', 'frame-weight', 'identity-source', 'frame-stiffness']],
    ['missing-china-price-giant-revolt-advanced', ['price', 'frame-stiffness']],
    ['missing-china-price-giant-tcr-advanced', ['price', 'frame-stiffness']],
    ['missing-china-price-merida-reacto', ['price', 'frame-stiffness']],
    ['hi-light-g0', ['frame-weight', 'frame-material', 'price', 'frame-stiffness']],
    ['carbonda-cfr707', ['frame-stiffness']]
  ]);
  for (const [recordId, fields] of targetFields) {
    for (const field of fields) {
      const key = `candidate:${recordId}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === 'candidate' && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      const expected = foundFields.has(key) ? 'found' : conflictedFields.has(key) ? 'conflicted' : 'blocked';
      assert.equal(attempt.status, expected, key);
    }
  }

  const legacySpeed7 = data.researchAttempts.find((record) => record.id === 'candidate-lightcarbon-speed7-complete-complete-weight-2026-08-17');
  const preservedQueries = new Set(legacySpeed7.required_channels.flatMap((channel) => legacySpeed7.channels[channel].attempts).map((attempt) => attempt.query));
  assert.ok(preservedQueries.has('LightCarbon Speed7 105 mechanical complete bike complete-build weight community'));
  assert.ok(preservedQueries.has('"LightCarbon Speed7" complete weight official'));
});

test('batch 032 resolves exact frame facts and preserves seven exhausted unknowns', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const hiLight = candidates.get('hi-light-r9-2025');
  assert.equal(hiLight.facts.frame_weight_g, undefined);
  assert.match(hiLight.facts.frame_material, /titanium.*3Al\/2\.5V/i);
  assert.equal(hiLight.official_price.amount_cny, 8900);
  assert.equal(hiLight.official_price.observed_at, '2026-09-01');

  const lagetAero = candidates.get('laget-aero-one');
  const lagetPioneer = candidates.get('laget-pioneer');
  const lagetPioneerOne = candidates.get('laget-pioneer-one');
  assert.equal(lagetAero.facts.frame_weight_g, 1630);
  assert.match(lagetAero.facts.frame_material, /3D-printed titanium.*titanium fork/i);
  assert.equal(lagetPioneer.facts.frame_weight_g, 1550);
  assert.match(lagetPioneer.facts.frame_material, /hand-welded titanium.*carbon fork/i);
  assert.equal(lagetPioneerOne.facts.frame_weight_g, 1350);
  assert.match(lagetPioneerOne.facts.frame_material, /3D-printed titanium.*carbon fork/i);

  assert.match(candidates.get('twitter-t10-pro').facts.frame_material, /high-modulus carbon.*full-carbon fork/i);
  assert.equal(candidates.get('twitter-cyclone-gen3-7170').facts.tire_clearance_mm, undefined);
  assert.match(candidates.get('dengfu-gravel').facts.frame_stiffness_status, /No controlled numeric/);
  assert.equal(candidates.get('elves-mori-community-lead').facts.tire_clearance_mm, undefined);
  assert.equal(candidates.get('generic-custom-carbon-road').facts.frame_weight_g, undefined);
  assert.equal(candidates.get('generic-custom-carbon-road').facts.frame_material, undefined);
  assert.equal(candidates.get('missing-china-price-merida-scultura').facts.tire_clearance_mm, 30);
  assert.equal(candidates.get('missing-china-price-trek-madone-gen-8').facts.tire_clearance_mm, 32);
  assert.equal(candidates.get('missing-china-price-elves-vanyar').facts.tire_clearance_mm, 30);
  assert.equal(candidates.get('missing-china-price-tavelo-attack').facts.tire_clearance_mm, 32);
  assert.equal(candidates.get('missing-china-price-winspace-slc3').facts.tire_clearance_mm, 32);
  assert.equal(candidates.get('tavelo-arow-sl-community-lead').facts.drivetrain, undefined);
  assert.match(candidates.get('tavelo-arow-sl-community-lead').facts.drivetrain_status, /No complete attributable/);

  const twitterPlatform = data.platforms.find((platform) => platform.id === 'twitter-cyclone-gen3-et');
  assert.equal(twitterPlatform.frame.material, 'high-modulus carbon');
  assert.equal(twitterPlatform.frame.fork_material, 'full carbon');

  const foundFields = new Set([
    'candidate:hi-light-r9-2025:frame-material',
    'candidate:hi-light-r9-2025:price',
    'candidate:laget-aero-one:frame-weight',
    'candidate:laget-aero-one:frame-material',
    'candidate:laget-aero-one:price',
    'candidate:laget-pioneer:frame-weight',
    'candidate:laget-pioneer:frame-material',
    'candidate:laget-pioneer:price',
    'candidate:laget-pioneer-one:frame-weight',
    'candidate:laget-pioneer-one:frame-material',
    'candidate:laget-pioneer-one:price',
    'candidate:twitter-t10-pro:frame-material',
    'candidate:missing-china-price-merida-scultura:tire-clearance',
    'candidate:missing-china-price-trek-madone-gen-8:tire-clearance',
    'platform:twitter-cyclone-gen3-et:frame-material',
    'candidate:missing-china-price-elves-vanyar:tire-clearance',
    'candidate:missing-china-price-tavelo-attack:tire-clearance',
    'candidate:missing-china-price-winspace-slc3:tire-clearance'
  ]);
  const targetFields = new Map([
    ['candidate:hi-light-r9-2025', ['frame-weight', 'frame-material', 'price']],
    ['candidate:laget-aero-one', ['frame-weight', 'frame-material', 'price']],
    ['candidate:laget-pioneer', ['frame-weight', 'frame-material', 'price']],
    ['candidate:laget-pioneer-one', ['frame-weight', 'frame-material', 'price']],
    ['candidate:twitter-t10-pro', ['frame-material']],
    ['candidate:twitter-cyclone-gen3-7170', ['tire-clearance']],
    ['candidate:dengfu-gravel', ['frame-stiffness']],
    ['candidate:elves-mori-community-lead', ['tire-clearance']],
    ['candidate:generic-custom-carbon-road', ['frame-weight', 'frame-material']],
    ['candidate:missing-china-price-merida-scultura', ['tire-clearance']],
    ['candidate:missing-china-price-trek-madone-gen-8', ['tire-clearance']],
    ['platform:twitter-cyclone-gen3-et', ['frame-material']],
    ['candidate:missing-china-price-elves-vanyar', ['tire-clearance']],
    ['candidate:missing-china-price-tavelo-attack', ['tire-clearance']],
    ['candidate:missing-china-price-winspace-slc3', ['tire-clearance']],
    ['candidate:tavelo-arow-sl-community-lead', ['drivetrain']]
  ]);
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }

  const legacyMori = data.researchAttempts.find((record) => record.id === 'candidate-elves-mori-community-lead-tire-clearance-2026-08-17');
  const preservedQueries = new Set(legacyMori.required_channels.flatMap((channel) => legacyMori.channels[channel].attempts).map((attempt) => attempt.query));
  assert.ok(preservedQueries.has('ELVES Mori gravel frameset (subtrim unconfirmed) material, standards, clearance and BOM community'));
  assert.ok(preservedQueries.has('精灵 Mori 砾石车架组 material, standards, clearance and BOM'));
});

test('batch 033 records exact MTB and road facts while preserving conflicts and mainland unknowns', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  assert.match(candidates.get('giant-defy-advanced-sl1-community-lead').facts.complete_weight_status, /unverified and unmapped/);
  assert.equal(candidates.get('missing-china-price-specialized-crux').facts.complete_weight_g, 8550);
  assert.match(candidates.get('missing-china-price-specialized-crux').facts.complete_weight_basis, /product 223483.*size 56/i);

  const p9 = candidates.get('icanian-p9');
  assert.match(p9.facts.tire_clearance, /27\.5×3\.0 or 29×2\.3/);
  assert.match(p9.facts.frame_weight_status, /2,570.*2,620.*2,400/);
  assert.match(p9.facts.frame_material, /T700\/T800/);
  assert.match(p9.facts.stiffness_evidence, /stiff in key zones/);

  const sn04 = candidates.get('icanian-sn04');
  assert.match(sn04.facts.tire_clearance, /26×4\.8.*26×4\.0/);
  assert.match(sn04.facts.frame_weight_status, /2,560.*2,507.*2,057/);
  assert.match(sn04.facts.frame_material_status, /T700 versus T700\/T800/);
  assert.match(sn04.facts.stiffness_evidence, /front-end stiffness/);

  assert.equal(candidates.get('specialized-roubaix-sl8-comp-105').official_price.amount_cny, 27990);
  assert.match(candidates.get('specialized-roubaix-sl8-comp-105').facts.stiffness_evidence, /rigid rear triangle/);
  assert.match(candidates.get('tavelo-arow-sl-community-lead').facts.complete_weight_basis, /Single exact public custom-build report/);
  assert.match(candidates.get('tavelo-arow-sl-community-lead').facts.price_status, /No attributable current mainland CNY/);
  assert.equal(candidates.get('tsb-titan-super-bond-pioneer-one').facts.frame_weight_g, 1350);
  assert.equal(candidates.get('tsb-titan-super-bond-pioneer-one').facts.tire_clearance_mm, 32);
  assert.match(candidates.get('twitter-t10-pro').facts.complete_weight_basis, /three selectable drivetrain builds/);

  const sava = data.platforms.find((platform) => platform.id === 'sava-a7l-r7100');
  assert.equal(sava.tire_clearance.published_max_mm, 25);
  assert.match(sava.frame.frame_weight_status, /No frame-only/);

  const foundFields = new Set([
    'candidate:missing-china-price-specialized-crux:complete-weight',
    'candidate:icanian-p9:tire-clearance',
    'candidate:icanian-p9:frame-material',
    'candidate:icanian-p9:frame-stiffness',
    'candidate:icanian-sn04:tire-clearance',
    'candidate:icanian-sn04:frame-stiffness',
    'candidate:specialized-roubaix-sl8-comp-105:price',
    'candidate:specialized-roubaix-sl8-comp-105:frame-stiffness',
    'candidate:tavelo-arow-sl-community-lead:complete-weight',
    'candidate:tavelo-arow-sl-community-lead:frame-stiffness',
    'candidate:tsb-titan-super-bond-pioneer-one:tire-clearance',
    'candidate:tsb-titan-super-bond-pioneer-one:frame-weight',
    'candidate:tsb-titan-super-bond-pioneer-one:frame-material',
    'candidate:twitter-t10-pro:complete-weight',
    'candidate:twitter-t10-pro:frame-stiffness',
    'platform:sava-a7l-r7100:tire-clearance'
  ]);
  const conflictedFields = new Set([
    'candidate:icanian-p9:frame-weight',
    'candidate:icanian-sn04:frame-weight',
    'candidate:icanian-sn04:frame-material'
  ]);
  const targetFields = new Map([
    ['candidate:giant-defy-advanced-sl1-community-lead', ['complete-weight', 'price']],
    ['candidate:missing-china-price-specialized-crux', ['complete-weight', 'price']],
    ['candidate:icanian-p9', ['tire-clearance', 'frame-weight', 'frame-material', 'frame-stiffness']],
    ['candidate:icanian-sn04', ['tire-clearance', 'frame-weight', 'frame-material', 'frame-stiffness']],
    ['candidate:specialized-roubaix-sl8-comp-105', ['price', 'frame-stiffness']],
    ['candidate:tavelo-arow-sl-community-lead', ['price', 'complete-weight', 'frame-stiffness']],
    ['candidate:tsb-titan-super-bond-pioneer-one', ['tire-clearance', 'frame-weight', 'frame-material', 'frame-stiffness']],
    ['candidate:twitter-t10-pro', ['complete-weight', 'frame-stiffness']],
    ['platform:sava-a7l-r7100', ['tire-clearance', 'frame-weight']]
  ]);
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      const expected = foundFields.has(key) ? 'found' : conflictedFields.has(key) ? 'conflicted' : 'blocked';
      assert.equal(attempt.status, expected, key);
    }
  }

  const preservedLegacy = new Map([
    ['candidate-giant-defy-advanced-sl1-community-lead-price-2026-08-17', 'Giant China Defy Advanced SL 1 price'],
    ['candidate-missing-china-price-specialized-crux-price-2026-08-17', 'Specialized China Crux Comp GRX price'],
    ['candidate-tavelo-arow-sl-community-lead-price-2026-08-17', 'Tavelo Arow SL official price'],
    ['candidate-tavelo-arow-sl-community-lead-complete-weight-2026-08-17', '踏为乐 Arow SL 6.2kg complete-build weight']
  ]);
  for (const [id, query] of preservedLegacy) {
    const attempt = data.researchAttempts.find((record) => record.id === id);
    const queries = new Set(attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts).map((entry) => entry.query));
    assert.ok(queries.has(query), id);
  }
});

test('batch 034 resolves exact current build facts and exhausts every remaining frozen field across fifty distinct areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  const quick = candidates.get('quick-pro-ur-one');
  assert.equal(quick.facts.complete_weight_g, undefined);
  assert.match(quick.facts.complete_weight_status, /No official complete-bike weight.*50 registered source areas/);
  assert.match(quick.facts.price_status, /US\$6,899.*no attributable mainland CNY/);
  assert.match(quick.facts.stiffness_evidence, /preserves stiffness and control.*Silverstone/);

  const cyclonePlatform = platforms.get('twitter-cyclone-gen3-et');
  assert.match(cyclonePlatform.frame.frame_weight_status, /No frame-only.*50 registered source areas/);
  assert.match(cyclonePlatform.frame.stiffness_evidence, /engineered for stiffness and efficient power transfer/);

  const cycloneVariant = variants.get('twitter-cyclone-gen3-et');
  assert.equal(cycloneVariant.drivetrain.model, 'EDS TX');
  assert.equal(cycloneVariant.claimed_complete_weight_g, 9200);
  assert.match(cycloneVariant.claimed_complete_weight_basis, /size, pedals, accessories and weighing protocol/);
  assert.match(cycloneVariant.purchase_route, /made-to-order international route from US\$1,489/);

  const mori = candidates.get('elves-mori-community-lead');
  assert.match(mori.facts.frame_weight_status, /Exact subtrim.*unresolved/);
  assert.match(mori.facts.frame_material_status, /carbon grade.*unresolved/);
  assert.match(mori.facts.frame_stiffness_status, /No exact-subtrim/);

  const generic = candidates.get('generic-custom-carbon-road');
  assert.match(generic.facts.identity_source_status, /No attributable manufacturer, mold, model year or exact SKU/);
  assert.match(generic.facts.frame_stiffness_status, /No attributable exact-model stiffness result/);

  const pardus = candidates.get('pardus-robin-evo-community-lead');
  assert.equal(pardus.facts.complete_weight_g, 6200);
  assert.match(pardus.facts.complete_weight_basis, /Exact public XS competition-build report/);
  assert.match(pardus.facts.frame_stiffness_status, /No generation-safe/);
  assert.match(pardus.source_note, /no exact-build mainland price or manufacturer maximum tire clearance/);

  const cycloneR7120 = candidates.get('twitter-cyclone-gen3-7170');
  assert.equal(cycloneR7120.facts.complete_weight_g, 8700);
  assert.match(cycloneR7120.facts.frame_material, /High-modulus carbon frame with full-carbon fork/);
  assert.match(cycloneR7120.facts.stiffness_evidence, /aerodynamic stability and efficient power delivery/);

  const gravel = candidates.get('twitter-gravel-v3-2024-rs-carbon-wave');
  assert.equal(gravel.facts.complete_weight_g, 9500);
  assert.match(gravel.facts.complete_weight_basis, /Historical seller claim.*pictured wheel selection/);
  assert.match(gravel.facts.frame_stiffness_status, /No exact historical-selection/);
  assert.match(candidates.get('hi-light-r9-2025').facts.frame_stiffness_status, /No exact-model numeric/);
  assert.match(candidates.get('laget-aero-one').facts.frame_stiffness_status, /No exact-model numeric/);

  const foundFields = new Set([
    'candidate:quick-pro-ur-one:frame-stiffness',
    'platform:twitter-cyclone-gen3-et:frame-stiffness',
    'variant:twitter-cyclone-gen3-et:bom',
    'variant:twitter-cyclone-gen3-et:complete-weight',
    'variant:twitter-cyclone-gen3-et:purchase-route',
    'candidate:pardus-robin-evo-community-lead:complete-weight',
    'candidate:twitter-cyclone-gen3-7170:frame-material',
    'candidate:twitter-cyclone-gen3-7170:complete-weight',
    'candidate:twitter-cyclone-gen3-7170:frame-stiffness',
    'candidate:twitter-gravel-v3-2024-rs-carbon-wave:complete-weight'
  ]);
  const targetFields = new Map([
    ['candidate:quick-pro-ur-one', ['complete-weight', 'price', 'frame-stiffness']],
    ['platform:twitter-cyclone-gen3-et', ['frame-weight', 'frame-stiffness']],
    ['variant:twitter-cyclone-gen3-et', ['bom', 'complete-weight', 'purchase-route']],
    ['candidate:elves-mori-community-lead', ['frame-weight', 'frame-material', 'frame-stiffness']],
    ['candidate:generic-custom-carbon-road', ['identity-source', 'frame-stiffness']],
    ['candidate:pardus-robin-evo-community-lead', ['complete-weight', 'frame-stiffness']],
    ['candidate:twitter-cyclone-gen3-7170', ['frame-material', 'complete-weight', 'frame-stiffness']],
    ['candidate:twitter-gravel-v3-2024-rs-carbon-wave', ['complete-weight', 'frame-stiffness']],
    ['candidate:hi-light-r9-2025', ['frame-stiffness']],
    ['candidate:laget-aero-one', ['frame-stiffness']]
  ]);
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }

  const preservedLegacy = new Map([
    ['variant-twitter-cyclone-gen3-et-complete-weight-2026-08-17', 'TWITTER Cyclone Third Generation ET complete weight official'],
    ['variant-twitter-cyclone-gen3-et-purchase-route-2026-08-17', 'TWITTER Cyclone 3rd ET current purchase route'],
    ['candidate-elves-mori-community-lead-frame-weight-2026-08-17', 'ELVES Mori gravel frameset (subtrim unconfirmed) frame weight community']
  ]);
  for (const [id, query] of preservedLegacy) {
    const attempt = data.researchAttempts.find((record) => record.id === id);
    const queries = new Set(attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts).map((entry) => entry.query));
    assert.ok(queries.has(query), id);
  }
});

test('batch 035 records exact weights and configurations while preserving mainland and technical unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));

  assert.match(candidates.get('laget-pioneer-one').facts.frame_stiffness_status, /No exact-model numeric.*50 registered source areas/);
  assert.match(candidates.get('laget-pioneer').facts.frame_stiffness_status, /No exact-model numeric.*50 registered source areas/);

  const vanyar = candidates.get('missing-china-price-elves-vanyar');
  assert.equal(vanyar.facts.frame_weight_g, 870);
  assert.match(vanyar.facts.frame_weight_basis, /size 47.*unpainted without metal parts.*1,050 g in size 62/);
  assert.match(vanyar.facts.price_status, /US\$1,100.*no attributable mainland CNY/);
  assert.match(vanyar.facts.stiffness_evidence, /race-sprinting stiffness and power-transfer intent/);

  const attack = candidates.get('missing-china-price-tavelo-attack');
  assert.equal(attack.facts.frame_weight_g, 860);
  assert.match(attack.facts.frame_weight_basis, /size XS \(430\)/);
  assert.match(attack.facts.price_status, /US\$1,500.*no attributable mainland CNY/);
  assert.match(attack.facts.stiffness_evidence, /stiff enough to win a sprint/);

  const uraganoF = candidates.get('pardus-uragano-f');
  assert.equal(uraganoF.facts.complete_weight_g, undefined);
  assert.match(uraganoF.facts.complete_weight_status, /No exact-build complete weight/);
  assert.match(uraganoF.facts.tire_clearance_status, /No manufacturer maximum attributable to the exact Uragano F/);
  assert.match(uraganoF.facts.frame_stiffness_status, /No exact-model numeric/);

  const roubaix = candidates.get('missing-china-price-specialized-roubaix-sl8');
  assert.match(roubaix.facts.drivetrain, /Tiagra hydraulic 2x10.*105 R7000.*11-34T.*50\/34T/);
  assert.equal(roubaix.official_price.amount_cny, 15990);
  assert.equal(roubaix.facts.complete_weight_g, 9460);
  assert.match(roubaix.facts.complete_weight_basis, /size 56.*production-painted/);
  assert.match(roubaix.facts.frame_stiffness_status, /compliance evidence is kept separate/);

  const sava = candidates.get('sava-f20-hawkeye');
  assert.equal(sava.facts.complete_weight_g, 8700);
  assert.match(sava.facts.complete_weight_basis, /varies by size/);
  assert.match(sava.facts.tire_clearance_status, /fitted 25C tire is not treated as clearance/);
  assert.match(sava.facts.price_status, /US\$1,899.*no attributable mainland CNY/);
  assert.match(sava.facts.frame_stiffness_status, /No exact-model numeric/);

  const camp = platforms.get('camp-gx600');
  assert.equal(camp.tire_clearance.stock_nominal_mm, 35);
  assert.match(camp.tire_clearance.note, /fitted 700x35C tire but no manufacturer maximum/);
  assert.match(camp.frame.geometry_status, /No attributable numeric geometry table/);
  assert.match(camp.frame.frame_weight_status, /No frame-only/);
  assert.equal(camp.frame.bottom_bracket, 'unknown');
  assert.match(camp.frame.bottom_bracket_status, /No attributable shell standard/);

  const foundFields = new Set([
    'candidate:missing-china-price-elves-vanyar:frame-weight',
    'candidate:missing-china-price-elves-vanyar:frame-stiffness',
    'candidate:missing-china-price-tavelo-attack:frame-weight',
    'candidate:missing-china-price-tavelo-attack:frame-stiffness',
    'candidate:missing-china-price-specialized-roubaix-sl8:drivetrain',
    'candidate:missing-china-price-specialized-roubaix-sl8:price',
    'candidate:missing-china-price-specialized-roubaix-sl8:complete-weight',
    'candidate:sava-f20-hawkeye:complete-weight'
  ]);
  const targetFields = new Map([
    ['candidate:laget-pioneer-one', ['frame-stiffness']],
    ['candidate:laget-pioneer', ['frame-stiffness']],
    ['candidate:missing-china-price-elves-vanyar', ['frame-weight', 'price', 'frame-stiffness']],
    ['candidate:missing-china-price-tavelo-attack', ['frame-weight', 'price', 'frame-stiffness']],
    ['candidate:pardus-uragano-f', ['complete-weight', 'tire-clearance', 'frame-stiffness']],
    ['candidate:missing-china-price-specialized-roubaix-sl8', ['drivetrain', 'price', 'complete-weight', 'frame-stiffness']],
    ['candidate:sava-f20-hawkeye', ['tire-clearance', 'price', 'complete-weight', 'frame-stiffness']],
    ['platform:camp-gx600', ['tire-clearance', 'geometry', 'frame-weight', 'bottom-bracket']]
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }
  assert.equal(fieldCount, 23);
});

test('batch 036 records exact current road-bike facts and preserves clearance, price, stiffness and weight conflicts across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const merida = candidates.get('missing-china-price-merida-scultura');
  assert.equal(merida.official_price.amount_cny, 16800);
  assert.equal(merida.facts.complete_weight_g, 8200);
  assert.match(merida.facts.complete_weight_basis, /size M.*paint.*supply-chain/i);
  assert.match(merida.facts.stiffness_evidence, /AWS.*increases stiffness.*NACA/i);

  const trek = candidates.get('missing-china-price-trek-madone-gen-8');
  assert.equal(trek.official_price.amount_cny, 21800);
  assert.equal(trek.facts.complete_weight_g, 8700);
  assert.match(trek.facts.complete_weight_basis, /stock Madone SL 5 Gen 8/);
  assert.match(trek.facts.frame_stiffness_status, /No exact SL 5 numeric.*50 registered source areas/);

  const winspace = candidates.get('missing-china-price-winspace-slc3');
  assert.equal(winspace.facts.frame_weight_g, 699);
  assert.match(winspace.facts.frame_weight_basis, /unpainted size-M/);
  assert.match(winspace.facts.price_status, /US\$1,450.*no attributable mainland CNY/);
  assert.match(winspace.facts.stiffness_evidence, /significantly improves stiffness in key areas/);

  const cyclone = candidates.get('twitter-cyclone-r7120');
  assert.match(cyclone.facts.tire_clearance_status, /fitted 28C tire is not treated as clearance/);
  assert.match(cyclone.facts.frame_material, /High-modulus carbon frame.*full-carbon fork/);
  assert.equal(cyclone.facts.complete_weight_g, 8700);
  assert.match(cyclone.facts.complete_weight_status, /8\.7 kg.*9\.3 kg/);
  assert.match(cyclone.facts.complete_weight_basis, /catalog row.*conflicted/);
  assert.match(cyclone.facts.stiffness_evidence, /aerodynamic stability and efficient power delivery/);

  const gravel = candidates.get('twitter-gravel-v3-105');
  assert.equal(gravel.facts.complete_weight_g, 9900);
  assert.match(gravel.facts.complete_weight_basis, /9\.7-9\.9 kg.*selectable builds/);
  assert.match(gravel.facts.frame_material, /High-modulus carbon frame and carbon fork/);
  assert.match(gravel.facts.tire_clearance_status, /fitted 40C tire is not treated as clearance/);
  assert.match(gravel.facts.frame_stiffness_status, /No numeric.*50 registered source areas/);

  const pardus = candidates.get('pardus-spark-sport-pes');
  assert.equal(pardus.facts.complete_weight_g, 8500);
  assert.match(pardus.facts.complete_weight_basis, /2026 Spark Sport 3 PES size-XS owner-build report/);
  assert.match(pardus.facts.stiffness_evidence, /20% higher pedaling stiffness/);
  assert.match(pardus.facts.tire_clearance_status, /No generation-safe manufacturer maximum/);

  const sava = candidates.get('sava-a7l-pro-2026');
  assert.equal(sava.facts.complete_weight_g, 8800);
  assert.match(sava.facts.complete_weight_basis, /varies by size/);
  assert.match(sava.facts.tire_clearance_status, /fitted 25C tire is not treated as clearance/);
  assert.match(sava.facts.frame_stiffness_status, /No exact-model numeric.*50 registered source areas/);

  const foundFields = new Set([
    'candidate:missing-china-price-merida-scultura:price',
    'candidate:missing-china-price-merida-scultura:complete-weight',
    'candidate:missing-china-price-merida-scultura:frame-stiffness',
    'candidate:missing-china-price-trek-madone-gen-8:price',
    'candidate:missing-china-price-trek-madone-gen-8:complete-weight',
    'candidate:missing-china-price-winspace-slc3:frame-weight',
    'candidate:missing-china-price-winspace-slc3:frame-stiffness',
    'candidate:twitter-cyclone-r7120:frame-material',
    'candidate:twitter-cyclone-r7120:frame-stiffness',
    'candidate:twitter-gravel-v3-105:frame-material',
    'candidate:twitter-gravel-v3-105:complete-weight',
    'candidate:pardus-spark-sport-pes:complete-weight',
    'candidate:pardus-spark-sport-pes:frame-stiffness',
    'candidate:sava-a7l-pro-2026:complete-weight'
  ]);
  const conflictedFields = new Set(['candidate:twitter-cyclone-r7120:complete-weight']);
  const targetFields = new Map([
    ['candidate:missing-china-price-merida-scultura', ['price', 'complete-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-trek-madone-gen-8', ['price', 'complete-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-winspace-slc3', ['price', 'frame-weight', 'frame-stiffness']],
    ['candidate:twitter-cyclone-r7120', ['tire-clearance', 'frame-material', 'complete-weight', 'frame-stiffness']],
    ['candidate:twitter-gravel-v3-105', ['tire-clearance', 'frame-material', 'complete-weight', 'frame-stiffness']],
    ['candidate:pardus-spark-sport-pes', ['tire-clearance', 'complete-weight', 'frame-stiffness']],
    ['candidate:sava-a7l-pro-2026', ['tire-clearance', 'complete-weight', 'frame-stiffness']]
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      const expected = foundFields.has(key) ? 'found' : conflictedFields.has(key) ? 'conflicted' : 'blocked';
      assert.equal(attempt.status, expected, key);
    }
  }
  assert.equal(fieldCount, 23);
});

test('batch 037 records exact current race and endurance facts while preserving mainland and complete-weight unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));

  const scott = candidates.get('scott-foil-rc-10');
  assert.equal(scott.facts.tire_clearance_mm, 30);
  assert.match(scott.facts.tire_clearance_basis, /Foil RC platform maximum.*manufacturer manual/);
  assert.equal(scott.facts.complete_weight_g, 7900);
  assert.match(scott.facts.complete_weight_basis, /model 425337/);
  assert.match(scott.facts.stiffness_evidence, /without sacrificing stiffness/);

  const aeroad = candidates.get('missing-china-price-canyon-aeroad');
  assert.equal(aeroad.facts.complete_weight_g, 7120);
  assert.match(aeroad.facts.complete_weight_basis, /size-M standard specification/);
  assert.match(aeroad.facts.price_status, /US\$10,499.*no attributable mainland CNY/);
  assert.match(aeroad.facts.stiffness_evidence, /benchmark stiffness-to-weight/);

  const ultimate = candidates.get('missing-china-price-canyon-ultimate');
  assert.equal(ultimate.facts.complete_weight_g, 6780);
  assert.match(ultimate.facts.price_status, /US\$10,499.*no attributable mainland CNY/);
  assert.match(ultimate.facts.stiffness_evidence, /pinnacle of stiffness-to-weight/);

  const arow = candidates.get('missing-china-price-tavelo-arow');
  assert.equal(arow.facts.tire_clearance_mm, 32);
  assert.equal(arow.facts.frame_weight_g, 950);
  assert.match(arow.facts.frame_weight_basis, /Race Polestar painted size-XS.*±40 g/);
  assert.match(arow.facts.stiffness_evidence, /headtube and downtube stiffness/);

  const domane = candidates.get('missing-china-price-trek-domane');
  assert.equal(domane.official_price.amount_cny, 20800);
  assert.equal(domane.facts.complete_weight_g, 9090);
  assert.match(domane.facts.complete_weight_basis, /2026 Gen 4.*size 56.*tubeless sealant/);
  assert.match(domane.facts.stiffness_evidence, /light weight, strength and stiffness/);

  const crux = candidates.get('specialized-s-works-crux-2024-sram-red-xplr');
  assert.equal(crux.official_price.amount_cny, 84990);
  assert.equal(crux.facts.complete_weight_g, 7280);
  assert.match(crux.facts.complete_weight_basis, /production-painted size-56/);
  assert.match(crux.facts.stiffness_evidence, /responsive at the pedals/);

  const propel = candidates.get('giant-propel-advanced-3');
  assert.equal(propel.facts.complete_weight_g, undefined);
  assert.match(propel.facts.complete_weight_status, /No exact complete-bike weight.*50 registered source areas/);
  assert.match(propel.facts.stiffness_evidence, /significantly increases frame stiffness/);

  const merida = candidates.get('merida-scultura-endurance-4000-community-lead');
  assert.equal(merida.facts.complete_weight_g, 9030);
  assert.match(merida.facts.complete_weight_basis, /earlier-generation independent test-bike review/);
  assert.match(merida.facts.stiffness_evidence, /no detectable flex.*efficient power transfer/);

  const gr025 = platforms.get('rinasclta-gr025');
  assert.equal(gr025.frame.material, 'Full Torayca T800 and T1000 carbon fiber');
  assert.match(gr025.frame.stiffness_evidence, /high stiffness-to-weight ratio/);
  assert.match(gr025.frame.weight_conflict_note, /1,250 g/);

  const foundFields = new Set([
    'candidate:scott-foil-rc-10:tire-clearance',
    'candidate:scott-foil-rc-10:complete-weight',
    'candidate:scott-foil-rc-10:frame-stiffness',
    'candidate:missing-china-price-canyon-aeroad:complete-weight',
    'candidate:missing-china-price-canyon-aeroad:frame-stiffness',
    'candidate:missing-china-price-canyon-ultimate:complete-weight',
    'candidate:missing-china-price-canyon-ultimate:frame-stiffness',
    'candidate:missing-china-price-tavelo-arow:tire-clearance',
    'candidate:missing-china-price-tavelo-arow:frame-weight',
    'candidate:missing-china-price-tavelo-arow:frame-stiffness',
    'candidate:missing-china-price-trek-domane:complete-weight',
    'candidate:missing-china-price-trek-domane:price',
    'candidate:missing-china-price-trek-domane:frame-stiffness',
    'candidate:specialized-s-works-crux-2024-sram-red-xplr:complete-weight',
    'candidate:specialized-s-works-crux-2024-sram-red-xplr:price',
    'candidate:specialized-s-works-crux-2024-sram-red-xplr:frame-stiffness',
    'candidate:giant-propel-advanced-3:frame-stiffness',
    'candidate:merida-scultura-endurance-4000-community-lead:complete-weight',
    'candidate:merida-scultura-endurance-4000-community-lead:frame-stiffness',
    'platform:rinasclta-gr025:frame-material',
    'platform:rinasclta-gr025:frame-stiffness'
  ]);
  const targetFields = new Map([
    ['candidate:scott-foil-rc-10', ['tire-clearance', 'complete-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-canyon-aeroad', ['complete-weight', 'price', 'frame-stiffness']],
    ['candidate:missing-china-price-canyon-ultimate', ['complete-weight', 'price', 'frame-stiffness']],
    ['candidate:missing-china-price-tavelo-arow', ['tire-clearance', 'frame-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-trek-domane', ['complete-weight', 'price', 'frame-stiffness']],
    ['candidate:specialized-s-works-crux-2024-sram-red-xplr', ['complete-weight', 'price', 'frame-stiffness']],
    ['candidate:giant-propel-advanced-3', ['complete-weight', 'frame-stiffness']],
    ['candidate:merida-scultura-endurance-4000-community-lead', ['complete-weight', 'frame-stiffness']],
    ['platform:rinasclta-gr025', ['frame-material', 'frame-stiffness']]
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }
  assert.equal(fieldCount, 24);
});

test('batch 038 records exact materials, weights and prices while preserving model and generation boundaries across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));

  const xmcs = platforms.get('xmcarbonspeed-cs-gr01');
  assert.equal(xmcs.frame.material, 'T800 carbon fiber');
  assert.match(xmcs.frame.stiffness_evidence_status, /No attributable exact-model stiffness.*50 registered source areas/);

  const vanRysel = candidates.get('missing-china-price-van-rysel-rcr');
  assert.equal(vanRysel.facts.tire_clearance_mm, 32);
  assert.equal(vanRysel.facts.complete_weight_g, 8000);
  assert.match(vanRysel.facts.complete_weight_basis, /separate Decathlon regional catalog says 8\.2 kg/);
  assert.match(vanRysel.facts.stiffness_evidence, /7% stiffer than RCR Pro/);

  assert.match(candidates.get('missing-china-price-giant-defy-advanced').price_status, /CNY 14,800/);
  assert.match(candidates.get('pardus-spark-tourist').facts.complete_weight_status, /similarly named Spark AL and Spark Sport values are not transferable/);
  assert.match(candidates.get('quick-pro-gr-one-grx-di2').price_status, /no exact mapped mainland CNY checkout/);
  assert.match(candidates.get('sava-starship-r13').facts.tire_clearance_status, /fitted 700×25C tires are not a maximum/);

  const argon = candidates.get('argon18-krypton-pro');
  assert.match(argon.facts.frame_weight_status, /current-generation.*870 g prior-generation value is excluded/);
  assert.match(argon.price_status, /US\$3,375.*no attributable mainland CNY/);

  assert.match(candidates.get('seka-spear-rdc').facts.stiffness_evidence, /14\.5% stiffness-to-weight improvement/);

  const crux = candidates.get('specialized-s-works-crux-frameset');
  assert.equal(crux.facts.frame_weight_g, 725);
  assert.match(crux.facts.frame_weight_basis, /product 223486/);
  assert.match(crux.price_status, /CNY 33,990.*prior-generation/);

  const tarmac = candidates.get('missing-china-price-specialized-tarmac-sl8');
  assert.equal(tarmac.facts.complete_weight_g, 7680);
  assert.match(tarmac.facts.complete_weight_basis, /production-painted size-56/);
  assert.match(tarmac.facts.stiffness_evidence, /33% stiffness-to-weight improvement/);
  assert.match(tarmac.price_status, /CNY 30,990/);

  const foundFields = new Set([
    'platform:xmcarbonspeed-cs-gr01:frame-material',
    'candidate:missing-china-price-van-rysel-rcr:tire-clearance',
    'candidate:missing-china-price-van-rysel-rcr:complete-weight',
    'candidate:missing-china-price-van-rysel-rcr:frame-stiffness',
    'candidate:missing-china-price-giant-defy-advanced:price',
    'candidate:seka-spear-rdc:frame-stiffness',
    'candidate:specialized-s-works-crux-frameset:frame-weight',
    'candidate:specialized-s-works-crux-frameset:price',
    'candidate:missing-china-price-specialized-tarmac-sl8:price',
    'candidate:missing-china-price-specialized-tarmac-sl8:complete-weight',
    'candidate:missing-china-price-specialized-tarmac-sl8:frame-stiffness'
  ]);
  const targetFields = new Map([
    ['platform:xmcarbonspeed-cs-gr01', ['frame-material', 'frame-stiffness']],
    ['candidate:missing-china-price-van-rysel-rcr', ['tire-clearance', 'complete-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-giant-defy-advanced', ['price']],
    ['candidate:pardus-spark-tourist', ['complete-weight']],
    ['candidate:quick-pro-gr-one-grx-di2', ['price']],
    ['candidate:sava-starship-r13', ['tire-clearance']],
    ['candidate:argon18-krypton-pro', ['frame-weight', 'price']],
    ['candidate:seka-spear-rdc', ['frame-stiffness']],
    ['candidate:specialized-s-works-crux-frameset', ['frame-weight', 'price']],
    ['candidate:missing-china-price-specialized-tarmac-sl8', ['price', 'complete-weight', 'frame-stiffness']]
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field);
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, foundFields.has(key) ? 'found' : 'blocked', key);
    }
  }
  assert.equal(fieldCount, 17);
});

test('batch 039 records three exact LightCarbon owner quotations and exhausts seven price unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const lcg071 = candidates.get('lightcarbon-lcg071-pro');
  assert.equal(lcg071.observed_price.amount_cny, 4271);
  assert.equal(lcg071.observed_price.original_amount, 629);
  assert.match(lcg071.observed_price.price_basis, /exact LCG071-PRO frameset package/);
  assert.match(lcg071.observed_price.conditions, /paint, wheelset, accessories, shipping/);

  const lcr017 = candidates.get('lightcarbon-lcr017-d');
  assert.equal(lcr017.observed_price.amount_cny, 4067);
  assert.equal(lcr017.observed_price.original_amount, 599);
  assert.match(lcr017.price_status, /package details and current mainland checkout unverified/);

  const lcr017s = candidates.get('lightcarbon-lcr017s-d');
  assert.equal(lcr017s.observed_price.amount_cny, 3768);
  assert.equal(lcr017s.observed_price.original_amount, 555);
  assert.match(lcr017s.observed_price.conditions, /US\$167 Italy shipping/);

  const blockedIds = [
    'lightcarbon-lcg074-d',
    'lightcarbon-lcg074s-d',
    'lightcarbon-lcg087-d',
    'lightcarbon-lcg087s-d',
    'lightcarbon-lcr020-d',
    'lightcarbon-lcr007-v',
    'lightcarbon-lcr014-v'
  ];
  for (const id of blockedIds) {
    assert.equal(candidates.get(id).observed_price, undefined, id);
    assert.match(candidates.get(id).price_status, /50 registered areas/, id);
  }
  assert.match(candidates.get('lightcarbon-lcg074-d').source_note, /bundles wheels, paint, accessories and DDP delivery/);
  assert.match(candidates.get('lightcarbon-lcg087-d').source_note, /secondary £500 database record/);
  assert.match(candidates.get('lightcarbon-lcr007-v').source_note, /2018 snapshot/);
  assert.match(candidates.get('lightcarbon-lcr014-v').source_note, /Brazilian Black Edition listing/);

  const foundIds = new Set(['lightcarbon-lcg071-pro', 'lightcarbon-lcr017-d', 'lightcarbon-lcr017s-d']);
  const allIds = [...foundIds, ...blockedIds];
  for (const recordId of allIds) {
    const attempt = data.researchAttempts.find((record) => record.target.record_type === 'candidate' && record.target.record_id === recordId && record.field === 'price');
    assert.ok(attempt, recordId);
    const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
    assert.equal(applications.length, 50, recordId);
    assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, recordId);
    assert.equal(attempt.status, foundIds.has(recordId) ? 'found' : 'blocked', recordId);
  }
});

test('batch 040 records four exact LightCarbon supplier listings and exhausts six price unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));

  const lcr015d = candidates.get('lightcarbon-lcr015-d');
  assert.equal(lcr015d.observed_price.low_cny, 3259);
  assert.equal(lcr015d.observed_price.high_cny, 3734);
  assert.equal(lcr015d.observed_price.original_low, 480);
  assert.equal(lcr015d.observed_price.original_high, 550);
  assert.match(lcr015d.price_status, /manufacturer-supplier.*MOQ-1 reference/);

  const lcr015v = candidates.get('lightcarbon-lcr015-v');
  assert.equal(lcr015v.observed_price.low_cny, 3388);
  assert.equal(lcr015v.observed_price.high_cny, 3870);
  assert.match(lcr015v.source_note, /in-stock US\$499–570/);

  const lcr015sd = candidates.get('lightcarbon-lcr015s-d');
  assert.equal(lcr015sd.observed_price.low_cny, 3157);
  assert.equal(lcr015sd.observed_price.high_cny, 3497);
  assert.match(lcr015sd.observed_price.conditions, /selected cockpit/);

  const lcr014d = candidates.get('lightcarbon-lcr014-d');
  assert.equal(lcr014d.observed_price.amount_cny, 2376);
  assert.equal(lcr014d.observed_price.original_amount, 350);
  assert.match(lcr014d.observed_price.conditions, /minimum order 10 sets/);

  const blockedIds = [
    'lightcarbon-lcr0x-d',
    'lightcarbon-lcr0x-v',
    'lightcarbon-lctt05-d',
    'lightcarbon-lcr015s-v',
    'lightcarbon-lcrxs-d',
    'lightcarbon-lcrxs-v'
  ];
  for (const id of blockedIds) {
    assert.equal(candidates.get(id).observed_price, undefined, id);
    assert.match(candidates.get(id).price_status, /50 registered areas/, id);
  }
  assert.match(candidates.get('lightcarbon-lcr0x-d').source_note, /used LCR0X-D Ultegra Di2 complete-bike listing/);
  assert.match(candidates.get('lightcarbon-lctt05-d').source_note, /indicative US\$1,150–1,450 range was rejected/);
  assert.match(candidates.get('lightcarbon-lcrxs-d').source_note, /incorrectly labels the disc model as rim brake/);
  assert.match(candidates.get('lightcarbon-lcrxs-v').source_note, /conflicts on HBR05\/HBR07/);

  const foundIds = new Set(['lightcarbon-lcr015-d', 'lightcarbon-lcr015-v', 'lightcarbon-lcr015s-d', 'lightcarbon-lcr014-d']);
  const allIds = [...foundIds, ...blockedIds];
  for (const recordId of allIds) {
    const attempt = data.researchAttempts.find((record) => record.target.record_type === 'candidate' && record.target.record_id === recordId && record.field === 'price');
    assert.ok(attempt, recordId);
    const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
    assert.equal(applications.length, 50, recordId);
    assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, recordId);
    assert.equal(attempt.status, foundIds.has(recordId) ? 'found' : 'blocked', recordId);
  }
});

test('batch 041 resolves sixteen exact fields and explicitly exhausts three LightCarbon prices across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  for (const id of ['lightcarbon-lctr003', 'lightcarbon-lctt001', 'lightcarbon-lctt004']) {
    assert.equal(candidates.get(id).observed_price, undefined, id);
    assert.match(candidates.get(id).price_status, /50 registered areas/, id);
  }

  assert.ok(variants.get('lightcarbon-lcg071s-pro-frameset').source_ids.includes('lightcarbon-faq-official-2026-09-01'));

  const tt = candidates.get('quick-pro-tt-one');
  assert.match(tt.facts.frame_weight_basis, /1,089 g ±5%.*fork 399 g ±5%/);
  assert.match(tt.facts.stiffness_evidence, /qualitative manufacturer evidence/);

  const sava = candidates.get('sava-a4');
  assert.match(sava.facts.stiffness_evidence, /independent exact-model Bilibili ride review/);

  const er = candidates.get('quick-pro-er-one');
  assert.equal(er.observed_price.amount_cny, 33940);
  assert.match(er.facts.complete_weight_basis, /carbon-spoke.*7\.1 kg ±5%/);
  assert.match(er.facts.stiffness_evidence, /independent exact-model owner review/);

  const scott = platforms.get('scott-addict-rc-40');
  assert.equal(scott.frame.material, 'HMX carbon');
  assert.equal(scott.frame.claimed_frame_weight_g, 850);
  assert.match(scott.frame.stiffness_evidence, /exact-model road test/);

  const elves = candidates.get('missing-china-price-elves-falath-evo');
  assert.equal(elves.observed_price.amount_cny, 7468);
  assert.match(elves.facts.frame_weight_basis, /1,050 g.*size 46.*unpainted/);
  assert.match(elves.facts.stiffness_evidence, /Exact-model qualitative manufacturer evidence/);

  const winspace = candidates.get('missing-china-price-winspace-t1550');
  assert.equal(winspace.observed_price.amount_cny, 12900);
  assert.match(winspace.observed_price.conditions, /embedded copy still says US\$1,780/);
  assert.match(winspace.facts.frame_weight_basis, /828 ±35 g.*size-M/);
  assert.match(winspace.facts.stiffness_evidence, /same wheels, parts and tires/);

  const targetFields = new Map([
    ['candidate:lightcarbon-lctr003', ['price']],
    ['candidate:lightcarbon-lctt001', ['price']],
    ['candidate:lightcarbon-lctt004', ['price']],
    ['variant:lightcarbon-lcg071s-pro-frameset', ['purchase-route']],
    ['candidate:quick-pro-tt-one', ['frame-weight', 'frame-stiffness']],
    ['candidate:sava-a4', ['frame-stiffness']],
    ['candidate:quick-pro-er-one', ['price', 'complete-weight', 'frame-stiffness']],
    ['platform:scott-addict-rc-40', ['frame-material', 'frame-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-elves-falath-evo', ['price', 'frame-weight', 'frame-stiffness']],
    ['candidate:missing-china-price-winspace-t1550', ['price', 'frame-weight', 'frame-stiffness']]
  ]);
  const blocked = new Set([
    'candidate:lightcarbon-lctr003:price',
    'candidate:lightcarbon-lctt001:price',
    'candidate:lightcarbon-lctt004:price'
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field && record.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 19);
});

test('batch 042 resolves thirteen exact fields and explicitly exhausts six unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  const savaVariant = variants.get('sava-a7l-r7100');
  assert.equal(savaVariant.claimed_complete_weight_g, 8600);
  assert.match(savaVariant.purchase_route, /US\$1,699.*add-to-cart/);
  const savaImage = data.images.find((image) => image.id === 'sava-a7l-r08-2026-exact-primary-image');
  assert.equal(savaImage.subject_accuracy, 'exact-variant');
  assert.equal(savaImage.source_id, 'sava-a7l-r08-current-2026-08-30');
  assert.match(savaImage.hosting.remote_url, /savadeck-bike\.com\/cdn\/shop\/files\/sava-a7l-2026/);

  assert.match(candidates.get('missing-china-price-giant-defy-advanced').facts.complete_weight_status, /50 registered source areas/);
  assert.match(candidates.get('quick-pro-gr-one-grx-di2').facts.complete_weight_status, /50 registered source areas/);
  assert.match(candidates.get('missing-china-price-quick-pro-xr-one').facts.complete_weight_status, /50 registered source areas/);

  const rinas = platforms.get('rinasclta-gr025');
  assert.match(rinas.frame.geometry_status, /50 registered source areas/);
  assert.match(variants.get('rinasclta-gr025-frameset').purchase_route, /€561.*add-to-cart/);
  const rinasPrice = data.prices.find((price) => price.id === 'rinasclta-gr025-official-2026-09-01');
  assert.equal(rinasPrice.amount_cny, 4371);
  assert.equal(rinasPrice.price_type, 'official-global-store-reference-conversion');

  const xm = platforms.get('xmcarbonspeed-cs-gr01');
  assert.equal(xm.frame.geometry.sizes.length, 6);
  assert.deepEqual(xm.frame.geometry.sizes.map((size) => size.size), ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  assert.deepEqual(xm.frame.geometry.sizes.map((size) => [size.stack_mm, size.reach_mm]), [[538, 360], [554, 368], [574, 375], [588, 382], [602, 390], [636, 398]]);
  assert.match(variants.get('xmcarbonspeed-cs-gr01-frameset').purchase_route, /US\$669.*add-to-cart/);
  const xmPrice = data.prices.find((price) => price.id === 'xmcarbonspeed-cs-gr01-official-2026-09-01');
  assert.equal(xmPrice.amount_cny, 4496);
  assert.equal(xmPrice.price_type, 'official-global-store-reference-conversion');

  const seka = candidates.get('seka-spear-rdc');
  assert.equal(seka.facts.tire_clearance_mm, 32);
  assert.match(seka.facts.complete_weight_basis, /approximately 7\.1 kg.*before pedals.*not a factory complete-bike SKU/);

  const sava = candidates.get('sava-a4');
  assert.equal(sava.observed_price.amount_cny, 9401);
  assert.equal(sava.observed_price.price_type, 'official-global-store-reference-conversion');
  assert.match(sava.facts.complete_weight_basis, /approximate.*varies by size/);

  const tt = candidates.get('quick-pro-tt-one');
  assert.equal(tt.observed_price.amount_cny, 20152);
  assert.equal(tt.observed_price.price_type, 'official-global-store-reference-conversion');

  const irefox = candidates.get('irefox-profound-400');
  assert.match(irefox.facts.complete_weight_status, /50 registered source areas/);
  assert.match(irefox.price_status, /No current exact-model stock or price after 50 registered source areas/);
  assert.equal(irefox.observed_price, undefined);

  const targetFields = new Map([
    ['variant:sava-a7l-r7100', ['image', 'complete-weight', 'purchase-route']],
    ['candidate:missing-china-price-giant-defy-advanced', ['complete-weight']],
    ['candidate:quick-pro-gr-one-grx-di2', ['complete-weight']],
    ['platform:rinasclta-gr025', ['geometry']],
    ['variant:rinasclta-gr025-frameset', ['price', 'purchase-route']],
    ['platform:xmcarbonspeed-cs-gr01', ['geometry']],
    ['variant:xmcarbonspeed-cs-gr01-frameset', ['price', 'purchase-route']],
    ['candidate:seka-spear-rdc', ['tire-clearance', 'complete-weight']],
    ['candidate:sava-a4', ['price', 'complete-weight']],
    ['candidate:quick-pro-tt-one', ['price']],
    ['candidate:missing-china-price-quick-pro-xr-one', ['complete-weight']],
    ['candidate:irefox-profound-400', ['complete-weight', 'price']]
  ]);
  const blocked = new Set([
    'candidate:missing-china-price-giant-defy-advanced:complete-weight',
    'candidate:quick-pro-gr-one-grx-di2:complete-weight',
    'platform:rinasclta-gr025:geometry',
    'candidate:missing-china-price-quick-pro-xr-one:complete-weight',
    'candidate:irefox-profound-400:complete-weight',
    'candidate:irefox-profound-400:price'
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field && record.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 19);
});

test('batch 043 resolves eighteen exact fields, exhausts five unknowns, and corrects Addict RC generation data', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  const ican = platforms.get('ican-graro');
  assert.match(ican.frame.geometry_status, /50 registered source areas/);
  assert.match(ican.frame.stiffness_evidence_status, /50 registered source areas/);
  assert.match(variants.get('ican-graro-frameset').purchase_route, /US\$899.*add-to-cart/);
  assert.equal(data.prices.find((price) => price.id === 'ican-graro-official-2026-09-01').amount_cny, 6041);

  const bigrock = candidates.get('bigrock-sohtea');
  assert.equal(bigrock.observed_price.amount_cny, 8057);
  assert.match(bigrock.facts.frame_weight_basis, /XXS 730 g.*XL 860 g.*±5%/);
  assert.match(bigrock.facts.stiffness_evidence, /qualitative ride evidence.*not an instrumented/i);
  assert.ok(data.sources.some((source) => source.id === 'china-cycling-bigrock-sohtea-long-term'));

  assert.equal(candidates.get('airwolf-yfr068').observed_price.amount_cny, 4025);
  assert.equal(candidates.get('rinasclta-q-aero-gr').observed_price.amount_cny, 4294);

  const g3 = platforms.get('winspace-g3');
  assert.deepEqual(g3.frame.geometry.sizes.map((size) => size.size), ['XS/440', 'S/460', 'M/480', 'L/510', 'XL/540']);
  assert.deepEqual(g3.frame.geometry.sizes.map((size) => [size.stack_mm, size.reach_mm]), [[539, 363], [551, 370], [568, 377], [582, 388], [601, 399]]);
  assert.equal(data.prices.find((price) => price.id === 'winspace-g3-official-2026-09-01').amount_cny, 10416);

  assert.match(platforms.get('camp-gx700').frame.geometry_status, /50 registered source areas/);

  const crux = candidates.get('specialized-crux-10r-frameset');
  assert.equal(crux.facts.frame_weight_g, 825);
  assert.match(crux.facts.frame_weight_basis, /product 223491.*1\.4 kg.*complete frameset package/);
  assert.equal(crux.observed_price.amount_cny, 20159);

  const g026 = platforms.get('spcycle-g026');
  assert.equal(g026.frame.material_grade, 'High-modulus T1000 full carbon fibre');
  assert.match(variants.get('spcycle-g026-frameset').purchase_route, /US\$998 regular \/ US\$718 sale.*add-to-cart/);
  assert.equal(data.prices.find((price) => price.id === 'spcycle-g026-official-2026-09-01').amount_cny, 4825);

  const scott = platforms.get('scott-addict-rc-40');
  assert.equal(scott.frame.geometry.source_id, 'scott-addict-rc-40-bikeradar-review-2026-09-01');
  assert.deepEqual(scott.frame.geometry.sizes.map((size) => [size.size, size.stack_mm, size.reach_mm]), [
    ['XXS/47', 504, 380], ['XS/49', 511, 388], ['S/52', 526.5, 389], ['M/54', 548, 390], ['L/56', 568.5, 395], ['XL/58', 588, 400], ['XXL/61', 606, 410]
  ]);
  assert.equal(scott.tire_clearance.eligibility, 'unverified');
  assert.equal(scott.tire_clearance.published_max_mm, undefined);
  assert.ok(!scott.source_ids.includes('scott-addict-2026-manual-2026-08-17'));
  const scottVariant = variants.get('scott-addict-rc-40');
  assert.match(scottVariant.claimed_complete_weight_basis, /model 290362: 7\.9 kg/);
  assert.match(scottVariant.purchase_route, /dealer inquiry.*size-availability/i);
  assert.ok(!scottVariant.source_ids.includes('scott-addict-2026-manual-2026-08-17'));

  const starship = candidates.get('sava-starship-r13');
  assert.match(starship.facts.complete_weight_basis, /approximately 8\.5 kg/);
  assert.match(starship.facts.frame_stiffness_status, /50 registered source areas/);

  const targetFields = new Map([
    ['platform:ican-graro', ['geometry', 'frame-stiffness']],
    ['variant:ican-graro-frameset', ['price', 'purchase-route']],
    ['candidate:bigrock-sohtea', ['price', 'frame-weight', 'frame-stiffness']],
    ['candidate:airwolf-yfr068', ['price']],
    ['candidate:rinasclta-q-aero-gr', ['price']],
    ['platform:winspace-g3', ['geometry']],
    ['variant:winspace-g3-frameset', ['price']],
    ['platform:camp-gx700', ['geometry']],
    ['candidate:specialized-crux-10r-frameset', ['price', 'frame-weight']],
    ['platform:spcycle-g026', ['frame-material']],
    ['variant:spcycle-g026-frameset', ['price', 'purchase-route']],
    ['platform:scott-addict-rc-40', ['geometry', 'tire-clearance']],
    ['variant:scott-addict-rc-40', ['complete-weight', 'purchase-route']],
    ['candidate:sava-starship-r13', ['complete-weight', 'frame-stiffness']]
  ]);
  const blocked = new Set([
    'platform:ican-graro:geometry',
    'platform:ican-graro:frame-stiffness',
    'platform:camp-gx700:geometry',
    'platform:scott-addict-rc-40:tire-clearance',
    'candidate:sava-starship-r13:frame-stiffness'
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((record) => record.target.record_type === recordType && record.target.record_id === recordId && record.field === field && record.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = attempt.required_channels.flatMap((channel) => attempt.channels[channel].attempts);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 23);
});

test('batch 044 resolves eleven exact fields and exhausts six unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  const crux = candidates.get('specialized-s-works-crux-frameset');
  assert.match(crux.facts.stiffness_evidence, /stiff frame.*qualitative ride evidence/i);
  assert.ok(crux.source_ids.includes('specialized-s-works-crux-granfondo-review-2026-09-01'));

  assert.match(candidates.get('xds-gt350').facts.tire_clearance_status, /50 registered source areas.*700×40C/);
  assert.match(candidates.get('xds-gt600').facts.tire_clearance_status, /50 registered source areas.*700×40C/);

  const agile = candidates.get('missing-china-price-winspace-agile');
  assert.equal(agile.observed_price.amount_cny, 8400);
  assert.equal(agile.facts.frame_weight_g, 850);
  assert.match(agile.facts.frame_weight_basis, /850 ±35 g/);
  assert.match(agile.facts.stiffness_evidence, /less stiff than the T1600.*10,000 km/i);

  assert.equal(variants.get('twitter-v3-2024-rs-sensah-alloy').last_reviewed, '2026-09-01');
  assert.match(platforms.get('twitter-gravel-v3').frame.claimed_frame_weight_status, /current T47 frame-only mass.*50 registered source areas/i);
  assert.match(variants.get('twitter-v3-wheeltop-eds').purchase_route, /US\$1,750.*Shenzhen manufacturer contact/);
  assert.match(variants.get('twitter-v3-rs-sensah').purchase_route, /official factory-store.*Shenzhen manufacturer contact/i);

  assert.match(variants.get('winspace-g3-frameset').purchase_route, /US\$1,550.*10–15 business-day/);
  assert.equal(candidates.get('missing-china-price-winspace-g3').observed_price.amount_cny, 27544);

  const camp = platforms.get('camp-gx700');
  assert.match(camp.frame.claimed_frame_weight_status, /No frame-only mass.*50 registered source areas/);
  assert.match(camp.frame.bottom_bracket_status, /No exact shell.*50 registered source areas/);
  assert.match(platforms.get('spcycle-g026').frame.stiffness_evidence, /No meaningful exact-model stiffness evidence.*50 registered source areas/);

  assert.equal(candidates.get('cervelo-aspero-5-current').observed_price.amount_cny, 36959);
  assert.equal(candidates.get('missing-china-price-merida-silex').reference_price_kind, 'official');

  const targetFields = new Map([
    ['candidate:specialized-s-works-crux-frameset', ['frame-stiffness']],
    ['candidate:xds-gt350', ['tire-clearance']],
    ['candidate:xds-gt600', ['tire-clearance']],
    ['candidate:missing-china-price-winspace-agile', ['price', 'frame-weight', 'frame-stiffness']],
    ['variant:twitter-v3-2024-rs-sensah-alloy', ['image']],
    ['platform:twitter-gravel-v3', ['frame-weight']],
    ['variant:twitter-v3-wheeltop-eds', ['purchase-route']],
    ['variant:twitter-v3-rs-sensah', ['purchase-route']],
    ['variant:winspace-g3-frameset', ['purchase-route']],
    ['candidate:missing-china-price-winspace-g3', ['price']],
    ['platform:camp-gx700', ['frame-weight', 'bottom-bracket']],
    ['platform:spcycle-g026', ['frame-stiffness']],
    ['candidate:cervelo-aspero-5-current', ['price']],
    ['candidate:missing-china-price-merida-silex', ['price']]
  ]);
  const blocked = new Set([
    'candidate:xds-gt350:tire-clearance',
    'candidate:xds-gt600:tire-clearance',
    'platform:twitter-gravel-v3:frame-weight',
    'platform:camp-gx700:frame-weight',
    'platform:camp-gx700:bottom-bracket',
    'platform:spcycle-g026:frame-stiffness'
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((entry) => entry.target.record_type === recordType && entry.target.record_id === recordId && entry.field === field && entry.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = Object.values(attempt.channels).flatMap((channel) => channel.attempts ?? []);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 17);
});

test('batch 045 resolves fifteen exact fields and exhausts one unknown across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));

  assert.equal(candidates.get('missing-china-price-trek-checkpoint').reference_price_kind, 'official');
  assert.equal(candidates.get('specialized-roubaix-sl8-sport-105').official_price.amount_cny, 23519);
  assert.equal(platforms.get('bxt-055').frame.geometry.sizes.length, 6);
  assert.equal(platforms.get('bxt-055').frame.geometry.sizes.find((size) => size.size === '54').stack_mm, 555.5);
  assert.match(variants.get('sava-gelaro-s4-grx400').purchase_route, /US\$1,799.*official JD storefront/);
  assert.match(variants.get('sava-gelaro-sf6-cues').purchase_route, /US\$1,499.*official JD storefront/);
  assert.equal(data.prices.find((price) => price.id === 'sava-gelaro-s4-grx400-global-official-2026-09-01').amount_cny, 12089);
  assert.equal(data.prices.find((price) => price.id === 'sava-gelaro-sf6-cues-global-official-2026-09-01').amount_cny, 10073);

  const pardus = products.find((product) => product.variant.id === 'pardus-super-sport-gen2-egr');
  assert.equal(pardus.image.id, 'pardus-super-sport-gen2-xhs-build-gallery');
  assert.equal(pardus.image.display_accuracy, 'exact-variant');
  assert.equal(pardus.image.hosting.mode, 'local');
  assert.match(candidates.get('xlab-ad8').facts.stiffness_evidence, /strong power transfer.*qualitative ride evidence/i);
  assert.match(candidates.get('xlab-ad9').facts.stiffness_evidence, /1,200 W.*qualitative wattage-context/i);
  assert.match(candidates.get('quick-pro-tr-one').facts.frame_weight_basis, /1,219 g.*5 percent tolerance/i);
  assert.match(candidates.get('quick-pro-tr-one').facts.stiffness_evidence_status, /No meaningful exact-model stiffness result.*50 registered source areas/i);
  assert.match(candidates.get('quick-pro-ur-one-frameset').facts.stiffness_evidence, /high bottom-bracket stiffness.*Specialized SL8/i);

  const targetFields = new Map([
    ['candidate:missing-china-price-trek-checkpoint', ['price']],
    ['candidate:specialized-roubaix-sl8-sport-105', ['price']],
    ['platform:bxt-055', ['geometry']],
    ['variant:sava-gelaro-s4-grx400', ['price', 'purchase-route']],
    ['variant:sava-gelaro-sf6-cues', ['price', 'purchase-route']],
    ['variant:pardus-super-sport-gen2-egr', ['image']],
    ['candidate:xlab-ad8', ['price', 'frame-stiffness']],
    ['candidate:xlab-ad9', ['price', 'frame-stiffness']],
    ['candidate:quick-pro-tr-one', ['frame-weight', 'frame-stiffness']],
    ['candidate:quick-pro-ur-one-frameset', ['frame-weight', 'frame-stiffness']]
  ]);
  const blocked = new Set(['candidate:quick-pro-tr-one:frame-stiffness']);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((entry) => entry.target.record_type === recordType && entry.target.record_id === recordId && entry.field === field && entry.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = Object.values(attempt.channels).flatMap((channel) => channel.attempts ?? []);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 16);
});

test('batch 046 resolves fifteen exact fields and exhausts seven unknowns across fifty areas', () => {
  const candidates = new Map(data.candidates.map((candidate) => [candidate.id, candidate]));
  const platforms = new Map(data.platforms.map((platform) => [platform.id, platform]));
  const variants = new Map(data.variants.map((variant) => [variant.id, variant]));
  const prices = new Map(data.prices.map((price) => [price.id, price]));

  assert.equal(prices.get('elves-mori-aerox-global-official-2026-09-01').amount_cny, 6706);
  assert.equal(prices.get('evolve-cima-gr-global-official-2026-09-01').amount_cny, 13433);
  assert.equal(prices.get('quick-gr-one-global-official-2026-09-01').amount_cny, 14105);
  assert.equal(prices.get('sava-gelaro-s8-global-official-2026-09-01').amount_cny, 14777);
  assert.equal(candidates.get('hi-light-g7-2').observed_price.amount_cny, 6500);
  assert.match(candidates.get('quick-pro-xr-one-frameset-aelous-gravel').facts.frame_weight_basis, /839 g size-M.*5%/i);
  assert.match(platforms.get('elves-mori-aerox').frame.stiffness_evidence, /18,000 km.*not instrumented/i);
  assert.match(platforms.get('evolve-cima-gr').frame.stiffness_evidence, /1.2%.*7.5%.*protocol/i);
  assert.match(platforms.get('ican-gra04').frame.stiffness_evidence, /manufacturer-hosted.*not an independent/i);
  assert.match(platforms.get('quick-gr-one').frame.stiffness_evidence, /manufacturer-hosted.*not an independent/i);
  assert.match(platforms.get('twitter-gravel-v3-2024').frame.stiffness_evidence, /No exact-2024-generation.*50-area/i);
  assert.match(variants.get('sava-gelaro-s8').purchase_route, /US\$2,199.*factory-direct/i);

  const targetFields = new Map([
    ['platform:sava-gelaro', ['frame-weight']],
    ['variant:elves-mori-aerox-frameset', ['price', 'purchase-route']],
    ['platform:elves-mori-aerox', ['frame-stiffness']],
    ['variant:evolve-cima-gr-frameset', ['price', 'purchase-route']],
    ['platform:evolve-cima-gr', ['frame-stiffness']],
    ['variant:ican-gra04-frameset', ['price', 'purchase-route']],
    ['platform:ican-gra04', ['frame-stiffness']],
    ['variant:quick-gr-one-frameset', ['price', 'purchase-route']],
    ['platform:quick-gr-one', ['frame-stiffness']],
    ['platform:sava-gelaro-sf', ['bottom-bracket']],
    ['variant:twitter-v3-2024-rs-sensah-alloy', ['purchase-route']],
    ['platform:twitter-gravel-v3-2024', ['frame-stiffness']],
    ['candidate:hi-light-g7-2', ['price', 'frame-stiffness']],
    ['platform:sava-gelaro-s8', ['frame-weight', 'bottom-bracket']],
    ['variant:sava-gelaro-s8', ['purchase-route']],
    ['candidate:quick-pro-xr-one-frameset-aelous-gravel', ['frame-weight']]
  ]);
  const blocked = new Set([
    'platform:sava-gelaro:frame-weight',
    'variant:ican-gra04-frameset:price',
    'platform:sava-gelaro-sf:bottom-bracket',
    'platform:twitter-gravel-v3-2024:frame-stiffness',
    'candidate:hi-light-g7-2:frame-stiffness',
    'platform:sava-gelaro-s8:frame-weight',
    'platform:sava-gelaro-s8:bottom-bracket'
  ]);
  let fieldCount = 0;
  for (const [target, fields] of targetFields) {
    const [recordType, recordId] = target.split(':');
    for (const field of fields) {
      fieldCount += 1;
      const key = `${target}:${field}`;
      const attempt = data.researchAttempts.find((entry) => entry.target.record_type === recordType && entry.target.record_id === recordId && entry.field === field && entry.searched_at === '2026-09-01');
      assert.ok(attempt, key);
      const applications = Object.values(attempt.channels).flatMap((channel) => channel.attempts ?? []);
      assert.equal(applications.length, 50, key);
      assert.equal(new Set(applications.map((application) => application.approach_area_id)).size, 50, key);
      assert.equal(attempt.status, blocked.has(key) ? 'blocked' : 'found', key);
    }
  }
  assert.equal(fieldCount, 22);
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

test('XHS, Taobao, and Xianyu sources use identity-safe canonical public URLs', () => {
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

  const xianyu = structuredClone(data);
  xianyu.sources.push({
    id: 'privacy-test-xianyu-source',
    type: 'marketplace-product-page',
    title: 'Exact public listing',
    publisher: 'Public seller',
    accessed_at: '2026-08-29',
    url: 'https://www.goofish.com/item?id=1075378619856',
    reliability: { identity: 'high', specification: 'medium', price: 'none' },
    notes: 'Synthetic validation fixture.'
  });
  assert.deepEqual(validateDataset(xianyu), []);
  xianyu.sources.at(-1).url += '&spm=private-referral-context';
  assert.ok(validateDataset(xianyu).some((error) => error.includes('Xianyu URL must be the identity-safe canonical item URL')));
  xianyu.sources.at(-1).url = 'https://www.goofish.com/search?q=bike';
  assert.ok(validateDataset(xianyu).some((error) => error.includes('Xianyu URL must be the identity-safe canonical item URL')));
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
  assert.equal(data.brands.length, 41);
  assert.equal(data.platforms.length, 38);
  assert.equal(data.variants.length, 41);
  assert.equal(data.prices.length, 67);
  assert.equal(data.images.length, 212);
  assert.equal(data.groupsets.length, 11);
  assert.equal(data.buildParts.length, 10);
  assert.equal(data.videos.length, 12);
  assert.ok(data.sources.length >= 313);
  assert.equal(data.candidates.length, 231);
  assert.equal(data.exclusions.length, 16);
  assert.equal(data.research.length, 1);
  assert.equal(data.researchAttempts.length, 1425);
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
  assert.deepEqual(data.meta.frameset_build_assumption.presets.map((preset) => preset.amount_cny ?? null), [6000, 7900, null, null, null]);
  assert.equal(data.meta.frameset_build_assumption.presets.find((preset) => preset.default).id, 'shimano-105-r7170');
  assert.deepEqual(
    data.meta.frameset_build_assumption.presets.filter((preset) => preset.manual_allowance).map((preset) => preset.groupset_id),
    ['magene-qed-pes', 'wheeltop-eds-tx']
  );
  assert.ok(data.meta.frameset_build_assumption.presets.filter((preset) => preset.manual_allowance).every((preset) => !Number.isFinite(preset.amount_cny) && preset.source_id));
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
  assert.equal(catalogCandidates.length, 217);
  assert.equal(catalogCandidates.filter((entry) => entry.defaultVisible).length, 209);
  assert.ok(catalogCandidates.every((entry) => !entry.candidate.existing_record_id || entry.candidate.catalog_distinct_reason));
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'missing-china-price-elves-mori-aerox'), false);
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'pardus-uragano-evo-community-lead'), false);
  assert.equal(catalogCandidates.find((entry) => entry.candidate.id === 'dengfu-gravel').defaultVisible, true);

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
  const generationUnresolvedV3 = catalogCandidates.find((entry) => entry.candidate.id === 'twitter-carbon-road-gravel-unknown');
  assert.equal(generationUnresolvedV3.defaultVisible, true);
  const genericBuild = catalogCandidates.find((entry) => entry.candidate.id === 'gito-carbon-aero-entry');
  assert.equal(genericBuild.defaultVisible, true);
  assert.equal(catalogCandidates.some((entry) => entry.candidate.id === 'java-aluminum-24s'), false);
  const vittoriaEr7 = catalogCandidates.find((entry) => entry.candidate.id === 'java-vittoria-er7-2026');
  assert.equal(vittoriaEr7.candidate.observed_price.observation_count, 5);
  assert.match(vittoriaEr7.candidate.source_refs, /IMG_6886\.png#R1/);
  assert.match(vittoriaEr7.candidate.facts.frame_material, /carbon-frame and aluminum-frame/);
  assert.match(vittoriaEr7.candidate.facts.drivetrain, /2x12 or 1x12/);
  assert.equal(vittoriaEr7.candidate.facts.complete_weight_g, undefined);
  const suprema = catalogCandidates.find((entry) => entry.candidate.id === 'java-suprema-7120');
  assert.equal(suprema.candidate.facts.complete_weight_g, 8500);
  assert.match(suprema.candidate.facts.drivetrain, /Shimano 105 R7120 mechanical 2x12/);
  assert.match(suprema.candidate.facts.tires, /not a published maximum/);
  const vega = catalogCandidates.find((entry) => entry.candidate.id === 'java-vega-tt-24s');
  assert.equal(vega.candidate.facts.complete_weight_g, 9800);
  assert.match(vega.candidate.facts.frame_material, /T800 carbon/);
  assert.match(vega.candidate.facts.drivetrain, /L-TWOO ER9 electronic 2x12/);
  const vittoriaR7170 = catalogCandidates.find((entry) => entry.candidate.id === 'java-vittoria-7170');
  assert.equal(vittoriaR7170.candidate.facts.complete_weight_g, 9200);
  assert.match(vittoriaR7170.candidate.facts.drivetrain, /Shimano 105 Di2 R7170 electronic 2x12/);
  assert.match(vittoriaR7170.candidate.facts.tires, /not a published maximum/);
  const lampo = catalogCandidates.find((entry) => entry.candidate.id === 'java-lampo-carbon-road');
  assert.equal(lampo.defaultVisible, true);
  assert.match(lampo.candidate.name, /exact model unresolved/);
  const gitoG530SellerBuild = catalogCandidates.find((entry) => entry.candidate.id === 'gito-gtv5-plus');
  assert.equal(gitoG530SellerBuild.defaultVisible, true);
  assert.match(gitoG530SellerBuild.candidate.name, /G530/);
  assert.doesNotMatch(gitoG530SellerBuild.candidate.name, /GTV5/);
  assert.equal(gitoG530SellerBuild.candidate.facts.complete_weight_g, 8300);
  const gitoWave = catalogCandidates.find((entry) => entry.candidate.id === 'gito-wave');
  assert.equal(gitoWave.defaultVisible, true);
  assert.match(gitoWave.candidate.name, /exact frame model unresolved/);
  assert.ok(!gitoWave.candidate.facts.drivetrain);
  const identifiedBxt = catalogCandidates.find((entry) => entry.candidate.id === 'bxt-gravel-complete');
  assert.equal(identifiedBxt.defaultVisible, true);
  assert.match(identifiedBxt.candidate.facts.listing_identity, /BXT-135/);

  const basso = catalogCandidates.find((entry) => entry.candidate.id === 'basso-venta-disc');
  assert.deepEqual(basso.brand, { id: 'candidate-brand-basso', name: 'BASSO' });
  const vanRysel = catalogCandidates.find((entry) => entry.candidate.id === 'missing-china-price-van-rysel-rcr');
  assert.deepEqual(vanRysel.brand, { id: 'candidate-brand-van-rysel', name: 'Van Rysel' });
  const quickEr = catalogCandidates.find((entry) => entry.candidate.id === 'quick-pro-er-one');
  assert.equal(quickEr.kind, 'complete-bike');
  assert.equal(quickEr.price.amount_cny, 33940);
  assert.equal(quickEr.price.price_type, 'official-global-store-reference-conversion');
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
  const gelaroSf = catalogCandidates.find((entry) => entry.candidate.id === 'sava-gelaro-sf');
  assert.equal(gelaroSf.candidate.facts.complete_weight_g, 10400);
  assert.equal(gelaroSf.candidate.facts.tire_clearance_mm, 45);
  assert.equal(gelaroSf.candidate.facts.drivetrain, undefined);
  const spectMira = catalogCandidates.find((entry) => entry.candidate.id === 'spect-mira');
  assert.equal(spectMira.kind, 'frameset');
  assert.equal(spectMira.brand.name_zh, '空力公式');
  assert.equal(spectMira.candidate.facts.frame_weight_g, 940);
  assert.equal(spectMira.candidate.facts.tire_clearance_mm, undefined);
  const victoryExpert = catalogCandidates.find((entry) => entry.candidate.id === 'sunpeed-victory-e-2026');
  assert.equal(victoryExpert.candidate.facts.complete_weight_g, 8100);
  assert.match(victoryExpert.candidate.facts.drivetrain, /105 Di2/);
  const invincibleSport = catalogCandidates.find((entry) => entry.candidate.id === 'sunpeed-wudi-e-2026');
  assert.equal(invincibleSport.candidate.facts.complete_weight_g, 8600);
  assert.match(invincibleSport.candidate.facts.drivetrain, /R7120 mechanical/);
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

test('LightCarbon gravel cards preserve exact current item identities and package differences', () => {
  const expected = [
    ['lightcarbon-lcg071-pro', 'lightcarbon-lcg071-pro-official-2026-08-29', 1140, 50],
    ['lightcarbon-lcg074-d', 'lightcarbon-lcg074-d-official-2026-08-29', 1230, 50],
    ['lightcarbon-lcg074s-d', 'lightcarbon-lcg074s-d-official-2026-08-29', 1230, 50],
    ['lightcarbon-lcg087-d', 'lightcarbon-lcg087-d-official-2026-08-29', 1480, 47],
    ['lightcarbon-lcg087s-d', 'lightcarbon-lcg087s-d-official-2026-08-29', 1480, 47]
  ];

  for (const [candidateId, sourceId, weight, clearance] of expected) {
    const candidate = data.candidates.find((item) => item.id === candidateId);
    assert.ok(candidate);
    assert.equal(candidate.facts.frame_weight_g, weight);
    assert.equal(candidate.facts.tire_clearance_mm, clearance);
    assert.ok(candidate.source_ids.includes(sourceId));
    assert.ok(data.sources.some((source) => source.id === sourceId));
  }

  const existing = data.platforms.find((item) => item.id === 'lightcarbon-lcg071s-pro');
  assert.ok(existing);
  assert.equal(data.platforms.filter((item) => item.id === existing.id).length, 1);
  assert.ok(existing.source_ids.includes('lightcarbon-lcg071s-official-2026-08-16'));
  assert.equal(data.sources.find((source) => source.id === 'lightcarbon-lcg071s-official-2026-08-16').url, 'https://www.lightcarbon.com/new-carbon-gravel-frameset-with-integrated-stem-system_p171.html');
  assert.equal(data.candidates.some((item) => item.id === 'lightcarbon-lcg073-d' || item.id === 'lightcarbon-lcg073s-d'), false);
});

test('LightCarbon road-frame tranche preserves exact current and legacy model boundaries', () => {
  const ids = [
    'lightcarbon-lcr018-d',
    'lightcarbon-lcr020-d',
    'lightcarbon-lcr017-d',
    'lightcarbon-lcr017s-d',
    'lightcarbon-lcr0x-d',
    'lightcarbon-lcr015-d',
    'lightcarbon-lcr015s-d',
    'lightcarbon-lcr0x-v',
    'lightcarbon-lcr015-v',
    'lightcarbon-lcr014-v'
  ];
  const records = ids.map((id) => data.candidates.find((candidate) => candidate.id === id));
  assert.ok(records.every(Boolean));
  assert.equal(records.length, 10);
  assert.equal(records.find((record) => record.id === 'lightcarbon-lcr020-d').facts.tire_clearance_mm, 35);
  assert.equal(records.find((record) => record.id === 'lightcarbon-lcr017-d').facts.frame_weight_g, 870);
  assert.match(records.find((record) => record.id === 'lightcarbon-lcr0x-d').status, /legacy-or-order-inquiry/);
  assert.ok(records.every((record) => record.source_ids.length >= 3));
});

test('KUNG, LEINAK, and Meihanda leads preserve exact names and configuration boundaries', () => {
  const kung = data.candidates.find((item) => item.id === 'kung-horizon');
  const leina = data.candidates.find((item) => item.id === 'leinax-leina-road');
  const youlong = data.candidates.find((item) => item.id === 'leinax-youlong-2');
  const phantom = data.candidates.find((item) => item.id === 'meihanda-phantom-p10');

  assert.match(kung.name, /KUNG 攻 HORIZON 天际/);
  assert.match(kung.facts.drivetrain, /R7120 mechanical 2×12/);
  assert.match(kung.source_note, /multiple distinct trims/);

  assert.match(leina.name, /^LEINAK 雷纳克 雷娜/);
  assert.match(leina.facts.frame_material, /Toray carbon/);
  assert.deepEqual(leina.alternative_builds.map((build) => build.id), [
    'jd-qiguang-niying-105-di2',
    'jd-liujin-yuelin-105-mechanical'
  ]);
  assert.match(youlong.name, /^LEINAK 雷纳克 游龙 2\.0$/);
  assert.equal(youlong.facts.drivetrain, undefined);
  assert.match(youlong.facts.listing_drivetrain, /generation.*not visible/);

  assert.equal(phantom.facts.tire_clearance_mm, 40);
  assert.match(phantom.name, /Meihanda 美涵达.*Phantom \/ 幻影 P10/);
  assert.match(phantom.facts.frame_material, /7005 aluminum.*T800 carbon fork/);
  assert.match(phantom.facts.drivetrain, /U6000 10-speed/);
  assert.match(phantom.source_note, /P10.*P12/);
});

test('Meihanda Xtreme, MEINIER, MISSILE, and MUIDLER leads preserve exact seller evidence and sibling boundaries', () => {
  const xtreme = data.candidates.find((item) => item.id === 'meihanda-xtreme-gravel');
  const meinier = data.candidates.find((item) => item.id === 'meinier-superlight-2');
  const missile = data.candidates.find((item) => item.id === 'missile-e6000');
  const muidler = data.candidates.find((item) => item.id === 'muidler-ashius-s7');

  assert.match(xtreme.name, /^Meihanda 美涵达 \/ Xtreme/);
  assert.match(xtreme.facts.frame_material, /carbon-fiber gravel bike/);
  assert.equal(xtreme.facts.drivetrain, undefined);
  assert.match(xtreme.source_note, /Phantom.*distinct/);

  assert.equal(meinier.observed_price.amount_cny, 21000);
  assert.match(meinier.observed_price.correction_note, /dropped one zero/);
  assert.equal(meinier.facts.drivetrain, undefined);
  assert.deepEqual(meinier.alternative_builds.map((build) => build.id), [
    'official-ds118-frameset-reference',
    'official-ds618-r7120-reference'
  ]);
  assert.match(meinier.source_note, /not transferred/);

  assert.equal(missile.name, 'MISSILE 米赛尔 水星6000');
  assert.equal(missile.facts.complete_weight_g, 9300);
  assert.match(missile.facts.drivetrain, /SENSAH 2×12/);
  assert.match(missile.source_note, /破风6000.*not merged/);

  assert.equal(muidler.name, 'MUIDLER 媚影 阿修斯 S7');
  assert.equal(muidler.facts, undefined);
  assert.match(muidler.source_note, /truncated immediately after 全/);
  assert.match(muidler.source_note, /阿瑞斯 R7.*none is transferred/i);
});

test('NSCR, PARAGON JAZZ, original PARDUS Super Sport, and PHILLIPS SACHEM preserve exact evidence boundaries', () => {
  const nscr = data.candidates.find((item) => item.id === 'nscr-carbon-gravel-storage');
  const jazz = data.candidates.find((item) => item.id === 'paragon-jazz-2026');
  const superSport = data.candidates.find((item) => item.id === 'pardus-super-sport');
  const sachem = data.candidates.find((item) => item.id === 'phillips-carbon-road-unknown');

  assert.equal(nscr.facts.complete_weight_g, 8500);
  assert.match(nscr.facts.frame_material, /carbon-fiber gravel/i);
  assert.equal(nscr.facts.drivetrain, undefined);
  assert.match(nscr.source_note, /exact model.*legal entity/i);

  assert.equal(jazz.name, 'PARAGON 鹏来格 JAZZ 2026');
  assert.match(jazz.facts.drivetrain, /105 R7100 mechanical 2×12/);
  assert.match(jazz.facts.frame_material, /carbon-fiber frame/i);
  assert.match(jazz.source_note, /JAZZ Plus.*separate/i);

  assert.match(superSport.name, /original generation/);
  assert.match(superSport.facts.drivetrain, /R7000 mechanical 2×11/);
  assert.match(superSport.facts.frame_material, /HS-EPS carbon frame.*HS-HPT carbon fork/);
  assert.equal(superSport.facts.complete_weight_g, undefined);
  assert.match(superSport.source_note, /9\.5 kg.*not transferred/i);
  assert.ok(data.candidates.some((item) => item.id === 'pardus-super-sport-gen2'));

  assert.equal(sachem.name, 'PHILLIPS 菲利普 SACHEM 24-speed');
  assert.equal(sachem.facts.complete_weight_g, 8500);
  assert.match(sachem.facts.drivetrain, /2×12/);
  assert.match(sachem.facts.frame_material, /carbon frame.*carbon aero fork/i);
  assert.equal(sachem.facts.tire_clearance_mm, undefined);
  assert.match(sachem.facts.tires, /not a published maximum-clearance/i);
  assert.match(sachem.source_note, /浙江菲利普车业有限公司/);
});

test('remaining LightCarbon road, TT and track catalog entries retain exact identities', () => {
  const ids = [
    'lightcarbon-lcrxs-v',
    'lightcarbon-lcrxs-d',
    'lightcarbon-lcr015s-v',
    'lightcarbon-lcr007-v',
    'lightcarbon-lcr014-d',
    'lightcarbon-lctt05-d',
    'lightcarbon-lctt004',
    'lightcarbon-lctr003',
    'lightcarbon-lctt001'
  ];
  const records = ids.map((id) => data.candidates.find((candidate) => candidate.id === id));
  assert.ok(records.every(Boolean));
  assert.equal(records.find((record) => record.id === 'lightcarbon-lcr007-v').facts.frame_weight_g, 875);
  assert.equal(records.find((record) => record.id === 'lightcarbon-lctt05-d').facts.tire_clearance_mm, 28);
  assert.equal(records.find((record) => record.id === 'lightcarbon-lctr003').category, 'track');
  assert.ok(records.every((record) => record.source_ids.length >= 3));
  assert.ok(records.every((record) => record.facts.frame_material && record.facts.frame_weight_basis));
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
  assert.equal(meinier.observed_price.amount_cny, 21000);
  assert.equal(rollingStone.observed_price.amount_cny, 15000);
  assert.match(meinier.observed_price.correction_note, /shows ¥21,000.*dropped one zero/);
  assert.match(rollingStone.observed_price.correction_note, /show ¥15,000.*¥1,500 transcription was incorrect/);
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
  const imagedPlatforms = new Set(platformImages.filter((image) => image.role === 'primary').map((image) => image.platform_id));
  assert.equal(imagedPlatforms.size, data.platforms.length);
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
  assert.equal(data.images.filter((image) => image.hosting.mode === 'remote').length, 198);
  assert.equal(data.images.filter((image) => image.candidate_id).length, 122);
  assert.equal(data.images.filter((image) => image.rights.status === 'source-attributed-rehost').length, 12);
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
  assert.equal(publishedVideos.length, 5);
  assert.equal(candidateVideos.length, 7);
  assert.ok(publishedVideos.every((video) => video.match === 'exact-platform'));
  assert.ok(candidateVideos.every((video) => video.match === 'exact-model-lead'));
  assert.ok(data.videos.every((video) => video.disclosure.length >= 20));
  assert.equal(products.find((product) => product.platform.id === 'yoeleo-altera-g21').videos[0].channel_name, 'China Cycling');
  assert.equal(products.find((product) => product.platform.id === 'winspace-g3').videos.length, 0);

  const malformed = structuredClone(data);
  malformed.videos[0].url = 'https://www.youtube.com/watch?v=wrong-id';
  assert.ok(validateDataset(malformed).some((error) => error.includes('URL must match its YouTube video ID')));

  const mismatchedTarget = structuredClone(data);
  mismatchedTarget.candidates.find((candidate) => candidate.id === 'quick-pro-er-one').video_ids = ['china-cycling-incolor-ssr-published'];
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
  assert.equal(pardus.image.display_accuracy, 'exact-variant');
});

test('published images stay credited while incomplete builds remain candidates', () => {
  const ican = products.find((product) => product.platform.id === 'ican-gra04');
  const trinx = data.candidates.find((candidate) => candidate.id === 'trinx-gtr-c6');
  assert.equal(ican.image.hosting.mode, 'remote');
  assert.equal(ican.image.display_accuracy, 'exact-variant');
  assert.equal(ican.image.rights.status, 'official-page-embed');
  assert.equal(trinx.status, 'exact-carbon-1x12-core-specs-verified');
  assert.ok(trinx.missing.some((item) => /complete-bike weight/i.test(item)));
  assert.ok(trinx.missing.some((item) => /maximum tire clearance/i.test(item)));
});
