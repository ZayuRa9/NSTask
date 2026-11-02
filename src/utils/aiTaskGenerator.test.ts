import { test } from 'node:test';
import assert from 'node:assert';
import { detectTaskDomain, generateDynamicSubtasks } from './aiTaskGenerator';

test('detectTaskDomain identifies sports tasks accurately', () => {
  assert.strictEqual(detectTaskDomain('Tổ chức giải bóng đá mini nam chào mừng 26/3'), 'sports');
  assert.strictEqual(detectTaskDomain('Hội thao cán bộ công nhân viên chức'), 'sports');
});

test('detectTaskDomain identifies procurement tasks accurately', () => {
  assert.strictEqual(detectTaskDomain('Mua sắm 5 bộ máy in văn phòng và bàn ghế'), 'procurement');
  assert.strictEqual(detectTaskDomain('Khảo sát báo giá trang thiết bị CNTT quý 3'), 'procurement');
});

test('detectTaskDomain identifies inspection tasks accurately', () => {
  assert.strictEqual(detectTaskDomain('Thanh tra kiểm tra công tác cải cách hành chính tại cơ sở'), 'inspection');
});

test('detectTaskDomain identifies legal policy drafting tasks accurately', () => {
  assert.strictEqual(detectTaskDomain('Soạn thảo quy chế chi tiêu nội bộ và sử dụng tài sản công'), 'legal_policy');
});

test('detectTaskDomain identifies media design tasks accurately', () => {
  assert.strictEqual(detectTaskDomain('Thiết kế poster và ấn phẩm truyền thông sự kiện 20/11'), 'media_design');
});

test('generateDynamicSubtasks produces domain-tailored actionable subtasks with exact task name', () => {
  const result = generateDynamicSubtasks('Giải bóng đá thanh niên tranh cúp mùa xuân', 'Ban Phong Trào');
  assert.strictEqual(result.domain, 'sports');
  assert.ok(result.subtasks.length >= 5);
  // Must mention the specific task context and start with action from "Tôi"
  assert.ok(result.subtasks[0].title.startsWith('Tôi'));
  assert.ok(result.subtasks.some((s) => s.title.includes('bóng đá') || s.title.includes('Giải bóng đá')));
});

test('generateDynamicSubtasks produces procurement-tailored subtasks with exact task name', () => {
  const result = generateDynamicSubtasks('Mua sắm máy in văn phòng phòng Hành chính', 'Văn Phòng');
  assert.strictEqual(result.domain, 'procurement');
  assert.ok(result.subtasks.some((s) => s.title.includes('báo giá') || s.title.includes('mua sắm') || s.title.includes('máy in')));
});
