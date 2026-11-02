import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCEL_TEMPLATE_COLUMNS, SAMPLE_EXCEL_DATA, DEFAULT_EXCEL_TEMPLATE_CONFIG } from './excelTemplate';

test('EXCEL_TEMPLATE_COLUMNS defines all 13 standard columns with separated date and time', () => {
  assert.equal(EXCEL_TEMPLATE_COLUMNS.length, 13);
  assert.equal(EXCEL_TEMPLATE_COLUMNS[0], 'STT');
  assert.equal(EXCEL_TEMPLATE_COLUMNS[1], 'Nội dung công việc');
  assert.equal(EXCEL_TEMPLATE_COLUMNS[2], 'Mô tả (nếu có)');
  assert.ok(EXCEL_TEMPLATE_COLUMNS.includes('Thời gian bắt đầu (Mặc định khi tạo - Khóa)'));
  assert.ok(EXCEL_TEMPLATE_COLUMNS.includes('Ngày hoàn thành (ngày, tháng, năm)'));
  assert.ok(EXCEL_TEMPLATE_COLUMNS.includes('Thời gian hoàn thành (giờ, phút)'));
  assert.ok(EXCEL_TEMPLATE_COLUMNS.includes('Thêm vào Google Lịch (có, không)'));
});

test('SAMPLE_EXCEL_DATA contains separated completion date and time with locked creation time', () => {
  assert.ok(SAMPLE_EXCEL_DATA.length >= 3);
  const row1 = SAMPLE_EXCEL_DATA[0];
  assert.equal(row1.STT, 1);
  assert.ok(row1['Nội dung công việc'].length > 0);
  assert.ok(row1['Ngày hoàn thành (ngày, tháng, năm)'].length > 0);
  assert.ok(row1['Thời gian hoàn thành (giờ, phút)'].length > 0);
  assert.equal(row1['Thời gian bắt đầu (Mặc định khi tạo - Khóa)'], 'Tự động tính từ khi tạo nhiệm vụ');
  assert.equal(row1['Thêm vào Google Lịch (có, không)'], 'có');
});

test('DEFAULT_EXCEL_TEMPLATE_CONFIG contains standard styling and all 13 columns', () => {
  assert.ok(DEFAULT_EXCEL_TEMPLATE_CONFIG);
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.headerFillColor, '#1E40AF');
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.headerTextColor, '#FFFFFF');
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.wrapText, true);
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.autoItalicParentheses, true);
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.columns.length, 13);
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.columns[0].label, 'STT');
  assert.equal(DEFAULT_EXCEL_TEMPLATE_CONFIG.columns[1].label, 'Nội dung công việc');
});
