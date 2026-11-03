import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  convertMillimetersToTwip,
} from 'docx';
import { Task, UserProfile, ReportStatistics, WordReportCustomConfig } from '../types/task';
import { formatDateVietnamese } from './taskCalculations';

/**
 * Removes any markdown asterisks * and brackets [] from administrative text
 */
export function cleanAdministrativeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*+/g, '')
    .replace(/[\[\]]/g, '')
    .trim();
}

const tableBorderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const tableBorderCell = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
};

// Chuẩn căn lề Nghị định 30/2020/NĐ-CP: Trên 2cm, Dưới 2cm, Trái 3cm, Phải 2cm
export const ADMINISTRATIVE_PAGE_MARGINS = {
  top: convertMillimetersToTwip(20),
  bottom: convertMillimetersToTwip(20),
  left: convertMillimetersToTwip(30),
  right: convertMillimetersToTwip(20),
};

// Chuẩn đoạn văn bản: Before 6pt, After 6pt, Line spacing Single (240 twips)
export const ADMINISTRATIVE_PARAGRAPH_SPACING = {
  before: 120, // 6 pt (1 pt = 20 twips)
  after: 120,  // 6 pt
  line: 240,   // Single line spacing
};

// Thụt đầu dòng chuẩn 1.27 cm (720 twips)
export const ADMINISTRATIVE_FIRST_LINE_INDENT = 720;

/**
 * Helper tạo một đoạn văn bản hành chính chuẩn
 */
export function createAdminParagraph(
  text: string,
  options: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    indentFirstLine?: boolean;
    spacingBefore?: number;
    spacingAfter?: number;
  } = {}
): Paragraph {
  const clean = cleanAdministrativeText(text);
  const size = options.size || 28; // 14 pt = 28 half-points
  const alignment = options.alignment || AlignmentType.JUSTIFIED;
  const shouldIndent = options.indentFirstLine !== false && alignment === AlignmentType.JUSTIFIED;

  return new Paragraph({
    alignment,
    spacing: {
      before: options.spacingBefore !== undefined ? options.spacingBefore : ADMINISTRATIVE_PARAGRAPH_SPACING.before,
      after: options.spacingAfter !== undefined ? options.spacingAfter : ADMINISTRATIVE_PARAGRAPH_SPACING.after,
      line: ADMINISTRATIVE_PARAGRAPH_SPACING.line,
    },
    indent: shouldIndent ? { firstLine: ADMINISTRATIVE_FIRST_LINE_INDENT } : undefined,
    children: [
      new TextRun({
        text: clean,
        font: 'Times New Roman',
        size,
        bold: Boolean(options.bold),
        italics: Boolean(options.italics),
        color: '000000',
      }),
    ],
  });
}

/**
 * Creates a visual ASCII / block meter bar for Word reports (e.g., ██████████░░ 80%)
 */
export function createVisualBar(ratePercent: number, totalChars = 16): string {
  const safePercent = Math.max(0, Math.min(100, Math.round(ratePercent || 0)));
  const filledCount = Math.round((safePercent / 100) * totalChars);
  const emptyCount = Math.max(0, totalChars - filledCount);
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount) + ` ${safePercent}%`;
}

/**
 * Builds a standardized Representative Overview & Progress Chart Table for DOCX
 */
