import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading1,
  Heading2,
  Highlighter,
  Palette,
  CheckSquare,
  List,
  ListOrdered,
  Eraser,
  X,
} from 'lucide-react';
import { applyInlineFormatting, removeInlineFormatting, InlineFormatType } from '../utils/textFormatting';

export interface FloatingNoteToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

const COLOR_SWATCHES = [
  { name: 'Xanh dương', hex: '#2563eb', bg: 'bg-blue-600' },
  { name: 'Đỏ khẩn cấp', hex: '#dc2626', bg: 'bg-red-600' },
  { name: 'Xanh lá', hex: '#16a34a', bg: 'bg-emerald-600' },
  { name: 'Cam cảnh báo', hex: '#ea580c', bg: 'bg-orange-600' },
  { name: 'Tím nổi bật', hex: '#9333ea', bg: 'bg-purple-600' },
  { name: 'Vàng hổ phách', hex: '#d97706', bg: 'bg-amber-600' },
  { name: 'Xám than', hex: '#334155', bg: 'bg-slate-700' },
];

export const FloatingNoteToolbar: React.FC<FloatingNoteToolbarProps> = ({
  textareaRef,
  containerRef,
  value,
  onChange,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showColorPalette, setShowColorPalette] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const lastMouseCoords = useRef<{ x: number; y: number } | null>(null);

  // Helper to calculate position from selection or mouse release
  const updatePosition = useCallback(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) {
      setIsVisible(false);
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd || selectionStart == null || selectionEnd == null) {
      setIsVisible(false);
      setShowColorPalette(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    let posX = 0;
    let posY = 0;

    // If we have recent mouse coords within the textarea, use them for pinpoint accuracy
    if (
      lastMouseCoords.current &&
      lastMouseCoords.current.x >= textareaRect.left &&
      lastMouseCoords.current.x <= textareaRect.right &&
      lastMouseCoords.current.y >= textareaRect.top &&
      lastMouseCoords.current.y <= textareaRect.bottom
    ) {
      posX = lastMouseCoords.current.x - containerRect.left;
      posY = lastMouseCoords.current.y - containerRect.top - 12; // place 12px above cursor
    } else {
      // Estimate based on textarea layout and character offset
      const textBefore = textarea.value.substring(0, selectionStart);
      const lines = textBefore.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineCharCount = lines[currentLineIndex].length;

      const approxLineHeight = 22;
      const approxCharWidth = 8;
      const topOffset = (textareaRect.top - containerRect.top) + (currentLineIndex * approxLineHeight) - textarea.scrollTop;
      const leftOffset = (textareaRect.left - containerRect.left) + Math.min(currentLineCharCount * approxCharWidth + 20, textareaRect.width - 150);

      posX = leftOffset;
      posY = topOffset - 10;
    }

    // Clamp inside container
    const clampedX = Math.max(140, Math.min(posX, containerRect.width - 140));
    const clampedY = Math.max(10, Math.min(posY, containerRect.height - 50));

    setPosition({ top: clampedY, left: clampedX });
    setIsVisible(true);
  }, [textareaRef, containerRef]);

  // Track mouse up and selection changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleMouseUp = (e: MouseEvent) => {
      lastMouseCoords.current = { x: e.clientX, y: e.clientY };
      // Small delay to allow browser to finalize selectionStart/End
      setTimeout(() => {
        updatePosition();
      }, 30);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setShowColorPalette(false);
        return;
      }
      lastMouseCoords.current = null;
      updatePosition();
    };

    const handleSelect = () => {
      updatePosition();
    };

    textarea.addEventListener('mouseup', handleMouseUp);
    textarea.addEventListener('keyup', handleKeyUp);
    textarea.addEventListener('select', handleSelect);

    return () => {
      textarea.removeEventListener('mouseup', handleMouseUp);
      textarea.removeEventListener('keyup', handleKeyUp);
      textarea.removeEventListener('select', handleSelect);
    };
  }, [textareaRef, updatePosition]);

  // Close floating toolbar when clicking outside textarea or toolbar
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
        setShowColorPalette(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [textareaRef]);

  const handleApplyFormat = (format: InlineFormatType, colorHex?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const result = applyInlineFormatting(value, start, end, format, colorHex);
    onChange(result.newText);

    if (format === 'color') {
      setShowColorPalette(false);
    }

    // Keep focus and re-select formatted range
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newStart, result.newEnd);
      updatePosition();
    }, 10);
  };

  const handleRemoveFormatting = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const result = removeInlineFormatting(value, start, end);
    onChange(result.newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newStart, result.newEnd);
      updatePosition();
    }, 10);
  };

  const handleApplyBlock = (type: 'h1' | 'h2' | 'bullet' | 'number' | 'checklist') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let replacement = '';
    if (type === 'h1') {
      replacement = selectedText
        .split('\n')
        .map((l) => (l.startsWith('# ') ? l.replace(/^#\s*/, '') : `# ${l}`))
        .join('\n');
    } else if (type === 'h2') {
      replacement = selectedText
        .split('\n')
        .map((l) => (l.startsWith('## ') ? l.replace(/^##\s*/, '') : `## ${l}`))
        .join('\n');
    } else if (type === 'bullet') {
      replacement = selectedText
        .split('\n')
        .map((l) => (l.startsWith('• ') ? l.replace(/^•\s*/, '') : `• ${l}`))
        .join('\n');
    } else if (type === 'number') {
      replacement = selectedText
        .split('\n')
        .map((l, idx) => (l.match(/^\d+\.\s*/) ? l.replace(/^\d+\.\s*/, '') : `${idx + 1}. ${l}`))
        .join('\n');
    } else if (type === 'checklist') {
      replacement = selectedText
        .split('\n')
        .map((l) => (l.match(/^-\s*\[[ xX]\]\s*/) ? l.replace(/^-\s*\[[ xX]\]\s*/, '') : `- [ ] ${l}`))
        .join('\n');
    }

    const newText = value.substring(0, start) + replacement + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
      updatePosition();
    }, 10);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
      }}
      className="absolute z-50 transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-auto"
    >
      <div className="relative flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 ring-1 ring-black/20">
        {/* Headings */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyBlock('h1');
          }}
          title="Tiêu đề lớn (# H1)"
          className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <Heading1 className="w-4 h-4 font-black" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyBlock('h2');
          }}
          title="Tiêu đề mục (## H2)"
          className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

        {/* Bold Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyFormat('bold');
          }}
          title="Bôi đậm (Ctrl+B) - **chữ**"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <Bold className="w-4 h-4 font-black" />
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyFormat('italic');
          }}
          title="In nghiêng (Ctrl+I) - *chữ*"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Underline Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyFormat('underline');
          }}
          title="Gạch chân - <u>chữ</u>"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        {/* Strikethrough Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyFormat('strikethrough');
          }}
          title="Gạch ngang - ~~chữ~~"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <StrikethroughIcon className="w-4 h-4" />
        </button>

        {/* Highlight Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyFormat('highlight');
          }}
          title="Đánh dấu nổi bật - ==chữ=="
          className="p-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-400/20 transition-all cursor-pointer"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/20 mx-1" />

        {/* Color Palette Popover Trigger */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPalette(!showColorPalette);
            }}
            title="Đổi màu chữ"
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              showColorPalette
                ? 'bg-indigo-600 text-white'
                : 'text-slate-200 hover:text-white hover:bg-white/15'
            }`}
          >
            <Palette className="w-4 h-4 text-rose-400" />
          </button>

          {/* Color Popover Menu */}
          {showColorPalette && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl flex items-center gap-1.5 z-60 animate-in fade-in zoom-in-95"
              onMouseDown={(e) => e.preventDefault()}
            >
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleApplyFormat('color', swatch.hex);
                  }}
                  title={swatch.name}
                  className={`w-6 h-6 rounded-full ${swatch.bg} border-2 border-white/40 hover:border-white hover:scale-115 transition-transform cursor-pointer shadow-sm`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-white/20 mx-1" />

        {/* Checklist Format */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyBlock('checklist');
          }}
          title="Tạo danh sách kiểm tra - [ ]"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        {/* Bullet List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyBlock('bullet');
          }}
          title="Gạch đầu dòng (•)"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyBlock('number');
          }}
          title="Đánh số thứ tự (1, 2, 3...)"
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Clear formatting */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleRemoveFormatting();
          }}
          title="Gỡ mọi định dạng trên đoạn văn bản đã chọn"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/15 transition-all cursor-pointer ml-0.5"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>

        {/* Close button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsVisible(false);
          }}
          title="Đóng thanh công cụ"
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Downward pointer triangle */}
      <div className="w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-slate-900 mx-auto" />
    </div>
  );
};
