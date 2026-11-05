/**
 * Pure utility functions for Voice-to-Text and speech recognition parsing
 */

/**
 * Clean up and capitalize speech recognized text
 */
export function formatSpeechText(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Smart combination of existing field value and incoming voice text
 */
export function joinTranscript(
  existingValue: string,
  incomingTranscript: string,
  mode: 'append' | 'replace' = 'append'
): string {
  const cleanIncoming = formatSpeechText(incomingTranscript);
  if (!cleanIncoming) return existingValue;
  if (mode === 'replace' || !existingValue.trim()) {
    return cleanIncoming;
  }
  const cleanExisting = existingValue.trimEnd();
  // If existing doesn't end with punctuation or newline, add space
  const separator = cleanExisting.endsWith('.') || cleanExisting.endsWith('\n') ? ' ' : '. ';
  return `${cleanExisting}${separator}${cleanIncoming}`;
}

/**
 * Heuristic parsing of spoken phrases to extract potential priority, timeframe or description
 * e.g. "Khẩn cấp: Gửi báo cáo tài chính cho sếp trước thứ sáu"
 */
export function extractTaskDetailsFromSpeech(rawText: string): {
  title: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
} {
  const formatted = formatSpeechText(rawText);
  if (!formatted) {
    return { title: '' };
  }

  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  const lower = formatted.toLowerCase();

  if (
    lower.includes('hỏa tốc') ||
    lower.includes('khẩn cấp') ||
    lower.includes('gấp lắm') ||
    lower.includes('urgent')
  ) {
    priority = 'urgent';
  } else if (
    lower.includes('quan trọng') ||
    lower.includes('ưu tiên cao') ||
    lower.includes('high priority')
  ) {
    priority = 'high';
  } else if (
    lower.includes('không vội') ||
    lower.includes('ưu tiên thấp') ||
    lower.includes('khi nào rảnh')
  ) {
    priority = 'low';
  }

  return {
    title: formatted,
    priority,
  };
}
