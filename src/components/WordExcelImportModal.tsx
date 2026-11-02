import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Loader2,
  Download,
} from 'lucide-react';
import { Task, ImportedCandidateTask, DocumentTableStructure, TaskPriority } from '../types/task';
import { downloadExcelTaskTemplate } from '../utils/excelTemplate';
import { ExcelTemplateModal } from './ExcelTemplateModal';

interface WordExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (tasks: Partial<Task>[]) => void;
  defaultUnit?: string;
  availableUnits?: string[];
}

export const WordExcelImportModal: React.FC<WordExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  defaultUnit = 'Ban Thanh Niên',
  availableUnits = ['Ban Thanh Niên', 'Văn Phòng', 'Đoàn Cơ Sở'],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Parsed results
  const [tables, setTables] = useState<DocumentTableStructure[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>(0);
  const [candidates, setCandidates] = useState<ImportedCandidateTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Editing state for preview
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'warning'>('all');
  const [isExcelCustomModalOpen, setIsExcelCustomModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await analyzeUploadedFile(selectedFile);
  };

  const analyzeUploadedFile = async (targetFile: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCandidates([]);
    setTables([]);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(targetFile);
      const base64Data = await base64Promise;

      const response = await fetch('/api/import/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: targetFile.name,
          base64Data,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Lỗi từ máy chủ khi phân tích tệp tin.');
      }

      const data = await response.json();
      const parsedTables: DocumentTableStructure[] = data.tables || [];
      const parsedCandidates: ImportedCandidateTask[] = (data.candidates || []).map((c: any) => ({
        ...c,
        unit: c.unit || defaultUnit,
      }));

      setTables(parsedTables);
      setCandidates(parsedCandidates);

      // Select all valid candidates by default
      const initialSelected = new Set<string>();
      parsedCandidates.forEach((c) => {
        initialSelected.add(c.tempId);
      });
      setSelectedIds(initialSelected);
    } catch (err: any) {
      setAnalysisError(err.message || 'Không thể đọc và phân tích tệp tin này.');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectCandidate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(candidates.map((c) => c.tempId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleUpdateCandidate = (id: string, field: keyof ImportedCandidateTask, value: any) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.tempId === id) {
          const updated = { ...c, [field]: value };
          // Re-evaluate errors
          const errors: string[] = [];
          if (!updated.title.trim()) errors.push('Tên nhiệm vụ không được để trống');
          if (!updated.dueDate) errors.push('Thiếu hạn hoàn thành');
          updated.validationErrors = errors;
          updated.isCertain = errors.length === 0;
          return updated;
        }
        return c;
      })
    );
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.tempId !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const chosen = candidates.filter((c) => selectedIds.has(c.tempId));
    if (chosen.length === 0) {
      setAnalysisError('Vui lòng chọn ít nhất một nhiệm vụ để nhập.');
      return;
    }

    const tasksToCreate: Partial<Task>[] = chosen.map((c) => ({
      title: c.title.trim(),
      unit: c.unit.trim() || defaultUnit,
      dueDate: c.dueDate,
      priority: c.priority,
      description: c.description || '',
      subtasks: (c.subtasks || []).map((st, idx) => ({
        id: `st_${Date.now()}_${idx}`,
        title: st,
        completed: false,
      })),
      links: (c.links || []).map((l, idx) => ({
        id: `lnk_${Date.now()}_${idx}`,
        title: l.title,
        url: l.url,
      })),
      reminder: {
        enabled: !!c.addToGoogleCalendar,
        minutesBefore: 60,
      },
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    }));

    onConfirmImport(tasksToCreate);
    onClose();
  };

  const filteredCandidates = candidates.filter((c) => {
    if (filterMode === 'valid') return c.validationErrors.length === 0;
    if (filterMode === 'warning') return c.validationErrors.length > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Nhập Hàng Loạt Nhiệm Vụ Từ Tệp Word &amp; Excel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  .docx • .xlsx • .pdf
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Upload Zone & Download Template Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="md:col-span-2 p-5 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.docx,.doc,.pdf,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Bấm để chọn tệp Word (.docx), Excel (.xlsx) hoặc PDF'}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Mẫu Excel Chuẩn 12 Cột</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsExcelCustomModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tùy chỉnh mẫu Excel</span>
                </button>
                <button
                  type="button"
                  onClick={downloadExcelTaskTemplate}
                  className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Tải nhanh file mẫu (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isAnalyzing && (
            <div className="py-8 text-center space-y-2 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-800">Đang phân tích bảng biểu và cấu trúc tài liệu...</div>
              <div className="text-[11px] text-slate-500">Trích xuất tên nhiệm vụ, đơn vị, hạn chót và việc con</div>
            </div>
          )}

          {/* Error Banner */}
          {analysisError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* Multi-table selector if present */}
          {tables.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Tài liệu chứa nhiều bảng dữ liệu ({tables.length} bảng):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tables.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTableIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTableIndex === idx
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t.title} ({t.rowCount} dòng)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Candidates Preview & Validation Table */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              {/* Filter and bulk select toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Đã tìm thấy {candidates.length} nhiệm vụ khả dụng
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    Đã chọn {selectedIds.size}/{candidates.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === 'all' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      Tất cả ({candidates.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('valid')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === 'valid' ? 'bg-white shadow-2xs font-bold text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      Hợp lệ ({candidates.filter((c) => c.validationErrors.length === 0).length})
                    </button>
                    <button
                      onClick={() => setFilterMode('warning')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        filterMode === 'warning' ? 'bg-white shadow-2xs font-bold text-amber-700' : 'text-slate-600'
                      }`}
                    >
                      Có cảnh báo ({candidates.filter((c) => c.validationErrors.length > 0).length})
                    </button>
                  </div>

                  <button
                    onClick={() => handleSelectAll(selectedIds.size < candidates.length)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                  >
                    {selectedIds.size === candidates.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                </div>
              </div>

              {/* Editable Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === candidates.length && candidates.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                      </th>
                      <th className="py-2.5 px-3 min-w-[200px]">Tên nhiệm vụ</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Đơn vị</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Hạn hoàn thành</th>
                      <th className="py-2.5 px-3 w-28">Mức ưu tiên</th>
                      <th className="py-2.5 px-3 min-w-[100px]">Trạng thái</th>
                      <th className="py-2.5 px-3 w-16 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((item) => {
                      const isSelected = selectedIds.has(item.tempId);
                      const isEditing = editingCandidateId === item.tempId;

                      return (
                        <tr
                          key={item.tempId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isSelected ? 'opacity-50 bg-slate-50/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCandidate(item.tempId)}
                              className="rounded text-emerald-600"
                            />
                          </td>

                          {/* Task Title */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleUpdateCandidate(item.tempId, 'title', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-emerald-300 rounded-lg focus:outline-hidden"
                              />
                            ) : (
                              <div>
                                <div className="font-semibold text-slate-900 line-clamp-1">{item.title}</div>
                                {item.description && (
                                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleUpdateCandidate(item.tempId, 'unit', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-emerald-300 rounded-lg focus:outline-hidden"
                              />
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                {item.unit || defaultUnit}
                              </span>
                            )}
                          </td>

                          {/* Due Date */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                value={item.dueDate ? item.dueDate.slice(0, 16) : ''}
                                onChange={(e) => handleUpdateCandidate(item.tempId, 'dueDate', new Date(e.target.value).toISOString())}
                                className="w-full px-1.5 py-1 text-[11px] border border-emerald-300 rounded-lg focus:outline-hidden"
                              />
                            ) : (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>
                                  {item.dueDate
                                    ? new Date(item.dueDate).toLocaleString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })
                                    : 'Chưa có'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <select
                                value={item.priority}
                                onChange={(e) => handleUpdateCandidate(item.tempId, 'priority', e.target.value as TaskPriority)}
                                className="px-2 py-1 text-xs border border-emerald-300 rounded-lg focus:outline-hidden bg-white"
                              >
                                <option value="high">Khẩn cấp</option>
                                <option value="medium">Bình thường</option>
                                <option value="low">Thấp</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.priority === 'high'
                                    ? 'bg-rose-100 text-rose-700'
                                    : item.priority === 'low'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {item.priority === 'high' ? 'Khẩn cấp' : item.priority === 'low' ? 'Thấp' : 'Bình thường'}
                              </span>
                            )}
                          </td>

                          {/* Status / Warnings */}
                          <td className="py-2.5 px-3">
                            {item.validationErrors.length === 0 ? (
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Hợp lệ</span>
                              </span>
                            ) : (
                              <span
                                className="text-[11px] font-bold text-amber-600 flex items-center gap-1 cursor-help"
                                title={item.validationErrors.join(', ')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[120px]">{item.validationErrors[0]}</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  setEditingCandidateId(isEditing ? null : item.tempId)
                                }
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 cursor-pointer"
                                title={isEditing ? 'Lưu sửa' : 'Chỉnh sửa dòng này'}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCandidate(item.tempId)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                                title="Xóa bỏ dòng này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Chỉ tạo nhiệm vụ sau khi bạn xác nhận • Dễ dàng chỉnh sửa trực tiếp từng dòng
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Xác nhận nhập {selectedIds.size} nhiệm vụ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Excel Customizer Modal */}
      <ExcelTemplateModal
        isOpen={isExcelCustomModalOpen}
        onClose={() => setIsExcelCustomModalOpen(false)}
      />
    </div>
  );
};
