import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Edit3,
  Trash2,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Play,
  Hash,
  Flame,
  Calendar
} from 'lucide-react';
import { Task, Subtask, TaskStatus } from '../types/task';
import {
  calculateProgress,
  formatDateVietnamese,
  isTaskOverdue,
  getTaskTimeframeBadge,
} from '../utils/taskCalculations';
import { playNotificationSound } from '../utils/audioNotification';
import { getUnitColorStyle, getTaskCardColorStyle } from '../utils/unitTheme';

interface KanbanBoardProps {
  tasks: Task[];
  searchQuery?: string;
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: (defaultDueDate?: string) => void;
}

type KanbanColumnKey = 'pending' | 'in_progress';

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  searchQuery = '',
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onOpenCreateModal,
}) => {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnKey | null>(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

  // Categorize tasks into 2 active columns: Chưa thực hiện & Đang thực hiện (Hoàn thành lưu trong Kho lưu trữ)
  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || (!t.status && t.progress === 0)
  );

  const inProgressTasks = tasks.filter(
    (t) =>
      t.status === 'in_progress' ||
      t.status === 'overdue' ||
      (t.progress > 0 && t.progress < 100 && t.status !== 'completed')
  );

  // Move task status
  const handleMoveStatus = (
    task: Task,
    targetStatus: KanbanColumnKey
  ) => {
    let updatedTask: Task;

    if (targetStatus === 'in_progress') {
      const isPastDue = isTaskOverdue(task.dueDate, undefined);
      updatedTask = {
        ...task,
        status: isPastDue ? 'overdue' : 'in_progress',
        progress: task.progress === 100 ? 50 : Math.max(25, task.progress),
        completedAt: undefined,
      };
    } else {
      // Pending
      const resetSubtasks = task.subtasks.map((s) => ({ ...s, completed: false }));
      updatedTask = {
        ...task,
        status: 'pending',
        progress: 0,
        subtasks: resetSubtasks,
        completedAt: undefined,
      };
    }

    onUpdateTask(updatedTask);
  };

  const handleCompleteTask = (task: Task) => {
    const completedSubtasks = task.subtasks.map((s) => ({ ...s, completed: true }));
    onUpdateTask({
      ...task,
      status: 'completed',
      progress: 100,
      subtasks: completedSubtasks,
      completedAt: new Date().toISOString(),
    });
    playNotificationSound();
  };

  // Toggle subtask completion directly in Kanban card
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
        : isTaskOverdue(task.dueDate, undefined)
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

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colKey: KanbanColumnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDrop = (e: React.DragEvent, colKey: KanbanColumnKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDragOverCol(null);
    setDraggingTaskId(null);

    if (taskId) {
      const target = tasks.find((t) => t.id === taskId);
      if (target) {
        handleMoveStatus(target, colKey);
      }
    }
  };

  const toggleSubtasksExpand = (taskId: string) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const columns = [
    {
      key: 'pending' as KanbanColumnKey,
      title: 'Chưa thực hiện',
      subtitle: 'Chờ triển khai & chuẩn bị',
      tasks: pendingTasks,
      badgeColor: 'bg-white text-amber-950',
      headerBg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-600',
      containerBg: 'bg-amber-50/50 border-2 border-amber-300/80',
      icon: Clock,
      iconColor: 'text-amber-600',
    },
    {
      key: 'in_progress' as KanbanColumnKey,
      title: 'Đang thực hiện',
      subtitle: 'Đang triển khai & bám sát hạn',
      tasks: inProgressTasks,
      badgeColor: 'bg-white text-blue-950',
      headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-600',
      containerBg: 'bg-blue-50/40 border-2 border-blue-300/80',
      icon: Flame,
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Kanban Grid Container (2 wide balanced columns: Chưa thực hiện & Đang thực hiện) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
        {columns.map((col) => {
          const ColIcon = col.icon;
          const isOver = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`rounded-3xl border transition-all duration-200 flex flex-col shadow-xs ${
                col.containerBg
              } ${
                isOver
                  ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-indigo-50/50'
                  : ''
              }`}
            >
              {/* Column Header with vivid gradient */}
              <div
                className={`p-4 rounded-t-3xl border-b shadow-xs flex items-center justify-between ${col.headerBg}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/95 shadow-xs flex items-center justify-center shrink-0">
                    <ColIcon className={`w-4.5 h-4.5 ${col.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight text-white drop-shadow-2xs">
                      {col.title}
                    </h3>
                    <p className="text-[10px] text-white/90 font-medium">{col.subtitle}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black shadow-xs ${col.badgeColor}`}
                >
                  {col.tasks.length}
                </span>
              </div>

              {/* Tasks List in Column */}
              <div className="p-3 space-y-3 min-h-[360px] flex flex-col justify-between">
                {col.tasks.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/70 space-y-2 flex flex-col items-center justify-center my-auto shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <ColIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Không có nhiệm vụ nào
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {col.tasks.map((task) => {
                      const isOverdue = isTaskOverdue(task.dueDate, task.completedAt);
                      const isDone = task.status === 'completed' || task.progress === 100;
                      const subDone = task.subtasks.filter((s) => s.completed).length;
                      const isExpanded = expandedSubtasks[task.id] || false;
                      const timeframeBadge = getTaskTimeframeBadge(task.dueDate);
                      const unitStyle = getUnitColorStyle(task.unit);
                      const cardColorStyle = getTaskCardColorStyle(task.priority, isOverdue);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverCol(null);
                          }}
                          className={`rounded-2xl p-4 border transition-all duration-200 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing group relative ${cardColorStyle.cardClass}`}
                        >
                          {/* Priority, Unit, Timeframe & Overdue Badges */}
                          <div className="flex items-center justify-between gap-1.5 mb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Distinct Unit badge */}
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 truncate max-w-[140px] shadow-2xs ${unitStyle.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${unitStyle.dotClass}`} />
                                <Building2 className="w-2.5 h-2.5 opacity-80" />
                                {task.unit}
                              </span>

                              {timeframeBadge && (
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] border shadow-2xs ${timeframeBadge.colorClass}`}
                                  title={timeframeBadge.tooltip}
                                >
                                  <Clock className="w-2.5 h-2.5 opacity-70" />
                                  <span>{timeframeBadge.label}</span>
                                </span>
                              )}

                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-2xs ${
                                  task.priority === 'high'
                                    ? 'bg-rose-600 text-white'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {task.priority === 'high' && <Flame className="w-2.5 h-2.5" />}
                                {task.priority === 'high' ? 'Gấp' : task.priority === 'medium' ? 'Vừa' : 'Thường'}
                              </span>
                            </div>

                            {isOverdue && !isDone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-xs">
                                <AlertTriangle className="w-2.5 h-2.5" /> Quá hạn
                              </span>
                            )}
                            {isDone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Xong
                              </span>
                            )}
                          </div>

                          {/* Task Title */}
                          <h4
                            onClick={() => onEditTask(task)}
                            className={`font-bold text-xs sm:text-sm text-slate-900 leading-snug hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2 ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </h4>

                          {/* Task Description Excerpt */}
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Tags Display */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {task.tags.map((tg, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-medium"
                                >
                                  <Hash className="w-2.5 h-2.5 opacity-60" />
                                  {tg}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Progress Bar & Subtasks Toggle */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => toggleSubtasksExpand(task.id)}
                                className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <span>Checklist ({subDone}/{task.subtasks.length})</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              <span className="font-extrabold text-slate-800 text-[11px]">
                                {task.progress}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isDone
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : isOverdue
                                    ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>

                            {/* Expanded Subtask List */}
                            {isExpanded && task.subtasks.length > 0 && (
                              <div className="pt-2 space-y-1.5 max-h-48 overflow-y-auto">
                                {task.subtasks.map((st) => (
                                  <label
                                    key={st.id}
                                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-[11px] text-slate-700 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() => handleToggleSubtask(task, st.id)}
                                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span
                                      className={st.completed ? 'line-through text-slate-400' : ''}
                                    >
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Due Date & Footer Action Buttons */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className={isOverdue && !isDone ? 'text-rose-600 font-bold' : ''}>
                                {formatDateVietnamese(task.dueDate)}
                              </span>
                            </div>

                            {/* Quick Status Advance & Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {col.key === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveStatus(task, 'in_progress')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Bắt đầu thực hiện"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Bắt đầu</span>
                                </button>
                              )}

                              {col.key === 'in_progress' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveStatus(task, 'pending')}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                                    title="Chuyển về Chưa thực hiện"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Lùi lại</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteTask(task)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Đánh dấu hoàn thành 100%"
                                  >
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Xong</span>
                                  </button>
                                </div>
                              )}

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa nhiệm vụ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa nhiệm vụ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add task button in column */}
                <button
                  type="button"
                  onClick={() => onOpenCreateModal()}
                  className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-white text-slate-600 hover:text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm việc cho {col.title.toLowerCase()}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
