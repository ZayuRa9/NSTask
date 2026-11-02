import React from 'react';

interface FormattedContentRendererProps {
  content: string;
  className?: string;
}

export const FormattedContentRenderer: React.FC<FormattedContentRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  const lines = content.split('\n');

  // Parses inline formatting: [color=...]...[/color], <u>...</u>, __...__, ~~...~~, ==...==, **bold**, *italic*
  const renderInline = (text: string) => {
    const tokens = text.split(
      /(\[color=[^\]]+\][\s\S]*?\[\/color\]|<u>[\s\S]*?<\/u>|__[^_]+?__|~~[^~]+?~~|==[^=]+?==|\*\*[^*]+?\*\*|\*[^*]+?\*)/g
    );

    return tokens.map((part, index) => {
      // Color: [color=#hex]text[/color]
      const colorMatch = part.match(/^\[color=([^\]]+)\]([\s\S]*?)\[\/color\]$/);
      if (colorMatch) {
        const hex = colorMatch[1];
        const innerText = colorMatch[2];
        return (
          <span key={index} style={{ color: hex }} className="font-semibold">
            {renderInline(innerText)}
          </span>
        );
      }

      // Underline: <u>text</u> or __text__
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return (
          <u key={index} className="underline underline-offset-3 decoration-slate-700 font-medium">
            {renderInline(part.slice(3, -4))}
          </u>
        );
      }
      if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
        return (
          <u key={index} className="underline underline-offset-3 decoration-slate-700 font-medium">
            {renderInline(part.slice(2, -2))}
          </u>
        );
      }

      // Strikethrough: ~~text~~
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={index} className="line-through text-slate-400">
            {renderInline(part.slice(2, -2))}
          </del>
        );
      }

      // Highlight: ==text==
      if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
        return (
          <mark key={index} className="bg-amber-200/90 text-slate-900 px-1 py-0.5 rounded-sm font-medium">
            {renderInline(part.slice(2, -2))}
          </mark>
        );
      }

      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {renderInline(part.slice(2, -2))}
          </strong>
        );
      }

      // Italic: *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic text-slate-700">
            {renderInline(part.slice(1, -1))}
          </em>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-1 text-slate-800 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Checklist item: - [ ] or - [x]
        if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
          const isChecked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
          const itemText = trimmed.replace(/^-\s*\[[ xX]\]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm py-0.5">
              <span
                className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  isChecked
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isChecked && <span className="text-[10px] leading-none">✓</span>}
              </span>
              <span className={isChecked ? 'line-through text-slate-400' : ''}>
                {renderInline(itemText)}
              </span>
            </div>
          );
        }

        // 2. Bullet list: • or -
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^(•|-)\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm py-0.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>{renderInline(itemText)}</span>
            </div>
          );
        }

        // 3. Numbered list: e.g. 1. or 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const itemText = numMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm py-0.5 pl-1">
              <span className="font-bold text-indigo-700 text-xs shrink-0 min-w-4 text-right">
                {num}.
              </span>
              <span>{renderInline(itemText)}</span>
            </div>
          );
        }

        // 4. Blockquote: >
        if (trimmed.startsWith('>')) {
          const quoteText = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className="border-l-3 border-indigo-500 pl-3 py-1 my-1 italic bg-indigo-50/50 rounded-r-lg text-xs sm:text-sm text-slate-700"
            >
              {renderInline(quoteText)}
            </blockquote>
          );
        }

        // 5. Headings: # H1, ## H2, ### H3
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-base sm:text-lg font-black text-slate-900 mt-2 mb-1 border-b border-black/10 pb-0.5">
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-sm sm:text-base font-extrabold text-slate-900 mt-1.5 mb-0.5 text-indigo-950">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-800 mt-1 mb-0.5">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        // 6. Horizontal divider: ---
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-2 border-t border-black/15" />;
        }

        // 7. Empty line
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // 8. Normal line (Căn lề thụt đầu dòng đẹp mắt)
        return (
          <p key={idx} className="text-xs sm:text-sm leading-relaxed text-justify indent-6 sm:indent-8">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};
