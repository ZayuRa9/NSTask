import test from 'node:test';
import assert from 'node:assert/strict';
import { extractKeywordsAndTags } from './voiceAnalysis';

test('extractKeywordsAndTags extracts tags and notable keywords from voice speech', () => {
  const speech = 'Hoàn thành dự thảo báo cáo tài chính quý 4 trước thứ sáu cho Ban Thanh Niên, mức độ rất khẩn cấp';
  const result = extractKeywordsAndTags(speech, 'Ban Thanh Niên');

  assert.ok(result.tags.includes('Khẩn cấp'), 'Should tag as Khẩn cấp');
  assert.ok(result.tags.includes('Báo cáo'), 'Should tag as Báo cáo');
  assert.ok(result.tags.includes('Tài chính & Dự toán'), 'Should tag as Tài chính');
  assert.ok(result.tags.includes('Ban Thanh Niên'), 'Should include unit hint tag');
  assert.ok(result.keywords.length > 0, 'Should extract keywords');
  assert.ok(result.keywords.some((k) => k.includes('thảo') || k.includes('chính') || k.includes('quý')), 'Should capture relevant keywords');
});

test('extractKeywordsAndTags handles empty or generic input with fallback tags', () => {
  const emptyResult = extractKeywordsAndTags('', 'Văn Phòng');
  assert.ok(emptyResult.tags.includes('Văn Phòng'));
  assert.ok(emptyResult.tags.includes('Nhiệm vụ'));
  assert.equal(emptyResult.keywords.length, 0);
});

test('extractKeywordsAndTags tags event and conference tasks', () => {
  const speech = 'Tổ chức hội nghị tập huấn công nghệ thông tin và số hóa tài liệu';
  const result = extractKeywordsAndTags(speech);

  assert.ok(result.tags.includes('Hội nghị & Họp'));
  assert.ok(result.tags.includes('Công nghệ & Số hóa'));
});
