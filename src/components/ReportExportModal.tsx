import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  X,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Check,
  Type,
  Palette,
  Grid,
  Italic,
  AlignLeft,
  Lock,
  Edit3,
} from 'lucide-react';
import {
  Task,
  UserProfile,
  ReportPeriodType,
  ReportStatistics,
  WordReportCustomConfig,
  DocxTemplateLayout,
} from '../types/task';
import { downloadCustomizedReportExcel } from '../utils/excelTemplate';
import { exportCustomWordReportDocx } from '../utils/docxExport';
import { ExcelTemplateModal } from './ExcelTemplateModal';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  userProfile: UserProfile;
}

const FONT_OPTIONS = [
  { value: 'Times New Roman', label: 'Times New Roman (Chuẩn văn bản hành chính)' },
  { value: 'Arial', label: 'Arial (Hiện đại không chân)' },
  { value: 'Calibri', label: 'Calibri (Thanh thoát MS Office)' },
  { value: 'Roboto', label: 'Roboto (Chuẩn Web Google)' },
];

const COLOR_OPTIONS = [
  { name: 'Đen Chuẩn Công Vụ', hex: '#000000' },
  { name: 'Xanh Hải Quân Lãnh Đạo', hex: '#1E40AF' },
  { name: 'Xanh Lá Công Tác', hex: '#047857' },
  { name: 'Đỏ Rượu Sang Trọng', hex: '#991B1B' },
  { name: 'Xám Than Lịch Sự', hex: '#334155' },
];

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  userProfile,
}) => {
  // Filter & Period State
  const [periodType, setPeriodType] = useState<ReportPeriodType>('month');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(now.toISOString().slice(0, 10));
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  // Word Document Formatting Toolbar State
  const [templateLayout, setTemplateLayout] = useState<DocxTemplateLayout>('executive_summary');
  const [fontFamily, setFontFamily] = useState<'Times New Roman' | 'Arial' | 'Calibri' | 'Roboto'>('Times New Roman');
  const [fontSizePt, setFontSizePt] = useState<number>(13);
  const [lineSpacing, setLineSpacing] = useState<number>(1.15);
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [hasBorderBox, setHasBorderBox] = useState<boolean>(true);
  const [autoItalicParentheses, setAutoItalicParentheses] = useState<boolean>(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Storage key for persisting last report metadata
  const STORAGE_KEY_REPORT_METADATA = 'taskmaster_last_report_metadata';

  const realtimeDatePart = useMemo(() => {
    const d = new Date();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `ngày ${day} tháng ${month} năm ${year}`;
  }, []);

  // Editable Document Content State (Restored from previous export)
  const [governingBody, setGoverningBody] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_REPORT_METADATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.governingBody) return parsed.governingBody;
        }
      }
    } catch {}
    return 'ỦY BAN NHÂN DÂN / ĐƠN VỊ CẤP TRÊN';
  });

  const [issuingAgency, setIssuingAgency] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_REPORT_METADATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.issuingAgency) return parsed.issuingAgency;
        }
      }
    } catch {}
    return userProfile.units[0]?.toUpperCase() || 'BAN THANH NIÊN';
  });

  const [docNumber, setDocNumber] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_REPORT_METADATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.docNumber) return parsed.docNumber;
        }
      }
    } catch {}
    return 'Số: ..../BC-TM';
  });

  const [locationName, setLocationName] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_REPORT_METADATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.locationName) return parsed.locationName;
        }
      }
    } catch {}
    return 'Hà Nội';
  });

  // Location and Date combined string, formatted according to national administrative standard with real-time date
  const locationAndDate = useMemo(() => {
    const loc = (locationName || 'Hà Nội').trim();
    return `${loc}, ${realtimeDatePart}`;
  }, [locationName, realtimeDatePart]);

  const saveReportHeaderToStorage = (updates: {
    governingBody?: string;
    issuingAgency?: string;
    docNumber?: string;
    locationName?: string;
  }) => {
    try {
      if (typeof window !== 'undefined') {
        const currentData = {
          governingBody: updates.governingBody !== undefined ? updates.governingBody : governingBody,
          issuingAgency: updates.issuingAgency !== undefined ? updates.issuingAgency : issuingAgency,
          docNumber: updates.docNumber !== undefined ? updates.docNumber : docNumber,
          locationName: updates.locationName !== undefined ? updates.locationName : locationName,
        };
        localStorage.setItem(STORAGE_KEY_REPORT_METADATA, JSON.stringify(currentData));
      }
    } catch {}
  };

  const [reportTitle, setReportTitle] = useState<string>('BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC');
  const [reportSubtitle, setReportSubtitle] = useState<string>('');
  const [section1Title, setSection1Title] = useState<string>('I. TỔNG HỢP CHỈ SỐ HOÀN THÀNH (DỮ LIỆU CHUẨN HỆ THỐNG)');
  const [section2Title, setSection2Title] = useState<string>('II. ĐÁNH GIÁ, THAM MƯU CỦA AI VÀ PHƯƠNG HƯỚNG TRỌNG TÂM');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [futureDirections, setFutureDirections] = useState<string>(
    'Tập trung hoàn thành dứt điểm các nhiệm vụ tồn đọng và đẩy nhanh tiến độ các công việc trong kỳ tiếp theo.'
  );
  const [section3Title, setSection3Title] = useState<string>('III. DANH MỤC CHI TIẾT CÁC NHIỆM VỤ');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('THỦ TRƯỞNG ĐƠN VỊ');
  const [signatoryNote, setSignatoryNote] = useState<string>('(Ký và ghi rõ họ tên)');
  const [signatoryName, setSignatoryName] = useState<string>(userProfile.displayName || 'Nguyễn Văn A');
  const [recipientList, setRecipientList] = useState<string>(
    'Nơi nhận:\n- Lãnh đạo đơn vị;\n- Các bộ phận phụ trách;\n- Lưu: VT, Hồ sơ việc.'
  );

  // Switch Layout Template presets
  const handleSelectTemplateLayout = (layout: DocxTemplateLayout) => {
    setTemplateLayout(layout);
    if (layout === 'detailed_tasks') {
      setReportTitle('BÁO CÁO CHI TIẾT TÌNH HÌNH THỰC HIỆN NHIỆM VỤ');
      setSection1Title('I. TỔNG HỢP CHỈ SỐ THEO DÕI HỆ THỐNG');
      setSection2Title('II. BẢNG KIỂM KÊ TOÀN DIỆN CÁC ĐẦU VIỆC VÀ VIỆC CON');
      setSection3Title('III. ĐÁNH GIÁ CHẤT LƯỢNG THỰC HIỆN & ĐỀ XUẤT KIẾN NGHỊ');
    } else if (layout === 'project_timeline') {
      setReportTitle('BÁO CÁO TIẾN ĐỘ & LỘ TRÌNH THỰC HIỆN DỰ ÁN');
      setSection1Title('I. ĐÁNH GIÁ SỨC KHỎE TIẾN ĐỘ & MỨC ĐỘ AN TOÀN KỲ BÁO CÁO');
      setSection2Title('II. BẢNG PHÂN BỔ NHIỆM VỤ THEO CÁC MỐC THỜI GIAN & TRẠNG THÁI TIẾN ĐỘ');
      setSection3Title('III. KẾ HOẠCH BỨT PHÁ TIẾN ĐỘ & GIẢI PHÓNG ĐIỂM NGHẼN');
    } else {
      setReportTitle('BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC');
      setSection1Title('I. TỔNG HỢP CHỈ SỐ HOÀN THÀNH (DỮ LIỆU CHUẨN HỆ THỐNG)');
      setSection2Title('II. ĐÁNH GIÁ, THAM MƯU CỦA AI VÀ PHƯƠNG HƯỚNG TRỌNG TÂM');
      setSection3Title('III. DANH MỤC CHI TIẾT CÁC NHIỆM VỤ');
    }
  };

  // UI state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExcelCustomModalOpen, setIsExcelCustomModalOpen] = useState(false);

  // Determine date range and label
  const { dateRangeStart, dateRangeEnd, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';

    if (periodType === 'month') {
      start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0);
      end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      label = `Tháng ${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`;
    } else if (periodType === 'year') {
      start = new Date(selectedYear, 0, 1, 0, 0, 0);
      end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      label = `Năm ${selectedYear}`;
    } else {
      start = new Date(`${customStartDate}T00:00:00`);
      end = new Date(`${customEndDate}T23:59:59`);
      label = `Từ ${new Date(customStartDate).toLocaleDateString('vi-VN')} đến ${new Date(customEndDate).toLocaleDateString('vi-VN')}`;
    }

    return {
      dateRangeStart: start,
      dateRangeEnd: end,
      periodLabel: label,
    };
  }, [periodType, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Sync default subtitle when periodLabel changes
  useEffect(() => {
    if (!reportSubtitle || reportSubtitle.startsWith('Kỳ đánh giá:')) {
      setReportSubtitle(`Kỳ đánh giá: ${periodLabel}`);
    }
  }, [periodLabel]);

  // Filter tasks based on period and unit
  const { filteredTasks, stats } = useMemo(() => {
    const startTime = dateRangeStart.getTime();
    const endTime = dateRangeEnd.getTime();

    let pool = tasks;
    if (selectedUnit !== 'all') {
      pool = pool.filter((t) => t.unit === selectedUnit);
    }

    const relevantTasks: Task[] = [];
    let completedInPeriodCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let inProgressCount = 0;
    let backlogCount = 0;

    for (const t of pool) {
      const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const completedTime = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : 0;

      const isCompletedInPeriod = t.status === 'completed' && completedTime >= startTime && completedTime <= endTime;
      const isCreatedInPeriod = createdTime >= startTime && createdTime <= endTime;
      const isBacklog = createdTime < startTime && t.status !== 'completed';

      if (isCompletedInPeriod || isCreatedInPeriod || isBacklog) {
        relevantTasks.push(t);

        if (t.status === 'completed') {
          completedInPeriodCount++;
          if (dueTime === 0 || completedTime <= dueTime) {
            onTimeCount++;
          } else {
            lateCount++;
          }
        } else if (isBacklog) {
          backlogCount++;
        } else {
          inProgressCount++;
        }
      }
    }

    const total = relevantTasks.length;
    const completionRate = total > 0 ? Math.round((completedInPeriodCount / total) * 100) : 0;
    const onTimeRate = completedInPeriodCount > 0 ? Math.round((onTimeCount / completedInPeriodCount) * 100) : 100;

    const statistics: ReportStatistics = {
      totalTasks: total,
      completedTasks: completedInPeriodCount,
      completedOnTime: onTimeCount,
      completedLate: lateCount,
      inProgressTasks: inProgressCount,
      backlogTasks: backlogCount,
      onTimeRate,
      completionRate,
    };

    return { filteredTasks: relevantTasks, stats: statistics };
  }, [tasks, dateRangeStart, dateRangeEnd, selectedUnit]);

  // AI Summary generator (Strictly grounded in real numbers)
  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const highlights = filteredTasks.slice(0, 6).map((t) => t.title);
      const res = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodLabel,
          unitName: selectedUnit === 'all' ? 'Toàn bộ đơn vị' : selectedUnit,
          statistics: stats,
          taskHighlights: highlights,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setAiSummary(data.summary);
        }
      }
    } catch {}
    setIsGeneratingAi(false);
  };

  // Helper: auto italicize any text inside parentheses (...) for WYSIWYG preview
  const renderTextWithParentheses = (text: string) => {
    if (!autoItalicParentheses || !text || !text.includes('(')) {
      return text;
    }
    const parts = text.split(/(\([^)]+\))/g);
    return parts.map((p, idx) => {
      if (p.startsWith('(') && p.endsWith(')')) {
        return (
          <span key={idx} className="italic text-indigo-700 font-normal">
            {p}
          </span>
        );
      }
      return <span key={idx}>{p}</span>;
    });
  };

  // Export customized Word .docx
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      // Persist the latest user header inputs for future exports
      saveReportHeaderToStorage({ governingBody, issuingAgency, docNumber, locationName });

      const customConfig: WordReportCustomConfig = {
        templateLayout,
        fontFamily,
        fontSizePt,
        lineSpacing,
        primaryColor,
        hasBorderBox,
        autoItalicParentheses,
        governingBody,
        issuingAgency,
        docNumber,
        locationAndDate,
        reportTitle,
        reportSubtitle,
        section1Title,
        section2Title,
        aiSummary,
        futureDirections,
        section3Title,
        signatoryTitle,
        signatoryNote,
        signatoryName,
        recipientList,
      };

      let blob: Blob | null = null;
      try {
        const res = await fetch('/api/reports/generate-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateLayout,
            reportTitle,
            periodLabel,
            unitName: selectedUnit === 'all' ? 'Toàn bộ đơn vị' : selectedUnit,
            createdByName: signatoryName,
            tasks: filteredTasks,
            statistics: stats,
            aiSummary,
            customDocConfig: customConfig,
          }),
        });

        if (res.ok) {
          blob = await res.blob();
        }
      } catch (err) {
        console.warn('Server docx export unavailable, falling back to client-side generation:', err);
      }

      // If server returned error or was unavailable, generate directly on the client with full fidelity
      if (!blob) {
        blob = await exportCustomWordReportDocx({
          tasks: filteredTasks,
          statistics: stats,
          reportTitle,
          periodLabel,
          unitName: selectedUnit === 'all' ? 'Toàn bộ đơn vị' : selectedUnit,
          createdByName: signatoryName,
          customDocConfig: customConfig,
        });
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_${periodLabel.replace(/[\/\s]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessToast(`Đã xuất và tải file Báo Cáo Word (.docx) thành công!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Không thể kết xuất báo cáo: ${err?.message || 'Vui lòng thử lại.'}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Export direct Excel
  const handleExportExcel = () => {
    downloadCustomizedReportExcel(
      filteredTasks,
      stats,
      periodLabel,
      selectedUnit === 'all' ? 'Toàn bộ đơn vị' : selectedUnit,
      reportTitle
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>Thiết Kế &amp; Tùy Chỉnh Báo Cáo Trực Tiếp</span>
                <span className="px-2 py-0.5 text-[10px] bg-indigo-400/20 text-indigo-200 border border-indigo-300/30 rounded-full font-semibold">
                  Word &amp; Excel WYSIWYG
                </span>
              </h2>
              <p className="text-xs text-indigo-100/90">
                Chỉnh sửa phông chữ, in đậm, in nghiêng, in màu, thêm khung và tự động in nghiêng phần ngoặc đơn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* In-app Toast / Alerts */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="hover:opacity-80 text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-200" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="hover:opacity-80 text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Word/Office Style Formatting Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Font Family */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400 font-bold text-[11px]">Cỡ:</span>
              <select
                value={fontSizePt}
                onChange={(e) => setFontSizePt(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value={11}>11 pt</option>
                <option value={12}>12 pt</option>
                <option value={13}>13 pt (Chuẩn NĐ 30)</option>
                <option value={14}>14 pt</option>
                <option value={16}>16 pt</option>
              </select>
            </div>

            {/* Line Spacing */}
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <AlignLeft className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value={1.0}>1.0x (Đơn)</option>
                <option value={1.15}>1.15x (Chuẩn)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </div>

            {/* Color Presets */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex items-center gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setPrimaryColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      primaryColor === c.hex ? 'border-amber-400 scale-110 shadow-xs' : 'border-white hover:scale-105'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Borders / Frame toggle */}
            <button
              onClick={() => setHasBorderBox(!hasBorderBox)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                hasBorderBox
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Đóng khung viền bảng biểu và khối chỉ số"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Thêm khung viền</span>
            </button>

            {/* Mandatory rule toggle: (có ngoặc đơn bắt buộc phải in nghiêng) */}
            <button
              onClick={() => setAutoItalicParentheses(!autoItalicParentheses)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                autoItalicParentheses
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title="Bắt buộc in nghiêng toàn bộ nội dung nằm trong ngoặc đơn (...) theo thể thức văn bản hành chính"
            >
              <Italic className="w-3.5 h-3.5 text-amber-600" />
              <span>(Ngoặc đơn: In nghiêng)</span>
              {autoItalicParentheses && <Check className="w-3 h-3 text-amber-600 ml-0.5" />}
            </button>

            {/* Fixed Standard Administrative Margins Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-900 shadow-2xs"
              title="Định dạng lề trang chuẩn quy định (Nghị định 30): Trên 2cm, dưới 2cm, trái 3cm, phải 2cm"
            >
              <span className="text-indigo-600 font-bold text-[11px]">Lề trang:</span>
              <span className="font-bold text-[11px] text-indigo-950">Trên 2cm • Dưới 2cm • Trái 3cm • Phải 2cm</span>
              <Check className="w-3 h-3 text-indigo-700 ml-0.5" />
            </div>
          </div>

          {/* Quick Excel Customizer Trigger */}
          <button
            onClick={() => setIsExcelCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer ml-auto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Tùy chỉnh mẫu Excel</span>
          </button>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Form & Content Editor (5 cols) */}
          <div className="lg:col-span-5 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
            {/* Template Selector Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Chọn Mẫu Bố Cục DOCX (Template Layout)</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  3 Mẫu Thiết Kế Sẵn
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Lựa chọn mẫu xuất Word (.docx) phù hợp nhất với mục đích báo cáo cơ quan, đoàn thể hoặc lãnh đạo:
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {/* Option 1: Executive Summary */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplateLayout('executive_summary')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    templateLayout === 'executive_summary'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${templateLayout === 'executive_summary' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">1. Báo cáo Tổng kết Tuần / Kỳ (Executive Summary)</span>
                      {templateLayout === 'executive_summary' && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Đo lường chỉ số KPI hệ thống, nhận định điều hành của AI, kết quả then chốt và phương hướng tuần tới.
                    </p>
                  </div>
                </button>

                {/* Option 2: Detailed Task Report */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplateLayout('detailed_tasks')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    templateLayout === 'detailed_tasks'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${templateLayout === 'detailed_tasks' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">2. Báo cáo Chi tiết Nhiệm vụ (Detailed Task Report)</span>
                      {templateLayout === 'detailed_tasks' && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Kiểm kê toàn diện các đầu việc, mô tả cụ thể, việc con (subtasks), đơn vị phụ trách, hạn xử lý và ngày xong.
                    </p>
                  </div>
                </button>

                {/* Option 3: Project Timeline */}
                <button
                  type="button"
                  onClick={() => handleSelectTemplateLayout('project_timeline')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    templateLayout === 'project_timeline'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${templateLayout === 'project_timeline' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">3. Báo cáo Tiến độ &amp; Lộ trình (Project Timeline)</span>
                      {templateLayout === 'project_timeline' && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Phân bổ theo dòng mốc thời gian, đánh giá nguy cơ trễ hạn, mức độ rủi ro và giải pháp tháo gỡ điểm nghẽn.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Filter Period Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Kỳ Báo Cáo &amp; Phạm Vi</span>
                </span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {periodLabel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setPeriodType('month')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    periodType === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Tháng
                </button>
                <button
                  onClick={() => setPeriodType('year')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    periodType === 'year' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Năm
                </button>
                <button
                  onClick={() => setPeriodType('custom')}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    periodType === 'custom' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tùy Chọn
                </button>
              </div>

              {periodType === 'month' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Tháng:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Năm:</label>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              {periodType === 'year' && (
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Năm báo cáo:</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              {periodType === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Từ ngày:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Đến ngày:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium text-slate-500">Đơn vị phụ trách:</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">Toàn bộ các đơn vị ({tasks.length} nhiệm vụ)</option>
                  {userProfile.units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editable Metadata Inputs */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>Thể Thức &amp; Tiêu Đề Văn Bản</span>
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Tự động lưu thông tin lần xuất gần nhất</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Cơ quan chủ quản:</label>
                  <input
                    type="text"
                    value={governingBody}
                    onChange={(e) => {
                      setGoverningBody(e.target.value);
                      saveReportHeaderToStorage({ governingBody: e.target.value });
                    }}
                    placeholder="ỦY BAN NHÂN DÂN / ĐƠN VỊ CẤP TRÊN"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Cơ quan ban hành:</label>
                  <input
                    type="text"
                    value={issuingAgency}
                    onChange={(e) => {
                      setIssuingAgency(e.target.value);
                      saveReportHeaderToStorage({ issuingAgency: e.target.value });
                    }}
                    placeholder="BAN THANH NIÊN"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Số / Ký hiệu:</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => {
                      setDocNumber(e.target.value);
                      saveReportHeaderToStorage({ docNumber: e.target.value });
                    }}
                    placeholder="Số: ..../BC-TM"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Địa danh (Tỉnh / Thành phố):</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      saveReportHeaderToStorage({ locationName: e.target.value });
                    }}
                    placeholder="Hà Nội"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dynamic Real-time Date Preview */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] text-slate-500 shrink-0">Ngày tháng xuất:</span>
                  <span className="font-semibold text-slate-800 italic truncate text-[11px]">
                    {locationAndDate}
                  </span>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold border border-indigo-200 shrink-0">
                  Thời gian thực
                </span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Tên báo cáo:</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Kỳ đánh giá (phụ đề):</label>
                <input
                  type="text"
                  value={reportSubtitle}
                  onChange={(e) => setReportSubtitle(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg italic"
                />
              </div>
            </div>

            {/* Section I: Locked System Statistics */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>I. Số Liệu Thống Kê Chuẩn Hệ Thống</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                  Đã khóa (Không sửa)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Các chỉ số được tính toán tự động từ nhiệm vụ thực tế và không thể sửa đổi thủ công nhằm đảm bảo tính khách quan:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tổng nhiệm vụ:</div>
                  <div className="font-extrabold text-slate-800 text-sm">{stats.totalTasks} việc</div>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <div className="text-[11px] text-emerald-700">Đã hoàn thành:</div>
                  <div className="font-extrabold text-emerald-800 text-sm">
                    {stats.completedTasks} ({stats.completionRate}%)
                  </div>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <div className="text-[11px] text-blue-700">Đúng hạn:</div>
                  <div className="font-extrabold text-blue-800 text-sm">
                    {stats.completedOnTime} ({stats.onTimeRate}%)
                  </div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <div className="text-[11px] text-amber-700">Trễ hạn / Đang làm:</div>
                  <div className="font-extrabold text-amber-800 text-sm">
                    {stats.completedLate} trễ • {stats.inProgressTasks} đang làm
                  </div>
                </div>
              </div>
            </div>

            {/* Section II: Narrative & AI Guidance Editor */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  II. Đánh Giá &amp; AI Tham Mưu
                </span>
                <button
                  onClick={handleGenerateAiSummary}
                  disabled={isGeneratingAi}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>{isGeneratingAi ? 'AI đang phân tích...' : 'AI Tham mưu tự động'}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">1. Nhận xét, đánh giá chung:</label>
                <textarea
                  rows={3}
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  placeholder="Nhập nhận xét hoặc bấm nút 'AI Tham mưu tự động' ở trên..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">2. Phương hướng &amp; nhiệm vụ trọng tâm:</label>
                <textarea
                  rows={2}
                  value={futureDirections}
                  onChange={(e) => setFutureDirections(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Signatory & Recipients */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-800">
                Chữ Ký &amp; Nơi Nhận
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Chức danh người ký:</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Chú thích ký (Tự động in nghiêng):</label>
                  <input
                    type="text"
                    value={signatoryNote}
                    onChange={(e) => setSignatoryNote(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg italic"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Họ và tên người ký:</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Nơi nhận:</label>
                  <textarea
                    rows={2}
                    value={recipientList}
                    onChange={(e) => setRecipientList(e.target.value)}
                    className="w-full text-xs px-2.5 py-1 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live WYSIWYG A4 Document Sheet View (7 cols) */}
          <div className="lg:col-span-7 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center">
            {/* A4 Paper Simulation Canvas with exact administrative margins */}
            <div
              style={{
                fontFamily: fontFamily,
                lineHeight: lineSpacing,
                color: primaryColor,
                paddingTop: '20mm',
                paddingBottom: '20mm',
                paddingLeft: '30mm',
                paddingRight: '20mm',
              }}
              className="bg-white w-full max-w-[760px] min-h-[900px] shadow-2xl rounded-sm text-slate-800 transition-all select-text border border-slate-300 relative"
            >
              {/* Header Table / Administrative Layout */}
              <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-200">
                <div className="col-span-5 text-center space-y-1">
                  <div className="text-[11px] font-normal uppercase tracking-tight text-slate-600">
                    {governingBody}
                  </div>
                  <div className="text-xs font-extrabold uppercase">
                    {issuingAgency}
                  </div>
                  <div className="w-16 h-0.5 bg-slate-400 mx-auto my-1"></div>
                  <div className="text-xs italic text-slate-600">
                    {renderTextWithParentheses(docNumber)}
                  </div>
                </div>

                <div className="col-span-7 text-center space-y-1">
                  <div className="text-xs font-extrabold uppercase tracking-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-xs font-bold">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="w-24 h-0.5 bg-slate-400 mx-auto my-1"></div>
                  <div className="text-xs italic text-slate-600">
                    {renderTextWithParentheses(locationAndDate)}
                  </div>
                </div>
              </div>

              {/* Document Title Banner: BÁO CÁO & Trích Yếu */}
              <div className="text-center py-5 space-y-1">
                <h1
                  style={{ fontSize: `14pt`, color: primaryColor }}
                  className="font-extrabold tracking-wide uppercase"
                >
                  BÁO CÁO
                </h1>
                <div style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  {reportTitle}
                </div>
                <div className="text-xs italic text-slate-600">
                  {renderTextWithParentheses(reportSubtitle)}
                </div>
              </div>

              {/* Mở đầu */}
              <div className="mb-4 text-justify text-xs italic text-slate-700 indent-[1.27cm] leading-relaxed">
                Căn cứ Quy chế làm việc và chương trình công tác trọng tâm {reportSubtitle || periodLabel}, {issuingAgency} tổng hợp báo cáo chi tiết kết quả thực hiện các nhiệm vụ công việc như sau:
              </div>

              {/* I. Đặc điểm tình hình */}
              <div className="mb-5 space-y-1.5 text-xs">
                <h2 style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  I. ĐẶC ĐIỂM TÌNH HÌNH
                </h2>
                <div className="space-y-1 text-justify indent-[1.27cm] leading-relaxed">
                  <p>- Bối cảnh tình hình: Trong kỳ báo cáo {periodLabel}, đơn vị tiếp nhận và xử lý tổng cộng {stats.totalTasks} nhiệm vụ thuộc các mảng công tác chuyên môn trên hệ thống.</p>
                  <p>- Thuận lợi: Được sự quan tâm, chỉ đạo thường xuyên của Lãnh đạo đơn vị; đội ngũ cán bộ có tinh thần trách nhiệm cao, chủ động bám sát kế hoạch và ứng dụng nền tảng số hóa theo dõi tiến độ thời gian thực.</p>
                  <p>- Khó khăn: Một số công việc có tính chất đột xuất, yêu cầu phối hợp liên phòng ban trong thời gian ngắn đòi hỏi sự điều phối linh hoạt.</p>
                </div>
              </div>

              {/* II. Kết quả thực hiện */}
              <div className="mb-5 space-y-2">
                <h2 style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  II. KẾT QUẢ THỰC HIỆN
                </h2>
                <div className="text-xs font-bold indent-[1.27cm]">
                  1. Số liệu thống kê chuẩn hóa từ hệ thống:
                </div>
                <div
                  className={`p-3.5 rounded-lg text-xs space-y-1.5 ${
                    hasBorderBox
                      ? 'border border-slate-300 bg-slate-50/60 shadow-2xs'
                      : 'bg-transparent'
                  }`}
                  style={{ fontSize: `13pt` }}
                >
                  <p className="indent-[1.27cm]">
                    - Tổng số nhiệm vụ trong kỳ: <strong>{stats.totalTasks} việc</strong>.
                  </p>
                  <p className="indent-[1.27cm]">
                    - Đã hoàn thành: <strong>{stats.completedTasks} việc</strong>{' '}
                    {renderTextWithParentheses(`(Tỷ lệ hoàn thành: ${stats.completionRate}%)`)}.
                  </p>
                  <p className="indent-[1.27cm]">
                    - Hoàn thành đúng hạn: <strong>{stats.completedOnTime} việc</strong>{' '}
                    {renderTextWithParentheses(`(Đúng hạn: ${stats.onTimeRate}%)`)}.
                  </p>
                  <p className="indent-[1.27cm]">
                    - Hoàn thành trễ hạn: <strong>{stats.completedLate} việc</strong>.
                  </p>
                  <p className="indent-[1.27cm]">
                    - Nhiệm vụ đang tiếp tục triển khai: <strong>{stats.inProgressTasks} việc</strong>.
                  </p>
                  <p className="indent-[1.27cm]">
                    - Nhiệm vụ tồn đọng từ kỳ trước chuyển sang: <strong>{stats.backlogTasks} việc</strong>.
                  </p>
                </div>

                {/* BẢNG CHỈ SỐ TỔNG QUAN ĐẠI DIỆN & BIỂU ĐỒ TIẾN ĐỘ THỰC TẾ */}
                <div className="border border-slate-300 rounded-lg p-3 bg-white text-xs space-y-3">
                  <div className="font-bold text-slate-800 text-[12px] flex items-center justify-between border-b pb-1.5">
                    <span className="uppercase text-indigo-900 font-extrabold">Biểu Đồ Tiến Độ &amp; Phân Bổ Chỉ Số Thực Tế</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                      Số liệu thực tế 100%
                    </span>
                  </div>

                  {/* Progress bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                        <span>Tiến độ hoàn thành tổng thể:</span>
                        <span className="font-bold text-emerald-600">{stats.completionRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, stats.completionRate))}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                        <span>Tỷ lệ hoàn thành đúng hạn:</span>
                        <span className="font-bold text-blue-600">{stats.onTimeRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, stats.onTimeRate))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overview Stats Mini Cards */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Tổng việc</div>
                      <div className="text-sm font-extrabold text-slate-800">{stats.totalTasks}</div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-medium">Đã xong</div>
                      <div className="text-sm font-extrabold text-emerald-700">{stats.completedTasks}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <div className="text-[10px] text-blue-700 font-medium">Đúng hạn</div>
                      <div className="text-sm font-extrabold text-blue-700">{stats.completedOnTime}</div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <div className="text-[10px] text-rose-700 font-medium">Trễ hạn</div>
                      <div className="text-sm font-extrabold text-rose-700">{stats.completedLate}</div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <div className="text-[10px] text-amber-700 font-medium">Đang làm</div>
                      <div className="text-sm font-extrabold text-amber-700">{stats.inProgressTasks}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                      <div className="text-[10px] text-purple-700 font-medium">Tồn đọng</div>
                      <div className="text-sm font-extrabold text-purple-700">{stats.backlogTasks}</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold indent-[1.27cm] pt-1">
                  2. Bảng kiểm kê chi tiết các nhiệm vụ thực hiện trong kỳ:
                </div>
              </div>

              {/* Section III: Table of Tasks */}
              <div className="mb-8 space-y-2">
                <h2
                  style={{ fontSize: `${fontSizePt * 1.1}pt`, color: primaryColor }}
                  className="font-bold"
                >
                  {section3Title}
                </h2>
                <div className="overflow-x-auto">
                  {templateLayout === 'detailed_tasks' ? (
                    /* Layout 2: Detailed Task Inventory Table */
                    <table
                      className={`w-full text-left border-collapse ${
                        hasBorderBox ? 'border border-slate-400' : 'border border-slate-200'
                      }`}
                      style={{ fontSize: `${Math.max(9, fontSizePt - 3)}pt` }}
                    >
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                          <th className="py-2 px-1.5 border border-slate-300 text-center w-7 font-bold">STT</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold min-w-[140px]">Tên nhiệm vụ &amp; Nội dung chi tiết</th>
                          <th className="py-2 px-1.5 border border-slate-300 font-bold">Đơn vị</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold min-w-[110px]">Việc con &amp; Checklist</th>
                          <th className="py-2 px-1.5 border border-slate-300 font-bold">Hạn xử lý</th>
                          <th className="py-2 px-1.5 border border-slate-300 font-bold">Ngày xong</th>
                          <th className="py-2 px-1.5 border border-slate-300 font-bold text-center">Ưu tiên</th>
                          <th className="py-2 px-1.5 border border-slate-300 font-bold text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-slate-400 italic">
                              Không có nhiệm vụ nào trong kỳ báo cáo này.
                            </td>
                          </tr>
                        ) : (
                          filteredTasks.map((t, idx) => {
                            const dueStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn';
                            const doneStr =
                              t.status === 'completed' && t.completedAt
                                ? new Date(t.completedAt).toLocaleDateString('vi-VN')
                                : '---';
                            const subtasksText = Array.isArray(t.subtasks) && t.subtasks.length > 0
                              ? t.subtasks.map((st, i) => `${i + 1}. ${st.title} (${st.completed ? 'Xong' : 'Chưa'})`).join('; ')
                              : 'Không có';

                            return (
                              <tr key={t.id || idx} className="hover:bg-slate-50">
                                <td className="py-1 px-1.5 border border-slate-300 text-center">{idx + 1}</td>
                                <td className="py-1 px-2 border border-slate-300">
                                  <div className="font-bold text-slate-800">{t.title}</div>
                                  {t.description && (
                                    <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">{t.description}</div>
                                  )}
                                </td>
                                <td className="py-1 px-1.5 border border-slate-300 text-slate-600">{t.unit || 'Chung'}</td>
                                <td className="py-1 px-2 border border-slate-300 text-[10px] text-slate-600 leading-tight">
                                  {subtasksText}
                                </td>
                                <td className="py-1 px-1.5 border border-slate-300 text-slate-600">{dueStr}</td>
                                <td className="py-1 px-1.5 border border-slate-300 font-medium text-emerald-700">{doneStr}</td>
                                <td className="py-1 px-1.5 border border-slate-300 text-center">
                                  {t.priority === 'high' ? 'Cao' : t.priority === 'low' ? 'Thấp' : 'Bình thường'}
                                </td>
                                <td className="py-1 px-1.5 border border-slate-300 text-center">
                                  <span className={t.status === 'completed' ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                                    {t.status === 'completed' ? 'Đã xong' : t.status === 'overdue' ? 'Trễ hạn' : 'Đang làm'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  ) : templateLayout === 'project_timeline' ? (
                    /* Layout 3: Project Timeline & Milestone Table */
                    <table
                      className={`w-full text-left border-collapse ${
                        hasBorderBox ? 'border border-slate-400' : 'border border-slate-200'
                      }`}
                      style={{ fontSize: `${Math.max(9, fontSizePt - 3)}pt` }}
                    >
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                          <th className="py-2 px-2 border border-slate-300 font-bold">Mốc tiến độ</th>
                          <th className="py-2 px-2.5 border border-slate-300 font-bold min-w-[150px]">Tên nhiệm vụ / Hạng mục</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Đơn vị chủ trì</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Mốc hạn chót</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold text-center">Tiến độ thực tế</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold text-center">Đánh giá rủi ro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                              Không có nhiệm vụ nào trong kỳ báo cáo này.
                            </td>
                          </tr>
                        ) : (
                          filteredTasks.map((t, idx) => {
                            const dueStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn';
                            const isDone = t.status === 'completed';
                            const isOver = t.status === 'overdue';
                            const riskTag = isOver ? 'Nguy cơ cao' : isDone ? 'An toàn (Đã xong)' : 'Đang kiểm soát';

                            return (
                              <tr key={t.id || idx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2 border border-slate-300 font-medium text-slate-700">{dueStr}</td>
                                <td className="py-1.5 px-2.5 border border-slate-300 font-bold text-slate-800">{t.title}</td>
                                <td className="py-1.5 px-2 border border-slate-300 text-slate-600">{t.unit || 'Chung'}</td>
                                <td className="py-1.5 px-2 border border-slate-300 text-slate-600">{dueStr}</td>
                                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                                  {isDone ? <span className="text-emerald-700">100% (Hoàn thành)</span> : `${t.progress || 0}%`}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isOver ? 'bg-rose-100 text-rose-800' : isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {riskTag}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Layout 1: Executive Summary Standard Administrative Table */
                    <table
                      className={`w-full text-left border-collapse ${
                        hasBorderBox ? 'border border-slate-400' : 'border border-slate-200'
                      }`}
                      style={{ fontSize: `${Math.max(10, fontSizePt - 2)}pt` }}
                    >
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                          <th className="py-2 px-2 border border-slate-300 text-center w-8 font-bold">STT</th>
                          <th className="py-2 px-2.5 border border-slate-300 font-bold">Nội dung công việc</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Đơn vị</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Hạn hoàn thành</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Ngày xong</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Trạng thái</th>
                          <th className="py-2 px-2 border border-slate-300 font-bold">Ưu tiên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                              Không có nhiệm vụ nào trong kỳ báo cáo này.
                            </td>
                          </tr>
                        ) : (
                          filteredTasks.map((t, idx) => {
                            const dueStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn';
                            const doneStr =
                              t.status === 'completed' && t.completedAt
                                ? new Date(t.completedAt).toLocaleDateString('vi-VN')
                                : '---';

                            return (
                              <tr key={t.id || idx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2 border border-slate-300 text-center">{idx + 1}</td>
                                <td className="py-1.5 px-2.5 border border-slate-300 font-medium">{t.title}</td>
                                <td className="py-1.5 px-2 border border-slate-300 text-slate-600">{t.unit || 'Chung'}</td>
                                <td className="py-1.5 px-2 border border-slate-300 text-slate-600">{dueStr}</td>
                                <td className="py-1.5 px-2 border border-slate-300 font-medium text-emerald-700">{doneStr}</td>
                                <td className="py-1.5 px-2 border border-slate-300">
                                  <span className={t.status === 'completed' ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                                    {t.status === 'completed' ? 'Đã xong' : t.status === 'overdue' ? 'Trễ hạn' : 'Đang làm'}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 border border-slate-300 text-slate-600">
                                  {t.priority === 'high' ? 'Cao' : t.priority === 'low' ? 'Thấp' : 'Bình thường'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* III. Đánh giá */}
              <div className="mb-5 space-y-1.5 text-xs">
                <h2 style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  III. ĐÁNH GIÁ
                </h2>
                <div className="space-y-1 text-justify indent-[1.27cm] leading-relaxed">
                  <p className="font-bold">1. Ưu điểm:</p>
                  <p>- Đa số các nhiệm vụ trọng tâm được triển khai đúng mốc tiến độ; chất lượng công việc được kiểm soát chặt chẽ thông qua việc phân chia các bước việc con và hồ sơ lưu trữ điện tử.</p>
                  <p>- {aiSummary || 'Các chỉ số hoàn thành đạt mức ổn định theo kế hoạch đề ra. Đơn vị kiểm soát chặt chẽ các nhiệm vụ sắp đến hạn.'}</p>
                  <p className="font-bold pt-1">2. Hạn chế và nguyên nhân:</p>
                  <p>- Còn một số nhiệm vụ trễ hạn ({stats.completedLate} việc) do công tác thu thập số liệu đầu vào từ các cơ sở chưa đạt tiến độ yêu cầu.</p>
                </div>
              </div>

              {/* IV. Phương hướng */}
              <div className="mb-5 space-y-1.5 text-xs">
                <h2 style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  IV. PHƯƠNG HƯỚNG, NHIỆM VỤ TIẾP THEO
                </h2>
                <div className="space-y-1 text-justify indent-[1.27cm] leading-relaxed">
                  <p>- {futureDirections}</p>
                  <p>- Rà soát toàn bộ các nhiệm vụ đang thực hiện và việc tồn đọng để xây dựng kế hoạch bứt phá, cam kết hoàn thành đúng hạn 100% trong kỳ tới.</p>
                  <p>- Tăng cường kiểm tra, đôn đốc cán bộ bám sát lộ trình và chủ động báo cáo vướng mắc phát sinh ngay khi xuất hiện dấu hiệu chậm trễ.</p>
                </div>
              </div>

              {/* V. Kiến nghị, Đề xuất */}
              <div className="mb-6 space-y-1.5 text-xs">
                <h2 style={{ fontSize: `14pt` }} className="font-bold text-slate-900">
                  V. KIẾN NGHỊ, ĐỀ XUẤT
                </h2>
                <div className="space-y-1 text-justify indent-[1.27cm] leading-relaxed">
                  <p>- Kính đề nghị Lãnh đạo cấp trên xem xét, phê duyệt kết quả thực hiện nhiệm vụ {reportSubtitle || periodLabel} của {issuingAgency}.</p>
                  <p>- Tiếp tục tạo điều kiện về trang thiết bị và cơ chế phối hợp liên đơn vị nhằm nâng cao hơn nữa hiệu quả giải quyết công vụ.</p>
                </div>
              </div>

              {/* Sign-off Block */}
              <div className="grid grid-cols-12 gap-4 pt-6">
                <div className="col-span-6 text-xs space-y-1">
                  <div className="font-bold text-slate-700">Nơi nhận:</div>
                  <div className="text-[11px] text-slate-500 whitespace-pre-line italic">
                    {recipientList}
                  </div>
                </div>

                <div className="col-span-6 text-center space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {signatoryTitle}
                  </div>
                  <div className="text-xs italic text-slate-500">
                    {renderTextWithParentheses(signatoryNote)}
                  </div>
                  <div className="h-16"></div>
                  <div className="text-xs font-bold text-slate-900">
                    {signatoryName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Báo cáo đã sẵn sàng • Nhấn nút dưới đây để tải về máy</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Báo Cáo Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingDocx ? 'Đang xuất Word...' : 'Xuất Báo Cáo Word (.docx)'}</span>
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
