import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Type,
  Palette,
  Columns,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Sparkles,
  Grid,
  AlignLeft,
  Italic,
  Bold,
} from 'lucide-react';
import { ExcelCustomConfig } from '../types/task';
import {
  downloadCustomizedExcelTaskTemplate,
  downloadStyledExcelHtmlTemplate,
} from '../utils/excelTemplate';

interface ExcelTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_COLUMNS = [
  { id: 'col_stt', label: 'STT', width: 8, isLocked: true },
  { id: 'col_title', label: 'Nội dung công việc', width: 38 },
  { id: 'col_desc', label: 'Mô tả (nếu có)', width: 42 },
  { id: 'col_sub1', label: 'Nhiệm vụ 1', width: 32 },
  { id: 'col_sub2', label: 'Nhiệm vụ 2', width: 32 },
  { id: 'col_sub3', label: 'Nhiệm vụ 3', width: 32 },
  { id: 'col_sub4', label: 'Nhiệm vụ 4 (nếu có)', width: 32 },
  { id: 'col_sub5', label: 'Nhiệm vụ 5 (nếu có)', width: 32 },
  { id: 'col_start', label: 'Thời gian bắt đầu (Mặc định khi tạo - Khóa)', width: 28, isLocked: true },
  { id: 'col_due_date', label: 'Ngày hoàn thành (ngày, tháng, năm)', width: 24 },
  { id: 'col_due_time', label: 'Thời gian hoàn thành (giờ, phút)', width: 20 },
  { id: 'col_link', label: 'Đường liên kết (tiêu đề link, đường link)', width: 36 },
  { id: 'col_gcal', label: 'Thêm vào Google Lịch (có, không)', width: 22 },
];

const DEFAULT_ROWS: Array<Record<string, any>> = [
  {
    col_stt: 1,
    col_title: 'Tổ chức Hội nghị sơ kết công tác chuyên môn quý IV',
    col_desc: 'Đánh giá chỉ tiêu nhiệm vụ và biểu dương tập thể xuất sắc',
    col_sub1: 'Tôi chuẩn bị dự thảo báo cáo sơ kết và phụ lục số liệu',
    col_sub2: 'Tôi lập danh sách khách mời và chương trình chi tiết',
    col_sub3: 'Tôi kiểm tra cơ sở vật chất, âm thanh hội trường',
    col_sub4: 'Tôi điều phối chương trình và đón tiếp đại biểu',
    col_sub5: 'Tôi hoàn thiện biên bản hội nghị và thông báo kết luận',
    col_start: 'Tự động tính từ khi tạo nhiệm vụ',
    col_due_date: '05/11/2026',
    col_due_time: '17:30',
    col_link: 'Kế hoạch sơ kết: https://vbpl.vn/kehoach',
    col_gcal: 'có',
  },
  {
    col_stt: 2,
    col_title: 'Soạn thảo đề cương chuyển đổi số và tự động hóa',
    col_desc: 'Xây dựng phương án ứng dụng công nghệ thông tin nhắc việc',
    col_sub1: 'Tôi khảo sát nhu cầu nghiệp vụ của các phòng ban',
    col_sub2: 'Tôi lập khung giải pháp kỹ thuật và dự toán kinh phí',
    col_sub3: 'Tôi tổng hợp ý kiến góp ý của chuyên gia',
    col_sub4: 'Tôi hoàn thiện tờ trình phê duyệt',
    col_sub5: '',
    col_start: 'Tự động tính từ khi tạo nhiệm vụ',
    col_due_date: '10/11/2026',
    col_due_time: '17:00',
    col_link: 'Tài liệu hướng dẫn: https://chuyendoiso.gov.vn',
    col_gcal: 'có',
  },
  {
    col_stt: 3,
    col_title: 'Kiểm tra tiến độ giải quyết hồ sơ tồn đọng',
    col_desc: 'Thống kê danh mục hồ sơ, đôn đốc hoàn thành dứt điểm',
    col_sub1: 'Tôi trích xuất danh sách hồ sơ gần hạn hoặc quá hạn',
    col_sub2: 'Tôi phát hành phiếu nhắc nhở nội bộ',
    col_sub3: 'Tôi báo cáo kết quả đôn đốc lên lãnh đạo',
    col_sub4: '',
    col_sub5: '',
    col_start: 'Tự động tính từ khi tạo nhiệm vụ',
    col_due_date: '04/11/2026',
    col_due_time: '16:30',
    col_link: '',
    col_gcal: 'không',
  },
];

const COLOR_PRESETS = [
  { name: 'Xanh Hải Quân', bg: '#1E40AF', text: '#FFFFFF' },
  { name: 'Xanh Rêu Công Vụ', bg: '#047857', text: '#FFFFFF' },
  { name: 'Xám Than Lịch Lãm', bg: '#334155', text: '#FFFFFF' },
  { name: 'Xanh Ngọc Hiện Đại', bg: '#0E7490', text: '#FFFFFF' },
  { name: 'Đỏ Rượu Sang Trọng', bg: '#991B1B', text: '#FFFFFF' },
];

