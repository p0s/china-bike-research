import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDrivetrainText, variantShiftingClass, candidateShiftingClass } from '../src/lib/shifting.mjs';
import { loadDataset, joinProducts, joinCatalogCandidates } from '../src/lib/data.mjs';
import { catalogSummaries } from '../src/render.mjs';

test('drivetrain text is classified only from explicit words or exact system names', () => {
  const cases = [
    ['Shimano 105 Di2 2×12', 'electronic'],
    ['Shimano 105 R7120 2×12', 'mechanical'],
    ['Shimano 105 mechanical 2x12 with R7120 controls and R7170 hydraulic disc brakes', 'mechanical'],
    ['Shimano 105 R7120 mechanical 2x12 with hydraulic BR-R7170 disc brakes', 'mechanical'],
    ['Custom build: Shimano 105 mechanical with R8170 crank/chain upgrade', 'mechanical'],
    ['Shimano Dura-Ace R9270 2×12', 'electronic'],
    ['Shimano GRX 1×12: ST-RX825 controls, RD-RX827 rear derailleur', 'electronic'],
    ['Shimano GRX RX-820 2×12 with FSA Omega 48/32 crank', 'mechanical'],
    ['SRAM Apex AXS 1×12 with X1 Eagle AXS rear derailleur', 'electronic'],
    ['SRAM Apex 1×11, 11–42T', 'mechanical'],
    ['Magene PES 1×12', 'electronic'],
    ['Shimano Tiagra R4720 2×10', 'mechanical'],
    ['Shimano U6000 10-speed', 'mechanical'],
    ['Shimano Ultegra electronic; exact series unconfirmed', 'electronic'],
    // Alternatives, conflicts and unnamed systems stay unknown rather than guessed.
    ['Shimano 105 R7120 mechanical or 105 Di2 R7170 electronic 2×12', 'unknown'],
    ['Shimano 105 mechanical 2×12 or Shimano 105 Di2 2×12', 'unknown'],
    ['Prior index reported Shimano 105 R7100 mechanical 2×12; current JD title says 105Di2', 'unknown'],
    ['Offered with SENSAH HRD6900, WheelTop EDS TX wireless or Shimano 105 R7120', 'unknown'],
    ['Detailed copy describes R7120/R7170 parts, so the exact drivetrain model and shifting layout are unresolved.', 'unknown'],
    ['Shimano 105 2×12', 'unknown'],
    ['Shimano GRX 12-speed', 'unknown'],
    ['L-TWOO RX 2×12 hydraulic', 'unknown'],
    ['24-speed', 'unknown'],
    ['', 'unknown']
  ];
  for (const [text, expected] of cases) assert.equal(classifyDrivetrainText(text), expected, text);
});

test('frame records never receive a drivetrain class', () => {
  assert.equal(variantShiftingClass({ kind: 'frameset', drivetrain: { shifting: 'mechanical' } }), 'frame-only');
  assert.equal(candidateShiftingClass({ kind: 'frameset', candidate: { facts: { drivetrain: 'Mechanical and Di2 compatible' } } }), 'frame-only');
  assert.equal(variantShiftingClass({ kind: 'complete-bike', drivetrain: { shifting: 'electronic-wireless' } }), 'electronic');
  assert.equal(variantShiftingClass({ kind: 'complete-bike', drivetrain: { shifting: 'mechanical' } }), 'mechanical');
});

test('every catalog row carries one shifting class and frames stay frame-only', () => {
  const data = loadDataset();
  const summaries = catalogSummaries({ data, products: joinProducts(data), catalogCandidates: joinCatalogCandidates(data) });
  for (const summary of summaries) {
    assert.ok(['electronic', 'mechanical', 'frame-only', 'unknown'].includes(summary.shifting), summary.id);
    if (summary.kind === 'frameset') assert.equal(summary.shifting, 'frame-only', summary.id);
    if (summary.shifting === 'frame-only') assert.equal(summary.kind, 'frameset', summary.id);
  }
  // "Wireless" in a published label means the reviewed system is fully wireless.
  for (const summary of summaries.filter((item) => /fully wireless/.test(item.drivetrainSubline ?? ''))) {
    assert.match(summary.drivetrain, /WheelTop/, summary.id);
  }
});
