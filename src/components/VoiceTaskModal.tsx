import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  Layers,
  ArrowRight,
  X,
  RotateCcw,
  Volume2,
  Tag,
  Hash,
  Plus,
} from 'lucide-react';
import { Task, UserProfile, VoiceTaskAnalysisResult } from '../types/task';
import { extractKeywordsAndTags } from '../utils/voiceAnalysis';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
  userProfile: UserProfile;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  userProfile,
}) => {
  // Recording states: 'idle' | 'recording' | 'processing' | 'preview'
  const [stage, setStage] = useState<'idle' | 'recording' | 'processing' | 'preview'>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Stream & MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // AI Parsed Result & Form State
  const [analysisResult, setAnalysisResult] = useState<VoiceTaskAnalysisResult | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('17:00');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formUnit, setFormUnit] = useState('');
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [formKeywords, setFormKeywords] = useState<string[]>([]);
  const [manualSpokenText, setManualSpokenText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setStage('idle');
      setRecordSeconds(0);
      setErrorMessage(null);
      setAnalysisResult(null);
      setManualSpokenText('');
      setFormTags([]);
      setNewTagInput('');
      setFormKeywords([]);
      audioChunksRef.current = [];
    } else {
      stopRecordingCleanup();
    }
  }, [isOpen]);

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
  };

  // Start recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp hoặc chưa cấp quyền thiết bị.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Prefer audio/webm, fallback to standard mime types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        processAudioWithGemini(audioBlob, recorder.mimeType || 'audio/webm');
      };

      recorder.start(250); // Slice chunks every 250ms
      setStage('recording');
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[Microphone Access Info]', err?.name, err?.message);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('denied');

      setErrorMessage(
        isDenied
          ? 'Trình duyệt chưa cấp quyền micro (hoặc micro đang bị chặn). Bạn có thể bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ để bật micro, hoặc nhập nhanh nội dung câu nói vào ô bên dưới để AI phân tích ngay.'
          : 'Không thể truy cập micro ghi âm. Bạn có thể nhập nhanh nội dung câu nói vào ô bên dưới để AI phân tích ngay.'
      );
      setShowManualInput(true);
      setStage('idle');
    }
  };

  // Process text prompt directly when microphone is unavailable or user prefers typing
  const processTextWithGemini = async (text: string) => {
    if (!text.trim()) {
      setErrorMessage('Vui lòng nhập nội dung câu nói của bạn.');
      return;
    }
    setStage('processing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/voice-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textPrompt: text.trim(),
          nowIso: new Date().toISOString(),
          timeZone: 'Asia/Ho_Chi_Minh',
          units: userProfile.units || ['Ban Thanh Niên', 'Văn Phòng'],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Lỗi xử lý câu nói với Gemini AI.');
      }

      const data = await res.json();
      const result: VoiceTaskAnalysisResult = data.result;

      setAnalysisResult(result);
      setFormTitle(result.title || '');
      setFormDescription(result.description || '');
      setFormDueDate(result.dueDate || '');
      setFormDueTime(result.dueTime || '17:00');
      setFormPriority(result.priority || 'medium');
      setFormUnit(result.unit || userProfile.units[0] || 'Ban Thanh Niên');
      setFormSubtasks(result.subtasks || []);

      const autoExtracted = extractKeywordsAndTags(
        `${text} ${result.title || ''} ${result.description || ''}`,
        result.unit || userProfile.units[0]
      );
      const mergedTags = Array.from(
        new Set([
          ...(Array.isArray(result.tags) ? result.tags : []),
          ...autoExtracted.tags,
        ])
      );
      const mergedKeywords = Array.from(
        new Set([
          ...(Array.isArray(result.keywords) ? result.keywords : []),
          ...autoExtracted.keywords,
        ])
      );

      setFormTags(mergedTags.length > 0 ? mergedTags : ['Nhiệm vụ', result.unit || 'Chung']);
      setFormKeywords(mergedKeywords);
      setStage('preview');
    } catch (postErr: any) {
      setErrorMessage(postErr.message || 'Lỗi kết nối máy chủ phân tích.');
      setStage('idle');
    }
  };

  // Stop recording manually
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setStage('processing');
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Send audio to Gemini server-side endpoint
  const processAudioWithGemini = async (blob: Blob, mimeType: string) => {
    setStage('processing');
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/ai/voice-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType,
              nowIso: new Date().toISOString(),
              timeZone: 'Asia/Ho_Chi_Minh',
              units: userProfile.units || ['Ban Thanh Niên', 'Văn Phòng'],
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.details || errData.error || 'Lỗi xử lý âm thanh với Gemini AI.');
          }

          const data = await res.json();
          const result: VoiceTaskAnalysisResult = data.result;

          setAnalysisResult(result);
          setFormTitle(result.title || '');
          setFormDescription(result.description || '');
          setFormDueDate(result.dueDate || '');
          setFormDueTime(result.dueTime || '17:00');
          setFormPriority(result.priority || 'medium');
          setFormUnit(result.unit || userProfile.units[0] || 'Ban Thanh Niên');
          setFormSubtasks(result.subtasks || []);

          const autoExtracted = extractKeywordsAndTags(
            `${result.transcript || ''} ${result.title || ''} ${result.description || ''}`,
            result.unit || userProfile.units[0]
          );
          const mergedTags = Array.from(
            new Set([
              ...(Array.isArray(result.tags) ? result.tags : []),
              ...autoExtracted.tags,
            ])
          );
          const mergedKeywords = Array.from(
            new Set([
              ...(Array.isArray(result.keywords) ? result.keywords : []),
              ...autoExtracted.keywords,
            ])
          );

          setFormTags(mergedTags.length > 0 ? mergedTags : ['Nhiệm vụ', result.unit || 'Chung']);
          setFormKeywords(mergedKeywords);
          setStage('preview');
        } catch (postErr: any) {
          setErrorMessage(postErr.message || 'Lỗi kết nối máy chủ phân tích giọng nói.');
          setStage('idle');
        }
      };
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi đọc tệp ghi âm.');
      setStage('idle');
    }
  };

  // Confirm and Save Task
  const handleConfirmSave = () => {
    if (!formTitle.trim()) {
      setErrorMessage('Tiêu đề nhiệm vụ không được để trống.');
      return;
    }

    const newTask: Task = {
      id: `task_voice_${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      unit: formUnit || userProfile.units[0] || 'Chung',
      priority: formPriority,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      dueDate: formDueDate
        ? `${formDueDate}T${formDueTime || '17:00'}:00`
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      subtasks: formSubtasks.map((st, idx) => ({
        id: `st_v_${idx}_${Date.now()}`,
        title: st,
        phase: 'Thực hiện',
        completed: false,
      })),
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
      source: 'app',
      assigner: userProfile.defaultAssigner,
      tags: formTags.length > 0 ? formTags : undefined,
    };

    onSaveTask(newTask);
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Ghi Âm &amp; Tạo Nhiệm Vụ
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-white/25 rounded-full">
                  Giọng nói tự nhiên
                </span>
              </h3>
              <p className="text-xs text-white/80">
                Nói yêu cầu công việc tự nhiên • Tự động trích xuất thông tin, người dùng xác nhận trước khi lưu
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopRecordingCleanup();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* STAGE 1: IDLE */}
          {stage === 'idle' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-30" />
                <button
                  onClick={handleStartRecording}
                  className="relative p-6 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl hover:shadow-red-500/30 hover:scale-105 active:scale-95 transition-all"
                  title="Nhấn để bắt đầu ghi âm"
                >
                  <Mic className="w-10 h-10" />
                </button>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">Nhấn nút Micro để nói yêu cầu công việc</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Ví dụ: <span className="italic font-medium text-slate-700">"Hoàn thành dự thảo báo cáo tài chính quý 4 trước 17 giờ chiều mai cho Ban Thanh Niên, mức độ khẩn"</span>
                </p>
              </div>

              {/* Alternative natural language input mode */}
              <div className="pt-1">
                {!showManualInput ? (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    Hoặc gõ câu nói tự nhiên (Nếu micro bị chặn hoặc không có micro)
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2.5 max-w-md mx-auto animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Soạn văn bản nhiệm vụ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowManualInput(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={manualSpokenText}
                      onChange={(e) => setManualSpokenText(e.target.value)}
                      placeholder='Ví dụ: "Hoàn thành dự thảo báo cáo tài chính trước 17 giờ chiều mai cho Ban Thanh Niên, mức độ khẩn"'
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => processTextWithGemini(manualSpokenText)}
                      disabled={!manualSpokenText.trim()}
                      className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-bold text-xs shadow-md hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Phân tích yêu cầu</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: RECORDING */}
          {stage === 'recording' && (
            <div className="text-center py-8 space-y-5">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-2xl font-bold text-red-600">{formatTimer(recordSeconds)}</span>
              </div>

              {/* Pulsing Visualizer Wave */}
              <div className="flex items-center justify-center gap-1.5 h-12">
                {[16, 28, 44, 20, 36, 48, 24, 40, 18, 30, 42, 22].map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>

              <p className="text-xs text-slate-600 font-medium">
                Đang lắng nghe... Nói tự nhiên nội dung công việc và thời hạn của bạn.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    stopRecordingCleanup();
                    setStage('idle');
                    setRecordSeconds(0);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Hủy bỏ bản ghi
                </button>
                <button
                  onClick={handleStopRecording}
                  className="px-6 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Xong & Phân tích ngay
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: PROCESSING */}
          {stage === 'processing' && (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Đang lắng nghe và trích xuất thông tin nhiệm vụ...</h4>
              <p className="text-xs text-slate-500">
                Nhận diện nội dung tiếng Việt, tính toán mốc thời gian Asia/Ho_Chi_Minh và đề xuất cấu trúc công việc.
              </p>
            </div>
          )}

          {/* STAGE 4: PREVIEW & EDIT */}
          {stage === 'preview' && analysisResult && (
            <div className="space-y-4">
              {/* Transcript Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  Nội dung bạn vừa nói:
                </div>
                <div className="italic text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                  "{analysisResult.transcript || '(Không nhận diện được giọng nói)'}"
                </div>
              </div>

              {/* Missing Fields Warnings */}
              {analysisResult.missingFields && analysisResult.missingFields.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Lưu ý thông tin còn thiếu từ câu nói:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5">
                    {analysisResult.missingFields.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Editable Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề nhiệm vụ *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Nhập tiêu đề nhiệm vụ..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Đơn vị thực hiện
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
                    >
                      {userProfile.units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="high">Cao (Khẩn cấp)</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Hạn hoàn thành (Ngày)</span>
                      {!formDueDate && (
                        <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                          Cần chọn ngày
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none ${
                        !formDueDate ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giờ hoàn thành
                    </label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mô tả công việc
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả bối cảnh hoặc ghi chú thêm..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                  />
                </div>

                {/* AI Extracted Keywords & Tags */}
                <div className="p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Phân tích giọng nói &amp; Gán nhãn tự động
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                      Gemini AI Voice
                    </span>
                  </div>

                  {/* Keywords Extracted */}
                  {formKeywords.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Từ khóa quan trọng phát hiện:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {formKeywords.map((kw, kidx) => (
                          <span
                            key={kidx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs"
                          >
                            <span className="text-indigo-500 mr-1 font-bold">#</span>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task Tags Management */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-600" />
                        Nhãn nhiệm vụ (Tags) ({formTags.length})
                      </label>
                      <span className="text-[10px] text-slate-400">Tự động gán cho nhiệm vụ mới</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {formTags.map((tag, tidx) => (
                        <span
                          key={tidx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-2xs group"
                        >
                          <Hash className="w-3 h-3 opacity-75" />
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => setFormTags(formTags.filter((_, i) => i !== tidx))}
                            className="hover:bg-indigo-700 rounded-xs p-0.5 ml-0.5 cursor-pointer text-indigo-200 hover:text-white"
                            title="Xóa nhãn"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {formTags.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">Chưa có nhãn nào</span>
                      )}
                    </div>

                    {/* Add new tag input */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTagInput.trim()) {
                              e.preventDefault();
                              const clean = newTagInput.trim().replace(/^#/, '');
                              if (!formTags.includes(clean)) {
                                setFormTags([...formTags, clean]);
                              }
                              setNewTagInput('');
                            }
                          }}
                          placeholder="Nhập tên nhãn mới rồi nhấn Enter..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (newTagInput.trim()) {
                            const clean = newTagInput.trim().replace(/^#/, '');
                            if (!formTags.includes(clean)) {
                              setFormTags([...formTags, clean]);
                            }
                            setNewTagInput('');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer"
                      >
                        + Thêm nhãn
                      </button>
                    </div>

                    {/* Quick tag suggestions */}
                    <div className="flex items-center gap-1 pt-1.5 text-[10px] text-slate-500">
                      <span>Gợi ý:</span>
                      {['Báo cáo', 'Hội nghị', 'Kế hoạch', 'Khẩn cấp', 'Tài chính'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (!formTags.includes(sug)) {
                              setFormTags([...formTags, sug]);
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            formTags.includes(sug)
                              ? 'bg-indigo-100 text-indigo-700 font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          +{sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Các bước hành động ({formSubtasks.length})
                  </label>
                  <div className="space-y-1.5 mb-2">
                    {formSubtasks.map((st, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <span className="text-slate-700">
                          {index + 1}. {st}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormSubtasks(formSubtasks.filter((_, i) => i !== index))}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtaskInput}
                      onChange={(e) => setNewSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubtaskInput.trim()) {
                          e.preventDefault();
                          setFormSubtasks([...formSubtasks, newSubtaskInput.trim()]);
                          setNewSubtaskInput('');
                        }
                      }}
                      placeholder="+ Thêm bước thực hiện..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubtaskInput.trim()) {
                          setFormSubtasks([...formSubtasks, newSubtaskInput.trim()]);
                          setNewSubtaskInput('');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {stage === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStage('idle');
                  setAnalysisResult(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ghi âm lại
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopRecordingCleanup();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận & Lưu nhiệm vụ
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] text-slate-400">
                Âm thanh được phân tích và hủy tức thì, không lưu trên máy chủ
              </span>
              <button
                type="button"
                onClick={() => {
                  stopRecordingCleanup();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl"
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