export function createOverviewMetricsChartTable(stats: ReportStatistics): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderCell,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Chỉ số tổng quan đại diện', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Số lượng thực tế', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Biểu đồ tiến độ & Tỷ lệ đại diện', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '1. Tổng nhiệm vụ tiếp nhận', font: 'Times New Roman', bold: true, size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.totalTasks} việc`, font: 'Times New Roman', bold: true, size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(100), font: 'Times New Roman', size: 24 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '2. Đã hoàn thành nghiệm thu', font: 'Times New Roman', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.completedTasks} việc`, font: 'Times New Roman', bold: true, color: '16A34A', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(stats.completionRate), font: 'Times New Roman', bold: true, color: '16A34A', size: 24 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '3. Hoàn thành đúng hạn cam kết', font: 'Times New Roman', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.completedOnTime} việc`, font: 'Times New Roman', bold: true, color: '2563EB', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(stats.onTimeRate), font: 'Times New Roman', bold: true, color: '2563EB', size: 24 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '4. Hoàn thành trễ hạn', font: 'Times New Roman', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.completedLate} việc`, font: 'Times New Roman', color: stats.completedLate > 0 ? 'DC2626' : '64748B', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(stats.totalTasks > 0 ? (stats.completedLate / stats.totalTasks) * 100 : 0), font: 'Times New Roman', color: stats.completedLate > 0 ? 'DC2626' : '64748B', size: 24 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '5. Đang tiếp tục xử lý', font: 'Times New Roman', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.inProgressTasks} việc`, font: 'Times New Roman', color: 'D97706', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0), font: 'Times New Roman', color: 'D97706', size: 24 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: '6. Tồn đọng từ kỳ trước chuyển sang', font: 'Times New Roman', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: `${stats.backlogTasks} việc`, font: 'Times New Roman', color: '9333EA', size: 26 })] })],
          }),
          new TableCell({
            borders: tableBorderCell,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40, line: 240 }, children: [new TextRun({ text: createVisualBar(stats.totalTasks > 0 ? (stats.backlogTasks / stats.totalTasks) * 100 : 0), font: 'Times New Roman', color: '9333EA', size: 24 })] })],
          }),
        ],
      }),
    ],
  });
}

/**
 * Exports a task's full report into a professional Microsoft Word (.docx) document
 * strictly conforming to Vietnamese administrative standard.
 */
