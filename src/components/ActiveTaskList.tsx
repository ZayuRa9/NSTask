import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  CalendarCheck2,
  Calendar,
  CalendarDays,
  ExternalLink,
  Edit3,
  Trash2,
  Download,
  Paperclip,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  LayoutList,
  Kanban,
  Check,
  Plus,
  ArrowRight,
  RotateCcw,
  Hash,
  Flame,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { Task, Subtask, TaskPriority, TaskStatus, TaskTimeframeFilter } from '../types/task';
import {
  calculateProgress,
  formatDateVietnamese,
  generateGoogleCalendarUrl,
  generateIcsContent,
  filterTasksBySearchQuery,
  isTaskOverdue,
  isTaskThisWeek,
  isTaskThisMonth,
  isTaskUpcoming,
  getTimeframeCounts,
  getTaskTimeframeBadge,
} from '../utils/taskCalculations';
import { playNotificationSound } from '../utils/audioNotification';
import { getUnitColorStyle, getTaskCardColorStyle } from '../utils/unitTheme';
import { KanbanBoard } from './KanbanBoard';

interface ActiveTaskListProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (task: Task) => void;
  onOpenCreateModal: (defaultDueDate?: string) => void;
  units: string[];
  initialStatusFilter?: string;
  initialTimeframeFilter?: TaskTimeframeFilter;
  initialViewMode?: 'list' | 'kanban';
}

