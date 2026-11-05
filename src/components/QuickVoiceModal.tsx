import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  CheckSquare,
  StickyNote,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  AlertCircle,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useSpeechRecognition, formatSpeechText } from '../hooks/useSpeechRecognition';

export interface QuickVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTaskWithVoice: (text: string) => void;
  onCreateNoteWithVoice: (text: string) => void;
}

export const QuickVoiceModal: React.FC<QuickVoiceModalProps> = ({
  isOpen,
  onClose,
  onCreateTaskWithVoice,
  onCreateNoteWithVoice,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'vi-VN' | 'en-US'>('vi-VN');
  const [editableText, setEditableText] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setLanguage,
  } = useSpeechRecognition({
    lang: selectedLanguage,
    continuous: true,
    interimResults: true,
    onResult: (spokenText) => {
      setEditableText(spokenText);
    },
  });

  // When opening, reset and automatically start listening if supported
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      setEditableText('');
      setCopied(false);
      if (isSupported) {
        // Start listening after a brief animation delay
        const timer = setTimeout(() => {
          startListening({ lang: selectedLanguage });
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      stopListening();
    }
  }, [isOpen, isSupported, selectedLanguage]);

  if (!isOpen) return null;

  const handleLanguageChange = (newLang: 'vi-VN' | 'en-US') => {
    setSelectedLanguage(newLang);
    setLanguage(newLang);
  };

  const handleCopyText = async () => {
    if (!editableText.trim()) return;
    try {
      await navigator.clipboard.writeText(editableText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCreateTask = () => {
    const textToUse = editableText.trim() || interimTranscript.trim();
    if (!textToUse) return;
    onCreateTaskWithVoice(textToUse);
    onClose();
  };

  const handleCreateNote = () => {
    const textToUse = editableText.trim() || interimTranscript.trim();
    if (!textToUse) return;
    onCreateNoteWithVoice(textToUse);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Nhập Liệu Bằng Giọng Nói</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  Web Speech
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Nói vào micro để tự động chuyển thành văn bản và tạo việc hoặc ghi chú tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Language Switcher Bar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 pl-1">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Ngôn ngữ nhận diện:</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleLanguageChange('vi-VN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedLanguage === 'vi-VN'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tiếng Việt (vi-VN)
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en-US')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedLanguage === 'en-US'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                English (en-US)
              </button>
            </div>
          </div>

          {/* Microphone Interactive Zone */}
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-gradient-to-b from-indigo-50/50 via-slate-50 to-white border border-indigo-100 text-center space-y-4">
            {isSupported ? (
              <>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                    isListening
                      ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/40 scale-105 ring-4 ring-rose-400/40'
                      : 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white hover:scale-105 shadow-indigo-500/30'
                  }`}
                  title={isListening ? 'Bấm để dừng ghi âm' : 'Bấm để bắt đầu nói'}
                >
                  {isListening ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                      <Mic className="w-8 h-8 relative z-10" />
                    </>
                  ) : (
                    <Mic className="w-8 h-8 relative z-10" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-slate-900">
                    {isListening ? 'Đang lắng nghe giọng nói...' : 'Nhấn vào biểu tượng Micro để bắt đầu nói'}
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isListening
                      ? 'Hãy nói to, rõ ràng vào micro. Hệ thống sẽ tự động chuyển giọng nói thành văn bản.'
                      : 'Hỗ trợ nói tiếng Việt chuẩn. Bạn có thể nói một hoặc nhiều câu liên tục.'}
                  </p>
                </div>

                {/* Animated sound bars while listening */}
                {isListening && (
                  <div className="flex items-center gap-1.5 h-6">
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-5" style={{ animationDelay: '100ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-6" style={{ animationDelay: '200ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-4" style={{ animationDelay: '300ms' }} />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2" style={{ animationDelay: '400ms' }} />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2 py-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <MicOff className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Trình duyệt chưa hỗ trợ Web Speech API
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Tính năng nhận diện giọng nói yêu cầu trình duyệt hỗ trợ Web Speech API (Google Chrome, Microsoft Edge, Safari trên macOS/iOS).
                </p>
              </div>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transcription Display & Editable Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Văn bản đã nhận diện:</span>
                {interimTranscript && (
                  <span className="text-[10px] text-rose-600 font-semibold italic animate-pulse">
                    (Đang nhận diện...)
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {editableText && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetTranscript();
                    setEditableText('');
                  }}
                  disabled={!editableText && !interimTranscript}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={editableText || interimTranscript}
                onChange={(e) => setEditableText(e.target.value)}
                placeholder="Nội dung bạn nói sẽ hiển thị trực tiếp ở đây. Bạn cũng có thể tự chỉnh sửa hoặc thêm bớt..."
                className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-sm text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed resize-none bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCreateNote}
              disabled={!editableText.trim() && !interimTranscript.trim()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Lưu nội dung nói này thành một ghi chú nhanh"
            >
              <StickyNote className="w-4 h-4" />
              <span>Lưu Thành Ghi Chú</span>
            </button>

            <button
              type="button"
              onClick={handleCreateTask}
              disabled={!editableText.trim() && !interimTranscript.trim()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Mở biểu mẫu tạo nhiệm vụ với nội dung này"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tạo Nhiệm Vụ Mới</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
