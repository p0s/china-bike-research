// Buyer-facing shifting class for catalog filters and labels.
// Published variants carry an explicit `drivetrain.shifting` fact. Research-lead
// drivetrain text is classified only from an explicit word or an exact system name;
// offered alternatives, conflicts and unnamed systems stay unknown, and a frame
// record never receives a drivetrain class.
export const SHIFTING_CLASSES = ['electronic', 'mechanical', 'frame-only', 'unknown'];

// Electronic systems documented in the Groupsets reference, plus Shimano's
// electronic-only lever/derailleur codes and 12-speed Ultegra/Dura-Ace series.
const electronic = /\belectronic\b|电子变速|电变|Di2|\bAXS\b|\beTap\b|\bEDS\b|\be(?:RX|R9|R7|GR)\b|\bPES\b|\bQED\b|\b(?:ST|RD|FD)-R(?:7150|7170|8150|8170|9250|9270)\b|\bR(?:8150|9250|9270)\b|\bRX(?:717|815|825|827)\b/i;
// Shimano and SRAM series that are mechanical by the maker's own naming.
const mechanical = /\bmechanical\b|机械|\bR7120\b|\bR70[02]0\b|\bR80[02]0\b|\bR47[02]0\b|\bTiagra\b|\bSora\b|\bClaris\b|\bCUES\b|\bU6000\b|\bRX-?(?:400|600|610|810|812|820|822)\b|\bGRX\s*(?:RX-?)?8[12]0\b|\bRD-M[5-9]100\b|\bForce 22\b|\bRival 22\b|\bApex 1[×x]11\b/i;
const unresolved = /(?:drivetrain|groupset|shifting)[^.;]*\b(?:unresolved|not established|unconfirmed)\b/i;

export function classifyDrivetrainText(text) {
  const value = String(text ?? '').trim();
  const isElectronic = electronic.test(value);
  const isMechanical = mechanical.test(value);
  // Alternatives or conflicts ("R7120 mechanical or 105 Di2") are not one build.
  if (isElectronic === isMechanical || unresolved.test(value)) return 'unknown';
  return isElectronic ? 'electronic' : 'mechanical';
}

export function variantShiftingClass(variant) {
  if (variant?.kind === 'frameset') return 'frame-only';
  const shifting = variant?.drivetrain?.shifting;
  if (shifting === 'mechanical') return 'mechanical';
  if (shifting === 'electronic' || shifting === 'electronic-wireless') return 'electronic';
  return 'unknown';
}

export function candidateShiftingClass(entry) {
  if (entry?.kind === 'frameset') return 'frame-only';
  return classifyDrivetrainText(entry?.candidate?.facts?.drivetrain);
}
