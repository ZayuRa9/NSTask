import test from 'node:test';
import assert from 'node:assert/strict';
import { getUnitColorStyle, getTaskCardColorStyle } from './unitTheme';

test('getUnitColorStyle returns distinct color styling for known units', () => {
  const youthStyle = getUnitColorStyle('Ban Thanh Niên');
  assert.ok(youthStyle.badgeClass.includes('blue'));
  assert.equal(youthStyle.dotClass, 'bg-blue-600');

  const branchStyle = getUnitColorStyle('Chi hội 1');
  assert.ok(branchStyle.badgeClass.includes('teal'));
  assert.equal(branchStyle.dotClass, 'bg-teal-600');

  const propagandaStyle = getUnitColorStyle('Ban Tuyên Giáo');
  assert.ok(propagandaStyle.badgeClass.includes('amber'));

  const financeStyle = getUnitColorStyle('Phòng Kế Toán');
  assert.ok(financeStyle.badgeClass.includes('emerald'));
});

test('getUnitColorStyle handles unknown or arbitrary units deterministically', () => {
  const custom1 = getUnitColorStyle('Đội Tình Nguyện Số 5');
  const custom2 = getUnitColorStyle('Đội Tình Nguyện Số 5');
  assert.equal(custom1.badgeClass, custom2.badgeClass);
  assert.ok(custom1.badgeClass.length > 0);
});

test('getTaskCardColorStyle returns high-contrast styling for overdue and priorities', () => {
  const overdueStyle = getTaskCardColorStyle('medium', true);
  assert.ok(overdueStyle.cardClass.includes('border-rose-400'));
  assert.equal(overdueStyle.accentBarClass, 'bg-rose-600');

  const highStyle = getTaskCardColorStyle('high', false);
  assert.ok(highStyle.cardClass.includes('border-rose-200'));

  const mediumStyle = getTaskCardColorStyle('medium', false);
  assert.ok(mediumStyle.cardClass.includes('border-amber-200'));

  const lowStyle = getTaskCardColorStyle('low', false);
  assert.ok(lowStyle.cardClass.includes('border-emerald-200'));
});
