import React, { useState, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckSquare,
  Tag,
  Link as LinkIcon,
  Filter,
  Sparkles,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Lock,
  Settings,
  Check,
  X
} from 'lucide-react';
import { Note, Task, DEFAULT_NOTE_LABELS, NOTE_COLOR_PALETTES } from '../types/task';
import {
  filterNotes,
  loadAllLabels,
  saveAllLabels,
  deleteLabelSafely,
  getLabelUsageCount,
} from '../utils/noteStorage';
import { FormattedContentRenderer } from './FormattedContentRenderer';

interface NotesViewProps {
  notes: Note[];
  tasks: Task[];
  onOpenCreateNote?: (initialLabel?: string) => void;
  onSelectNote?: (note: Note) => void;
  onOpenNoteModal?: (note?: Note, initialLinkedTaskId?: string, initialLabel?: string) => void;
  onSaveNote?: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onConvertChecklistToTask?: (checklistText: string, noteTitle: string) => void;
  onTogglePin?: (noteId: string) => void;
  onToggleArchive?: (noteId: string) => void;
  onTrashNote?: (noteId: string) => void;
  onRestoreNote?: (noteId: string) => void;
  onPermanentDeleteNote?: (noteId: string) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  onOpenTaskDetail?: (taskId: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  tasks,
  onOpenCreateNote,
  onSelectNote,
  onOpenNoteModal,
  onSaveNote,
  onDeleteNote,
  onConvertChecklistToTask,
  onTogglePin,
  onToggleArchive,
  onTrashNote,
  onRestoreNote,
  onPermanentDeleteNote,
  onToggleChecklistItem,
  onOpenTaskDetail = () => {},
}) => {
  // Confirmation Modal states
  const [noteToDeletePermanently, setNoteToDeletePermanently] = useState<Note | null>(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

  const handleCreate = (presetLabel?: string) => {
    const labelToUse = presetLabel !== undefined ? presetLabel : (selectedLabel !== 'all' ? selectedLabel : undefined);
    if (onOpenCreateNote) onOpenCreateNote(labelToUse);
    else if (onOpenNoteModal) onOpenNoteModal(undefined, undefined, labelToUse);
  };

  const handleSelect = (note: Note) => {
    if (onSelectNote) onSelectNote(note);
    else if (onOpenNoteModal) onOpenNoteModal(note);
  };

  const handlePin = (noteId: string) => {
    if (onTogglePin) return onTogglePin(noteId);
    const target = notes.find((n) => n.id === noteId);
    if (target && onSaveNote) {
      onSaveNote({ ...target, isPinned: !target.isPinned, updatedAt: new Date().toISOString() });
    }
  };

  const handleArchive = (noteId: string) => {
    if (onToggleArchive) return onToggleArchive(noteId);
    const target = notes.find((n) => n.id === noteId);
    if (target && onSaveNote) {
      onSaveNote({ ...target, isArchived: !target.isArchived, updatedAt: new Date().toISOString() });
    }
  };

  const handleTrash = (noteId: string) => {
    if (onTrashNote) return onTrashNote(noteId);
    const target = notes.find((n) => n.id === noteId);
    if (target && onSaveNote) {
      onSaveNote({
        ...target,
        isDeleted: true,
        isTrash: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleRestore = (noteId: string) => {
    if (onRestoreNote) return onRestoreNote(noteId);
    const target = notes.find((n) => n.id === noteId);
    if (target && onSaveNote) {
      onSaveNote({
        ...target,
        isDeleted: false,
        isTrash: false,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handlePermanentDelete = (noteId: string) => {
    if (onPermanentDeleteNote) return onPermanentDeleteNote(noteId);
    if (onDeleteNote) onDeleteNote(noteId);
  };

  const handleChecklistToggle = (noteId: string, itemId: string) => {
    if (onToggleChecklistItem) return onToggleChecklistItem(noteId, itemId);
    const target = notes.find((n) => n.id === noteId);
    if (target && onSaveNote) {
      const items = (target.checklistItems || target.checklist || []).map((c) =>
        c.id === itemId ? { ...c, completed: !c.completed } : c
      );
      onSaveNote({ ...target, checklistItems: items, checklist: items, updatedAt: new Date().toISOString() });
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pinned' | 'archived' | 'trash'>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [labelNotice, setLabelNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Persistent registry of all labels
  const [registeredLabels, setRegisteredLabels] = useState<string[]>(() => loadAllLabels());

  // Compute all available unique labels combining registered + currently present on notes
  const allLabels = useMemo(() => {
    const set = new Set<string>(registeredLabels);
    notes.forEach((n) => {
      if (Array.isArray(n.labels)) {
        n.labels.forEach((l) => set.add(l));
      }
    });
    return Array.from(set);
  }, [registeredLabels, notes]);

  const handleAddNewLabel = () => {
    const trimmed = newLabelInput.trim();
    if (!trimmed) return;
    if (allLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setLabelNotice({ type: 'error', text: `Nhãn "${trimmed}" đã tồn tại.` });
      return;
    }
    const updated = [...registeredLabels, trimmed];
    setRegisteredLabels(updated);
    saveAllLabels(updated);
    setNewLabelInput('');
    setLabelNotice({ type: 'success', text: `Đã thêm nhãn mới "${trimmed}" thành công.` });
    setTimeout(() => setLabelNotice(null), 3000);
  };

  const handleDeleteLabel = (label: string) => {
    const result = deleteLabelSafely(label, registeredLabels, notes, tasks);
    if (!result.success) {
      setLabelNotice({ type: 'error', text: result.reason || 'Không thể xóa nhãn đang sử dụng.' });
      setTimeout(() => setLabelNotice(null), 4000);
      return;
    }
    setRegisteredLabels(result.updatedLabels);
    if (selectedLabel === label) {
      setSelectedLabel('all');
    }
    setLabelNotice({ type: 'success', text: `Đã xóa nhãn không sử dụng "${label}" thành công.` });
    setTimeout(() => setLabelNotice(null), 3000);
  };

  // Counts for tabs
  const activeCount = useMemo(() => notes.filter((n) => !n.isDeleted && !n.isArchived).length, [notes]);
  const pinnedCount = useMemo(() => notes.filter((n) => !n.isDeleted && !n.isArchived && n.isPinned).length, [notes]);
  const archivedCount = useMemo(() => notes.filter((n) => !n.isDeleted && n.isArchived).length, [notes]);
  const trashCount = useMemo(() => notes.filter((n) => n.isDeleted).length, [notes]);

  // Filtered notes
  const displayedNotes = useMemo(() => {
    return filterNotes(notes, searchQuery, filterMode, selectedLabel);
  }, [notes, searchQuery, filterMode, selectedLabel]);

  // Separate pinned vs others if in 'all' view
  const { pinnedNotes, otherNotes } = useMemo(() => {
    if (filterMode !== 'all') {
      return { pinnedNotes: [], otherNotes: displayedNotes };
    }
    const pinned = displayedNotes.filter((n) => n.isPinned);
    const others = displayedNotes.filter((n) => !n.isPinned);
    return { pinnedNotes: pinned, otherNotes: others };
  }, [displayedNotes, filterMode]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-indigo-950/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-100 border border-white/20 text-xs font-semibold backdrop-blur-xs">
                <StickyNote className="w-3.5 h-3.5 text-amber-300" />
                Ghi chú thông minh
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sổ Tay &amp; Ghi Chú Công Việc
            </h1>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => handleCreate()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tạo ghi chú mới
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar & Primary Filter Tabs */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, nội dung, checklist hoặc nhãn..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Tất cả</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('pinned')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'pinned'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              <span>Đã ghim</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full">
                {pinnedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('archived')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'archived'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Lưu trữ</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                {archivedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('trash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'trash'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Thùng rác</span>
              {trashCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] rounded-full font-bold">
                  {trashCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Labels chips row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5" /> Nhãn:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLabel('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              selectedLabel === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả nhãn
          </button>
          {allLabels.map((lbl) => {
            const isSelected = selectedLabel === lbl;
            const usage = getLabelUsageCount(lbl, notes, tasks);
            return (
              <button
                key={lbl}
                type="button"
                onClick={() => setSelectedLabel(lbl)}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{lbl}</span>
                {usage > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {usage}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsLabelManagerOpen(true)}
            className="px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs ml-auto shadow-2xs"
            title="Quản lý và xóa các nhãn không sử dụng"
          >
            <Settings className="w-3.5 h-3.5 text-amber-600" />
            <span>Quản lý nhãn</span>
          </button>
        </div>

        {/* Quick action strip right below labels */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            {selectedLabel === 'all' ? (
              <span>Hiển thị tất cả ghi chú ({displayedNotes.length})</span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                <Tag className="w-3 h-3 text-indigo-600" />
                Đang lọc theo nhãn: #{selectedLabel} ({displayedNotes.length})
              </span>
            )}
          </div>
          {filterMode !== 'trash' ? (
            <button
              type="button"
              onClick={() => handleCreate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tạo ghi chú mới {selectedLabel !== 'all' ? `với #${selectedLabel}` : ''}</span>
            </button>
          ) : trashCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowEmptyTrashConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Dọn sạch thùng rác ({trashCount})</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Notes Grid */}
      {displayedNotes.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <StickyNote className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {filterMode === 'trash'
                ? 'Thùng rác trống'
                : filterMode === 'archived'
                ? 'Không có ghi chú nào được lưu trữ'
                : filterMode === 'pinned'
                ? 'Chưa có ghi chú nào được ghim'
                : searchQuery
                ? 'Không tìm thấy ghi chú phù hợp'
                : selectedLabel !== 'all'
                ? `Chưa có ghi chú nào gắn nhãn #${selectedLabel}`
                : 'Chưa có ghi chú nào'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {searchQuery
                ? `Không có kết quả nào cho "${searchQuery}". Hãy thử từ khóa khác hoặc bấm Xóa tìm kiếm.`
                : filterMode === 'trash'
                ? 'Các ghi chú bị xóa sẽ nằm ở đây trước khi bị xóa vĩnh viễn.'
                : selectedLabel !== 'all'
                ? `Bấm tạo ghi chú ngay bên dưới để thêm ghi chú mới và tự động gắn nhãn #${selectedLabel}.`
                : 'Ghi nhanh các ý tưởng, biên bản cuộc họp hoặc checklist công việc bằng cách bấm Tạo ghi chú mới.'}
            </p>
          </div>
          {filterMode !== 'trash' && !searchQuery && (
            <button
              onClick={() => handleCreate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo ghi chú ngay {selectedLabel !== 'all' ? `với nhãn #${selectedLabel}` : ''}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Pinned Notes Section (When in 'all' view) */}
          {filterMode === 'all' && pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Pin className="w-4 h-4 text-amber-600 fill-amber-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Đã ghim lên đầu ({pinnedNotes.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    tasks={tasks}
                    onSelectNote={handleSelect}
                    onTogglePin={handlePin}
                    onToggleArchive={handleArchive}
                    onTrashNote={handleTrash}
                    onRestoreNote={handleRestore}
                    onRequestPermanentDelete={(n) => setNoteToDeletePermanently(n)}
                    onToggleChecklistItem={handleChecklistToggle}
                    onOpenTaskDetail={onOpenTaskDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. Other Notes Section */}
          <div className="space-y-3">
            {filterMode === 'all' && pinnedNotes.length > 0 && otherNotes.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <StickyNote className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Các ghi chú khác ({otherNotes.length})
                </h3>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  tasks={tasks}
                  onSelectNote={handleSelect}
                  onTogglePin={handlePin}
                  onToggleArchive={handleArchive}
                  onTrashNote={handleTrash}
                  onRestoreNote={handleRestore}
                  onRequestPermanentDelete={(n) => setNoteToDeletePermanently(n)}
                  onToggleChecklistItem={handleChecklistToggle}
                  onOpenTaskDetail={onOpenTaskDetail}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Permanent Single Note */}
      {noteToDeletePermanently && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Xác nhận xóa vĩnh viễn ghi chú?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn ghi chú{' '}
                <strong className="text-slate-900">&quot;{noteToDeletePermanently.title}&quot;</strong>? Thao tác này không thể hoàn tác và dữ liệu sẽ bị xóa hoàn toàn khỏi hệ thống.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDeletePermanently(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePermanentDelete(noteToDeletePermanently.id);
                  setNoteToDeletePermanently(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Entire Trash */}
      {showEmptyTrashConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Dọn sạch thùng rác ({trashCount} ghi chú)?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Toàn bộ <strong className="text-slate-900">{trashCount} ghi chú</strong> trong thùng rác sẽ bị xóa vĩnh viễn khỏi thiết bị và cơ sở dữ liệu. Bạn có chắc chắn muốn tiếp tục?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyTrashConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const trashedNotes = notes.filter((n) => n.isDeleted);
                  trashedNotes.forEach((n) => handlePermanentDelete(n.id));
                  setShowEmptyTrashConfirm(false);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Xác nhận dọn sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quản Lý & Xóa Nhãn (Chỉ cho phép xóa khi không sử dụng) */}
      {isLabelManagerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Quản Lý Nhãn Phân Loại</h3>
                  <p className="text-xs text-slate-500">
                    Chỉ cho phép xóa các loại nhãn không được sử dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLabelManagerOpen(false);
                  setLabelNotice(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {labelNotice && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 shrink-0 animate-in fade-in ${
                  labelNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {labelNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{labelNotice.text}</div>
                <button
                  type="button"
                  onClick={() => setLabelNotice(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Thêm nhãn mới */}
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-bold text-slate-700 block">Thêm nhãn mới:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewLabel();
                    }
                  }}
                  placeholder="Nhập tên nhãn (VD: Hội thao, Kiểm toán...)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={handleAddNewLabel}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* Danh sách nhãn */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-600 block">
                Danh sách nhãn trong hệ thống ({allLabels.length}):
              </span>

              <div className="space-y-2">
                {allLabels.map((lbl) => {
                  const usage = getLabelUsageCount(lbl, notes, tasks);
                  const isUsed = usage > 0;

                  return (
                    <div
                      key={lbl}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          #{lbl}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isUsed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title={`Nhãn đang được gắn vào ${usage} ghi chú/nhiệm vụ. Không được phép xóa!`}
                          >
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>Đang dùng ({usage})</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Chưa dùng (0)
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isUsed}
                          onClick={() => handleDeleteLabel(lbl)}
                          className={`p-2 rounded-xl transition-all ${
                            isUsed
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-rose-500 hover:text-white hover:bg-rose-600 active:scale-95 cursor-pointer shadow-2xs'
                          }`}
                          title={
                            isUsed
                              ? `Nhãn "${lbl}" đang được sử dụng trong ${usage} mục, không được phép xóa!`
                              : `Xóa nhãn "${lbl}" (Chưa sử dụng)`
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs">
              <span className="text-[11px] text-slate-500">
                Lưu ý: Nhãn đang gắn vào ghi chú hoặc công việc sẽ bị khóa xóa tự động.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLabelManagerOpen(false);
                  setLabelNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NoteCardProps {
  note: Note;
  tasks: Task[];
  onSelectNote: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
  onToggleArchive: (noteId: string) => void;
  onTrashNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onRequestPermanentDelete: (note: Note) => void;
  onToggleChecklistItem: (noteId: string, itemId: string) => void;
  onOpenTaskDetail: (taskId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  tasks,
  onSelectNote,
  onTogglePin,
  onToggleArchive,
  onTrashNote,
  onRestoreNote,
  onRequestPermanentDelete,
  onToggleChecklistItem,
  onOpenTaskDetail,
}) => {
  const isDeleted = note.isDeleted;
  const isArchived = note.isArchived;

  // Find linked tasks
  const linkedTasks = useMemo(() => {
    if (!Array.isArray(note.linkedTaskIds) || note.linkedTaskIds.length === 0) return [];
    return tasks.filter((t) => note.linkedTaskIds.includes(t.id));
  }, [note.linkedTaskIds, tasks]);

  return (
    <div
      className="group rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 border border-black/8 hover:border-black/20 hover:shadow-lg shadow-xs cursor-pointer relative overflow-hidden min-h-[220px]"
      style={{ backgroundColor: note.color || '#FFFFFF' }}
      onClick={() => onSelectNote(note)}
    >
      <div className="space-y-3">
        {/* Top bar: Pin badge & actions */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
            {note.title || 'Ghi chú không tiêu đề'}
          </h4>

          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!isDeleted && (
              <button
                type="button"
                onClick={() => onTogglePin(note.id)}
                title={note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú'}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  note.isPinned
                    ? 'text-amber-700 bg-amber-100'
                    : 'text-slate-400 hover:text-slate-800 opacity-60 group-hover:opacity-100 hover:bg-black/5'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Text Content Preview */}
        {note.content && (
          <div className="text-xs text-slate-700 line-clamp-4 leading-relaxed font-normal">
            <FormattedContentRenderer content={note.content} />
          </div>
        )}

        {/* Checklist Preview */}
        {Array.isArray(note.checklistItems) && note.checklistItems.length > 0 && (
          <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
            {note.checklistItems.slice(0, 3).map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer group/chk select-none"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => onToggleChecklistItem(note.id, item.id)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-0"
                />
                <span className={`truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                  {item.text}
                </span>
              </label>
            ))}
            {note.checklistItems.length > 3 && (
              <span className="text-[10px] font-bold text-slate-500 pl-5 inline-block">
                +{note.checklistItems.length - 3} mục nữa...
              </span>
            )}
          </div>
        )}

        {/* Linked Tasks Badges */}
        {linkedTasks.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            {linkedTasks.slice(0, 2).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenTaskDetail(t.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/90 text-indigo-800 border border-indigo-200/80 text-[10px] font-bold hover:bg-indigo-100 transition-all cursor-pointer truncate max-w-[170px]"
                title={`Nhiệm vụ: ${t.title}`}
              >
                <LinkIcon className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                <span className="truncate">{t.title}</span>
              </button>
            ))}
            {linkedTasks.length > 2 && (
              <span className="text-[10px] font-bold text-indigo-600 self-center">
                +{linkedTasks.length - 2} việc
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Labels & Date & Hover Toolbar */}
      <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2 mt-3">
        {/* Labels */}
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {Array.isArray(note.labels) &&
            note.labels.slice(0, 2).map((lbl) => (
              <span
                key={lbl}
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/5 text-slate-700 truncate max-w-[90px]"
              >
                #{lbl}
              </span>
            ))}
        </div>

        {/* Hover Quick Action Buttons */}
        <div
          className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {isDeleted ? (
            <>
              <button
                type="button"
                onClick={() => onRestoreNote(note.id)}
                title="Khôi phục ghi chú"
                className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRequestPermanentDelete(note)}
                title="Xóa vĩnh viễn"
                className="p-1 rounded-lg text-rose-700 hover:bg-rose-100/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onToggleArchive(note.id)}
                title={isArchived ? 'Khôi phục từ lưu trữ' : 'Lưu trữ ghi chú'}
                className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-black/5 transition-colors cursor-pointer"
              >
                {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onTrashNote(note.id)}
                title="Chuyển vào thùng rác"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