export async function exportTaskToDocx(task: Task, user?: UserProfile): Promise<Blob> {
  const subtaskRows = (task.subtasks || []).map((subtask, index) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60, line: 240 },
              children: [new TextRun({ text: `${index + 1}`, font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 62, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              spacing: { before: 60, after: 60, line: 240 },
              children: [
                new TextRun({
                  text: cleanAdministrativeText(subtask.phase ? `${subtask.phase} - ${subtask.title}` : subtask.title),
                  font: 'Times New Roman',
                  bold: subtask.completed,
                  size: 26,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60, line: 240 },
              children: [
                new TextRun({
                  text: subtask.completed ? 'ĐÃ HOÀN THÀNH' : 'ĐANG THỰC HIỆN',
                  font: 'Times New Roman',
                  bold: true,
                  size: 24,
                  color: subtask.completed ? '16A34A' : 'D97706',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const now = new Date();
  const dateStr = `Hà Nội, ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: ADMINISTRATIVE_PAGE_MARGINS,
          },
        },
        children: [
          // Header Quốc hiệu / Cơ quan
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: cleanAdministrativeText((task.unit || 'ĐƠN VỊ CÔNG TÁC').toUpperCase()),
                            font: 'Times New Roman',
                            bold: true,
                            size: 26, // Cỡ 13 in đậm
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: `Số: ..../BC-${cleanAdministrativeText((task.unit || 'TM').slice(0, 4).toUpperCase())}`,
                            font: 'Times New Roman',
                            size: 26,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                            font: 'Times New Roman',
                            bold: true,
                            size: 26, // Cỡ 13 in đậm
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: 'Độc lập - Tự do - Hạnh phúc',
                            font: 'Times New Roman',
                            bold: true,
                            size: 28, // Cỡ 14 in đậm
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: dateStr,
                            font: 'Times New Roman',
                            italics: true,
                            size: 28, // Cỡ 14 in nghiêng căn phải
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Tên văn bản BÁO CÁO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60, line: 240 },
            children: [
              new TextRun({
                text: 'BÁO CÁO',
                font: 'Times New Roman',
                bold: true,
                size: 28, // Cỡ 14 in đậm, viết hoa, căn giữa
              }),
            ],
          }),

          // Trích yếu
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 180, line: 240 },
            children: [
              new TextRun({
                text: `Về việc kết quả thực hiện nhiệm vụ: ${cleanAdministrativeText(task.title)}`,
                font: 'Times New Roman',
                bold: true,
                size: 28, // Cỡ 14 in đậm
              }),
            ],
          }),

          // Mở đầu (Căn cứ, mục đích, phạm vi)
          createAdminParagraph(
            `Căn cứ yêu cầu công tác và kế hoạch phân công nhiệm vụ của ${cleanAdministrativeText(task.unit || 'đơn vị')}, cán bộ phụ trách báo cáo chi tiết kết quả triển khai như sau:`,
            { italics: true, size: 28, indentFirstLine: true }
          ),

          // I. Đặc điểm tình hình
          createAdminParagraph('I. ĐẶC ĐIỂM TÌNH HÌNH', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Bối cảnh và yêu cầu triển khai: Nhiệm vụ được giao thực hiện từ ngày ${formatDateVietnamese(task.createdAt)} với thời hạn cam kết hoàn thành trước ngày ${formatDateVietnamese(task.dueDate)}.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Thuận lợi: Được sự quan tâm chỉ đạo sát sao của lãnh đạo đơn vị, các nguồn lực tài liệu và quy trình phối hợp được đảm bảo kịp thời.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Khó khăn, vướng mắc: Khối lượng công việc chi tiết đòi hỏi phối hợp đa bước và kiểm tra kỹ thuật nghiêm ngặt trước khi nghiệm thu lưu trữ.`,
            { size: 28, indentFirstLine: true }
          ),

          // II. Kết quả thực hiện
          createAdminParagraph('II. KẾT QUẢ THỰC HIỆN', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Nội dung công việc chính: ${cleanAdministrativeText(task.description || task.title)}.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Tiến độ hoàn thành thực tế: Đạt ${task.progress}% - ${task.status === 'completed' ? 'Đã hoàn thành toàn bộ các hạng mục và nghiệm thu lưu trữ.' : 'Đang tiếp tục triển khai theo kế hoạch.'}`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Ngày hoàn thành thực tế: ${task.completedAt ? formatDateVietnamese(task.completedAt) : 'Đang triển khai'}.`,
            { size: 28, indentFirstLine: true }
          ),

          // Bảng các bước việc con
          ...(subtaskRows.length > 0
            ? [
                createAdminParagraph('Bảng kiểm kê các hạng mục công việc chi tiết:', { italics: true, size: 26, indentFirstLine: true, spacingBefore: 60, spacingAfter: 60 }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              spacing: { before: 60, after: 60, line: 240 },
                              children: [new TextRun({ text: 'STT', font: 'Times New Roman', bold: true, size: 26 })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 62, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              spacing: { before: 60, after: 60, line: 240 },
                              children: [new TextRun({ text: 'Nội dung hạng mục', font: 'Times New Roman', bold: true, size: 26 })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          borders: tableBorderCell,
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              spacing: { before: 60, after: 60, line: 240 },
                              children: [new TextRun({ text: 'Trạng thái', font: 'Times New Roman', bold: true, size: 26 })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    ...subtaskRows,
                  ],
                }),
              ]
            : []),

          // III. Đánh giá
          createAdminParagraph('III. ĐÁNH GIÁ', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Ưu điểm: Nhiệm vụ được theo dõi liên tục trên hệ thống NSTask, đảm bảo tuân thủ mốc thời gian và chất lượng hồ sơ lưu trữ.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Hạn chế và nguyên nhân: Một số bước phát sinh cần thời gian đối chiếu thêm số liệu từ các bên liên quan.`,
            { size: 28, indentFirstLine: true }
          ),

          // IV. Phương hướng
          createAdminParagraph('IV. PHƯƠNG HƯỚNG', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Tiếp tục duy trì chế độ cập nhật tiến độ theo thời gian thực và quản trị rủi ro hạn chót chặt chẽ.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Bàn giao đầy đủ sản phẩm đầu ra và biên bản nghiệm thu cho các bộ phận tiếp nhận.`,
            { size: 28, indentFirstLine: true }
          ),

          // V. Kiến nghị, Đề xuất
          createAdminParagraph('V. KIẾN NGHỊ, ĐỀ XUẤT', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `Kính đề nghị Lãnh đạo đơn vị xem xét, phê duyệt kết quả thực hiện nhiệm vụ và cho phép đưa hồ sơ vào lưu trữ chính thức.`,
            { size: 28, indentFirstLine: true }
          ),

          // Phần cuối: Nơi nhận & Khối ký
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        spacing: { before: 180, after: 40, line: 240 },
                        children: [new TextRun({ text: 'Nơi nhận:', font: 'Times New Roman', bold: true, italics: true, size: 24 })], // Cỡ 12 in đậm, in nghiêng
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20, line: 240 },
                        children: [new TextRun({ text: '- Lãnh đạo đơn vị (để báo cáo);', font: 'Times New Roman', italics: true, size: 22 })], // Cỡ 11 in nghiêng
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20, line: 240 },
                        children: [new TextRun({ text: '- Các bộ phận liên quan (để phối hợp);', font: 'Times New Roman', italics: true, size: 22 })],
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20, line: 240 },
                        children: [new TextRun({ text: '- Lưu: VT, Hồ sơ công tác.', font: 'Times New Roman', italics: true, size: 22 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 180, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: 'NGƯỜI LÀM BÁO CÁO', font: 'Times New Roman', bold: true, size: 28 }), // Cỡ 14 in đậm
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', italics: true, size: 24 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 700, after: 0, line: 240 }, children: [] }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0, line: 240 },
                        children: [
                          new TextRun({
                            text: cleanAdministrativeText(user?.displayName || 'Cán bộ phụ trách'),
                            font: 'Times New Roman',
                            bold: true,
                            size: 28, // Cỡ 14 in đậm
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Exports a master summary of ALL completed tasks into a single comprehensive DOCX report.
 */
export async function exportAllCompletedTasksToDocx(
  tasks: Task[],
  user?: UserProfile
): Promise<Blob> {
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.progress === 100);

  const onTimeCount = completedTasks.filter((t) => {
    if (!t.completedAt || !t.dueDate) return true;
    return new Date(t.completedAt).getTime() <= new Date(t.dueDate).getTime();
  }).length;
  const lateCount = completedTasks.length - onTimeCount;
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;

  const stats: ReportStatistics = {
    totalTasks: completedTasks.length,
    completedTasks: completedTasks.length,
    completedOnTime: onTimeCount,
    completedLate: lateCount,
    inProgressTasks: 0,
    backlogTasks: 0,
    onTimeRate: onTimeRate,
    completionRate: 100,
  };

  const summaryRows = completedTasks.map((t, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: `${idx + 1}`, font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 42, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: cleanAdministrativeText(t.title), font: 'Times New Roman', bold: true, size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: cleanAdministrativeText(t.unit || 'Chung'), font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40, line: 240 },
              children: [
                new TextRun({
                  text: t.completedAt ? formatDateVietnamese(t.completedAt) : 'Đã nghiệm thu',
                  font: 'Times New Roman',
                  size: 26,
                  color: '16A34A',
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const now = new Date();
  const dateStr = `Hà Nội, ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: ADMINISTRATIVE_PAGE_MARGINS,
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: 'CƠ QUAN / ĐƠN VỊ TỔNG HỢP', font: 'Times New Roman', bold: true, size: 26 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: 'HỆ THỐNG NSTASK', font: 'Times New Roman', italics: true, size: 24 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                            font: 'Times New Roman',
                            bold: true,
                            size: 26,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', font: 'Times New Roman', bold: true, size: 28 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [
                          new TextRun({ text: dateStr, font: 'Times New Roman', italics: true, size: 28 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Tên văn bản BÁO CÁO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60, line: 240 },
            children: [
              new TextRun({
                text: 'BÁO CÁO',
                font: 'Times New Roman',
                bold: true,
                size: 28,
              }),
            ],
          }),

          // Trích yếu
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 180, line: 240 },
            children: [
              new TextRun({
                text: 'Tổng hợp danh mục các nhiệm vụ đã hoàn thành và nghiệm thu lưu trữ',
                font: 'Times New Roman',
                bold: true,
                size: 28,
              }),
            ],
          }),

          // Mở đầu
          createAdminParagraph(
            `Căn cứ dữ liệu theo dõi thực tế trên hệ thống NSTask, đơn vị tổng hợp kết quả các nhiệm vụ đã hoàn thành tính đến thời điểm hiện tại như sau:`,
            { italics: true, size: 28, indentFirstLine: true }
          ),

          // I. Đặc điểm tình hình
          createAdminParagraph('I. ĐẶC ĐIỂM TÌNH HÌNH', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Toàn bộ các nhiệm vụ được phân công theo dõi đã được các đơn vị chuyên môn và cán bộ phụ trách triển khai nghiêm túc, tuân thủ đúng quy trình nghiệp vụ.`,
            { size: 28, indentFirstLine: true }
          ),

          // II. Kết quả thực hiện
          createAdminParagraph('II. KẾT QUẢ THỰC HIỆN', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Tổng số nhiệm vụ đã hoàn thành đạt chuẩn nghiệm thu: ${completedTasks.length} nhiệm vụ (Tỷ lệ đúng hạn đạt ${onTimeRate}%).`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph('1. Bảng chỉ số tổng quan đại diện và biểu đồ tiến độ:', { bold: true, size: 28, indentFirstLine: true }),
          createOverviewMetricsChartTable(stats),
          createAdminParagraph('2. Bảng kiểm kê chi tiết các nhiệm vụ đã hoàn thành đạt chuẩn:', { bold: true, size: 28, indentFirstLine: true, spacingBefore: 120 }),

          // Bảng thống kê chi tiết
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 6, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [new TextRun({ text: 'STT', font: 'Times New Roman', bold: true, size: 26 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 42, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [new TextRun({ text: 'Tên nhiệm vụ đã nghiệm thu', font: 'Times New Roman', bold: true, size: 26 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 24, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [new TextRun({ text: 'Đơn vị thực hiện', font: 'Times New Roman', bold: true, size: 26 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    borders: tableBorderCell,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 60, line: 240 },
                        children: [new TextRun({ text: 'Thời điểm hoàn thành', font: 'Times New Roman', bold: true, size: 26 })],
                      }),
                    ],
                  }),
                ],
              }),
              ...summaryRows,
            ],
          }),

          // III. Đánh giá
          createAdminParagraph('III. ĐÁNH GIÁ', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Các nhiệm vụ nghiệm thu đều đáp ứng đầy đủ yêu cầu chất lượng và tiến độ đã cam kết.`,
            { size: 28, indentFirstLine: true }
          ),

          // IV. Phương hướng
          createAdminParagraph('IV. PHƯƠNG HƯỚNG', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Phát huy các kết quả đạt được, đẩy mạnh ứng dụng công nghệ để nâng cao hơn nữa hiệu suất hoàn thành nhiệm vụ trong các giai đoạn tiếp theo.`,
            { size: 28, indentFirstLine: true }
          ),

          // V. Kiến nghị, Đề xuất
          createAdminParagraph('V. KIẾN NGHỊ, ĐỀ XUẤT', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `Kính đề nghị Lãnh đạo cấp trên tiếp tục tạo điều kiện và ghi nhận kết quả hoàn thành nhiệm vụ của các tập thể, cá nhân liên quan.`,
            { size: 28, indentFirstLine: true }
          ),

          // Ký xác nhận
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        spacing: { before: 180, after: 40, line: 240 },
                        children: [new TextRun({ text: 'Nơi nhận:', font: 'Times New Roman', bold: true, italics: true, size: 24 })],
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20, line: 240 },
                        children: [new TextRun({ text: '- Lãnh đạo đơn vị (báo cáo);', font: 'Times New Roman', italics: true, size: 22 })],
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 20, line: 240 },
                        children: [new TextRun({ text: '- Lưu: VT, Hồ sơ việc.', font: 'Times New Roman', italics: true, size: 22 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 180, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: 'NGƯỜI LẬP BÁO CÁO', font: 'Times New Roman', bold: true, size: 28 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 40, line: 240 },
                        children: [
                          new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', italics: true, size: 24 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 700, after: 0, line: 240 }, children: [] }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0, line: 240 },
                        children: [
                          new TextRun({
                            text: cleanAdministrativeText(user?.displayName || 'Cán bộ quản lý'),
                            font: 'Times New Roman',
                            bold: true,
                            size: 28,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Helper to download single task docx.
 */
export async function downloadTaskDocx(task: Task, user?: UserProfile) {
  const blob = await exportTaskToDocx(task, user);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = cleanAdministrativeText(task.title || 'Nhiem_vu')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .slice(0, 40);
  a.download = `Bao_cao_Nhiem_vu_${safeTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download master report of all completed tasks.
 */
export async function downloadAllCompletedTasksDocx(tasks: Task[], user?: UserProfile) {
  const blob = await exportAllCompletedTasksToDocx(tasks, user);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Bao_cao_Tong_hop_Nhiem_vu_Hoan_thanh_${dateStr}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Client-side robust generator for customized administrative Word reports
 * strictly complying with Vietnamese administrative standards (Nghị định 30/2020/NĐ-CP).
 * Includes representative overview metric chart table.
 */
export async function exportCustomWordReportDocx(params: {
  tasks: Task[];
  statistics: ReportStatistics;
  reportTitle?: string;
  periodLabel?: string;
  unitName?: string;
  createdByName?: string;
  customDocConfig?: Partial<WordReportCustomConfig>;
}): Promise<Blob> {
  const {
    tasks,
    statistics,
    reportTitle = 'BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC',
    periodLabel = 'Kỳ báo cáo',
    unitName = 'Toàn bộ đơn vị',
    createdByName = 'Cán bộ quản lý',
    customDocConfig = {},
  } = params;

  const governingBody = cleanAdministrativeText(customDocConfig.governingBody || 'ỦY BAN NHÂN DÂN / ĐƠN VỊ CẤP TRÊN');
  const issuingAgency = cleanAdministrativeText(customDocConfig.issuingAgency || unitName.toUpperCase());
  const docNumber = cleanAdministrativeText(customDocConfig.docNumber || `Số: ..../BC-${unitName.slice(0, 4).toUpperCase()}`);
  const now = new Date();
  const locationDate = cleanAdministrativeText(
    customDocConfig.locationAndDate ||
      `Hà Nội, ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`
  );
  const finalTitle = cleanAdministrativeText(customDocConfig.reportTitle || reportTitle);
  const finalSubtitle = cleanAdministrativeText(customDocConfig.reportSubtitle || `Kỳ đánh giá: ${periodLabel}`);
  const aiSummary = cleanAdministrativeText(customDocConfig.aiSummary || 'Các chỉ số hoàn thành đạt mức ổn định theo kế hoạch đề ra. Đơn vị cần tiếp tục kiểm soát chặt chẽ các nhiệm vụ sắp đến hạn.');
  const futureDirections = cleanAdministrativeText(customDocConfig.futureDirections || 'Tập trung hoàn thành dứt điểm các nhiệm vụ tồn đọng và đẩy nhanh tiến độ các công việc trong kỳ tiếp theo.');
  const sigTitle = cleanAdministrativeText(customDocConfig.signatoryTitle || 'THỦ TRƯỞNG ĐƠN VỊ');
  const sigNote = cleanAdministrativeText(customDocConfig.signatoryNote || '(Ký và ghi rõ họ tên)');
  const sigName = cleanAdministrativeText(customDocConfig.signatoryName || createdByName);
  const recipients = cleanAdministrativeText(customDocConfig.recipientList || 'Nơi nhận:\n- Lãnh đạo đơn vị;\n- Các bộ phận phụ trách;\n- Lưu: VT, Hồ sơ việc.');

  // Header Table
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: governingBody.toUpperCase(), font: 'Times New Roman', size: 26 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: issuingAgency.toUpperCase(), font: 'Times New Roman', bold: true, size: 26 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: '-----------------------', font: 'Times New Roman', size: 20, color: '666666' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: docNumber, font: 'Times New Roman', size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', font: 'Times New Roman', bold: true, size: 26 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', font: 'Times New Roman', bold: true, size: 28 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: '-------------------------------', font: 'Times New Roman', size: 20, color: '666666' })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: locationDate, font: 'Times New Roman', italics: true, size: 28 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Task Rows for detailed inventory
  const taskRows = tasks.map((t, idx) => {
    let statusText = 'Đang thực hiện';
    if (t.status === 'completed') statusText = 'Đã hoàn thành';
    else if (t.status === 'pending') statusText = 'Chờ xử lý';
    else if (t.status === 'overdue') statusText = 'Trễ hạn';

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: String(idx + 1), font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: cleanAdministrativeText(t.title), font: 'Times New Roman', bold: true, size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: cleanAdministrativeText(t.unit || 'Chung'), font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40, line: 240 },
              children: [new TextRun({ text: t.dueDate ? formatDateVietnamese(t.dueDate) : 'Không có hạn', font: 'Times New Roman', size: 26 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: tableBorderCell,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40, line: 240 },
              children: [
                new TextRun({
                  text: statusText,
                  font: 'Times New Roman',
                  bold: t.status === 'completed',
                  color: t.status === 'completed' ? '16A34A' : t.status === 'overdue' ? 'DC2626' : '334155',
                  size: 26,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const detailedTaskTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderCell,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'STT', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Nội dung nhiệm vụ', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Đơn vị', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Hạn hoàn thành', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            borders: tableBorderCell,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240 },
                children: [new TextRun({ text: 'Trạng thái', font: 'Times New Roman', bold: true, size: 26 })],
              }),
            ],
          }),
        ],
      }),
      ...taskRows,
    ],
  });

  // Signature Table
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            children: [
              new Paragraph({
                spacing: { before: 180, after: 40, line: 240 },
                children: [new TextRun({ text: 'Nơi nhận:', font: 'Times New Roman', bold: true, italics: true, size: 24 })],
              }),
              ...recipients
                .split('\n')
                .map((l: string) => cleanAdministrativeText(l))
                .filter((l: string) => Boolean(l) && !l.toLowerCase().startsWith('nơi nhận:'))
                .map(
                  (cleanedLine: string) =>
                    new Paragraph({
                      spacing: { before: 20, after: 20, line: 240 },
                      children: [new TextRun({ text: cleanedLine, font: 'Times New Roman', size: 22, italics: true })],
                    })
                ),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180, after: 40, line: 240 },
                children: [new TextRun({ text: sigTitle.toUpperCase(), font: 'Times New Roman', bold: true, size: 28 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40, line: 240 },
                children: [new TextRun({ text: sigNote, font: 'Times New Roman', italics: true, size: 24 })],
              }),
              new Paragraph({ spacing: { before: 800, after: 0, line: 240 }, children: [] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
                children: [new TextRun({ text: sigName, font: 'Times New Roman', bold: true, size: 28 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: ADMINISTRATIVE_PAGE_MARGINS,
          },
        },
        children: [
          headerTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60, line: 240 },
            children: [new TextRun({ text: 'BÁO CÁO', font: 'Times New Roman', bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 180, line: 240 },
            children: [new TextRun({ text: finalTitle, font: 'Times New Roman', bold: true, size: 28 })],
          }),
          createAdminParagraph(
            `Căn cứ Quy chế làm việc và chương trình công tác trọng tâm ${finalSubtitle}, ${issuingAgency} tổng hợp báo cáo chi tiết kết quả thực hiện các nhiệm vụ công việc như sau:`,
            { italics: true, size: 28, indentFirstLine: true }
          ),
          createAdminParagraph('I. ĐẶC ĐIỂM TÌNH HÌNH', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Bối cảnh tình hình: Trong kỳ báo cáo ${finalSubtitle}, đơn vị tiếp nhận và xử lý tổng cộng ${statistics.totalTasks} nhiệm vụ thuộc các mảng công tác chuyên môn trên hệ thống.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Thuận lợi: Được sự quan tâm, chỉ đạo thường xuyên của Lãnh đạo đơn vị; đội ngũ cán bộ có tinh thần trách nhiệm cao, chủ động bám sát kế hoạch và ứng dụng nền tảng số hóa theo dõi tiến độ thời gian thực.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Khó khăn: Một số công việc có tính chất đột xuất, yêu cầu phối hợp liên phòng ban trong thời gian ngắn đòi hỏi sự điều phối linh hoạt.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph('II. KẾT QUẢ THỰC HIỆN', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph('1. Bảng chỉ số tổng quan đại diện và biểu đồ tiến độ:', { bold: true, size: 28, indentFirstLine: true }),
          createOverviewMetricsChartTable(statistics),
          createAdminParagraph('2. Bảng kiểm kê chi tiết các nhiệm vụ thực hiện trong kỳ:', { bold: true, size: 28, indentFirstLine: true, spacingBefore: 120 }),
          detailedTaskTable,
          createAdminParagraph('III. ĐÁNH GIÁ', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph('1. Ưu điểm:', { bold: true, size: 28, indentFirstLine: true }),
          createAdminParagraph(
            `- Đa số các nhiệm vụ trọng tâm được triển khai đúng mốc tiến độ; chất lượng công việc được kiểm soát chặt chẽ thông qua việc phân chia các bước việc con và hồ sơ lưu trữ điện tử.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(`- ${aiSummary}`, { size: 28, indentFirstLine: true }),
          createAdminParagraph('2. Hạn chế và nguyên nhân:', { bold: true, size: 28, indentFirstLine: true }),
          createAdminParagraph(
            `- Còn một số nhiệm vụ trễ hạn (${statistics.completedLate} việc) do công tác thu thập số liệu đầu vào từ các cơ sở chưa đạt tiến độ yêu cầu.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph('IV. PHƯƠNG HƯỚNG, NHIỆM VỤ TIẾP THEO', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(`- ${futureDirections}`, { size: 28, indentFirstLine: true }),
          createAdminParagraph(
            `- Rà soát toàn bộ các nhiệm vụ đang thực hiện và việc tồn đọng để xây dựng kế hoạch bứt phá, cam kết hoàn thành đúng hạn 100% trong kỳ tới.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph('V. KIẾN NGHỊ, ĐỀ XUẤT', { bold: true, size: 28, indentFirstLine: false, spacingBefore: 180 }),
          createAdminParagraph(
            `- Kính đề nghị Lãnh đạo cấp trên xem xét, phê duyệt kết quả thực hiện nhiệm vụ ${finalSubtitle} của ${issuingAgency}.`,
            { size: 28, indentFirstLine: true }
          ),
          createAdminParagraph(
            `- Tiếp tục tạo điều kiện về trang thiết bị và cơ chế phối hợp liên đơn vị nhằm nâng cao hơn nữa hiệu quả giải quyết công vụ.`,
            { size: 28, indentFirstLine: true }
          ),
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
