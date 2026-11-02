export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  defaultTitle: string;
  defaultContent: string;
  defaultLabels: string[];
  defaultColor?: string;
  checklistItems?: string[];
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting_minutes',
    name: 'Biên bản cuộc họp',
    icon: '📋',
    category: 'Hội họp & Giao ban',
    description: 'Thời gian, địa điểm, chủ trì, nội dung thảo luận và kết luận phân công',
    defaultTitle: 'Biên bản cuộc họp: Nội dung cuộc họp',
    defaultColor: '#FFFFFF',
    defaultLabels: ['Họp giao ban', 'Biên bản'],
    defaultContent: `# BIÊN BẢN CUỘC HỌP
Thời gian: 08:30 - Ngày DD/MM/YYYY
Địa điểm: Phòng họp A (hoặc Google Meet trực tuyến)
Chủ trì: Đồng chí Họ và tên - Chức vụ
Thư ký: Họ và tên thư ký ghi chép
Thành phần tham dự: Đại diện các phòng ban và thành viên liên quan

## 1. Mục đích và Nội dung trọng tâm
• Đánh giá tiến độ thực hiện các nhiệm vụ được giao trong tuần
• Báo cáo khó khăn, vướng mắc cần ý kiến chỉ đạo
• Thống nhất định hướng và phân bổ nguồn lực thực hiện

## 2. Ý kiến thảo luận chính
> Ý kiến đại diện bộ phận chuyên môn: Đề xuất bổ sung tài liệu hướng dẫn và gia hạn thêm 2 ngày để rà soát số liệu.
> Ý kiến phòng Kế toán / Tổng hợp: Đồng thuận phương án và cam kết hoàn thành đối chiếu trước thứ Sáu.

## 3. Kết luận và Phân công nhiệm vụ cụ thể
• Hoàn thiện biên bản cuộc họp và gửi thông báo kết luận đến các bên liên quan
• Đôn đốc các đơn vị nộp báo cáo chuyên đề đúng hạn
• Báo cáo kết quả sơ bộ lên lãnh đạo trước 16:00 thứ Sáu`,
    checklistItems: [
      'Gửi biên bản cuộc họp cho các thành viên tham dự',
      'Đôn đốc thực hiện các kết luận đã được thống nhất',
      'Kiểm tra tiến độ vào giao ban tuần tới',
    ],
  },
  {
    id: 'weekly_plan',
    name: 'Kế hoạch công tác tuần',
    icon: '📅',
    category: 'Lập kế hoạch',
    description: 'Mục tiêu trọng tâm và lộ trình công việc từ Thứ Hai đến Chủ Nhật',
    defaultTitle: 'Kế hoạch công tác tuần - Tuần mới',
    defaultColor: '#F0F9FF',
    defaultLabels: ['Kế hoạch', 'Tuần'],
    defaultContent: `# KẾ HOẠCH CÔNG TÁC TUẦN
Mục tiêu trọng tâm tuần này: Hoàn thành hồ sơ chuyển đổi số và chuẩn bị tài liệu hội nghị quý

## • Thứ Hai (T2):
• Họp giao ban đầu tuần và Rà soát văn bản tồn đọng
• Lập lịch làm việc chi tiết và phân công phối hợp

## • Thứ Ba (T3):
• Làm việc với các bộ phận liên quan để thu thập số liệu
• Soạn thảo đề cương và phụ lục nhiệm vụ

## • Thứ Tư (T4):
• Kiểm tra tiến độ và thẩm định tính khả thi của các đề xuất
• Hoàn thiện dự thảo lần 1 trình lãnh đạo xem xét

## • Thứ Năm (T5):
• Tiếp thu ý kiến đóng góp và chỉnh lý văn bản
• Đôn đốc tiến độ các khâu then chốt

## • Thứ Sáu (T6):
• Tổng hợp kết quả thực hiện trong tuần
• Phát hành báo cáo tuần và Dự thảo lịch tuần kế tiếp

## Đánh giá và Rút kinh nghiệm cuối tuần:
> Đạt chỉ tiêu đề ra: Hoàn thành tốt các kế hoạch trọng điểm
> Tồn đọng cần chuyển tiếp: Tiếp tục rà soát các văn bản thẩm định`,
    checklistItems: [
      'Giao ban đầu tuần thứ Hai lúc 08:00',
      'Rà soát tiến độ giữa tuần thứ Tư',
      'Tổng kết và đánh giá kết quả vào chiều thứ Sáu',
    ],
  },
  {
    id: 'quick_idea',
    name: 'Ý tưởng nhanh & Đề xuất',
    icon: '💡',
    category: 'Sáng kiến & Brainstorm',
    description: 'Nhanh chóng ghi lại sáng kiến, giải pháp cải tiến và bước thử nghiệm',
    defaultTitle: 'Ý tưởng: Sáng kiến cải tiến quy trình',
    defaultColor: '#FEF9C3',
    defaultLabels: ['Ý tưởng', 'Sáng kiến'],
    defaultContent: `# Ý TƯỞNG VÀ ĐỀ XUẤT MỚI
Ý tưởng cốt lõi: Số hóa biểu mẫu nhập liệu và tự động hóa theo dõi tiến độ nhiệm vụ

## 1. Bối cảnh và Vấn đề hiện tại
• Quy trình thủ công hiện tại mất nhiều thời gian nhập liệu và dễ nhầm lẫn
• Cần một cơ chế tự động nhắc nhở và quản lý trạng thái tập trung

## 2. Giải pháp đề xuất
> Áp dụng quy trình số hóa biểu mẫu và tự động hóa thông báo nhắc việc qua tin nhắn và lịch.

## 3. Lợi ích dự kiến
• Giảm 60% thời gian tổng hợp báo cáo hằng tuần
• Đảm bảo 100% nhiệm vụ không bị trễ hạn hoặc quên sót

## 4. Các bước thử nghiệm ban đầu:
• Tham khảo ý kiến đồng nghiệp trong tổ
• Lập bản mẫu thử nghiệm trong 3 ngày
• Đánh giá hiệu quả trước khi đề xuất mở rộng`,
    checklistItems: [
      'Phác thảo quy trình sơ bộ',
      'Khảo sát ý kiến người dùng trực tiếp',
      'Đề xuất thử nghiệm trong 1 tuần',
    ],
  },
  {
    id: 'daily_standup',
    name: 'Báo cáo công việc ngày',
    icon: '📊',
    category: 'Nhật ký công vụ',
    description: 'Theo dõi 3 câu hỏi: Đã làm gì, Sẽ làm gì và Vướng mắc cần gỡ',
    defaultTitle: 'Nhật ký công việc ngày làm việc',
    defaultColor: '#F0FDF4',
    defaultLabels: ['Nhật ký', 'Báo cáo ngày'],
    defaultContent: `# NHẬT KÝ CÔNG VIỆC HẰNG NGÀY
Ngày làm việc: Hôm nay • Cán bộ thực hiện

## 1. Các việc đã hoàn thành hôm nay:
• Xử lý 03 văn bản đến và chuyển giao cho các bộ phận
• Rà soát và cập nhật tiến độ công việc trên hệ thống NSTask

## 2. Kế hoạch công việc ngày mai:
• Hoàn thành dự thảo báo cáo chuyên đề trước 11:30
• Tham dự buổi tập huấn chuyên môn lúc 14:00

## 3. Khó khăn / Điểm nghẽn cần hỗ trợ:
> Cần phòng Kỹ thuật hỗ trợ cấp quyền truy cập dữ liệu bổ sung`,
    checklistItems: [
      'Cập nhật tiến độ trước khi rời cơ quan',
      'Kiểm tra lại lịch làm việc sáng mai',
    ],
  },
  {
    id: 'eisenhower_matrix',
    name: 'Ma trận ưu tiên Eisenhower',
    icon: '🎯',
    category: 'Quản trị thời gian',
    description: 'Phân loại công việc theo mức độ Khẩn cấp và Quan trọng',
    defaultTitle: 'Ma trận ưu tiên công việc',
    defaultColor: '#FFF1F2',
    defaultLabels: ['Ưu tiên', 'Eisenhower'],
    defaultContent: `# MA TRẬN QUẢN LÝ ƯU TIÊN EISENHOWER

## 🔴 NHÓM 1: KHẨN CẤP VÀ QUAN TRỌNG (Ưu tiên làm ngay)
• Xử lý báo cáo đột xuất yêu cầu gửi trong hôm nay
• Khắc phục sự cố gián đoạn hệ thống dữ liệu

## 🔵 NHÓM 2: QUAN TRỌNG NHƯNG KHÔNG KHẨN CẤP (Lên lịch tập trung làm)
• Xây dựng quy chế phối hợp và chuẩn hóa quy trình
• Nâng cao chuyên môn và nghiên cứu giải pháp mới

## 🟡 NHÓM 3: KHẨN CẤP NHƯNG KHÔNG QUAN TRỌNG (Ủy quyền / Giảm thiểu)
• Trả lời các email và tin nhắn thông thường
• Các cuộc họp thông tin không có quyết định lớn

## ⚪ NHÓM 4: KHÔNG KHẨN CẤP VÀ KHÔNG QUAN TRỌNG (Loại bỏ)
• Các thói quen gây phân tán sự chú ý trong giờ hành chính`,
    checklistItems: [
      'Hoàn thành nhóm 1 trước buổi trưa',
      'Dành ít nhất 2 giờ cho nhóm 2 vào buổi chiều',
    ],
  },
];
