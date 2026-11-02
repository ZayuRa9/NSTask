import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInlineFormatting, removeInlineFormatting, sanitizeAdministrativeText } from './textFormatting';

test('applyInlineFormatting wraps selected text in bold and toggles off', () => {
  const original = 'Xin chào thế giới';
  // Select "thế giới" (index 9 to 17)
  const formatted = applyInlineFormatting(original, 9, 17, 'bold');
  assert.equal(formatted.newText, 'Xin chào **thế giới**');

  // Now toggle bold on the wrapped string
  const untoggled = applyInlineFormatting(formatted.newText, 9, 9 + '**thế giới**'.length, 'bold');
  assert.equal(untoggled.newText, 'Xin chào thế giới');
});

test('applyInlineFormatting wraps selected text in underline and strikethrough', () => {
  const original = 'Cần kiểm tra kỹ hợp đồng';
  const underlined = applyInlineFormatting(original, 4, 15, 'underline'); // "kiểm tra kỹ"
  assert.equal(underlined.newText, 'Cần <u>kiểm tra kỹ</u> hợp đồng');

  const struck = applyInlineFormatting('Xóa mục này', 4, 11, 'strikethrough'); // "mục này"
  assert.equal(struck.newText, 'Xóa ~~mục này~~');
});

test('applyInlineFormatting wraps in highlight and color tags', () => {
  const original = 'Ưu tiên cao nhất';
  const highlighted = applyInlineFormatting(original, 0, 7, 'highlight'); // "Ưu tiên"
  assert.equal(highlighted.newText, '==Ưu tiên== cao nhất');

  const colored = applyInlineFormatting(original, 8, 16, 'color', '#dc2626'); // "cao nhất"
  assert.equal(colored.newText, 'Ưu tiên [color=#dc2626]cao nhất[/color]');
});

test('applyInlineFormatting handles empty selection with placeholders', () => {
  const empty = '';
  const boldPlaceholder = applyInlineFormatting(empty, 0, 0, 'bold');
  assert.equal(boldPlaceholder.newText, '**in đậm**');
  assert.equal(boldPlaceholder.newStart, 2);
  assert.equal(boldPlaceholder.newEnd, 2 + 'in đậm'.length);

  const underlinePlaceholder = applyInlineFormatting(empty, 0, 0, 'underline');
  assert.equal(underlinePlaceholder.newText, '<u>gạch chân</u>');

  const colorPlaceholder = applyInlineFormatting(empty, 0, 0, 'color', '#2563eb');
  assert.equal(colorPlaceholder.newText, '[color=#2563eb]văn bản màu[/color]');
});

test('removeInlineFormatting strips all markup from selected region', () => {
  const formatted = 'Đoạn văn **đậm**, <u>gạch chân</u>, [color=#dc2626]đỏ[/color] và ==nổi bật==';
  const stripped = removeInlineFormatting(formatted, 0, formatted.length);
  assert.equal(stripped.newText, 'Đoạn văn đậm, gạch chân, đỏ và nổi bật');
});

test('sanitizeAdministrativeText removes asterisks and brackets cleanly', () => {
  const sample = '**Thời gian:** 08:30 - Ngày [DD/MM/YYYY] tại [Phòng họp 1] *Lưu ý quan trọng*';
  const clean = sanitizeAdministrativeText(sample);
  assert.equal(clean, 'Thời gian: 08:30 - Ngày DD/MM/YYYY tại Phòng họp 1 Lưu ý quan trọng');

  const sampleChecklist = '- [ ] Hoàn thiện biên bản cuộc họp';
  const cleanChecklist = sanitizeAdministrativeText(sampleChecklist);
  assert.equal(cleanChecklist, '- Hoàn thiện biên bản cuộc họp');
});
