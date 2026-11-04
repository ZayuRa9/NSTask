import React, { useState } from 'react';
import {
  Archive,
  Download,
  FileText,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Building2,
  Calendar,
  Search,
  ExternalLink,
  Paperclip,
  Clock,
  Sparkles,
  Eye,
  X,
  FileCheck2,
  Check
} from 'lucide-react';
import { Task, UserProfile, ReportPeriodType } from '../types/task';
import { formatDateVietnamese } from '../utils/taskCalculations';
import { downloadTaskDocx, downloadAllCompletedTasksDocx } from '../utils/docxExport';
import { getUnitColorStyle } from '../utils/unitTheme';

interface ArchiveVaultProps {
  completedTasks: Task[];
  userProfile: UserProfile;
  onRestoreTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
  onOpenReportModal?: (period?: ReportPeriodType) => void;
}

export const ArchiveVault: React.FC<ArchiveVaultProps> = ({
  completedTasks,
  userProfile,
  onRestoreTask,
  onDeleteTask,
  onOpenCreateModal,
  onOpenReportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const filteredTasks = completedTasks.filter((task) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      task.unit.toLowerCase().includes(q)
    );
  });

  const handleDownloadWord = async (task: Task) => {
    try {
      setDownloadingId(task.id);
      await downloadTaskDocx(task, userProfile);
      setSuccessToast(`Đã tải xuống file DOCX báo cáo nhiệm vụ "${task.title}"!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (error) {
      console.error('Error exporting docx:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAllMasterWord = async () => {
    if (completedTasks.length === 0) return;
    try {
      setIsDownloadingAll(true);
      await downloadAllCompletedTasksDocx(completedTasks, userProfile);
      setSuccessToast(`Đã tải xuống file DOCX tổng hợp ${completedTasks.length} nhiệm vụ đã hoàn thành!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (error) {
      console.error('Error exporting master docx:', error);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <FileCheck2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Vault Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold backdrop-blur-xs">
            <Archive className="w-3.5 h-3.5 text-emerald-300" />
            Kho Lưu Trữ &amp; Xuất Bản Báo Cáo DOCX
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Lưu Trữ Nhiệm Vụ &amp; Xuất File Word (.docx)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenReportModal && (
            <button
              onClick={() => onOpenReportModal('archive')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Mở trình tùy biến thể thức & xuất mẫu báo cáo Word lưu trữ theo Nghị định 30/2020/NĐ-CP"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Tùy Chỉnh &amp; Xuất Mẫu DOCX...</span>
            </button>
          )}

          <button
            onClick={handleDownloadAllMasterWord}
            disabled={completedTasks.length === 0 || isDownloadingAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold backdrop-blur-md transition-all cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
            title="Xuất file DOCX tổng hợp toàn bộ các nhiệm vụ đã hoàn thành theo mẫu chuẩn"
          >
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>{isDownloadingAll ? 'Đang tạo tổng hợp...' : 'Xuất Nhanh DOCX'}</span>
            <Download className="w-3.5 h-3.5" />
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2.5 text-center">
            <span className="block text-2xl font-black text-emerald-300">{completedTasks.length}</span>
            <span className="text-[11px] font-medium text-emerald-100">Đã nghiệm thu</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm nhiệm vụ đã lưu trữ theo tên, nội dung hoặc đơn vị..."
          className="flex-1 text-xs sm:text-sm outline-hidden text-slate-800 placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Xóa tìm
          </button>
        )}
      </div>

      {/* Archived Task Cards */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Archive className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Chưa có nhiệm vụ nào trong kho lưu trữ</h3>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tạo nhiệm vụ mới
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl border border-emerald-100 hover:border-emerald-300 p-5 sm:p-6 transition-all shadow-xs hover:shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ĐÃ HOÀN THÀNH 100%
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold shadow-2xs ${getUnitColorStyle(task.unit).badgeClass}`}
                    title={`Phân loại nhiệm vụ cá nhân tôi làm cho ${task.unit}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${getUnitColorStyle(task.unit).accentDot}`} />
                    Làm cho: {task.unit}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Hoàn tất:{' '}
                    <strong className="text-slate-700">
                      {task.completedAt ? formatDateVietnamese(task.completedAt) : 'Đã nghiệm thu'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Title & Description / Giới thiệu tác vụ */}
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{task.title}</h3>
                {task.description && (
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Giới thiệu &amp; Nội dung tác vụ:</span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                      {task.description
                        .split('\n')
                        .map((p) => p.trim())
                        .filter(Boolean)
                        .map((para, pIdx) => (
                          <p key={pIdx} className="indent-6 sm:indent-8 text-justify leading-relaxed">
                            {para}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtasks summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block mb-1">
                  Checklist đã nghiệm thu ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      {st.phase && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/80 text-slate-700 shrink-0">
                          {st.phase}
                        </span>
                      )}
                      <span className="line-clamp-1">
                        {i + 1}. {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: TẢI FILE DOCX NỔI BẬT */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Mã hồ sơ: #{task.id.slice(0, 8).toUpperCase()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Xem trước mẫu báo cáo */}
                  <button
                    type="button"
                    onClick={() => setPreviewTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Xem trước nội dung báo cáo Word"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Xem trước
                  </button>

                  {/* Khôi phục lại */}
                  <button
                    type="button"
                    onClick={() => onRestoreTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Chuyển lại về danh sách nhiệm vụ đang làm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục
                  </button>

                  {/* Xóa */}
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa khỏi lưu trữ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* NÚT TẢI DOCX (WORD) CHÍNH YÊU CẦU */}
                  <button
                    type="button"
                    onClick={() => handleDownloadWord(task)}
                    disabled={downloadingId === task.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-blue-200" />
                    <span>
                      {downloadingId === task.id ? 'Đang tạo DOCX...' : 'Tải về file DOCX (Word)'}
                    </span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal for DOCX Report */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">Xem Trước Cấu Trúc Báo Cáo DOCX</h3>
              </div>
              <button
                onClick={() => setPreviewTask(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                aria-label="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content simulating Word document format conforming to Nghị định 30/2020/NĐ-CP */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 text-slate-800 text-xs sm:text-sm bg-slate-100 flex justify-center">
              {/* Document Sheet simulating A4 with standard margins (Top 2cm, Bottom 2cm, Left 3cm, Right 2cm) */}
              <div
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  paddingTop: '20mm',
                  paddingBottom: '20mm',
                  paddingLeft: '30mm',
                  paddingRight: '20mm',
                }}
                className="bg-white w-full max-w-[760px] min-h-[850px] shadow-2xl rounded-sm text-slate-900 border border-slate-300 relative space-y-4 text-justify select-text leading-relaxed"
              >
                {/* Header standard: 2 columns */}
                <div className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-300">
                  <div className="col-span-5 text-center space-y-0.5">
                    <div className="text-[11px] font-normal uppercase tracking-tight text-slate-600">
                      CƠ QUAN / ĐƠN VỊ CHỦ QUẢN
                    </div>
                    <div className="text-xs font-bold uppercase text-slate-900">
                      {previewTask.unit?.toUpperCase() || 'BAN THANH NIÊN'}
                    </div>
                    <div className="w-16 h-0.5 bg-slate-400 mx-auto my-1"></div>
                    <div className="text-xs italic text-slate-600">
                      Số: ..../BC-NT
                    </div>
                  </div>

                  <div className="col-span-7 text-center space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-tight text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <div className="w-24 h-0.5 bg-slate-400 mx-auto my-1"></div>
                    <div className="text-xs italic text-slate-600">
                      Hà Nội, ngày {new Date().getDate().toString().padStart(2, '0')} tháng {(new Date().getMonth() + 1).toString().padStart(2, '0')} năm {new Date().getFullYear()}
                    </div>
                  </div>
                </div>

                {/* Document Title Banner: BÁO CÁO & Trích Yếu */}
                <div className="text-center py-3 space-y-1">
                  <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase text-slate-900">
                    BÁO CÁO
                  </h1>
                  <div className="text-sm sm:text-base font-bold text-slate-900">
                    Kết quả thực hiện và nghiệm thu nhiệm vụ lưu trữ
                  </div>
                  <div className="text-xs italic text-slate-600">
                    (Nhiệm vụ: {previewTask.title})
                  </div>
                </div>

                {/* Mở đầu */}
                <div className="text-justify text-xs italic text-slate-700 indent-[1.27cm] leading-relaxed">
                  Căn cứ yêu cầu công tác và kế hoạch phân công nhiệm vụ của {previewTask.unit}, cán bộ phụ trách báo cáo chi tiết kết quả thực hiện và tiến hành nghiệm thu hồ sơ như sau:
                </div>

                {/* I. Đặc điểm tình hình */}
                <div className="space-y-1.5 text-xs">
                  <h2 className="font-bold text-slate-900 text-sm">
                    I. ĐẶC ĐIỂM TÌNH HÌNH
                  </h2>
                  <div className="space-y-1 text-justify indent-[1.27cm] leading-relaxed">
                    <p>- Bối cảnh triển khai: Nhiệm vụ được giao thực hiện từ ngày {formatDateVietnamese(previewTask.createdAt)} với thời hạn cam kết hoàn thành trước ngày {formatDateVietnamese(previewTask.dueDate)}.</p>
                    <p>- Thuận lợi: Được sự quan tâm chỉ đạo sát sao của lãnh đạo đơn vị, các nguồn lực tài liệu và quy trình phối hợp được đảm bảo kịp thời.</p>
                    <p>- Khó khăn: Đòi hỏi tính chuẩn xác cao và kiểm soát chặt chẽ từng bước việc con trước khi kết chuyển vào kho lưu trữ số hóa.</p>
                  </div>
                </div>

                {/* II. Kết quả thực hiện & Biểu đồ tổng quan */}
                <div className="space-y-2 text-xs">
                  <h2 className="font-bold text-slate-900 text-sm">
                    II. KẾT QUẢ THỰC HIỆN
                  </h2>
                  <div className="text-xs font-bold indent-[1.27cm]">
                    1. Bảng chỉ số tổng quan đại diện &amp; biểu đồ tiến độ nghiệm thu:
                  </div>

                  {/* Representative Chart & Visual Meters */}
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>Tiến độ hoàn thành:</span>
                          <span className="font-bold text-emerald-600">100% (Đạt tiêu chuẩn)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                          <div className="h-full bg-emerald-500 rounded-full w-full" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>Đánh giá thời hạn:</span>
                          <span className={`font-bold ${previewTask.completedAt && previewTask.dueDate && new Date(previewTask.completedAt) > new Date(previewTask.dueDate) ? 'text-amber-600' : 'text-blue-600'}`}>
                            {previewTask.completedAt && previewTask.dueDate && new Date(previewTask.completedAt) > new Date(previewTask.dueDate) ? 'Hoàn thành trễ hạn' : 'Đúng hạn cam kết (100%)'}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                          <div className="h-full bg-blue-500 rounded-full w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-medium">Đơn vị phụ trách</div>
                        <div className="text-xs font-bold text-slate-800 truncate">{previewTask.unit}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-medium">Hạng mục con</div>
                        <div className="text-xs font-bold text-indigo-700">{previewTask.subtasks?.length || 0} mục đã xong</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-medium">Thời gian hoàn thành</div>
                        <div className="text-xs font-bold text-emerald-700">{previewTask.completedAt ? formatDateVietnamese(previewTask.completedAt) : 'Đã nghiệm thu'}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-medium">Trạng thái lưu trữ</div>
                        <div className="text-xs font-bold text-emerald-700">Nghiệm thu vĩnh viễn</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-bold indent-[1.27cm] pt-1">
                    2. Bảng kiểm kê chi tiết các hạng mục đã hoàn thành:
                  </div>

                  {/* Detailed Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-[11px] font-bold">
                        <tr>
                          <th className="p-2 border-b border-r text-center w-12">STT</th>
                          <th className="p-2 border-b border-r">Nội dung công việc &amp; Giai đoạn</th>
                          <th className="p-2 border-b text-center w-32">Kết quả nghiệm thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {previewTask.subtasks && previewTask.subtasks.length > 0 ? (
                          previewTask.subtasks.map((st, i) => (
                            <tr key={st.id}>
                              <td className="p-2 text-center border-r font-medium">{i + 1}</td>
                              <td className="p-2 border-r">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {st.phase && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {st.phase}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800">{st.title}</span>
                                </div>
                                {st.resource && (
                                  <span className="text-[10px] text-blue-600 italic block mt-0.5">
                                    [Tài liệu: {st.resource.title} - {st.resource.url}]
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center text-emerald-700 font-bold whitespace-nowrap">
                                ✓ ĐÃ HOÀN THÀNH
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-3 text-center text-slate-500 italic">
                              Toàn bộ nhiệm vụ đã được thực hiện và hoàn thành theo đúng mô tả.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* III. Đánh giá */}
                <div className="space-y-1 text-xs">
                  <h2 className="font-bold text-slate-900 text-sm">
                    III. ĐÁNH GIÁ VÀ KẾT LUẬN
                  </h2>
                  <p className="indent-[1.27cm] text-justify leading-relaxed">
                    Nhiệm vụ "{previewTask.title}" đã được triển khai nghiêm túc, đạt 100% khối lượng đề ra và đáp ứng toàn diện tiêu chuẩn chất lượng. Đơn vị đã hoàn tất nghiệm thu và chuyển lưu trữ điện tử.
                  </p>
                </div>

                {/* IV. Phương hướng */}
                <div className="space-y-1 text-xs">
                  <h2 className="font-bold text-slate-900 text-sm">
                    IV. PHƯƠNG HƯỚNG BÀN GIAO LƯU TRỮ
                  </h2>
                  <p className="indent-[1.27cm] text-justify leading-relaxed">
                    Hồ sơ công việc và các tài liệu liên quan được số hóa, lưu trữ lâu dài trên nền tảng NSTask để phục vụ công tác tra cứu, tổng hợp báo cáo và thanh kiểm tra công vụ khi có yêu cầu.
                  </p>
                </div>

                {/* Khối chữ ký chuẩn 2 cột */}
                <div className="grid grid-cols-2 text-xs pt-4 border-t border-slate-300">
                  <div className="text-left space-y-1">
                    <span className="font-bold italic block">Nơi nhận:</span>
                    <span className="italic text-slate-600 text-[11px] block">- Lãnh đạo đơn vị;</span>
                    <span className="italic text-slate-600 text-[11px] block">- Bộ phận lưu trữ;</span>
                    <span className="italic text-slate-600 text-[11px] block">- Lưu: VT, Hồ sơ nhiệm vụ.</span>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="font-bold uppercase block text-slate-900">NGƯỜI THỰC HIỆN BÁO CÁO</span>
                    <span className="italic text-slate-500 text-[10px] block mb-12">(Ký và ghi rõ họ tên)</span>
                    <span className="font-bold text-slate-900 text-sm block">{userProfile.displayName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Xuất trực tiếp bằng thư viện docx chuẩn Microsoft Word
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadWord(previewTask);
                    setPreviewTask(null);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Tải file DOCX này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
