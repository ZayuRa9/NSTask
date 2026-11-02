import * as XLSX from 'xlsx';
import { Task, Subtask, TaskLink } from '../types/task';

export const EXCEL_TEMPLATE_COLUMNS = [
  'STT',
  'Nội dung công việc',
  'Mô tả (nếu có)',
  'Nhiệm vụ 1',
  'Nhiệm vụ 2',
  'Nhiệm vụ 3',
  'Nhiệm vụ 4 (nếu có)',
  'Nhiệm vụ 5 (nếu có)',
  'Thời gian bắt đầu (Mặc định khi tạo - Khóa)',
  'Ngày hoàn thành (ngày, tháng, năm)',
  'Thời gian hoàn thành (giờ, phút)',
  'Đường liên kết (tiêu đề link, đường link)',
  'Thêm vào Google Lịch (có, không)',
];

export const SAMPLE_EXCEL_DATA = [
  {
    'STT': 1,
    'Nội dung công việc': 'Tổ chức Hội nghị sơ kết công tác chuyên môn quý IV',
    'Mô tả (nếu có)': 'Đánh giá chỉ tiêu nhiệm vụ, biểu dương tập thể xuất sắc và định hướng kế hoạch quý tiếp theo',
    'Nhiệm vụ 1': 'Tôi chuẩn bị dự thảo báo cáo sơ kết và phụ lục số liệu',
    'Nhiệm vụ 2': 'Tôi lập danh sách khách mời, giấy mời và chương trình chi tiết',
    'Nhiệm vụ 3': 'Tôi kiểm tra cơ sở vật chất, âm thanh, ánh sáng hội trường',
    'Nhiệm vụ 4 (nếu có)': 'Tôi điều phối chương trình và đón tiếp đại biểu',
    'Nhiệm vụ 5 (nếu có)': 'Tôi hoàn thiện biên bản hội nghị và thông báo kết luận',
    'Thời gian bắt đầu (Mặc định khi tạo - Khóa)': 'Tự động tính từ khi tạo nhiệm vụ',
    'Ngày hoàn thành (ngày, tháng, năm)': '05/11/2026',
    'Thời gian hoàn thành (giờ, phút)': '17:30',
    'Đường liên kết (tiêu đề link, đường link)': 'Kế hoạch sơ kết: https://vbpl.vn/kehoach-soket',
    'Thêm vào Google Lịch (có, không)': 'có',
  },
  {
    'STT': 2,
    'Nội dung công việc': 'Soạn thảo đề cương chuyển đổi số và tự động hóa quy trình',
    'Mô tả (nếu có)': 'Xây dựng phương án ứng dụng công nghệ thông tin trong quản lý hồ sơ, nhắc việc',
    'Nhiệm vụ 1': 'Tôi khảo sát nhu cầu nghiệp vụ của các phòng ban',
    'Nhiệm vụ 2': 'Tôi lập khung giải pháp kỹ thuật và dự toán kinh phí',
    'Nhiệm vụ 3': 'Tôi tổng hợp ý kiến góp ý của chuyên gia và lãnh đạo',
    'Nhiệm vụ 4 (nếu có)': 'Tôi hoàn thiện tờ trình trình lãnh đạo phê duyệt',
    'Nhiệm vụ 5 (nếu có)': '',
    'Thời gian bắt đầu (Mặc định khi tạo - Khóa)': 'Tự động tính từ khi tạo nhiệm vụ',
    'Ngày hoàn thành (ngày, tháng, năm)': '10/11/2026',
    'Thời gian hoàn thành (giờ, phút)': '17:00',
    'Đường liên kết (tiêu đề link, đường link)': 'Tài liệu hướng dẫn: https://chuyendoiso.gov.vn',
    'Thêm vào Google Lịch (có, không)': 'có',
  },
  {
    'STT': 3,
    'Nội dung công việc': 'Kiểm tra, rà soát tiến độ giải quyết hồ sơ công việc tồn đọng',
    'Mô tả (nếu có)': 'Thống kê danh mục văn bản, đôn đốc các bộ phận hoàn thành dứt điểm',
    'Nhiệm vụ 1': 'Tôi trích xuất danh sách hồ sơ gần đến hạn hoặc quá hạn',
    'Nhiệm vụ 2': 'Tôi phát hành phiếu nhắc nhở nội bộ gửi cán bộ phụ trách',
    'Nhiệm vụ 3': 'Tôi báo cáo kết quả đôn đốc lên lãnh đạo trực tiếp',
    'Nhiệm vụ 4 (nếu có)': '',
    'Nhiệm vụ 5 (nếu có)': '',
    'Thời gian bắt đầu (Mặc định khi tạo - Khóa)': 'Tự động tính từ khi tạo nhiệm vụ',
    'Ngày hoàn thành (ngày, tháng, năm)': '04/11/2026',
    'Thời gian hoàn thành (giờ, phút)': '16:30',
    'Đường liên kết (tiêu đề link, đường link)': '',
    'Thêm vào Google Lịch (có, không)': 'không',
  },
];

