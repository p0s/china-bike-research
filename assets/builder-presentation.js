import { translate } from './i18n.js';
import { numberOrNull, restoreBuildState } from './state-utils.js';

export function buildCompatibilityMessages(base, covered, selectedPart, selections) {
  const messages = [];
  const bottomBracket = covered.has('bottom-bracket') ? null : selectedPart('bottom-bracket');
  const acceptedShells = bottomBracket?.compatibility?.accepted_frame_shells
    || bottomBracket?.compatibility?.frame_bottom_bracket
    || [];
  if (bottomBracket && (!base.bottomBracketKey || base.bottomBracketStatus === 'conflicting')) messages.push('Bottom bracket shell is unresolved or conflicting; confirm the exact frame standard before selecting this part.');
  if (bottomBracket && base.bottomBracketKey && acceptedShells.length && !acceptedShells.includes(base.bottomBracketKey)) {
    messages.push(`${bottomBracket.maker} ${bottomBracket.name} does not list ${base.bottomBracket} frame compatibility.`);
  }
  const tires = covered.has('tires') ? null : selectedPart('tires');
  const tireWidth = Number(tires?.compatibility?.nominal_tire_width_mm ?? tires?.compatibility?.tire_width_mm);
  const drivetrain = selectedPart('drivetrain');
  const layout = drivetrain?.compatibility?.drivetrain_layout
    || (selections.drivetrain === 'included' ? base.drivetrainLayout : null);
  const limits = base.tireClearanceByDrivetrain;
  const clearanceLimit = limits
    ? (layout ? numberOrNull(limits[layout]) : null)
    : numberOrNull(base.tireClearanceMm);
  if (limits && !layout) messages.push(`Confirm drivetrain: tire limits are ${limits.single ?? 'unknown'}/${limits.double ?? 'unknown'} mm (1×/2×). Choose a known layout before using these limits; an unknown layout has no confirmed maximum.`);
  if (tires && clearanceLimit === null) messages.push('Tire clearance for the selected frame and drivetrain is not recorded; confirm it before buying.');
  if (tires && Number.isFinite(tireWidth) && Number.isFinite(clearanceLimit) && tireWidth > clearanceLimit) {
    messages.push(`${tireWidth} mm tires exceed the frame's published ${clearanceLimit} mm limit${layout ? ` for ${layout === 'single' ? '1×' : '2×'}` : ''}.`);
  }
  if (base.tireClearanceStatus === 'manufacturer-revision-conflict') messages.push('Manufacturer tire-clearance revisions conflict; the recorded limit is a conservative warning threshold. Confirm the exact generation and manual before buying.');
  const shifting = drivetrain?.compatibility?.shifting_type;
  const support = base.drivetrainCompatibility;
  if (support && (!shifting || !layout)) messages.push('Confirm shifting type and chainring layout against the frame’s manufacturer-supported combinations.');
  if (support && shifting && layout && support[shifting]?.[layout] === false) messages.push('The manufacturer does not support this shifting type and chainring layout on the selected frame.');
  if (support && typeof support === 'object') {
    if (shifting && layout && support[shifting]?.[layout] == null) messages.push('This shifting and chainring combination is not confirmed by the frame’s manufacturer. Confirm it before buying.');
    if (layout === 'single' && Number.isFinite(support.single_max_chainring_teeth)) {
      const teeth = drivetrain?.compatibility?.largest_chainring_teeth;
      if (!Number.isInteger(teeth) || teeth <= 0) messages.push('Confirm the selected 1× chainring tooth count against the manufacturer’s published maximum.');
      else if (teeth > support.single_max_chainring_teeth) messages.push(`${teeth}T chainring exceeds the frame's published ${support.single_max_chainring_teeth}T 1× maximum.`);
    }
    if (support.electronic_wireless_only && shifting === 'electronic') {
      const wireless = drivetrain?.compatibility?.wireless_shifting;
      if (wireless === false) messages.push('This frame requires wireless electronic shifting; the selected drivetrain is recorded as wired.');
      else if (wireless !== true) messages.push('Confirm that the selected electronic drivetrain meets the frame’s wireless-shifting requirement.');
    }
    if (support.supported_manufacturers?.length) {
      const maker = drivetrain?.maker?.trim().toLowerCase();
      if (!maker) messages.push('Confirm the drivetrain manufacturer against the frame’s documented supported brands.');
      else if (!support.supported_manufacturers.includes(maker)) messages.push('The selected drivetrain manufacturer is outside the frame’s documented support. Confirm exact compatibility before buying.');
    }
  }
  const wheelset = covered.has('wheelset') ? null : selectedPart('wheelset');
  const rotors = covered.has('rotors') ? null : selectedPart('rotors');
  const rotorMount = rotors?.compatibility?.rotor_mount;
  const hubMount = wheelset?.compatibility?.rotor_mount;
  if (rotorMount && hubMount && rotorMount !== hubMount) {
    messages.push(`Rotors use ${rotorMount}, but the wheelset lists ${hubMount}; confirm a compatible rotor or explicitly supported adapter.`);
  }
  const requiredFreehub = drivetrain?.compatibility?.required_freehub;
  const availableFreehubs = wheelset?.compatibility?.freehubs || [];
  if (requiredFreehub && availableFreehubs.length && !availableFreehubs.includes(requiredFreehub)) {
    messages.push(`${drivetrain.maker} ${drivetrain.name} requires ${requiredFreehub}; the selected wheelset does not list it.`);
  }
  return messages;
}

