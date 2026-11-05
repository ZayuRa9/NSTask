import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  startListening: (options?: Partial<UseSpeechRecognitionOptions>) => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  setLanguage: (lang: string) => void;
  currentLanguage: string;
}

export { formatSpeechText } from '../utils/speechRecognitionUtils';
import { formatSpeechText } from '../utils/speechRecognitionUtils';

export function useSpeechRecognition(
  initialOptions: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(initialOptions.lang || 'vi-VN');

  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef(initialOptions);
  optionsRef.current = initialOptions;

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [isListening]);

  const startListening = useCallback(
    (overrideOptions?: Partial<UseSpeechRecognitionOptions>) => {
      setError(null);

      if (typeof window === 'undefined') return;

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech API. Hãy sử dụng Google Chrome, Edge hoặc Safari.');
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const mergedOptions = {
        ...optionsRef.current,
        ...overrideOptions,
      };

      const langToUse = overrideOptions?.lang || currentLanguage;

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = langToUse;
        recognition.continuous = mergedOptions.continuous ?? true;
        recognition.interimResults = mergedOptions.interimResults ?? true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const textPart = res[0]?.transcript || '';
            if (res.isFinal) {
              currentFinal += textPart;
            } else {
              currentInterim += textPart;
            }
          }

          if (currentFinal) {
            setFinalTranscript((prev) => {
              const updated = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim();
              const formatted = formatSpeechText(updated);
              setTranscript(formatted);
              if (mergedOptions.onResult) {
                mergedOptions.onResult(formatted, true);
              }
              return formatted;
            });
            setInterimTranscript('');
          } else {
            setInterimTranscript(currentInterim);
            if (mergedOptions.onResult && currentInterim) {
              if (mergedOptions.onResult) {
                mergedOptions.onResult(currentInterim, false);
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[SpeechRecognition] error:', event.error);
          let message = 'Đã xảy ra lỗi khi nhận diện giọng nói.';
          switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed':
              message = 'Quyền truy cập Micro bị từ chối. Vui lòng cấp quyền Micro trên thanh địa chỉ trình duyệt.';
              break;
            case 'no-speech':
              message = 'Không nhận diện thấy giọng nói. Vui lòng nói lại gần micro hơn.';
              break;
            case 'network':
              message = 'Lỗi kết nối mạng khi xử lý giọng nói.';
              break;
            case 'audio-capture':
              message = 'Không tìm thấy thiết bị thu âm Micro trên máy tính.';
              break;
            case 'aborted':
              return; // Silently handle manual abort
            default:
              message = `Lỗi giọng nói: ${event.error}`;
          }
          setError(message);
          setIsListening(false);
          if (mergedOptions.onError) {
            mergedOptions.onError(message);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          if (mergedOptions.onEnd) {
            mergedOptions.onEnd();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setError('Không thể khởi động micro. Vui lòng thử lại.');
        setIsListening(false);
      }
    },
    [currentLanguage]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const setLanguage = useCallback((newLang: string) => {
    setCurrentLanguage(newLang);
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          startListening({ lang: newLang });
        }, 150);
      } catch {}
    }
  }, [isListening, startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setLanguage,
    currentLanguage,
  };
}
