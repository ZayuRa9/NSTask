import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  List,
  ListOrdered,
  CheckSquare,
  Palette,
  Eye,
  Edit2,
  ChevronDown,
  Quote,
  Sparkles,
} from 'lucide-react';

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  isPreviewing?: boolean;
  onTogglePreview?: (preview: boolean) => void;
  className?: string;
  isFloating?: boolean;
}

const COLOR_PALETTES = [
  { name: 'Xanh dương đậm', hex: '#2563eb', label: 'Xanh' },
  { name: 'Đỏ khẩn cấp', hex: '#dc2626', label: 'Đỏ' },
  { name: 'Xanh lá hoàn thành', hex: '#16a34a', label: 'Lá' },
  { name: 'Cam cảnh báo', hex: '#ea580c', label: 'Cam' },
  { name: 'Tím nổi bật', hex: '#9333ea', label: 'Tím' },
  { name: 'Xám than chuẩn', hex: '#334155', label: 'Đen' },
];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  isPreviewing = false,
  onTogglePreview,
  className = '',
  isFloating = false,
}) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Close color dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyFormat = (
    type:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'strikethrough'
      | 'heading1'
      | 'heading2'
      | 'heading3'
      | 'color'
      | 'bullet'
      | 'number'
      | 'checklist'
      | 'quote'
      | 'divider',
    colorHex?: string
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let replacement = '';
    let selectStart = start;
    let selectEnd = end;

    switch (type) {
      case 'heading1':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((l) => `# ${l.replace(/^#+\s*/, '')}`)
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '# Tiêu đề lớn H1\n';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 2 : 3);
          selectEnd = selectStart + 14;
        }
        break;

      case 'heading2':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((l) => `## ${l.replace(/^#+\s*/, '')}`)
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '## Tiêu đề mục H2\n';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 3 : 4);
          selectEnd = selectStart + 14;
        }
        break;

      case 'heading3':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((l) => `### ${l.replace(/^#+\s*/, '')}`)
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '### Tiêu đề phụ H3\n';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 4 : 5);
          selectEnd = selectStart + 14;
        }
        break;

      case 'divider':
        replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '---\n';
        selectStart = start + replacement.length;
        selectEnd = selectStart;
        break;

      case 'bold':
        replacement = selectedText ? `**${selectedText}**` : `**in đậm**`;
        selectStart = start + 2;
        selectEnd = selectedText ? end + 2 : start + 2 + 7;
        break;

      case 'italic':
        replacement = selectedText ? `*${selectedText}*` : `*in nghiêng*`;
        selectStart = start + 1;
        selectEnd = selectedText ? end + 1 : start + 1 + 10;
        break;

      case 'underline':
        replacement = selectedText ? `<u>${selectedText}</u>` : `<u>gạch chân</u>`;
        selectStart = start + 3;
        selectEnd = selectedText ? end + 3 : start + 3 + 9;
        break;

      case 'strikethrough':
        replacement = selectedText ? `~~${selectedText}~~` : `~~gạch ngang~~`;
        selectStart = start + 2;
        selectEnd = selectedText ? end + 2 : start + 2 + 10;
        break;

      case 'color': {
        const c = colorHex || '#2563eb';
        replacement = selectedText ? `[color=${c}]${selectedText}[/color]` : `[color=${c}]văn bản màu[/color]`;
        const tagLen = 8 + c.length; // "[color=" + c + "]"
        selectStart = start + tagLen;
        selectEnd = selectedText ? end + tagLen : start + tagLen + 12;
        break;
      }

      case 'bullet':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line) => (line.startsWith('• ') ? line : `• ${line}`))
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '• Đầu việc mới';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 2 : 3);
          selectEnd = start + replacement.length;
        }
        break;

      case 'number':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line, idx) => `${idx + 1}. ${line.replace(/^\d+\.\s*/, '')}`)
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '1. Bước thứ nhất';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 3 : 4);
          selectEnd = start + replacement.length;
        }
        break;

      case 'checklist':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line) => `- [ ] ${line.replace(/^-\s*\[[ xX]\]\s*/, '')}`)
            .join('\n');
          selectStart = start;
          selectEnd = start + replacement.length;
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '- [ ] Việc cần hoàn thành';
          selectStart = start + (value.endsWith('\n') || value.length === 0 ? 6 : 7);
          selectEnd = start + replacement.length;
        }
        break;

      case 'quote':
        if (selectedText) {
          replacement = selectedText
            .split('\n')
            .map((line) => `> ${line.replace(/^>\s*/, '')}`)
            .join('\n');
        } else {
          replacement = (value.endsWith('\n') || value.length === 0 ? '' : '\n') + '> Ghi chú lưu ý: ';
        }
        selectStart = start + replacement.length;
        selectEnd = selectStart;
        break;
    }

    const updated = value.substring(0, start) + replacement + value.substring(end);
    onChange(updated);

    // Re-focus and set range
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selectStart, selectEnd);
    }, 15);
  };

  return (
    <div
      className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/95 backdrop-blur-xs text-slate-700 text-xs shadow-2xs select-none ${
        isFloating ? 'sticky top-1 z-20 shadow-md ring-1 ring-slate-900/5' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1 flex-wrap">
        {/* Headings */}
        <button
          type="button"
          onClick={() => applyFormat('heading1')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Tiêu đề lớn (# H1)"
        >
          <Heading1 className="w-3.5 h-3.5 text-indigo-700" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat('heading2')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Tiêu đề mục (## H2)"
        >
          <Heading2 className="w-3.5 h-3.5 text-indigo-600" />
        </button>

        <button
          type="button"
          onClick={() => applyFormat('heading3')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Tiêu đề phụ (### H3)"
        >
          <Heading3 className="w-3.5 h-3.5 text-indigo-500" />
        </button>

        <div className="w-px h-4 bg-slate-300/80 mx-0.5" />

        {/* Bold */}
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="In đậm (Bold) - **văn bản**"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="In nghiêng (Italic) - *văn bản*"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Gạch chân (Underline) - <u>văn bản</u>"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => applyFormat('strikethrough')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Gạch ngang (Strikethrough) - ~~văn bản~~"
        >
          <StrikethroughIcon className="w-3.5 h-3.5" />
        </button>

        {/* Color Popover Button */}
        <div className="relative" ref={colorMenuRef}>
          <button
            type="button"
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="flex items-center gap-0.5 p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
            title="Đổi màu chữ (Text Color)"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {showColorMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-30 p-2 bg-white rounded-xl shadow-xl border border-slate-200 w-44 space-y-1.5 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Chọn màu chữ:
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.hex}
                    type="button"
                    onClick={() => {
                      applyFormat('color', palette.hex);
                      setShowColorMenu(false);
                    }}
                    style={{ backgroundColor: palette.hex }}
                    className="h-6 rounded-md text-[10px] font-bold text-white flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title={palette.name}
                  >
                    {palette.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-slate-300/80 mx-0.5" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => applyFormat('bullet')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Danh sách dấu chấm (Bullet List)"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={() => applyFormat('number')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Danh sách số thứ tự (Numbered List)"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        {/* Checklist */}
        <button
          type="button"
          onClick={() => applyFormat('checklist')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          title="Hộp kiểm việc cần làm (- [ ] Checklist)"
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
        </button>

        {/* Quote / Highlight */}
        <button
          type="button"
          onClick={() => applyFormat('quote')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer hidden sm:inline-flex"
          title="Trích dẫn / Khối lưu ý (> Quote)"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <button
          type="button"
          onClick={() => applyFormat('divider')}
          className="p-1.5 rounded-lg hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer hidden sm:inline-flex"
          title="Đường phân cách ngang (---)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview Mode Toggle */}
      {onTogglePreview && (
        <button
          type="button"
          onClick={() => onTogglePreview(!isPreviewing)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            isPreviewing
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-200/80'
          }`}
          title={isPreviewing ? 'Chuyển về chế độ Soạn thảo' : 'Xem trước định dạng đẹp mắt'}
        >
          {isPreviewing ? (
            <>
              <Edit2 className="w-3 h-3" />
              <span>Sửa</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Xem trước</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