export const formatBuildYuan = value => `¥${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
export const formatBuildPriceRange = (low, high) => low === high ? formatBuildYuan(low) : `${formatBuildYuan(low)}–${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(high))}`;
export const formatBuildWeight = grams => grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`;

// Match the existing bare-visit defaults; shared URLs and saved drafts still restore in the browser.
export function initialBuildPresentation(data) {
  const state = restoreBuildState(data, new URLSearchParams());
  const base = data.bases.find(item => item.id === state.baseId);
  if (!base) return null;
  const isComplete = base.kind === 'complete-bike';
  const selectedPart = slot => data.parts.find(part => part.id === state.selections[slot]) ?? null;
  const covered = new Map();
  for (const slot of data.slots) for (const other of selectedPart(slot)?.covers ?? []) {
    if (!covered.has(other)) covered.set(other, selectedPart(slot));
  }
  let priceLow = numberOrNull(base.priceLow) ?? 0;
  let priceHigh = numberOrNull(base.priceHigh ?? base.priceLow) ?? priceLow;
  let weight = numberOrNull(base.baseWeightG) ?? 0;
  let missingPrices = numberOrNull(base.priceLow) === null ? 1 : 0;
  let missingWeights = (numberOrNull(base.baseWeightG) === null ? 1 : 0) + (isComplete ? 0 : 1);
  const rows = new Map();
  for (const slot of data.slots) {
    const coveringPart = covered.get(slot), part = selectedPart(slot);
    const included = isComplete && state.selections[slot] === 'included';
    if (coveringPart || included) {
      rows.set(slot, { covered: Boolean(coveringPart), included, price: 'Included', weight: coveringPart ? 'Counted once' : 'In base weight', basis: included ? 'Included in the complete-bike package' : '', coveredNote: coveringPart ? `Included in ${coveringPart.maker} ${coveringPart.name}; not counted again.` : '', customHidden: true, priceHidden: true, weightHidden: true, source: null });
      continue;
    }
    const price = numberOrNull(part?.priceCny), grams = numberOrNull(part?.weightG);
    if (price === null) missingPrices++; else { priceLow += price; priceHigh += price; }
    if (grams === null) missingWeights++; else weight += grams;
    rows.set(slot, { covered: false, included: false, price: price === null ? '—' : formatBuildYuan(price), weight: grams === null ? '—' : formatBuildWeight(grams), basis: part ? [part.priceDate, part.priceBasis, part.weightBasis, part.note].filter(Boolean).join(' · ') : 'Buyer-entered value', coveredNote: '', customHidden: price !== null && grams !== null, priceHidden: price !== null, weightHidden: grams !== null, source: part?.source ?? null });
  }
  return {
    base, isComplete, state, rows,
    price: `${formatBuildPriceRange(priceLow, priceHigh)}${missingPrices ? ` known + ${missingPrices} unknown` : ''}`,
    weight: `${formatBuildWeight(weight)}${missingWeights ? ` ${isComplete ? 'base / known deltas' : 'known'} + ${missingWeights} unknown` : ''}`,
    completeness: missingPrices || missingWeights ? `${isComplete ? 'Purchase total' : 'Complete price'} needs ${missingPrices} more input${missingPrices === 1 ? '' : 's'}; ${isComplete ? 'projected weight' : 'complete weight'} needs ${missingWeights} more input${missingWeights === 1 ? '' : 's'}.` : isComplete ? 'Purchase price and every replacement weight delta are resolved.' : 'Every required slot has a price and weight.',
    conflicts: buildCompatibilityMessages(base, covered, selectedPart, state.selections)
  };
}

export function buildBaseFacts(base, locale) {
  return [
    `${base.kind === 'complete-bike' ? 'Complete bike' : 'Frameset'}${base.stage === 'candidate' ? ' · research stage' : ''}`,
    base.bottomBracket || 'bottom bracket unknown',
    base.tireClearanceLabel ? `${base.tireClearanceLabel} tire clearance` : base.tireClearanceMm ? `${base.tireClearanceMm} mm tire clearance` : 'tire clearance unknown',
    base.included.length ? base.included.join(', ') : 'package contents incomplete',
    base.priceNote || '', base.weightBasis || '', base.tireClearanceNote || '',
    base.drivetrainCompatibility?.note ? translate(base.drivetrainCompatibility.note, locale) : '',
    base.forkCaliperNote || ''
  ].filter(Boolean).join(' · ');
}
