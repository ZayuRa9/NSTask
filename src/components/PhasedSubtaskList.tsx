import React, { useState, useMemo } from 'react';
import {
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Target,
  Package,
  FileText,
  ExternalLink,
  Layers,
  ListChecks,
  RefreshCw,
  Loader2,
  X,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { Subtask, TaskPhaseId } from '../types/task';
import { CANONICAL_PHASES, normalizeSubtaskPhase } from '../utils/aiTaskGenerator';

interface PhasedSubtaskListProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  onAiBreakdown: (options: {
    granularity: 'phased' | 'standard' | 'detailed' | 'deliverables';
    targetPhase?: TaskPhaseId;
    keepCompletedOrCustom: boolean;
  }) => Promise<void>;
  isGeneratingAi: boolean;
  taskTitle: string;
}

export const PhasedSubtaskList: React.FC<PhasedSubtaskListProps> = ({
  subtasks,
  onChange,
  onAiBreakdown,
  isGeneratingAi,
  taskTitle,
}) => {
  // State for expanding/collapsing all details
  const [expandAllDetails, setExpandAllDetails] = useState(false);
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Record<string, boolean>>({});

  // Collapsed phases state
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({
    preparation: false,
    execution: false,
    conclusion: false,
  });

  // State for AI Breakdown panel modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedAiTargetPhase, setSelectedAiTargetPhase] = useState<'all' | TaskPhaseId>('all');
  const [keepExistingCustom, setKeepExistingCustom] = useState(true);
  const [complexityMode, setComplexityMode] = useState<'phased' | 'detailed' | 'standard'>('phased');

  // Edit / Add Subtask Modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Partial<Subtask> | null>(null);
  const [subtaskStepsInput, setSubtaskStepsInput] = useState('');

  // Group subtasks by 3 canonical phases
  const groupedSubtasks = useMemo(() => {
    const groups: Record<TaskPhaseId, Subtask[]> = {
      preparation: [],
      execution: [],
      conclusion: [],
    };

    subtasks.forEach((st) => {
      const { id: phaseId } = normalizeSubtaskPhase(st.phase, st.phaseId);
      groups[phaseId].push({
        ...st,
        phaseId,
      });
    });

    return groups;
  }, [subtasks]);

  // Overall stats
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle single subtask checkbox
  const handleToggleSubtask = (id: string) => {
    const next = subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st));
    onChange(next);
  };

  // Toggle single subtask card detail
  const handleToggleDetail = (id: string) => {
    setExpandedSubtaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle global expand/collapse
  const handleToggleExpandAll = () => {
    const nextState = !expandAllDetails;
    setExpandAllDetails(nextState);
    const map: Record<string, boolean> = {};
    subtasks.forEach((st) => {
      map[st.id] = nextState;
    });
    setExpandedSubtaskIds(map);
  };

  // Remove subtask
  const handleRemoveSubtask = (id: string) => {
    const next = subtasks.filter((st) => st.id !== id);
    onChange(next);
  };

  // Open add modal for a specific phase
  const handleOpenAddModal = (phaseId?: TaskPhaseId) => {
    const targetPhase = phaseId || 'preparation';
    const phaseLabel = CANONICAL_PHASES.find((p) => p.id === targetPhase)?.label || 'Giai đoạn 1: Chuẩn bị';
    setEditingSubtask({
      id: `subtask-${Date.now()}`,
      title: '',
      phase: phaseLabel,
      phaseId: targetPhase,
      completionCriteria: '',
      implementationSteps: [],
      deliverable: '',
      relatedDocuments: '',
      completed: false,
    });
    setSubtaskStepsInput('');
    setIsEditingModalOpen(true);
  };

  // Open edit modal for an existing subtask
  const handleOpenEditModal = (st: Subtask) => {
    const { id: phaseId, label } = normalizeSubtaskPhase(st.phase, st.phaseId);
    setEditingSubtask({
      ...st,
      phase: label,
      phaseId,
    });
    setSubtaskStepsInput(Array.isArray(st.implementationSteps) ? st.implementationSteps.join('\n') : '');
    setIsEditingModalOpen(true);
  };

  // Save subtask from edit/add modal
  const handleSaveSubtaskModal = () => {
    if (!editingSubtask || !editingSubtask.title?.trim()) return;

    const rawSteps = subtaskStepsInput
      .split('\n')
      .map((s) => s.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((s) => s.length > 0);

    const phaseId = editingSubtask.phaseId || 'preparation';
    const phaseLabel = CANONICAL_PHASES.find((p) => p.id === phaseId)?.label || 'Giai đoạn 1: Chuẩn bị';

    const cleanSubtask: Subtask = {
      id: editingSubtask.id || `subtask-${Date.now()}`,
      title: editingSubtask.title.trim(),
      phase: phaseLabel,
      phaseId,
      completionCriteria: editingSubtask.completionCriteria?.trim() || undefined,
      implementationSteps: rawSteps.length > 0 ? rawSteps : undefined,
      deliverable: editingSubtask.deliverable?.trim() || undefined,
      relatedDocuments: editingSubtask.relatedDocuments?.trim() || undefined,
      completed: Boolean(editingSubtask.completed),
      resource: editingSubtask.resource,
    };

    const exists = subtasks.some((s) => s.id === cleanSubtask.id);
    if (exists) {
      onChange(subtasks.map((s) => (s.id === cleanSubtask.id ? cleanSubtask : s)));
    } else {
      onChange([...subtasks, cleanSubtask]);
    }

    setIsEditingModalOpen(false);
    setEditingSubtask(null);
  };

  // Trigger AI breakdown
  const handleTriggerAiBreakdown = async () => {
    await onAiBreakdown({
      granularity: complexityMode,
      targetPhase: selectedAiTargetPhase === 'all' ? undefined : selectedAiTargetPhase,
      keepCompletedOrCustom: keepExistingCustom,
    });
    setShowAiModal(false);
  };

  // Helper colors for phases
  const getPhaseStyle = (phaseId: TaskPhaseId) => {
    switch (phaseId) {
      case 'preparation':
        return {
          headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50/50',
          border: 'border-blue-200/90',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          progressColor: 'bg-blue-600',
          accentText: 'text-blue-700',
          tagIcon: '📋',
        };
      case 'execution':
        return {
          headerBg: 'bg-gradient-to-r from-indigo-50 to-purple-50/50',
          border: 'border-indigo-200/90',
          badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          progressColor: 'bg-indigo-600',
          accentText: 'text-indigo-700',
          tagIcon: '⚡',
        };
      case 'conclusion':
        return {
          headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50/50',
          border: 'border-emerald-200/90',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          progressColor: 'bg-emerald-600',
          accentText: 'text-emerald-700',
          tagIcon: '🏁',
        };
    }
  };

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 shadow-2xs">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Kế hoạch thực hiện (3 Giai đoạn)
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
              {progressPercent}% ({completedCount}/{totalCount})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              {expandAllDetails ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thu gọn chi tiết</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mở rộng chi tiết</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddModal('preparation')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Thêm nhiệm vụ con thủ công"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Thêm việc con</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            disabled={isGeneratingAi || !taskTitle.trim()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            title="AI Phân rã nhiệm vụ thành 3 giai đoạn chi tiết"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI đang phân rã...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Phân rã 3 giai đoạn</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar overall */}
      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. 3 Phase Sections Container */}
      <div className="space-y-3 pt-1">
        {CANONICAL_PHASES.map((phase) => {
          const style = getPhaseStyle(phase.id);
          const phaseTasks = groupedSubtasks[phase.id];
          const phaseDone = phaseTasks.filter((s) => s.completed).length;
          const phaseTotal = phaseTasks.length;
          const isCollapsed = collapsedPhases[phase.id];

          return (
            <div
              key={phase.id}
              className={`rounded-2xl border-2 transition-all overflow-hidden ${style.border} bg-white shadow-xs`}
            >
              {/* Phase Header */}
              <div
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 ${style.headerBg} border-b ${style.border}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedPhases((prev) => ({
                        ...prev,
                        [phase.id]: !prev[phase.id],
                      }))
                    }
                    className="p-1 rounded-lg hover:bg-white/80 text-slate-600 cursor-pointer transition-colors"
                    title={isCollapsed ? 'Mở rộng giai đoạn này' : 'Thu gọn giai đoạn này'}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  <span className="text-base select-none">{phase.icon}</span>

                  <div className="min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 block truncate">
                      {phase.label}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border shrink-0 ${style.badgeBg}`}>
                    {phaseDone}/{phaseTotal} hoàn thành
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(phase.id)}
                    className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-700 text-xs font-semibold border border-slate-200/90 shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                    title={`Thêm việc con vào ${phase.shortLabel}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thêm việc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiTargetPhase(phase.id);
                      setShowAiModal(true);
                    }}
                    disabled={isGeneratingAi || !taskTitle.trim()}
                    className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-white/90 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200/90 shadow-2xs flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                    title={`AI phân rã riêng cho ${phase.shortLabel}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Phân rã lại</span>
                  </button>
                </div>
              </div>

              {/* Subtasks inside this phase */}
              {!isCollapsed && (
                <div className="p-2.5 sm:p-3 space-y-2">
                  {phaseTasks.length === 0 ? (
                    <div className="text-center py-4 px-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-slate-300" />
                      <span>Chưa có việc con nào trong giai đoạn này.</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(phase.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer text-xs"
                      >
                        + Thêm nhiệm vụ con vào {phase.shortLabel}
                      </button>
                    </div>
                  ) : (
                    phaseTasks.map((st, index) => {
                      const isExpanded = Boolean(expandedSubtaskIds[st.id] || expandAllDetails);
                      const hasDetails = Boolean(
                        st.completionCriteria ||
                          (st.implementationSteps && st.implementationSteps.length > 0) ||
                          st.deliverable ||
                          st.relatedDocuments ||
                          st.resource
                      );

                      return (
                        <div
                          key={st.id}
                          className={`rounded-xl border transition-all ${
                            st.completed
                              ? 'bg-emerald-50/40 border-emerald-200/90'
                              : 'bg-white border-slate-200/90 hover:border-slate-300'
                          } shadow-2xs`}
                        >
                          {/* Card Summary Header */}
                          <div className="p-3 flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`subtask-check-${st.id}`}
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(st.id)}
                              className="mt-0.5 w-4.5 h-4.5 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <label
                                  htmlFor={`subtask-check-${st.id}`}
                                  className={`text-xs sm:text-sm font-semibold cursor-pointer ${
                                    st.completed ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {index + 1}. {st.title}
                                </label>

                                {st.deliverable && (
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0 flex items-center gap-1 max-w-[220px] truncate"
                                    title={`Sản phẩm đầu ra: ${st.deliverable}`}
                                  >
                                    <Package className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span className="truncate">{st.deliverable}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {hasDetails && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleDetail(st.id)}
                                  className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(st)}
                                className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Chỉnh sửa nhiệm vụ con"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveSubtask(st.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa nhiệm vụ con này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Structured Details: Tiêu chuẩn, Các bước, Sản phẩm, Tài liệu */}
                          {isExpanded && hasDetails && (
                            <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/40 rounded-b-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                              {/* 1. Tiêu chuẩn hoàn thành */}
                              {st.completionCriteria && (
                                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 flex items-start gap-2">
                                  <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <span className="font-extrabold uppercase text-[10px] text-emerald-800 tracking-wider block">
                                      Tiêu chuẩn hoàn thành:
                                    </span>
                                    <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed font-medium">
                                      {st.completionCriteria}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* 2. Chi tiết thực hiện (Các bước) */}
                              {st.implementationSteps && st.implementationSteps.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                                  <span className="font-extrabold uppercase text-[10px] text-slate-600 tracking-wider flex items-center gap-1.5">
                                    <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Chi tiết thực hiện (Các bước thực tế):</span>
                                  </span>
                                  <div className="space-y-1 pl-1">
                                    {st.implementationSteps.map((step, sIdx) => (
                                      <div key={sIdx} className="flex items-start gap-2 text-slate-700">
                                        <span className="font-bold text-indigo-600 shrink-0">
                                          {sIdx + 1}.
                                        </span>
                                        <span className="leading-relaxed">{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 3. Sản phẩm đầu ra & Tài liệu liên quan (2 cột) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {st.deliverable && (
                                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-amber-950">
                                    <span className="font-extrabold uppercase text-[10px] text-amber-800 tracking-wider flex items-center gap-1 mb-0.5">
                                      <Package className="w-3 h-3 text-amber-600" />
                                      <span>Sản phẩm đầu ra:</span>
                                    </span>
                                    <p className="text-xs text-amber-900 font-medium">{st.deliverable}</p>
                                  </div>
                                )}

                                {st.relatedDocuments && (
                                  <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-blue-950">
                                    <span className="font-extrabold uppercase text-[10px] text-blue-800 tracking-wider flex items-center gap-1 mb-0.5">
                                      <FileText className="w-3 h-3 text-blue-600" />
                                      <span>Tài liệu liên quan:</span>
                                    </span>
                                    <p className="text-xs text-blue-900 font-medium">{st.relatedDocuments}</p>
                                  </div>
                                )}
                              </div>

                              {/* External resource link if present */}
                              {st.resource && (
                                <div className="flex items-center gap-2 pt-1 text-[11px]">
                                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                                    Biểu mẫu tham khảo:
                                  </span>
                                  <a
                                    href={st.resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                                  >
                                    <span>{st.resource.title}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. AI Breakdown Configuration Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm sm:text-base">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI Phân Rã Kế Hoạch 3 Giai Đoạn</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/90 text-indigo-950 space-y-1">
                <span className="font-extrabold text-[11px] uppercase tracking-wider block">Nhiệm vụ phân rã:</span>
                <p className="font-bold text-xs sm:text-sm text-indigo-900">&quot;{taskTitle}&quot;</p>
              </div>

              {/* Scope selection: All 3 phases or a specific phase */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Phạm vi phân rã:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAiTargetPhase('all')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                      selectedAiTargetPhase === 'all'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🌟 Toàn bộ 3 giai đoạn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiTargetPhase('preparation')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                      selectedAiTargetPhase === 'preparation'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>📋 Riêng Giai đoạn 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiTargetPhase('execution')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                      selectedAiTargetPhase === 'execution'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>⚡ Riêng Giai đoạn 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiTargetPhase('conclusion')}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                      selectedAiTargetPhase === 'conclusion'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>🏁 Riêng Giai đoạn 3</span>
                  </button>
                </div>
              </div>

              {/* Complexity mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Mức độ chi tiết của nhiệm vụ:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setComplexityMode('standard')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      complexityMode === 'standard'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Ngắn gọn (1-2 việc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComplexityMode('phased')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      complexityMode === 'phased'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Chuẩn (2 việc/GĐ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComplexityMode('detailed')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      complexityMode === 'detailed'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Tỉ mỉ (2-3 việc/GĐ)</span>
                  </button>
                </div>
              </div>

              {/* Option to keep existing custom subtasks */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepExistingCustom}
                  onChange={(e) => setKeepExistingCustom(e.target.checked)}
                  className="mt-0.5 rounded-sm text-indigo-600 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Giữ lại các việc con đã hoàn thành hoặc do tôi tự thêm
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Không làm mất những phần việc bạn đã chỉnh sửa thủ công trước đó.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleTriggerAiBreakdown}
                disabled={isGeneratingAi}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân rã...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Bắt đầu phân rã</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit / Add Subtask Modal */}
      {isEditingModalOpen && editingSubtask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Chi Tiết Nhiệm Vụ Con</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Tên nhiệm vụ con */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Tên nhiệm vụ con: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingSubtask.title || ''}
                  onChange={(e) => setEditingSubtask({ ...editingSubtask, title: e.target.value })}
                  placeholder="VD: Thu thập 3 bảng báo giá từ các đơn vị cung cấp..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:border-indigo-600 outline-hidden"
                />
              </div>

              {/* Giai đoạn */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Thuộc giai đoạn:
                </label>
                <select
                  value={editingSubtask.phaseId || 'preparation'}
                  onChange={(e) => {
                    const phaseId = e.target.value as TaskPhaseId;
                    const match = CANONICAL_PHASES.find((p) => p.id === phaseId);
                    setEditingSubtask({
                      ...editingSubtask,
                      phaseId,
                      phase: match?.label || 'Giai đoạn 1: Chuẩn bị',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:border-indigo-600 outline-hidden"
                >
                  {CANONICAL_PHASES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu chuẩn hoàn thành */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tiêu chuẩn hoàn thành (Điều kiện đạt yêu cầu):</span>
                </label>
                <input
                  type="text"
                  value={editingSubtask.completionCriteria || ''}
                  onChange={(e) =>
                    setEditingSubtask({ ...editingSubtask, completionCriteria: e.target.value })
                  }
                  placeholder="VD: Có đủ 3 bảng báo giá hợp lệ có mộc tròn và so sánh thông số."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:border-emerald-600 outline-hidden"
                />
              </div>

              {/* Chi tiết thực hiện (Các bước) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chi tiết thực hiện (Mỗi bước trên 1 dòng):</span>
                </label>
                <textarea
                  rows={3}
                  value={subtaskStepsInput}
                  onChange={(e) => setSubtaskStepsInput(e.target.value)}
                  placeholder="Bước 1: Liên hệ các nhà cung cấp uy tín&#10;Bước 2: Gửi thông số yêu cầu kỹ thuật&#10;Bước 3: Lập bảng so sánh giá cả và bảo hành"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:border-indigo-600 outline-hidden leading-relaxed"
                />
              </div>

              {/* Sản phẩm đầu ra & Tài liệu liên quan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-amber-600" />
                    <span>Sản phẩm đầu ra:</span>
                  </label>
                  <input
                    type="text"
                    value={editingSubtask.deliverable || ''}
                    onChange={(e) =>
                      setEditingSubtask({ ...editingSubtask, deliverable: e.target.value })
                    }
                    placeholder="VD: Bảng tổng hợp so sánh báo giá"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-amber-600 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span>Tài liệu liên quan:</span>
                  </label>
                  <input
                    type="text"
                    value={editingSubtask.relatedDocuments || ''}
                    onChange={(e) =>
                      setEditingSubtask({ ...editingSubtask, relatedDocuments: e.target.value })
                    }
                    placeholder="VD: Mẫu báo giá; Quy chế chi tiêu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-blue-600 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSubtaskModal}
                disabled={!editingSubtask.title?.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu việc con</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
