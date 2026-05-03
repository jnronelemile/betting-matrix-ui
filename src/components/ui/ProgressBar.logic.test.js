import { test } from 'node:test';
import assert from 'node:assert';
import { calculatePercentage } from './ProgressBar.logic.js';

test('calculatePercentage handles normal values', () => {
  assert.strictEqual(calculatePercentage(0.5, 1), 50);
  assert.strictEqual(calculatePercentage(25, 100), 25);
  assert.strictEqual(calculatePercentage(0, 100), 0);
  assert.strictEqual(calculatePercentage(100, 100), 100);
});

test('calculatePercentage caps at 100%', () => {
  assert.strictEqual(calculatePercentage(1.5, 1), 100);
  assert.strictEqual(calculatePercentage(200, 100), 100);
});

test('calculatePercentage floors at 0%', () => {
  assert.strictEqual(calculatePercentage(-0.5, 1), 0);
  assert.strictEqual(calculatePercentage(-50, 100), 0);
});

test('calculatePercentage handles division by zero', () => {
  assert.strictEqual(calculatePercentage(10, 0), 0);
});

test('calculatePercentage uses default max = 1', () => {
  assert.strictEqual(calculatePercentage(0.75), 75);
  assert.strictEqual(calculatePercentage(1.2), 100);
  assert.strictEqual(calculatePercentage(-0.1), 0);
});