import { ExcelCustomConfig, ReportStatistics } from '../types/task';

/**
 * Helper to download a file in browser
 */
function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DEFAULT_EXCEL_TEMPLATE_CONFIG: ExcelCustomConfig = {
  sheetName: 'Mau_Nhap_Nhiem_Vu',
  tableTitle: 'DANH SÁCH NHẬP NHIỆM VỤ MẪU (NSTASK)',
  fontFamily: 'Times New Roman',
  fontSizePt: 11,
  headerFillColor: '#1E40AF',
  headerTextColor: '#FFFFFF',
  hasBorders: true,
  wrapText: true,
  autoItalicParentheses: true,
  columns: [
    { id: 'col_stt', label: 'STT', width: 8, isLocked: true },
    { id: 'col_title', label: 'Nội dung công việc', width: 40 },
    { id: 'col_desc', label: 'Mô tả (nếu có)', width: 40 },
    { id: 'col_sub1', label: 'Nhiệm vụ 1', width: 30 },
    { id: 'col_sub2', label: 'Nhiệm vụ 2', width: 30 },
    { id: 'col_sub3', label: 'Nhiệm vụ 3', width: 30 },
    { id: 'col_sub4', label: 'Nhiệm vụ 4 (nếu có)', width: 30 },
    { id: 'col_sub5', label: 'Nhiệm vụ 5 (nếu có)', width: 30 },
    { id: 'col_start', label: 'Thời gian bắt đầu (Mặc định khi tạo - Khóa)', width: 28, isLocked: true },
    { id: 'col_due_date', label: 'Ngày hoàn thành (ngày, tháng, năm)', width: 24 },
    { id: 'col_due_time', label: 'Thời gian hoàn thành (giờ, phút)', width: 20 },
    { id: 'col_link', label: 'Đường liên kết (tiêu đề link, đường link)', width: 38 },
    { id: 'col_gcal', label: 'Thêm vào Google Lịch (có, không)', width: 22 },
  ],
  rows: SAMPLE_EXCEL_DATA.map((r, i) => ({
    col_stt: i + 1,
    col_title: (r as any)['Nội dung công việc'] || '',
    col_desc: (r as any)['Mô tả (nếu có)'] || '',
    col_sub1: (r as any)['Nhiệm vụ 1'] || '',
    col_sub2: (r as any)['Nhiệm vụ 2'] || '',
    col_sub3: (r as any)['Nhiệm vụ 3'] || '',
    col_sub4: (r as any)['Nhiệm vụ 4 (nếu có)'] || '',
    col_sub5: (r as any)['Nhiệm vụ 5 (nếu có)'] || '',
    col_start: (r as any)['Thời gian bắt đầu (Mặc định khi tạo - Khóa)'] || 'Tự động tính từ khi tạo nhiệm vụ',
    col_due_date: (r as any)['Ngày hoàn thành (ngày, tháng, năm)'] || '',
    col_due_time: (r as any)['Thời gian hoàn thành (giờ, phút)'] || '',
    col_link: (r as any)['Đường liên kết (tiêu đề link, đường link)'] || '',
    col_gcal: (r as any)['Thêm vào Google Lịch (có, không)'] || '',
  })),
};

