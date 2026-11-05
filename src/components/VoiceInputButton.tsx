import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export interface VoiceInputButtonProps {
  onTranscript: (newText: string) => void;
  currentValue?: string;
  mode?: 'append' | 'replace';
  lang?: 'vi-VN' | 'en-US';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
  buttonText?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  currentValue = '',
  mode = 'append',
  lang = 'vi-VN',
  size = 'sm',
  className = '',
  tooltip = 'Nhập bằng giọng nói (Web Speech API)',
  buttonText,
}) => {
  const { isSupported, isListening, error, toggleListening } = useSpeechRecognition({
    lang,
    continuous: true,
    interimResults: true,
    onResult: (spokenText, isFinal) => {
      if (isFinal && spokenText) {
        if (mode === 'append') {
          const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
          onTranscript(`${currentValue}${separator}${spokenText}`);
        } else {
          onTranscript(spokenText);
        }
      }
    },
  });

  const sizeClasses =
    size === 'sm'
      ? 'p-1.5 text-xs'
      : size === 'lg'
      ? 'px-4 py-2.5 text-sm'
      : 'px-3 py-1.5 text-xs';

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng mở bằng Chrome hoặc Edge."
        className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed ${sizeClasses} ${className}`}
      >
        <MicOff className="w-3.5 h-3.5" />
        {buttonText && <span>{buttonText}</span>}
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Đang lắng nghe... Bấm để dừng nói' : tooltip}
        className={`relative inline-flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer ${sizeClasses} ${
          isListening
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50 animate-pulse'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300'
        } ${className}`}
      >
        {isListening ? (
          <>
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <Mic className="relative inline-flex w-3.5 h-3.5 text-white" />
            </span>
            <span className="text-[11px] font-extrabold tracking-wide uppercase">
              {buttonText ? `${buttonText} (Đang nghe...)` : 'Đang nghe...'}
            </span>
            {/* Visual sound waves animation */}
            <span className="flex items-center gap-0.5 ml-1">
              <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
            {buttonText && <span>{buttonText}</span>}
          </>
        )}
      </button>

      {/* Error popover tooltip if any */}
      {error && !isListening && (
        <div className="absolute bottom-full mb-1.5 left-0 z-50 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[10px] px-2.5 py-1 shadow-lg border border-slate-700">
          {error}
        </div>
      )}
    </div>
  );
};
