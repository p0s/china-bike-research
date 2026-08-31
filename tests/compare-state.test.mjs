import test from 'node:test';
import assert from 'node:assert/strict';
import { moveSelectionId } from '../assets/compare-state.js';

test('comparison selections move one column without losing identity or mutating input', () => {
  const original = ['speedster', 'voyager', 'lightcarbon', 'tavelo'];
  assert.deepEqual(moveSelectionId(original, 'lightcarbon', -1), ['speedster', 'lightcarbon', 'voyager', 'tavelo']);
  assert.deepEqual(moveSelectionId(original, 'voyager', 1), ['speedster', 'lightcarbon', 'voyager', 'tavelo']);
  assert.deepEqual(original, ['speedster', 'voyager', 'lightcarbon', 'tavelo']);
});

test('comparison selection moves are stable at boundaries and for unknown ids', () => {
  const original = ['speedster', 'voyager', 'tavelo'];
  assert.deepEqual(moveSelectionId(original, 'speedster', -1), original);
  assert.deepEqual(moveSelectionId(original, 'tavelo', 1), original);
  assert.deepEqual(moveSelectionId(original, 'arden', 1), original);
});