const COLUMN_SPECS: Record<string, { widthPx: number; widthPt: number }> = {
  col_stt: { widthPx: 60, widthPt: 45 },
  'STT': { widthPx: 60, widthPt: 45 },
  col_title: { widthPx: 340, widthPt: 255 },
  'Nội dung công việc': { widthPx: 340, widthPt: 255 },
  col_desc: { widthPx: 320, widthPt: 240 },
  'Mô tả (nếu có)': { widthPx: 320, widthPt: 240 },
  col_sub1: { widthPx: 260, widthPt: 195 },
  'Nhiệm vụ 1': { widthPx: 260, widthPt: 195 },
  col_sub2: { widthPx: 260, widthPt: 195 },
  'Nhiệm vụ 2': { widthPx: 260, widthPt: 195 },
  col_sub3: { widthPx: 260, widthPt: 195 },
  'Nhiệm vụ 3': { widthPx: 260, widthPt: 195 },
  col_sub4: { widthPx: 260, widthPt: 195 },
  'Nhiệm vụ 4 (nếu có)': { widthPx: 260, widthPt: 195 },
  col_sub5: { widthPx: 260, widthPt: 195 },
  'Nhiệm vụ 5 (nếu có)': { widthPx: 260, widthPt: 195 },
  col_start: { widthPx: 220, widthPt: 165 },
  'Thời gian bắt đầu (Mặc định khi tạo - Khóa)': { widthPx: 220, widthPt: 165 },
  'Thời gian bắt đầu': { widthPx: 220, widthPt: 165 },
  col_due_date: { widthPx: 180, widthPt: 135 },
  'Ngày hoàn thành (ngày, tháng, năm)': { widthPx: 180, widthPt: 135 },
  'Ngày hoàn thành': { widthPx: 180, widthPt: 135 },
  col_due_time: { widthPx: 160, widthPt: 120 },
  'Thời gian hoàn thành (giờ, phút)': { widthPx: 160, widthPt: 120 },
  'Thời gian hoàn thành': { widthPx: 160, widthPt: 120 },
  col_link: { widthPx: 300, widthPt: 225 },
  'Đường liên kết (tiêu đề link, đường link)': { widthPx: 300, widthPt: 225 },
  col_gcal: { widthPx: 150, widthPt: 112 },
  'Thêm vào Google Lịch (có, không)': { widthPx: 150, widthPt: 112 },
};

/**
 * Downloads fully styled, standardized Excel template with colors, borders,
 * vertically and horizontally centered headers, locked cell sizes, and text wrapping.
 */
