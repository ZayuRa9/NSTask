export type InlineFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'highlight'
  | 'color';

export interface FormatResult {
  newText: string;
  newStart: number;
  newEnd: number;
}

/**
 * Applies or toggles inline formatting on a substring within `text`.
 */
export function applyInlineFormatting(
  text: string,
  start: number,
  end: number,
  format: InlineFormatType,
  colorHex?: string
): FormatResult {
  const isRange = start < end;
  const selectedText = isRange ? text.substring(start, end) : '';

  // If no text is selected, insert placeholder text formatted
  if (!isRange) {
    let placeholder = '';
    let innerText = '';
    switch (format) {
      case 'bold':
        innerText = 'in đậm';
        placeholder = `**${innerText}**`;
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + 2,
          newEnd: start + 2 + innerText.length,
        };
      case 'italic':
        innerText = 'in nghiêng';
        placeholder = `*${innerText}*`;
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + 1,
          newEnd: start + 1 + innerText.length,
        };
      case 'underline':
        innerText = 'gạch chân';
        placeholder = `<u>${innerText}</u>`;
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + 3,
          newEnd: start + 3 + innerText.length,
        };
      case 'strikethrough':
        innerText = 'gạch ngang';
        placeholder = `~~${innerText}~~`;
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + 2,
          newEnd: start + 2 + innerText.length,
        };
      case 'highlight':
        innerText = 'nổi bật';
        placeholder = `==${innerText}==`;
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + 2,
          newEnd: start + 2 + innerText.length,
        };
      case 'color': {
        const c = colorHex || '#2563eb';
        innerText = 'văn bản màu';
        placeholder = `[color=${c}]${innerText}[/color]`;
        const tagLen = 8 + c.length; // "[color=" + c + "]"
        return {
          newText: text.substring(0, start) + placeholder + text.substring(end),
          newStart: start + tagLen,
          newEnd: start + tagLen + innerText.length,
        };
      }
    }
  }

  // Text IS selected: check if toggling (already wrapped in the target format)
  switch (format) {
    case 'bold': {
      // Check if selectedText is directly wrapped with **...**
      if (selectedText.startsWith('**') && selectedText.endsWith('**') && selectedText.length >= 4) {
        const unwrapped = selectedText.slice(2, -2);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      // Check if text immediately surrounding selection has **
      if (start >= 2 && end <= text.length - 2 && text.substring(start - 2, start) === '**' && text.substring(end, end + 2) === '**') {
        return {
          newText: text.substring(0, start - 2) + selectedText + text.substring(end + 2),
          newStart: start - 2,
          newEnd: start - 2 + selectedText.length,
        };
      }
      // Apply bold
      const replacement = `**${selectedText}**`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }

    case 'italic': {
      // Check if selectedText is wrapped with *...* (and not **)
      if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**') && selectedText.length >= 2) {
        const unwrapped = selectedText.slice(1, -1);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      if (start >= 1 && end <= text.length - 1 && text[start - 1] === '*' && text[end] === '*' && text[start - 2] !== '*' && text[end + 1] !== '*') {
        return {
          newText: text.substring(0, start - 1) + selectedText + text.substring(end + 1),
          newStart: start - 1,
          newEnd: start - 1 + selectedText.length,
        };
      }
      const replacement = `*${selectedText}*`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }

    case 'underline': {
      // Check <u>...</u>
      if (selectedText.startsWith('<u>') && selectedText.endsWith('</u>') && selectedText.length >= 7) {
        const unwrapped = selectedText.slice(3, -4);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      // Check __...__
      if (selectedText.startsWith('__') && selectedText.endsWith('__') && selectedText.length >= 4) {
        const unwrapped = selectedText.slice(2, -2);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      // Check surrounding <u> and </u>
      if (start >= 3 && end <= text.length - 4 && text.substring(start - 3, start) === '<u>' && text.substring(end, end + 4) === '</u>') {
        return {
          newText: text.substring(0, start - 3) + selectedText + text.substring(end + 4),
          newStart: start - 3,
          newEnd: start - 3 + selectedText.length,
        };
      }
      const replacement = `<u>${selectedText}</u>`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }

    case 'strikethrough': {
      if (selectedText.startsWith('~~') && selectedText.endsWith('~~') && selectedText.length >= 4) {
        const unwrapped = selectedText.slice(2, -2);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      if (start >= 2 && end <= text.length - 2 && text.substring(start - 2, start) === '~~' && text.substring(end, end + 2) === '~~') {
        return {
          newText: text.substring(0, start - 2) + selectedText + text.substring(end + 2),
          newStart: start - 2,
          newEnd: start - 2 + selectedText.length,
        };
      }
      const replacement = `~~${selectedText}~~`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }

    case 'highlight': {
      if (selectedText.startsWith('==') && selectedText.endsWith('==') && selectedText.length >= 4) {
        const unwrapped = selectedText.slice(2, -2);
        return {
          newText: text.substring(0, start) + unwrapped + text.substring(end),
          newStart: start,
          newEnd: start + unwrapped.length,
        };
      }
      if (start >= 2 && end <= text.length - 2 && text.substring(start - 2, start) === '==' && text.substring(end, end + 2) === '==') {
        return {
          newText: text.substring(0, start - 2) + selectedText + text.substring(end + 2),
          newStart: start - 2,
          newEnd: start - 2 + selectedText.length,
        };
      }
      const replacement = `==${selectedText}==`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }

    case 'color': {
      const c = colorHex || '#2563eb';
      // If selected text is already wrapped in [color=...], replace the color or unwrap if matching
      const colorTagRegex = /^\[color=([^\]]+)\]([\s\S]*?)\[\/color\]$/;
      const match = selectedText.match(colorTagRegex);
      if (match) {
        const existingColor = match[1];
        const inner = match[2];
        if (existingColor.toLowerCase() === c.toLowerCase()) {
          // Unwrap
          return {
            newText: text.substring(0, start) + inner + text.substring(end),
            newStart: start,
            newEnd: start + inner.length,
          };
        } else {
          // Change to new color
          const replacement = `[color=${c}]${inner}[/color]`;
          return {
            newText: text.substring(0, start) + replacement + text.substring(end),
            newStart: start,
            newEnd: start + replacement.length,
          };
        }
      }
      const replacement = `[color=${c}]${selectedText}[/color]`;
      return {
        newText: text.substring(0, start) + replacement + text.substring(end),
        newStart: start,
        newEnd: start + replacement.length,
      };
    }
  }
}

/**
 * Strips all inline formatting tags from the selected text.
 */
export function removeInlineFormatting(text: string, start: number, end: number): FormatResult {
  if (start >= end) return { newText: text, newStart: start, newEnd: end };
  let selected = text.substring(start, end);

  // Strip [color=...]...[/color]
  selected = selected.replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/g, '$1');
  // Strip <u>...</u>
  selected = selected.replace(/<u>([\s\S]*?)<\/u>/g, '$1');
  // Strip __...__
  selected = selected.replace(/__([^_]+?)__/g, '$1');
  // Strip ~~...~~
  selected = selected.replace(/~~([^~]+?)~~/g, '$1');
  // Strip ==...==
  selected = selected.replace(/==([^=]+?)==/g, '$1');
  // Strip **...**
  selected = selected.replace(/\*\*([^*]+?)\*\*/g, '$1');
  // Strip *...*
  selected = selected.replace(/\*([^*]+?)\*/g, '$1');

  return {
    newText: text.substring(0, start) + selected + text.substring(end),
    newStart: start,
    newEnd: start + selected.length,
  };
}

/**
 * Cleans administrative documents, minutes, reports, and templates
 * by removing markdown asterisks (*) and bracket tags ([]).
 */
export function sanitizeAdministrativeText(text: string): string {
  if (!text) return '';
  return text
    // Replace bracketed content with clean inner text, e.g. [Nội dung] -> Nội dung
    .replace(/\[([^\]]*)\]/g, '$1')
    // Remove any remaining bracket characters
    .replace(/[\[\]]/g, '')
    // Remove asterisks
    .replace(/\*/g, '')
    // Replace multiple spaces on the same line
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
