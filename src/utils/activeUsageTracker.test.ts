import test from 'node:test';
import assert from 'node:assert';
import { formatSmartDuration, formatSmartDurationFromSeconds } from './activeUsageTracker';

test('formatSmartDuration under 60 minutes formats as minutes with 1 decimal place', () => {
  const result = formatSmartDuration(45.24);
  assert.strictEqual(result.unit, 'phút');
  assert.strictEqual(result.value, '45.2');
  assert.strictEqual(result.full, '45.2 phút');

  const zero = formatSmartDuration(0);
  assert.strictEqual(zero.unit, 'phút');
  assert.strictEqual(zero.value, '0.0');
  assert.strictEqual(zero.full, '0.0 phút');

  const boundary = formatSmartDuration(59.9);
  assert.strictEqual(boundary.unit, 'phút');
  assert.strictEqual(boundary.value, '59.9');
});

test('formatSmartDuration between 60 minutes and 24 hours formats as hours with 1 decimal place', () => {
  const result = formatSmartDuration(90); // 1.5 hours
  assert.strictEqual(result.unit, 'giờ');
  assert.strictEqual(result.value, '1.5');
  assert.strictEqual(result.full, '1.5 giờ');

  const sixty = formatSmartDuration(60); // 1.0 hour
  assert.strictEqual(sixty.unit, 'giờ');
  assert.strictEqual(sixty.value, '1.0');
  assert.strictEqual(sixty.full, '1.0 giờ');

  const boundary = formatSmartDuration(1439); // ~24.0 hours
  assert.strictEqual(boundary.unit, 'giờ');
  assert.strictEqual(boundary.value, '24.0');
});

test('formatSmartDuration over 24 hours (1440 mins) formats as days with 1 decimal place', () => {
  const result = formatSmartDuration(2880); // 2 days
  assert.strictEqual(result.unit, 'ngày');
  assert.strictEqual(result.value, '2.0');
  assert.strictEqual(result.full, '2.0 ngày');

  const fractional = formatSmartDuration(3024); // 2.1 days
  assert.strictEqual(fractional.unit, 'ngày');
  assert.strictEqual(fractional.value, '2.1');
  assert.strictEqual(fractional.full, '2.1 ngày');
});

test('formatSmartDurationFromSeconds handles seconds accurately', () => {
  const res = formatSmartDurationFromSeconds(3600); // 60 mins -> 1.0 giờ
  assert.strictEqual(res.unit, 'giờ');
  assert.strictEqual(res.value, '1.0');
  assert.strictEqual(res.full, '1.0 giờ');
});