export const ExcelTemplateModal: React.FC<ExcelTemplateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sheetName, setSheetName] = useState('Mau_Nhiem_Vu');
  const [tableTitle, setTableTitle] = useState('DANH SÁCH NHẬP NHIỆM VỤ MẪU (EXCEL)');
  const [fontFamily, setFontFamily] = useState<'Times New Roman' | 'Arial' | 'Calibri' | 'Tahoma'>('Times New Roman');
  const [fontSizePt, setFontSizePt] = useState<number>(11);
  const [headerFillColor, setHeaderFillColor] = useState<string>('#1E40AF');
  const [headerTextColor, setHeaderTextColor] = useState<string>('#FFFFFF');
  const [hasBorders, setHasBorders] = useState<boolean>(true);
  const [wrapText, setWrapText] = useState<boolean>(true);
  const [autoItalicParentheses, setAutoItalicParentheses] = useState<boolean>(true);

  // Column definitions
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  // Row data
  const [rows, setRows] = useState(DEFAULT_ROWS);

  // Active cell editor
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');

  if (!isOpen) return null;

  // Helper to format text with italics for words in parentheses
  const renderTextWithParentheses = (text: string) => {
    if (!autoItalicParentheses || !text || !text.includes('(')) {
      return <span>{text}</span>;
    }
    const parts = text.split(/(\([^)]+\))/g);
    return (
      <span>
        {parts.map((p, idx) => {
          if (p.startsWith('(') && p.endsWith(')')) {
            return (
              <span key={idx} className="italic text-amber-200 font-normal">
                {p}
              </span>
            );
          }
          return <span key={idx}>{p}</span>;
        })}
      </span>
    );
  };

  const handleUpdateRowCell = (rowIndex: number, colId: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [colId]: value };
    setRows(updated);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = { col_stt: rows.length + 1 };
    columns.forEach((c) => {
      if (c.id !== 'col_stt') newRow[c.id] = '';
    });
    setRows([...rows, newRow as any]);
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const updated = rows.filter((_, idx) => idx !== index).map((r, i) => ({ ...r, col_stt: i + 1 }));
    setRows(updated);
  };

  const handleAddColumn = () => {
    const newId = 'col_custom_' + Date.now();
    const newCol = {
      id: newId,
      label: newColTitle.trim() || `Cột bổ sung ${columns.length + 1} (nếu có)`,
      width: 25,
    };
    setColumns([...columns, newCol]);
    setNewColTitle('');
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 2) return;
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const handleResetDefaults = () => {
    setColumns(DEFAULT_COLUMNS);
    setRows(DEFAULT_ROWS);
    setFontFamily('Times New Roman');
    setFontSizePt(11);
    setHeaderFillColor('#1E40AF');
    setHeaderTextColor('#FFFFFF');
    setHasBorders(true);
    setWrapText(true);
    setAutoItalicParentheses(true);
  };

  const getConfig = (): ExcelCustomConfig => ({
    sheetName,
    tableTitle,
    fontFamily,
    fontSizePt,
    headerFillColor,
    headerTextColor,
    hasBorders,
    wrapText,
    autoItalicParentheses,
    columns,
    rows,
  });

  const handleDownloadExcel = () => {
    downloadCustomizedExcelTaskTemplate(getConfig());
  };

  const handleDownloadStyledExcel = () => {
    downloadStyledExcelHtmlTemplate(getConfig());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>Tùy Chỉnh &amp; Tải Về Mẫu Excel Trực Tiếp</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 rounded-full font-semibold">
                  WYSIWYG Excel
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90">
                Chỉnh sửa phông chữ, in đậm, in nghiêng, in màu, thêm khung và tự động in nghiêng phần ngoặc đơn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar - Word/Excel Style Formatting Bar */}
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
                <option value="Times New Roman">Times New Roman (Chuẩn CV)</option>
                <option value="Arial">Arial (Không chân)</option>
                <option value="Calibri">Calibri (Văn phòng MS)</option>
                <option value="Tahoma">Tahoma (Hiện đại)</option>
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
                <option value={10}>10 pt</option>
                <option value={11}>11 pt (Chuẩn)</option>
                <option value={12}>12 pt</option>
                <option value={14}>14 pt</option>
              </select>
            </div>

            {/* Header Theme Color Presets */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Màu tiêu đề:</span>
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.bg}
                    onClick={() => {
                      setHeaderFillColor(preset.bg);
                      setHeaderTextColor(preset.text);
                    }}
                    style={{ backgroundColor: preset.bg }}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      headerFillColor === preset.bg ? 'border-amber-400 scale-110 shadow-xs' : 'border-white hover:scale-105'
                    }`}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Borders & Wrap text toggles */}
            <button
              onClick={() => setHasBorders(!hasBorders)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                hasBorders
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Thêm viền khung cho toàn bộ ô tính"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Đóng khung ô</span>
            </button>

            {/* Mandatory rule: (có ngoặc đơn bắt buộc phải in nghiêng) */}
            <button
              onClick={() => setAutoItalicParentheses(!autoItalicParentheses)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                autoItalicParentheses
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title="Tự động in nghiêng mọi nội dung nằm trong ngoặc đơn (...) theo chuẩn văn bản hành chính"
            >
              <Italic className="w-3.5 h-3.5 text-amber-600" />
              <span>(Ngoặc đơn: In nghiêng)</span>
              {autoItalicParentheses && <Check className="w-3 h-3 text-amber-600 ml-0.5" />}
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-auto"
            title="Khôi phục mẫu chuẩn ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>
        </div>

        {/* Main Content Area: Spreadsheet Visual Editor */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/70">
          <div className="max-w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            {/* Sheet Banner Info */}
            <div className="px-5 py-3 bg-slate-800 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">Tên Sheet:</span>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-700 text-white font-mono text-xs border border-slate-600 focus:outline-hidden focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>Số cột: <strong className="text-white">{columns.length}</strong></span>
                <span>•</span>
                <span>Số dòng mẫu: <strong className="text-white">{rows.length}</strong></span>
              </div>
            </div>

            {/* Interactive Grid Table */}
            <div className="overflow-x-auto max-h-[50vh]">
              <table
                style={{ fontFamily: fontFamily }}
                className={`w-full text-left border-collapse ${hasBorders ? 'border border-slate-300' : ''}`}
              >
                {/* Header Row */}
                <thead>
                  <tr
                    style={{
                      backgroundColor: headerFillColor,
                      color: headerTextColor,
                      fontSize: `${fontSizePt}pt`,
                    }}
                  >
                    <th className="py-2.5 px-3 border border-slate-300/40 text-center align-middle font-bold text-xs uppercase tracking-wider w-10">
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className="py-2.5 px-3 border border-slate-300/40 font-bold text-center align-middle group relative"
                        style={{ minWidth: `${(col.width || 20) * 8}px` }}
                      >
                        <div className="flex items-center justify-center gap-1.5 relative">
                          <span className="font-bold text-center">
                            {renderTextWithParentheses(col.label)}
                          </span>
                          {!col.isLocked && (
                            <button
                              onClick={() => handleDeleteColumn(col.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/70 hover:text-rose-300 transition-opacity cursor-pointer absolute right-0"
                              title="Xóa cột này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 border border-slate-300/40 text-center align-middle text-xs w-16">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 text-slate-700 bg-white" style={{ fontSize: `${fontSizePt}pt` }}>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-emerald-50/40 transition-colors group">
                      <td className="py-2 px-3 border border-slate-200 text-center align-middle font-mono text-xs text-slate-400 bg-slate-50">
                        {rowIdx + 1}
                      </td>
                      {columns.map((col) => {
                        const isCenterCol = col.id === 'col_stt' || col.id === 'col_start' || col.id === 'col_end' || col.id === 'col_gcal' || col.label === 'STT' || col.label.includes('Thời gian') || col.label.includes('Google Lịch');
                        return (
                          <td key={col.id} className="py-2 px-3 border border-slate-200 align-middle">
                            <input
                              type="text"
                              value={row[col.id] ?? ''}
                              onChange={(e) => handleUpdateRowCell(rowIdx, col.id, e.target.value)}
                              className={`w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-emerald-50/20 focus:outline-hidden px-1 py-0.5 rounded text-xs text-slate-800 transition-colors ${
                                isCenterCol ? 'text-center' : 'text-left'
                              }`}
                              placeholder="Nhập..."
                            />
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 border border-slate-200 text-center align-middle">
                        <button
                          onClick={() => handleDeleteRow(rowIdx)}
                          disabled={rows.length <= 1}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-20"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Row / Column Addition Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Thêm dòng mẫu</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tên cột mới (nếu có)..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs w-48 focus:outline-hidden focus:border-emerald-500 bg-white"
                />
                <button
                  onClick={handleAddColumn}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm cột</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Mẫu Excel chuẩn hóa toàn hệ thống: Căn giữa ô & giữa hàng, tự động xuống dòng và khóa kích cỡ.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleDownloadStyledExcel}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Tải về file Excel hiển thị chính xác màu sắc, căn giữa ô và giữa hàng, khóa kích cỡ ô và cho phép xuống hàng"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Tải về Mẫu Excel Chuẩn Màu & Khóa Kích Cỡ (.xls)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
