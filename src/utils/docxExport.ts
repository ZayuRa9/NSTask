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
import { Task, UserProfile } from '../types/task';
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
            `- Tổng số nhiệm vụ đã hoàn thành đạt chuẩn nghiệm thu: ${completedTasks.length} nhiệm vụ.`,
            { size: 28, indentFirstLine: true }
          ),

          // Bảng thống kê
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