/**
 * Renders text with search query occurrences highlighted in real-time.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const trimmedQuery = query.trim();
  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const ActiveTaskList: React.FC<ActiveTaskListProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  onOpenCreateModal,
  units,
  initialStatusFilter = 'all',
  initialTimeframeFilter = 'all',
  initialViewMode = 'list',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [timeframeFilter, setTimeframeFilter] = useState<TaskTimeframeFilter>(initialTimeframeFilter);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(initialViewMode);

  // Synchronize filter states if incoming initial props change (e.g. when navigating from Dashboard)
  useEffect(() => {
    if (initialTimeframeFilter) {
      setTimeframeFilter(initialTimeframeFilter);
    }
  }, [initialTimeframeFilter]);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);
  
  // Collapse by default as requested: user clicks to expand and view details
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search input (press '/' or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active tasks (exclude completed) for list view
  const activeTasks = tasks.filter((t) => t.status !== 'completed');

  // Timeframe counts across all active tasks
  const timeframeCounts = useMemo(() => {
    return getTimeframeCounts(activeTasks);
  }, [activeTasks]);

  // Real-time filter across search query, unit, status, and timeframe for list view
  const searchedTasks = filterTasksBySearchQuery(activeTasks, searchQuery);

  const filteredTasks = searchedTasks.filter((task) => {
    if (selectedUnit !== 'all' && task.unit !== selectedUnit) {
      return false;
    }
    if (statusFilter === 'overdue' && task.status !== 'overdue') return false;
    if (statusFilter === 'in_progress' && task.status !== 'in_progress') return false;
    if (statusFilter === 'pending' && task.status !== 'pending') return false;
    if (statusFilter === 'high' && task.priority !== 'high') return false;

    // Timeframe filters: Tuần này, Tháng này, Sắp tới
    if (timeframeFilter === 'this_week' && !isTaskThisWeek(task.dueDate)) return false;
    if (timeframeFilter === 'this_month' && !isTaskThisMonth(task.dueDate)) return false;
    if (timeframeFilter === 'upcoming' && !isTaskUpcoming(task.dueDate)) return false;

    return true;
  });

  // Filter for Kanban Board (strictly excludes completed tasks - completed tasks are stored in Archive Vault)
  const kanbanTasks = tasks
    .filter((task) => task.status !== 'completed' && task.progress < 100)
    .filter((task) => {
      if (selectedUnit !== 'all' && task.unit !== selectedUnit) {
        return false;
      }
      if (statusFilter === 'high' && task.priority !== 'high') return false;
      if (statusFilter === 'overdue' && task.status !== 'overdue') return false;
      if (statusFilter === 'in_progress' && task.status !== 'in_progress') return false;
      if (statusFilter === 'pending' && task.status !== 'pending') return false;

      // Timeframe filters for Kanban
      if (timeframeFilter === 'this_week' && !isTaskThisWeek(task.dueDate)) return false;
      if (timeframeFilter === 'this_month' && !isTaskThisMonth(task.dueDate)) return false;
      if (timeframeFilter === 'upcoming' && !isTaskUpcoming(task.dueDate)) return false;

      if (searchQuery.trim()) {
        return filterTasksBySearchQuery([task], searchQuery).length > 0;
      }
      return true;
    });

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleToggleExpandAll = () => {
    const anyExpanded = filteredTasks.some((t) => expandedTasks[t.id]);
    const nextState: Record<string, boolean> = {};
    filteredTasks.forEach((t) => {
      nextState[t.id] = !anyExpanded;
    });
    setExpandedTasks(nextState);
  };

  // Toggle subtask directly on the task card
  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const newProgress = calculateProgress(updatedSubtasks);
    const isNowFinished = newProgress === 100;

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: isNowFinished
        ? 'completed'
        : new Date(task.dueDate).getTime() < Date.now()
        ? 'overdue'
        : newProgress > 0
        ? 'in_progress'
        : 'pending',
      completedAt: isNowFinished ? new Date().toISOString() : undefined,
    };

    if (isNowFinished) {
      playNotificationSound('success');
    }

    onUpdateTask(updatedTask);
  };

  const handleDownloadIcs = (task: Task) => {
    const icsContent = generateIcsContent(task);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${(task.title || 'nhiem_vu').slice(0, 30)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header Card: View Mode Switcher, Search & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        {/* Row 1: Mode Switcher (List vs Kanban) & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-4 h-4 text-indigo-600" />
                <span>Danh sách thu gọn</span>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  {filteredTasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className={`w-4 h-4 ${viewMode === 'kanban' ? 'text-white' : 'text-indigo-600'}`} />
                <span>Bảng tiến độ</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    viewMode === 'kanban' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {kanbanTasks.length}
                </span>
              </button>
            </div>

            {viewMode === 'list' && filteredTasks.length > 0 && (
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                title="Mở rộng hoặc thu gọn toàn bộ nhiệm vụ"
              >
                {filteredTasks.some((t) => expandedTasks[t.id]) ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Thu gọn tất cả</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Mở rộng tất cả</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick Create Task Trigger */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => onOpenCreateModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all hover:scale-102 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo việc mới</span>
            </button>
          </div>
        </div>

        {/* BỘ LỌC NHANH KHỐI LƯỢNG CÔNG VIỆC THEO THỜI HẠN (Tuần này / Tháng này / Sắp tới) */}
        <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khối lượng công việc theo thời hạn:</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Tất cả */}
            <button
              type="button"
              onClick={() => setTimeframeFilter('all')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                timeframeFilter === 'all'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckSquare className={`w-4 h-4 shrink-0 ${timeframeFilter === 'all' ? 'text-white' : 'text-slate-500'}`} />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Tất cả thời hạn</div>
                  <div className={`text-[10px] ${timeframeFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>Toàn bộ việc mở</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                timeframeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {activeTasks.length}
              </span>
            </button>

            {/* 2. Tuần này */}
            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'this_week' ? 'all' : 'this_week')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                timeframeFilter === 'this_week'
                  ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-500/20'
                  : 'bg-white border-sky-200/80 hover:border-sky-300 text-slate-800 hover:bg-sky-50/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className={`w-4 h-4 shrink-0 ${timeframeFilter === 'this_week' ? 'text-white' : 'text-sky-600'}`} />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate flex items-center gap-1">
                    <span>Tuần này</span>
                    {timeframeFilter === 'this_week' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </div>
                  <div className={`text-[10px] ${timeframeFilter === 'this_week' ? 'text-sky-100' : 'text-slate-500'}`}>Hạn T2 - CN</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                timeframeFilter === 'this_week' ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-800'
              }`}>
                {timeframeCounts.thisWeek}
              </span>
            </button>

            {/* 3. Tháng này */}
            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'this_month' ? 'all' : 'this_month')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                timeframeFilter === 'this_month'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500/20'
                  : 'bg-white border-indigo-200/80 hover:border-indigo-300 text-slate-800 hover:bg-indigo-50/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className={`w-4 h-4 shrink-0 ${timeframeFilter === 'this_month' ? 'text-white' : 'text-indigo-600'}`} />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate flex items-center gap-1">
                    <span>Tháng này</span>
                    {timeframeFilter === 'this_month' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </div>
                  <div className={`text-[10px] ${timeframeFilter === 'this_month' ? 'text-indigo-100' : 'text-slate-500'}`}>Hạn trong tháng</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                timeframeFilter === 'this_month' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {timeframeCounts.thisMonth}
              </span>
            </button>

            {/* 4. Sắp tới */}
            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'upcoming' ? 'all' : 'upcoming')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                timeframeFilter === 'upcoming'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20 ring-2 ring-amber-500/20'
                  : 'bg-white border-amber-200/80 hover:border-amber-300 text-slate-800 hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clock className={`w-4 h-4 shrink-0 ${timeframeFilter === 'upcoming' ? 'text-white' : 'text-amber-600'}`} />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate flex items-center gap-1">
                    <span>Sắp tới</span>
                    {timeframeFilter === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </div>
                  <div className={`text-[10px] ${timeframeFilter === 'upcoming' ? 'text-amber-100' : 'text-slate-500'}`}>Từ hôm nay trở đi</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                timeframeFilter === 'upcoming' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {timeframeCounts.upcoming}
              </span>
            </button>
          </div>
        </div>

        {/* BANNER THÔNG BÁO BỘ LỌC THỜI HẠN ĐANG KÍCH HOẠT */}
        {timeframeFilter !== 'all' && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border border-sky-200/90 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                {timeframeFilter === 'this_week' && <Calendar className="w-4 h-4" />}
                {timeframeFilter === 'this_month' && <CalendarDays className="w-4 h-4" />}
                {timeframeFilter === 'upcoming' && <Clock className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>
                    {timeframeFilter === 'this_week' && 'Đang lọc: Khối lượng công việc TUẦN NÀY'}
                    {timeframeFilter === 'this_month' && 'Đang lọc: Khối lượng công việc THÁNG NÀY'}
                    {timeframeFilter === 'upcoming' && 'Đang lọc: Khối lượng công việc SẮP TỚI'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white font-bold text-sky-800 border border-sky-200 shadow-2xs text-[11px]">
                    {filteredTasks.length} nhiệm vụ phù hợp
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {timeframeFilter === 'this_week' && 'Hiển thị các công việc có hạn chót trong tuần làm việc này (Thứ Hai đến Chủ Nhật).'}
                  {timeframeFilter === 'this_month' && 'Hiển thị các công việc có hạn chót trong tháng hiện tại.'}
                  {timeframeFilter === 'upcoming' && 'Hiển thị các công việc có thời hạn từ hôm nay trở đi.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTimeframeFilter('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs cursor-pointer text-xs transition-colors shrink-0"
              title="Xem toàn bộ nhiệm vụ"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Xem tất cả thời hạn</span>
            </button>
          </div>
        )}

        {/* Row 2: Search Input and Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhanh nhiệm vụ theo tiêu đề hoặc mô tả... (Gõ phím / để tìm)"
              aria-label="Tìm kiếm nhiệm vụ theo tiêu đề hoặc mô tả"
              className="w-full pl-11 pr-24 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-hidden transition-all text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {/* Quick Clear or Keyboard Shortcut badge */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 rounded-md border border-slate-200">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Unit, Status & Timeframe Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              aria-label="Lọc theo mảng việc làm cho đơn vị"
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Làm cho: Tất cả đơn vị</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  Làm cho: {u}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="overdue">🚨 Quá hạn / Trễ việc</option>
              <option value="in_progress">⏳ Đang thực hiện</option>
              <option value="pending">📋 Chưa bắt đầu</option>
              <option value="high">🔥 Ưu tiên cao (Gấp)</option>
            </select>

            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value as TaskTimeframeFilter)}
              aria-label="Lọc theo thời hạn nhiệm vụ"
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Thời hạn: Tất cả ({activeTasks.length})</option>
              <option value="this_week">📅 Tuần này ({timeframeCounts.thisWeek})</option>
              <option value="this_month">🗓️ Tháng này ({timeframeCounts.thisMonth})</option>
              <option value="upcoming">⏰ Sắp tới ({timeframeCounts.upcoming})</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips & Match Counter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Lọc nhanh:
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setTimeframeFilter('all');
                setSelectedUnit('all');
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all' && timeframeFilter === 'all' && selectedUnit === 'all' && !searchQuery
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({activeTasks.length})
            </button>

            {/* Timeframe Quick Filters: Tuần này, Tháng này, Sắp tới */}
            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'this_week' ? 'all' : 'this_week')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                timeframeFilter === 'this_week'
                  ? 'bg-sky-600 text-white shadow-2xs font-bold'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/70'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tuần này</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  timeframeFilter === 'this_week' ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-800'
                }`}
              >
                {timeframeCounts.thisWeek}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'this_month' ? 'all' : 'this_month')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                timeframeFilter === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Tháng này</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  timeframeFilter === 'this_month' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {timeframeCounts.thisMonth}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === 'upcoming' ? 'all' : 'upcoming')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                timeframeFilter === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sắp tới</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  timeframeFilter === 'upcoming' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {timeframeCounts.upcoming}
              </span>
            </button>

            {/* Subtle vertical separator */}
            <span className="w-px h-4 bg-slate-200 mx-0.5 hidden sm:inline-block" />

            {/* Status Quick Filters */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'high' ? 'all' : 'high')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'high'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              🔥 Việc gấp ({activeTasks.filter((t) => t.priority === 'high').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 border border-rose-300'
              }`}
            >
              🚨 Trễ hạn ({activeTasks.filter((t) => t.status === 'overdue').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              ⏳ Đang làm ({activeTasks.filter((t) => t.status === 'in_progress').length})
            </button>
          </div>

          {/* Real-time search count info & Reset button */}
          <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
            {(timeframeFilter !== 'all' || statusFilter !== 'all' || selectedUnit !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setTimeframeFilter('all');
                  setSelectedUnit('all');
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                title="Xóa tất cả bộ lọc đang áp dụng"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại lọc</span>
              </button>
            )}
            {searchQuery ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <span>Tìm thấy <strong>{filteredTasks.length}</strong> kết quả cho &quot;{searchQuery}&quot;</span>
              </span>
            ) : (
              <span>Hiển thị <strong>{filteredTasks.length}</strong>/{activeTasks.length} nhiệm vụ</span>
            )}
          </div>
        </div>
      </div>

      {/* RENDER VIEW: KANBAN BOARD or COMPACT COLLAPSIBLE LIST */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={kanbanTasks}
          searchQuery={searchQuery}
          onUpdateTask={onUpdateTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onOpenCreateModal={onOpenCreateModal}
        />
      ) : (
        /* COMPACT COLLAPSIBLE LIST VIEW */
        filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {searchQuery ? (
                <Search className="w-7 h-7" />
              ) : timeframeFilter === 'this_week' ? (
                <Calendar className="w-7 h-7 text-sky-600" />
              ) : timeframeFilter === 'this_month' ? (
                <CalendarDays className="w-7 h-7 text-indigo-600" />
              ) : timeframeFilter === 'upcoming' ? (
                <Clock className="w-7 h-7 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery
                  ? `Không tìm thấy nhiệm vụ nào khớp với "${searchQuery}"`
                  : timeframeFilter === 'this_week'
                  ? 'Không có nhiệm vụ nào có hạn trong tuần này'
                  : timeframeFilter === 'this_month'
                  ? 'Không có nhiệm vụ nào có hạn trong tháng này'
                  : timeframeFilter === 'upcoming'
                  ? 'Không có nhiệm vụ nào sắp tới'
                  : 'Không có nhiệm vụ nào phù hợp'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm theo tiêu đề hoặc mô tả khác.'
                  : timeframeFilter === 'this_week'
                  ? 'Bạn hiện không có nhiệm vụ nào có hạn chót trong tuần này (Thứ Hai đến Chủ Nhật). Tuyệt vời! Bạn có thể xem các công việc tháng này hoặc toàn bộ danh sách.'
                  : timeframeFilter === 'this_month'
                  ? 'Bạn hiện không có nhiệm vụ nào cần hoàn tất trong tháng hiện tại. Bạn có thể kiểm tra danh sách sắp tới hoặc tạo việc mới.'
                  : timeframeFilter === 'upcoming'
                  ? 'Hiện chưa có nhiệm vụ nào được lên lịch trong tương lai từ hôm nay trở đi.'
                  : (timeframeFilter !== 'all' || statusFilter !== 'all' || selectedUnit !== 'all')
                  ? 'Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc thời gian hoặc trạng thái hiện tại.'
                  : 'Hiện tại bạn chưa có nhiệm vụ nào đang diễn ra.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {timeframeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setTimeframeFilter('all')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xem tất cả thời hạn ({activeTasks.length})</span>
                </button>
              )}
              {timeframeFilter === 'this_week' && timeframeCounts.thisMonth > 0 && (
                <button
                  type="button"
                  onClick={() => setTimeframeFilter('this_month')}
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Xem việc tháng này ({timeframeCounts.thisMonth})</span>
                </button>
              )}
              {(statusFilter !== 'all' || selectedUnit !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSelectedUnit('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại bộ lọc phụ</span>
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Xóa từ khóa tìm kiếm
                </button>
              )}
              <button
                onClick={() => onOpenCreateModal()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Tạo nhiệm vụ mới
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* BẢNG CHÚ GIẢI MÀU SẮC NHẬN DIỆN: Giúp người dùng phân biệt nhanh chóng, tránh lóa mắt */}
            <div className="bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <span>Phân loại màu:</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold border border-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                  🔥 Việc gấp
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-bold border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  ⚡ Mức vừa
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 font-bold border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                  🌿 Bình thường
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold border border-blue-300">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                  ⏳ Đang làm
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold border border-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                  🏢 Màu đơn vị
                </span>
              </div>
              <span className="text-slate-500 text-[10px] font-medium hidden md:inline">
                Bấm thẻ để xem chi tiết &amp; việc con
              </span>
            </div>
            {filteredTasks.map((task) => {
              const isOverdue = task.status === 'overdue';
              // Collapsed by default: user clicks to see full details
              const isExpanded = Boolean(expandedTasks[task.id]);
              const googleCalUrl = generateGoogleCalendarUrl(task);
              const subDoneCount = task.subtasks.filter((s) => s.completed).length;
              const timeframeBadge = getTaskTimeframeBadge(task.dueDate);
              const unitStyle = getUnitColorStyle(task.unit);
              const cardColorStyle = getTaskCardColorStyle(task.priority, isOverdue);

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl transition-all duration-200 overflow-hidden relative shadow-2xs hover:shadow-md ${cardColorStyle.cardClass} ${
                    isExpanded ? 'ring-2 ring-indigo-500/25' : ''
                  }`}
                >
                  {/* Overdue Alert Bar if past deadline */}
                  {isOverdue && (
                    <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-4 py-1.5 text-xs font-black flex items-center justify-between shadow-xs">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                        NHIỆM VỤ ĐÃ TRỄ HẠN!
                      </span>
                      <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded">Hạn: {formatDateVietnamese(task.dueDate)}</span>
                    </div>
                  )}

                  {/* Compact Header Summary Bar (Click anywhere to expand/collapse) */}
                  <div
                    onClick={() => toggleExpand(task.id)}
                    className={`p-4 sm:p-4.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors select-none ${cardColorStyle.headerBg} hover:bg-white/80`}
                  >
                    {/* Left: Checkmark, Unit, Priority, Title, Tags */}
                    <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                      {/* Quick complete checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveTask(task);
                        }}
                        className="mt-0.5 md:mt-0 w-6 h-6 rounded-lg border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 flex items-center justify-center transition-all shrink-0 cursor-pointer bg-white shadow-2xs"
                        title="Đánh dấu hoàn thành & chuyển vào kho lưu trữ"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Unit badge with distinct color identity */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] shadow-2xs transition-colors ${unitStyle.badgeClass}`}
                            title={`Đơn vị: ${task.unit}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${unitStyle.dotClass}`} />
                            <Building2 className="w-3 h-3 opacity-80" />
                            <HighlightMatch text={task.unit} query={searchQuery} />
                          </span>

                          {/* Timeframe badge (Hôm nay / Ngày mai / Tuần này / Tháng này / Sắp tới) */}
                          {timeframeBadge && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] border shadow-2xs ${timeframeBadge.colorClass}`}
                              title={timeframeBadge.tooltip}
                            >
                              <Clock className="w-3 h-3 opacity-80" />
                              <span>{timeframeBadge.label}</span>
                            </span>
                          )}

                          {/* Priority badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                              task.priority === 'high'
                                ? 'bg-rose-600 text-white'
                                : task.priority === 'medium'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {task.priority === 'high'
                              ? '🔥 Gấp'
                              : task.priority === 'medium'
                              ? '⚡ Vừa'
                              : 'Thường'}
                          </span>

                          {/* Status badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs ${
                              task.status === 'overdue'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : task.status === 'in_progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            {task.status === 'overdue'
                              ? 'Trễ hạn'
                              : task.status === 'in_progress'
                              ? 'Đang làm'
                              : 'Chưa làm'}
                          </span>

                          {/* Subtasks Count Pill */}
                          {task.subtasks.length > 0 && (
                            <span className="text-[11px] font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-300 shadow-2xs">
                              {subDoneCount}/{task.subtasks.length} việc con
                            </span>
                          )}

                          {/* Task Tags if any */}
                          {Array.isArray(task.tags) && task.tags.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {task.tags.slice(0, 3).map((tg, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200"
                                >
                                  #{tg}
                                </span>
                              ))}
                              {task.tags.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-bold">
                                  +{task.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-700 transition-colors leading-snug">
                            <HighlightMatch text={task.title} query={searchQuery} />
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Right: Due Date, Progress Bar, Quick Edit/Delete, Expand Toggle */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      {/* Due date */}
                      <div
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800 font-extrabold border border-rose-300'
                            : 'bg-white/80 text-slate-700 font-bold border border-slate-200'
                        }`}
                        title="Hạn hoàn thành"
                      >
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`} />
                        <span>{formatDateVietnamese(task.dueDate)}</span>
                      </div>

                      {/* Mini Progress */}
                      <div className="flex items-center gap-2 w-28">
                        <div className="flex-1 bg-slate-200/80 h-2.5 rounded-full overflow-hidden border border-slate-300/60 p-0.5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOverdue
                                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                : task.progress === 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black text-slate-800 tabular-nums">{task.progress}%</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa nhiệm vụ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa nhiệm vụ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Expand / Collapse Chevron */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(task.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS ACCORDION */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-4 bg-slate-50/40 animate-in fade-in duration-150">
                      {/* Description / Task Introduction (Căn lề thụt đầu dòng đẹp mắt) */}
                      {task.description && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Giới thiệu &amp; Nội dung tác vụ:</span>
                          </div>
                          <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                            {task.description
                              .split('\n')
                              .map((p) => p.trim())
                              .filter(Boolean)
                              .map((paragraph, pIdx) => (
                                <p key={pIdx} className="indent-6 sm:indent-8 text-justify leading-relaxed">
                                  <HighlightMatch text={paragraph} query={searchQuery} />
                                </p>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* AI Strategic Recommendation if available */}
                      {task.aiAnalysis && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-violet-50/60 to-blue-50/90 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>💡 AI Tham mưu chiến lược thực thi:</span>
                          </div>
                          <p className="text-[12px] text-slate-700 leading-relaxed font-normal whitespace-pre-line pl-5">
                            <HighlightMatch text={task.aiAnalysis} query={searchQuery} />
                          </p>
                        </div>
                      )}

                      {/* Subtasks Checklist */}
                      {task.subtasks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>Checklist các bước việc con ({subDoneCount}/{task.subtasks.length}):</span>
                            <span className="text-slate-500 font-normal text-[11px]">Nhấn trực tiếp để hoàn thành mốc con</span>
                          </div>

                          <div className="space-y-1.5">
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                onClick={() => handleToggleSubtask(task, st.id)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                                  st.completed
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                    : 'bg-white border-slate-200/80 hover:border-indigo-300 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => {}} // Controlled via container onClick
                                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer pointer-events-none"
                                  />
                                  <span className={`truncate font-medium ${st.completed ? 'line-through opacity-75' : ''}`}>
                                    {st.title}
                                  </span>
                                </div>

                                {st.phase && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                    {st.phase}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attachments & Links if present */}
                      {(task.attachments.length > 0 || task.links.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {task.attachments.map((att) => (
                            <span
                              key={att.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
                            >
                              <Paperclip className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-xs">{att.name}</span>
                            </span>
                          ))}

                          {task.links.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:underline border border-blue-100"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate max-w-xs">{link.title}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Expanded Footer Actions */}
                      <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <a
                            href={googleCalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                          >
                            <CalendarCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Google Lịch</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDownloadIcs(task)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors cursor-pointer"
                            title="Tải file .ics cho Outlook / Apple Calendar"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>.ics</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
                          >
                            Chỉnh sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => onArchiveTask(task)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Hoàn thành & Lưu trữ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
