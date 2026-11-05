import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckSquare,
  Plus,
  Tag,
  Link as LinkIcon,
  Palette,
  Check,
  Calendar,
  ExternalLink,
  ArrowRight,
  Maximize2,
  Minimize2,
  LayoutTemplate,
  Cloud,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  Note,
  NoteChecklistItem,
  NOTE_COLOR_PALETTES,
  DEFAULT_NOTE_LABELS,
  Task
} from '../types/task';
import { FormattingToolbar } from './FormattingToolbar';
import { FormattedContentRenderer } from './FormattedContentRenderer';
import { FloatingNoteToolbar } from './FloatingNoteToolbar';
import { NOTE_TEMPLATES, NoteTemplate } from '../data/noteTemplates';
import { VoiceInputButton } from './VoiceInputButton';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null; // null if creating
  onSaveNote: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onPermanentDeleteNote?: (noteId: string) => void;
  onConvertChecklistToTask?: (text: string, noteTitle: string) => void;
  onOpenTaskDetail?: (taskId: string) => void;
  tasks: Task[];
  currentUserId?: string;
  initialLinkedTaskId?: string;
  initialLabel?: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  note,
  onSaveNote,
  onDeleteNote,
  onPermanentDeleteNote,
  onConvertChecklistToTask,
  onOpenTaskDetail,
  tasks,
  currentUserId = '',
  initialLinkedTaskId,
  initialLabel,
}) => {
  const isEditing = Boolean(note);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPreviewingContent, setIsPreviewingContent] = useState(false);
  const [color, setColor] = useState('#FFFFFF');
  const [labels, setLabels] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [checklistItems, setChecklistItems] = useState<NoteChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Full-screen mode state
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Template picker state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateForInsert, setSelectedTemplateForInsert] = useState<NoteTemplate | null>(null);
  const [showConflictChoice, setShowConflictChoice] = useState(false);

  // Auto-save & draft states
  const draftKey = note ? `taskmaster_note_draft_${note.id}` : 'taskmaster_note_draft_new';
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
        setColor(note.color || '#FFFFFF');
        setLabels(Array.isArray(note.labels) ? note.labels : []);
        setIsPinned(!!note.isPinned);
        setIsArchived(!!note.isArchived);
        setChecklistItems(Array.isArray(note.checklistItems) ? note.checklistItems : []);
        setLinkedTaskIds(Array.isArray(note.linkedTaskIds) ? note.linkedTaskIds : []);
      } else {
        setTitle('');
        setContent('');
        setColor('#FFFFFF');
        setLabels(initialLabel ? [initialLabel] : ['Công việc']);
        setIsPinned(false);
        setIsArchived(false);
        setChecklistItems([]);
        setLinkedTaskIds([]);
      }
      setNewChecklistText('');
      setCustomTagInput('');
      setIsAddingTag(false);
      setShowColorPicker(false);
      setShowTaskPicker(false);
      setShowTemplateModal(false);
      setShowConflictChoice(false);
      setSelectedTemplateForInsert(null);

      // Check for unsaved draft
      try {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          const hasDraftContent =
            parsed &&
            (parsed.title?.trim() ||
              parsed.content?.trim() ||
              (parsed.checklistItems && parsed.checklistItems.length > 0));
          if (hasDraftContent) {
            if (
              !note ||
              (parsed.savedAt &&
                note.updatedAt &&
                new Date(parsed.savedAt).getTime() > new Date(note.updatedAt).getTime())
            ) {
              setRecoveredDraft(parsed);
            }
          }
        }
      } catch {}
    }
  }, [isOpen, note, draftKey]);

  // Periodic Auto-Save
  useEffect(() => {
    if (!isOpen) return;
    if (!title.trim() && !content.trim() && checklistItems.length === 0) return;

    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          title,
          content,
          color,
          labels,
          checklistItems,
          linkedTaskIds,
          isPinned,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draftPayload));
        setLastSavedDraftTime(
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (e) {
        console.warn('Auto-save error', e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpen, title, content, color, labels, checklistItems, linkedTaskIds, isPinned, draftKey]);

  // Full-screen Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const handleRestoreDraft = () => {
    if (!recoveredDraft) return;
    if (recoveredDraft.title !== undefined) setTitle(recoveredDraft.title);
    if (recoveredDraft.content !== undefined) setContent(recoveredDraft.content);
    if (recoveredDraft.color) setColor(recoveredDraft.color);
    if (Array.isArray(recoveredDraft.labels)) setLabels(recoveredDraft.labels);
    if (Array.isArray(recoveredDraft.checklistItems)) setChecklistItems(recoveredDraft.checklistItems);
    if (Array.isArray(recoveredDraft.linkedTaskIds)) setLinkedTaskIds(recoveredDraft.linkedTaskIds);
    if (recoveredDraft.isPinned !== undefined) setIsPinned(recoveredDraft.isPinned);
    setRecoveredDraft(null);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setRecoveredDraft(null);
  };

  const handleSelectTemplate = (template: NoteTemplate) => {
    if (!content.trim() && !title.trim()) {
      applyTemplate(template, 'replace');
    } else {
      setSelectedTemplateForInsert(template);
      setShowConflictChoice(true);
    }
  };

  const applyTemplate = (template: NoteTemplate, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setTitle(template.defaultTitle);
      setContent(template.defaultContent);
      if (template.defaultColor) setColor(template.defaultColor);
      setLabels(Array.from(new Set([...labels, ...template.defaultLabels])));
      if (template.checklistItems && template.checklistItems.length > 0) {
        setChecklistItems(
          template.checklistItems.map((text, idx) => ({
            id: `chk_${Date.now()}_${idx}`,
            text,
            completed: false,
          }))
        );
      }
    } else {
      if (!title.trim()) setTitle(template.defaultTitle);
      setContent((prev) => `${prev.trim()}\n\n---\n\n${template.defaultContent}`);
      setLabels(Array.from(new Set([...labels, ...template.defaultLabels])));
      if (template.checklistItems && template.checklistItems.length > 0) {
        const added = template.checklistItems.map((text, idx) => ({
          id: `chk_${Date.now()}_${idx}`,
          text,
          completed: false,
        }));
        setChecklistItems((prev) => [...prev, ...added]);
      }
    }
    setShowConflictChoice(false);
    setSelectedTemplateForInsert(null);
    setShowTemplateModal(false);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    // If both title, content and checklist are empty, just close
    if (!cleanTitle && !cleanContent && checklistItems.length === 0) {
      onClose();
      return;
    }

    // Clear auto-save draft on intentional save
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setRecoveredDraft(null);
    setLastSavedDraftTime(null);

    const nowIso = new Date().toISOString();
    const noteId = note?.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const savedNote: Note = {
      id: noteId,
      ownerId: note?.ownerId || currentUserId,
      title: cleanTitle || 'Ghi chú không tiêu đề',
      content: cleanContent,
      color,
      labels,
      checklistItems,
      linkedTaskIds,
      isPinned,
      isArchived,
      isDeleted: note?.isDeleted || false,
      deletedAt: note?.deletedAt,
      createdAt: note?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSaveNote(savedNote);
    onClose();
  };

  // Checklist helpers
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: NoteChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text: newChecklistText.trim(),
      completed: false,
    };
    setChecklistItems([...checklistItems, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  // Label helpers
  const handleToggleLabel = (label: string) => {
    if (labels.includes(label)) {
      setLabels(labels.filter((l) => l !== label));
    } else {
      setLabels([...labels, label]);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    if (!labels.includes(tag)) {
      setLabels([...labels, tag]);
    }
    setCustomTagInput('');
    setIsAddingTag(false);
  };

  // Linked task toggle
  const handleToggleLinkedTask = (taskId: string) => {
    if (linkedTaskIds.includes(taskId)) {
      setLinkedTaskIds(linkedTaskIds.filter((id) => id !== taskId));
    } else {
      setLinkedTaskIds([...linkedTaskIds, taskId]);
    }
  };

  // Find color option
  const activeColorOption = NOTE_COLOR_PALETTES.find((c) => c.hex === color) || NOTE_COLOR_PALETTES[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs transition-all ${
        isFullScreen ? 'p-0' : 'p-3 sm:p-5'
      }`}
    >
      <div
        className={`flex flex-col shadow-2xl transition-all duration-150 overflow-hidden ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0'
            : 'rounded-3xl max-w-2xl w-full max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in-95'
        }`}
        style={{ backgroundColor: color }}
      >
        {/* Header toolbar */}
        <div className="px-6 py-3.5 border-b border-black/5 flex items-center justify-between shrink-0 bg-white/40 backdrop-blur-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {isEditing ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
            </span>
            {isPinned && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                <Pin className="w-3 h-3 fill-amber-600 text-amber-600" />
                Đã ghim
              </span>
            )}
            {isArchived && (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                Đã lưu trữ
              </span>
            )}
            {lastSavedDraftTime && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300/60 animate-in fade-in">
                <Cloud className="w-3 h-3 text-emerald-600" />
                <span>Đã lưu nháp tự động {lastSavedDraftTime}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Template Selector Button */}
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-indigo-700 text-xs font-bold transition-all border border-indigo-200 shadow-2xs cursor-pointer"
              title="Chọn mẫu ghi chú định dạng sẵn (Biên bản họp, Kế hoạch tuần, Ý tưởng...)"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Mẫu có sẵn</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Thu nhỏ cửa sổ (Esc)' : 'Toàn màn hình (F11/Mở rộng)'}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isFullScreen
                  ? 'bg-indigo-100 text-indigo-700 font-bold ring-2 ring-indigo-400/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
              }`}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Bỏ ghim' : 'Ghim ghi chú lên đầu'}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
            </button>

            {/* Archive Toggle */}
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsArchived(!isArchived)}
                title={isArchived ? 'Khôi phục từ lưu trữ' : 'Lưu trữ ghi chú'}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-black/5 transition-all cursor-pointer"
              >
                {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </button>
            )}

            {/* Delete button */}
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (note?.isDeleted && onPermanentDeleteNote) {
                    if (window.confirm('Bạn có chắc muốn xóa vĩnh viễn ghi chú này?')) {
                      onPermanentDeleteNote(note.id);
                      onClose();
                    }
                  } else if (onDeleteNote && note) {
                    onDeleteNote(note.id);
                    onClose();
                  }
                }}
                title={note?.isDeleted ? 'Xóa vĩnh viễn' : 'Chuyển vào thùng rác'}
                className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={handleSave}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-black/5 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Note Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {/* Unsaved draft recovery alert */}
          {recoveredDraft && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold">Tìm thấy bản nháp tự động chưa lưu</span>
                  <span className="text-[11px] text-amber-700 ml-1.5">
                    ({recoveredDraft.savedAt ? new Date(recoveredDraft.savedAt).toLocaleTimeString('vi-VN') : 'gần đây'})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                >
                  Khôi phục
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2 py-1 rounded-lg hover:bg-amber-100 text-amber-800 font-medium text-xs cursor-pointer"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          )}

          {/* Title and Template Trigger Row */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề ghi chú..."
              className="flex-1 text-lg sm:text-xl font-extrabold bg-transparent border-0 outline-hidden placeholder:text-slate-400 text-slate-900 focus:ring-0 px-0"
              autoFocus={!isEditing}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <VoiceInputButton
                currentValue={title}
                onTranscript={(text) => setTitle(text)}
                mode="replace"
                tooltip="Nói tiêu đề ghi chú"
                buttonText="Nói tiêu đề"
              />
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold shrink-0 border border-indigo-200"
                title="Chọn mẫu"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Formatting Toolbar & Voice Content Dictation */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex-1 min-w-[240px]">
              <FormattingToolbar
                textareaRef={contentTextareaRef}
                value={content}
                onChange={setContent}
                isPreviewing={isPreviewingContent}
                onTogglePreview={setIsPreviewingContent}
                className="bg-white/80 border-black/10 shadow-xs"
              />
            </div>
            <VoiceInputButton
              currentValue={content}
              onTranscript={(text) => setContent(text)}
              mode="append"
              tooltip="Đọc nội dung để thêm vào ghi chú"
              buttonText="Nói nội dung"
              className="shadow-2xs"
            />
          </div>

          {/* Content Area with Floating Formatting Toolbar */}
          <div ref={editorContainerRef} className={`relative ${isFullScreen ? 'min-h-[460px] flex-1' : 'min-h-[140px]'}`}>
            {!isPreviewingContent && (
              <FloatingNoteToolbar
                textareaRef={contentTextareaRef}
                containerRef={editorContainerRef}
                value={content}
                onChange={setContent}
              />
            )}

            {isPreviewingContent ? (
              <div
                onClick={() => setIsPreviewingContent(false)}
                className={`w-full p-4 rounded-2xl bg-white/70 border border-black/5 text-sm cursor-text hover:border-black/20 transition-all ${
                  isFullScreen ? 'min-h-[460px] flex-1' : 'min-h-[140px]'
                }`}
                title="Nhấn để tiếp tục soạn thảo"
              >
                {content ? (
                  <FormattedContentRenderer content={content} />
                ) : (
                  <span className="italic text-slate-400">Chưa có nội dung để xem trước... Nhấn để soạn thảo.</span>
                )}
              </div>
            ) : (
              <textarea
                ref={contentTextareaRef}
                rows={isFullScreen ? 18 : 6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nội dung ghi chú, ý tưởng... (Bôi đen từ hoặc đoạn văn để mở thanh công cụ nổi: H1, H2, bôi đậm, in nghiêng, gạch chân, đổi màu chữ)"
                className={`w-full bg-transparent border-0 outline-hidden placeholder:text-slate-400 text-slate-800 leading-relaxed focus:ring-0 px-0 resize-none ${
                  isFullScreen ? 'min-h-[460px] text-base leading-loose flex-1' : 'min-h-[130px] text-sm'
                }`}
              />
            )}
          </div>

          {/* Checklist in Note Section */}
          <div className="space-y-2 pt-2 border-t border-black/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                Danh sách việc cần làm (Checklist trong ghi chú)
              </span>
              {checklistItems.length > 0 && (
                <span className="text-[11px] text-slate-500 font-semibold">
                  {checklistItems.filter((c) => c.completed).length}/{checklistItems.length} hoàn thành
                </span>
              )}
            </div>

            {/* Items list */}
            {checklistItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/70 hover:bg-white border border-black/5 transition-all group"
              >
                <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span
                    className={`text-xs text-slate-800 truncate ${
                      item.completed ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </label>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  {onConvertChecklistToTask && !item.completed && (
                    <button
                      type="button"
                      onClick={() => onConvertChecklistToTask(item.text, title || 'Ghi chú')}
                      title="Chuyển mục này thành nhiệm vụ chính thức"
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Tạo việc</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    title="Xóa mục"
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add checklist item input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="+ Thêm mục checklist (nhấn Enter để thêm)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-indigo-500"
              />
              <VoiceInputButton
                currentValue={newChecklistText}
                onTranscript={(text) => setNewChecklistText(text)}
                mode="replace"
                tooltip="Nói để điền nhanh mục checklist"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistText.trim()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Linked Tasks Section */}
          <div className="space-y-2 pt-2 border-t border-black/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                Liên kết với nhiệm vụ ({linkedTaskIds.length})
              </span>
              <button
                type="button"
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {showTaskPicker ? 'Thu gọn' : '+ Chọn nhiệm vụ liên kết'}
              </button>
            </div>

            {/* Display currently linked tasks */}
            {linkedTaskIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {linkedTaskIds.map((taskId) => {
                  const task = tasks.find((t) => t.id === taskId);
                  if (!task) return null;
                  return (
                    <div
                      key={taskId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-indigo-200 text-xs text-indigo-900 font-semibold shadow-2xs group"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenTaskDetail && onOpenTaskDetail(taskId)}
                        className="hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                        title={task.title}
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleLinkedTask(taskId)}
                        className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                        title="Hủy liên kết"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Task selector dropdown */}
            {showTaskPicker && (
              <div className="p-2.5 rounded-2xl bg-white/95 border border-slate-200 shadow-md max-h-48 overflow-y-auto space-y-1">
                <p className="text-[11px] font-bold text-slate-500 px-1 mb-1">
                  Chọn công việc để gắn kết với ghi chú này:
                </p>
                {tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">Chưa có nhiệm vụ nào trong hệ thống.</p>
                ) : (
                  tasks.map((t) => {
                    const isLinked = linkedTaskIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleLinkedTask(t.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isLinked
                            ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate max-w-[380px]">{t.title}</span>
                        {isLinked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Labels & Tags Section */}
          <div className="space-y-2 pt-2 border-t border-black/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Nhãn phân loại:
              </span>
              <button
                type="button"
                onClick={() => setIsAddingTag(!isAddingTag)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Thêm nhãn mới
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DEFAULT_NOTE_LABELS.map((lbl) => {
                const isSelected = labels.includes(lbl);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => handleToggleLabel(lbl)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/70 text-slate-600 hover:bg-white border border-black/5'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}

              {/* Custom tags */}
              {labels
                .filter((l) => !DEFAULT_NOTE_LABELS.includes(l))
                .map((custom) => (
                  <span
                    key={custom}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs"
                  >
                    <span>{custom}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleLabel(custom)}
                      className="hover:opacity-75 cursor-pointer ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>

            {/* Custom Tag Input */}
            {isAddingTag && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Nhập tên nhãn mới..."
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu nhãn
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingTag(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions: Pastel Color Palette & Save */}
        <div className="px-6 py-3.5 border-t border-black/5 flex flex-wrap items-center justify-between gap-3 bg-white/40 backdrop-blur-xs">
          {/* Pastel Color Swatches */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Màu:
            </span>
            <div className="flex items-center gap-1.5">
              {NOTE_COLOR_PALETTES.map((p) => {
                const isSelected = color.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setColor(p.hex)}
                    title={p.name}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                      isSelected ? 'border-indigo-600 scale-110 shadow-xs' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-black/5 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo ghi chú'}
            </button>
          </div>
        </div>

        {/* Template Picker Modal Overlay */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Chọn mẫu ghi chú có sẵn</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chèn sẵn cấu trúc chuẩn giúp tiết kiệm thời gian soạn thảo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                {NOTE_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group flex items-start gap-3.5"
                  >
                    <div className="text-2xl p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors shrink-0">
                      {tpl.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {tpl.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {tpl.defaultLabels.map((lbl) => (
                          <span
                            key={lbl}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700"
                          >
                            #{lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 border-t border-slate-100 bg-white flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Conflict Choice Modal */}
        {showConflictChoice && selectedTemplateForInsert && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Áp dụng mẫu: {selectedTemplateForInsert.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi chú của bạn đã có nội dung. Bạn muốn xử lý như thế nào?
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => applyTemplate(selectedTemplateForInsert, 'append')}
                  className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold">Chèn nối tiếp vào cuối</div>
                    <div className="text-[11px] text-indigo-700/80">
                      Giữ nguyên nội dung hiện tại và chèn mẫu vào phía dưới
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplate(selectedTemplateForInsert, 'replace')}
                  className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-left transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-rose-800">Ghi đè toàn bộ nội dung</div>
                    <div className="text-[11px] text-rose-700/80">
                      Thay thế tiêu đề và toàn bộ nội dung hiện tại bằng mẫu mới
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConflictChoice(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
