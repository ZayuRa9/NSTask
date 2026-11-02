/**
 * Utilities for analyzing speech transcript, extracting keywords and generating tags for tasks.
 */

const VIETNAMESE_STOP_WORDS = new Set([
  'là', 'của', 'và', 'các', 'cho', 'với', 'trong', 'được', 'người', 'những', 'để',
  'có', 'này', 'đó', 'từ', 'vào', 'khi', 'thì', 'ở', 'đến', 'lại', 'ra', 'về',
  'làm', 'phải', 'theo', 'như', 'bởi', 'sau', 'trước', 'qua', 'nên', 'một', 'hai',
]);

const DOMAIN_TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  {
    tag: 'Khẩn cấp',
    patterns: [/khẩn/i, /gấp/i, /hỏa tốc/i, /ngay lập tức/i, /trong ngày/i, /quan trọng nhất/i],
  },
  {
    tag: 'Báo cáo',
    patterns: [/báo cáo/i, /thống kê/i, /tổng hợp số liệu/i, /kết quả/i, /đánh giá/i],
  },
  {
    tag: 'Hội nghị & Họp',
    patterns: [/hội nghị/i, /cuộc họp/i, /họp/i, /tọa đàm/i, /hội thảo/i, /diễn đàn/i],
  },
  {
    tag: 'Kế hoạch',
    patterns: [/kế hoạch/i, /đề án/i, /phương án/i, /chủ trương/i, /chiến lược/i],
  },
  {
    tag: 'Tài chính & Dự toán',
    patterns: [/tài chính/i, /ngân sách/i, /kinh phí/i, /quyết toán/i, /dự toán/i, /thu chi/i],
  },
  {
    tag: 'Sự kiện & Phong trào',
    patterns: [/sự kiện/i, /phong trào/i, /hội thao/i, /giải đấu/i, /văn nghệ/i, /ra quân/i],
  },
  {
    tag: 'Văn bản & Nghị quyết',
    patterns: [/nghị quyết/i, /công văn/i, /tờ trình/i, /chỉ thị/i, /thông tri/i, /quyết định/i],
  },
  {
    tag: 'Thanh niên & Đoàn',
    patterns: [/thanh niên/i, /đoàn viên/i, /chi đoàn/i, /đoàn cơ sở/i, /tuổi trẻ/i],
  },
  {
    tag: 'Công nghệ & Số hóa',
    patterns: [/phần mềm/i, /website/i, /số hóa/i, /hệ thống/i, /dữ liệu/i, /cntt/i, /it/i],
  },
];

export interface VoiceAnalysisExtraction {
  keywords: string[];
  tags: string[];
}

/**
 * Extracts key domain tags and clean keywords from a voice transcript or task text.
 */
export function extractKeywordsAndTags(
  text: string,
  unitHint?: string
): VoiceAnalysisExtraction {
  if (!text || !text.trim()) {
    const defaultTags = unitHint ? [unitHint, 'Nhiệm vụ'] : ['Nhiệm vụ'];
    return { keywords: [], tags: defaultTags };
  }

  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();

  // 1. Identify matched domain tags
  const matchedTags = new Set<string>();
  for (const rule of DOMAIN_TAG_RULES) {
    if (rule.patterns.some((regex) => regex.test(lower))) {
      matchedTags.add(rule.tag);
    }
  }

  if (unitHint && unitHint.trim()) {
    matchedTags.add(unitHint.trim());
  }

  if (matchedTags.size === 0) {
    matchedTags.add('Nhiệm vụ');
  }

  // 2. Extract notable keywords (filter out stop words and single characters)
  const words = cleanText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–—]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !VIETNAMESE_STOP_WORDS.has(w.toLowerCase()));

  // Count frequency and keep unique top keywords
  const freqMap = new Map<string, number>();
  for (const w of words) {
    const norm = w.toLowerCase();
    freqMap.set(norm, (freqMap.get(norm) || 0) + 1);
  }

  const sortedUniqueWords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 5);

  return {
    keywords: sortedUniqueWords,
    tags: Array.from(matchedTags),
  };
}
