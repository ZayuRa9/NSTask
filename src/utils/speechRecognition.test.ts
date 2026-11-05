import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSpeechText,
  joinTranscript,
  extractTaskDetailsFromSpeech,
} from './speechRecognitionUtils.js';

describe('speechRecognitionUtils', () => {
  describe('formatSpeechText', () => {
    it('returns empty string for empty or whitespace inputs', () => {
      assert.equal(formatSpeechText(''), '');
      assert.equal(formatSpeechText('   '), '');
    });

    it('capitalizes the first character and trims surrounding whitespace', () => {
      assert.equal(formatSpeechText('  chuẩn bị báo cáo tài chính  '), 'Chuẩn bị báo cáo tài chính');
      assert.equal(formatSpeechText('kiểm tra tiến độ tuần'), 'Kiểm tra tiến độ tuần');
    });

    it('preserves already capitalized sentences', () => {
      assert.equal(formatSpeechText('Hoàn thành đồ án'), 'Hoàn thành đồ án');
    });

    it('handles English text correctly', () => {
      assert.equal(formatSpeechText('review code before merging'), 'Review code before merging');
    });
  });

  describe('joinTranscript', () => {
    it('returns clean incoming when existing is empty', () => {
      assert.equal(joinTranscript('', 'viết báo cáo'), 'Viết báo cáo');
      assert.equal(joinTranscript('   ', 'viết báo cáo'), 'Viết báo cáo');
    });

    it('replaces existing value when mode is replace', () => {
      assert.equal(joinTranscript('Nhiệm vụ cũ', 'Nhiệm vụ mới', 'replace'), 'Nhiệm vụ mới');
    });

    it('appends with period and space when existing does not end with period', () => {
      assert.equal(
        joinTranscript('Đã kiểm tra cơ sở vật chất', 'cần bổ sung thêm bàn ghế', 'append'),
        'Đã kiểm tra cơ sở vật chất. Cần bổ sung thêm bàn ghế'
      );
    });

    it('appends with space when existing already ends with period', () => {
      assert.equal(
        joinTranscript('Đã gửi tài liệu.', 'đang chờ phản hồi', 'append'),
        'Đã gửi tài liệu. Đang chờ phản hồi'
      );
    });

    it('returns existingValue if incoming transcript is empty', () => {
      assert.equal(joinTranscript('Văn bản hiện có', '', 'append'), 'Văn bản hiện có');
    });
  });

  describe('extractTaskDetailsFromSpeech', () => {
    it('detects urgent priority from spoken cues', () => {
      const res = extractTaskDetailsFromSpeech('hỏa tốc: nộp hồ sơ quyết toán thuế');
      assert.equal(res.priority, 'urgent');
      assert.equal(res.title, 'Hỏa tốc: nộp hồ sơ quyết toán thuế');
    });

    it('detects high priority from spoken cues', () => {
      const res = extractTaskDetailsFromSpeech('quan trọng: họp ban giám đốc sáng mai');
      assert.equal(res.priority, 'high');
    });

    it('detects low priority from spoken cues', () => {
      const res = extractTaskDetailsFromSpeech('khi nào rảnh thì dọn dẹp tủ tài liệu');
      assert.equal(res.priority, 'low');
    });

    it('defaults to medium priority when no cues found', () => {
      const res = extractTaskDetailsFromSpeech('soạn thảo công văn gửi các chi đoàn');
      assert.equal(res.priority, 'medium');
    });
  });
});