export function downloadStyledExcelHtmlTemplate(config: ExcelCustomConfig): void {
  const columnHeaders = config.columns.map((c) => c.label);
  const rows = config.rows && config.rows.length > 0
    ? config.rows
    : SAMPLE_EXCEL_DATA.map((r, i) => ({
        col_stt: i + 1,
        col_title: (r as any)['Nội dung công việc'] || '',
        col_desc: (r as any)['Mô tả (nếu có)'] || '',
        col_sub1: (r as any)['Nhiệm vụ 1'] || '',
        col_sub2: (r as any)['Nhiệm vụ 2'] || '',
        col_sub3: (r as any)['Nhiệm vụ 3'] || '',
        col_sub4: (r as any)['Nhiệm vụ 4 (nếu có)'] || '',
        col_sub5: (r as any)['Nhiệm vụ 5 (nếu có)'] || '',
        col_start: (r as any)['Thời gian bắt đầu (Mặc định khi tạo - Khóa)'] || 'Tự động tính từ khi tạo nhiệm vụ',
        col_due_date: (r as any)['Ngày hoàn thành (ngày, tháng, năm)'] || '',
        col_due_time: (r as any)['Thời gian hoàn thành (giờ, phút)'] || '',
        col_link: (r as any)['Đường liên kết (tiêu đề link, đường link)'] || '',
        col_gcal: (r as any)['Thêm vào Google Lịch (có, không)'] || '',
      }));

  const formatParentheses = (text: string) => {
    if (!config.autoItalicParentheses || !text || !text.includes('(')) return text;
    return text.replace(/(\([^)]+\))/g, '<i style="font-style: italic; font-weight: normal; opacity: 0.95;">$1</i>');
  };

  const fontFamily = config.fontFamily || 'Times New Roman';
  const fontSize = config.fontSizePt || 11;
  const headerBg = config.headerFillColor || '#1E40AF';
  const headerColor = config.headerTextColor || '#FFFFFF';
  const borderStyle = config.hasBorders ? '1px solid #475569' : 'none';
  const cellBorder = config.hasBorders ? '1px solid #CBD5E1' : 'none';

  // Calculate total locked width
  const totalWidthPx = config.columns.reduce((sum, col) => {
    const spec = COLUMN_SPECS[col.id] || COLUMN_SPECS[col.label] || { widthPx: 220, widthPt: 165 };
    return sum + spec.widthPx;
  }, 0);

  const colGroupHtml = config.columns
    .map((col) => {
      const spec = COLUMN_SPECS[col.id] || COLUMN_SPECS[col.label] || { widthPx: 220, widthPt: 165 };
      return `<col width="${spec.widthPx}" style="mso-width-source: userset; mso-width-alt: ${spec.widthPt * 36}; width: ${spec.widthPt}pt;" />`;
    })
    .join('\n');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${config.sheetName || 'Mau_Nhiem_Vu'}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:FitToPage/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body, table, td, th {
      font-family: '${fontFamily}', serif, Arial;
      font-size: ${fontSize}pt;
    }
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: ${totalWidthPx}px;
    }
    .table-title {
      font-size: ${fontSize + 4}pt;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      padding: 12px 6px;
      color: #0F172A;
      background-color: #F8FAFC;
      border-bottom: 2px solid ${headerBg};
      height: 40pt;
      mso-height-source: userset;
    }
    .table-subtitle {
      font-size: ${fontSize - 1}pt;
      font-style: italic;
      text-align: center;
      vertical-align: middle;
      color: #64748B;
      padding: 6px;
      height: 24pt;
      mso-height-source: userset;
    }
    th {
      background-color: ${headerBg};
      color: ${headerColor};
      font-weight: bold;
      border: ${borderStyle};
      padding: 10px 8px;
      text-align: center;
      vertical-align: middle;
      height: 38pt;
      mso-height-source: userset;
      white-space: normal;
      word-break: break-word;
      word-wrap: break-word;
      mso-style-parent: style0;
    }
    td {
      border: ${cellBorder};
      padding: 8px 10px;
      vertical-align: middle;
      color: #1E293B;
      white-space: normal;
      word-break: break-word;
      word-wrap: break-word;
      mso-style-parent: style0;
      mso-number-format: "\\@";
    }
    .row-even {
      background-color: #FFFFFF;
    }
    .row-odd {
      background-color: #F8FAFC;
    }
    .col-center {
      text-align: center;
      vertical-align: middle;
    }
    .col-stt {
      text-align: center;
      vertical-align: middle;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <table>
    <colgroup>
      ${colGroupHtml}
    </colgroup>
    <tr>
      <td colspan="${config.columns.length}" class="table-title">
        ${config.tableTitle || 'DANH SÁCH NHẬP NHIỆM VỤ MẪU (NSTASK)'}
      </td>
    </tr>
    <tr>
      <td colspan="${config.columns.length}" class="table-subtitle">
        (Mẫu chuẩn dùng để nhập tự động vào hệ thống - Nhận diện cột, nhiệm vụ con và thời hạn)
      </td>
    </tr>
    <tr height="10" style="height: 8pt; mso-height-source: userset;">
      <td colspan="${config.columns.length}" style="height: 8pt; border: none; background: transparent;"></td>
    </tr>
    <thead>
      <tr height="48" style="height: 36pt; mso-height-source: userset;">
        ${config.columns
          .map(
            (col) =>
              `<th style="background-color: ${headerBg}; color: ${headerColor}; font-weight: bold; border: ${borderStyle}; padding: 10px 8px; text-align: center; vertical-align: middle; white-space: normal; word-break: break-word; word-wrap: break-word; height: 38pt; mso-height-source: userset; font-family: '${fontFamily}', serif, Arial; font-size: ${fontSize}pt;">${formatParentheses(
                col.label
              )}</th>`
          )
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map((row: any, rIdx: number) => {
          const bgClass = rIdx % 2 === 0 ? 'row-even' : 'row-odd';
          const rowBgColor = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          const cells = config.columns.map((col) => {
            const val = row[col.id] ?? row[col.label] ?? '';
            const isStt = col.id === 'col_stt' || col.label === 'STT';
            const isDate = col.id === 'col_start' || col.id === 'col_end' || col.label.includes('Thời gian');
            const isGcal = col.id === 'col_gcal' || col.label.includes('Google Lịch');
            const isCenter = isStt || isDate || isGcal;
            const alignClass = isStt ? 'col-stt' : isCenter ? 'col-center' : '';
            return `<td class="${alignClass}" style="border: ${cellBorder}; background-color: ${rowBgColor}; padding: 8px 10px; vertical-align: middle; text-align: ${
              isCenter ? 'center' : 'left'
            }; font-weight: ${
              isStt ? 'bold' : 'normal'
            }; white-space: normal; word-break: break-word; word-wrap: break-word; mso-style-parent: style0; mso-number-format: '\\@'; font-family: '${fontFamily}', serif, Arial; font-size: ${fontSize}pt; color: #1E293B;">${val}</td>`;
          });
          return `<tr height="65" style="height: 50pt; mso-height-source: userset;" class="${bgClass}">${cells.join('')}</tr>`;
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const fileName = `${(config.sheetName || 'Mau_Nhap_Nhiem_Vu_NSTask').replace(/\s+/g, '_')}.xls`;
  triggerBrowserDownload(blob, fileName);
}

/**
 * Downloads the ONE unified standardized Excel template across the entire application.
 * Matches the colored, formatted sample with middle-aligned headers, locked cell sizes, and wrapped text.
 */
export function downloadExcelTaskTemplate(): void {
  downloadStyledExcelHtmlTemplate(DEFAULT_EXCEL_TEMPLATE_CONFIG);
}

/**
 * Downloads customized Excel template, maintaining the standardized styling, colors, and locked layout.
 */
export function downloadCustomizedExcelTaskTemplate(config: ExcelCustomConfig): void {
  downloadStyledExcelHtmlTemplate(config);
}

/**
 * Exports complete period report to Excel (.xlsx) with statistics and task inventory
 */
export function downloadCustomizedReportExcel(
  tasks: Task[],
  statistics: ReportStatistics,
  periodLabel: string,
  unitName: string,
  reportTitle: string = 'BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC'
): void {
  const summaryRows = [
    { 'Chỉ số thống kê': 'Kỳ báo cáo', 'Giá trị': periodLabel, 'Ghi chú': '' },
    { 'Chỉ số thống kê': 'Đơn vị lập báo cáo', 'Giá trị': unitName, 'Ghi chú': '' },
    { 'Chỉ số thống kê': 'Tổng số nhiệm vụ', 'Giá trị': statistics.totalTasks, 'Ghi chú': 'Dữ liệu chuẩn hệ thống (Khóa)' },
    { 'Chỉ số thống kê': 'Nhiệm vụ đã hoàn thành', 'Giá trị': statistics.completedTasks, 'Ghi chú': `Tỷ lệ hoàn thành: ${statistics.completionRate}%` },
    { 'Chỉ số thống kê': 'Hoàn thành đúng hạn', 'Giá trị': statistics.completedOnTime, 'Ghi chú': `Tỷ lệ đúng hạn: ${statistics.onTimeRate}%` },
    { 'Chỉ số thống kê': 'Hoàn thành trễ hạn', 'Giá trị': statistics.completedLate, 'Ghi chú': '' },
    { 'Chỉ số thống kê': 'Nhiệm vụ đang thực hiện', 'Giá trị': statistics.inProgressTasks, 'Ghi chú': '' },
    { 'Chỉ số thống kê': 'Tồn đọng từ kỳ trước', 'Giá trị': statistics.backlogTasks, 'Ghi chú': '' },
  ];

  const taskRows = tasks.map((t, idx) => ({
    'STT': idx + 1,
    'Nội dung công việc': t.title,
    'Mô tả (nếu có)': t.description || '',
    'Đơn vị': t.unit || 'Chung',
    'Hạn hoàn thành': t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn',
    'Ngày hoàn thành': t.status === 'completed' && t.completedAt ? new Date(t.completedAt).toLocaleDateString('vi-VN') : '---',
    'Trạng thái': t.status === 'completed' ? 'Đã hoàn thành' : t.status === 'overdue' ? 'Trễ hạn' : 'Đang thực hiện',
    'Mức độ ưu tiên': t.priority === 'high' ? 'Khẩn cấp' : t.priority === 'low' ? 'Thấp' : 'Bình thường',
    'Tiến độ': `${t.progress || 0}%`,
  }));

  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng hợp chỉ số
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Chi_So_Tong_Hop');

  // Sheet 2: Danh sách nhiệm vụ
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);
  wsTasks['!cols'] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 35 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Danh_Sach_Nhiem_Vu');

  const fileName = `Bao_Cao_${periodLabel.replace(/[\/\s]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export interface ParsedTaskItem {
  id: string;
  title: string;
  description: string;
  subtasks: Subtask[];
  createdAt: string;
  dueDate: string;
  links: TaskLink[];
  addToGoogleCalendar: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Parses an uploaded Excel (.xlsx, .xls, .csv) file and extracts tasks
 */
export async function parseExcelTasks(file: File): Promise<ParsedTaskItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel không có sheet dữ liệu nào.');
  }

  const sheet = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let headerRowIdx = rawRows.findIndex((r) =>
    Array.isArray(r) &&
    r.some((c) => {
      const s = String(c || '').toLowerCase().trim();
      return (
        s === 'stt' ||
        s.includes('nội dung công việc') ||
        s.includes('noi dung cong viec') ||
        s.includes('tên nhiệm vụ') ||
        s.includes('công việc')
      );
    })
  );

  let rawData: any[] = [];
  if (headerRowIdx !== -1) {
    const headers = rawRows[headerRowIdx].map((h: any) => String(h || '').trim());
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const rowArr = rawRows[r];
      if (!rowArr || rowArr.length === 0) continue;
      const rowObj: Record<string, any> = {};
      headers.forEach((h: string, colIdx: number) => {
        if (h && rowArr[colIdx] !== undefined) {
          rowObj[h] = rowArr[colIdx];
        }
      });
      if (Object.keys(rowObj).length > 0) {
        rawData.push(rowObj);
      }
    }
  } else {
    rawData = XLSX.utils.sheet_to_json(sheet);
  }

  if (!rawData || rawData.length === 0) {
    throw new Error('File Excel không có dòng dữ liệu công việc nào.');
  }

  const tasks: ParsedTaskItem[] = [];

  rawData.forEach((row, index) => {
    // Determine title from various potential column names
    const title =
      row['Nội dung công việc'] ||
      row['Noi dung cong viec'] ||
      row['Tên nhiệm vụ'] ||
      row['Công việc'] ||
      row['Title'] ||
      row['Nhiệm vụ'] ||
      '';

    if (!title || !String(title).trim()) {
      return; // Skip empty rows
    }

    const cleanTitle = String(title).trim();
    const desc =
      row['Mô tả (nếu có)'] ||
      row['Mô tả'] ||
      row['Mo ta'] ||
      row['Description'] ||
      '';

    // Subtasks 1..5
    const subtaskTexts = [
      row['Nhiệm vụ 1'] || row['Nhiem vu 1'] || row['Bước 1'],
      row['Nhiệm vụ 2'] || row['Nhiem vu 2'] || row['Bước 2'],
      row['Nhiệm vụ 3'] || row['Nhiem vu 3'] || row['Bước 3'],
      row['Nhiệm vụ 4 (nếu có)'] || row['Nhiệm vụ 4'] || row['Nhiem vu 4'] || row['Bước 4'],
      row['Nhiệm vụ 5 (nếu có)'] || row['Nhiệm vụ 5'] || row['Nhiem vu 5'] || row['Bước 5'],
    ].filter(Boolean);

    const subtasks: Subtask[] = subtaskTexts.map((stText, stIdx) => ({
      id: `parsed-sub-${Date.now()}-${index}-${stIdx}`,
      title: String(stText).trim(),
      phase: stIdx === 0 ? 'Chuẩn bị' : stIdx === subtaskTexts.length - 1 ? 'Hoàn thành' : 'Thực hiện',
      completed: false,
    }));

    if (subtasks.length === 0) {
      subtasks.push({
        id: `parsed-sub-${Date.now()}-${index}-0`,
        title: `Tôi chuẩn bị hồ sơ và kế hoạch thực hiện cho "${cleanTitle}"`,
        phase: 'Chuẩn bị',
        completed: false,
      });
      subtasks.push({
        id: `parsed-sub-${Date.now()}-${index}-1`,
        title: `Tôi trực tiếp triển khai và hoàn tất các hạng mục theo tiến độ`,
        phase: 'Thực hiện',
        completed: false,
      });
    }

    // Start date is strictly default calculated from task creation and cannot be edited
    const startDate = new Date().toISOString();

    // Due Date parsing: Separate Date (ngày, tháng, năm) and Time (giờ, phút)
    const rawDueDate =
      row['Ngày hoàn thành (ngày, tháng, năm)'] ||
      row['Ngày hoàn thành'] ||
      row['Ngay hoan thanh'] ||
      row['Hạn chót'] ||
      row['Due Date'] ||
      '';

    const rawDueTime =
      row['Thời gian hoàn thành (giờ, phút)'] ||
      row['Thời gian hoàn thành'] ||
      row['Thoi gian hoan thanh'] ||
      row['Giờ hoàn thành'] ||
      '';

    let dueDate = '';
    const defaultDueDate = new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000);
    defaultDueDate.setHours(17, 0, 0, 0);

    // Extract hours and minutes from rawDueTime (e.g. "17:30", "17h30", "09:15", or Date object)
    let hours = 17;
    let minutes = 0;
    if (rawDueTime) {
      if (rawDueTime instanceof Date) {
        hours = rawDueTime.getHours();
        minutes = rawDueTime.getMinutes();
      } else {
        const timeMatch = String(rawDueTime).match(/(\d{1,2})[:hH\-](\d{1,2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        }
      }
    }

    if (rawDueDate) {
      if (rawDueDate instanceof Date && !isNaN(rawDueDate.getTime())) {
        const d = new Date(rawDueDate);
        d.setHours(hours, minutes, 0, 0);
        dueDate = d.toISOString();
      } else {
        const str = String(rawDueDate).trim();
        // Check DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1], 10);
          const month = parseInt(dmyMatch[2], 10) - 1;
          const year = parseInt(dmyMatch[3], 10);
          dueDate = new Date(year, month, day, hours, minutes, 0).toISOString();
        } else {
          // Check YYYY-MM-DD
          const ymdMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (ymdMatch) {
            const year = parseInt(ymdMatch[1], 10);
            const month = parseInt(ymdMatch[2], 10) - 1;
            const day = parseInt(ymdMatch[3], 10);
            dueDate = new Date(year, month, day, hours, minutes, 0).toISOString();
          } else {
            const parsed = Date.parse(str);
            if (!isNaN(parsed)) {
              const d = new Date(parsed);
              d.setHours(hours, minutes, 0, 0);
              dueDate = d.toISOString();
            }
          }
        }
      }
    } else if (rawDueTime && typeof rawDueTime === 'string' && (rawDueTime.includes('/') || rawDueTime.includes('-'))) {
      // Legacy format where rawDueTime contained both date and time e.g. "2026-11-05 17:30"
      const parsed = Date.parse(rawDueTime);
      if (!isNaN(parsed)) {
        dueDate = new Date(parsed).toISOString();
      }
    }

    if (!dueDate) {
      dueDate = defaultDueDate.toISOString();
    }

    // Links: "Tiêu đề: http..." or raw url
    const linkRaw = row['Đường liên kết (tiêu đề link, đường link)'] || row['Đường liên kết'] || row['Link'] || '';
    const links: TaskLink[] = [];
    if (linkRaw && String(linkRaw).trim()) {
      const linkStr = String(linkRaw).trim();
      if (linkStr.includes('http://') || linkStr.includes('https://')) {
        const urlMatch = linkStr.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          const url = urlMatch[0];
          const linkTitle = linkStr.replace(url, '').replace(/[:\-–]/g, '').trim() || 'Tài liệu liên kết';
          links.push({
            id: `link-${Date.now()}-${index}`,
            title: linkTitle,
            url,
          });
        }
      } else {
        links.push({
          id: `link-${Date.now()}-${index}`,
          title: 'Tài liệu tham khảo',
          url: `https://${linkStr}`,
        });
      }
    }

    // Google Calendar
    const calRaw = String(row['Thêm vào Google Lịch (có, không)'] || row['Google Lịch'] || '').toLowerCase();
    const addToGoogleCalendar = calRaw.includes('có') || calRaw.includes('yes') || calRaw.includes('1') || calRaw.includes('true');

    tasks.push({
      id: `import-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      title: cleanTitle,
      description: String(desc || '').trim(),
      subtasks,
      createdAt: startDate,
      dueDate,
      links,
      addToGoogleCalendar,
      priority: 'medium',
    });
  });

  return tasks;
}
