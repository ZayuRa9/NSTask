/**
 * AI Task Generator Utility
 * Dynamically analyzes task title context and generates domain-specific,
 * actionable subtasks structured across 3 canonical phases:
 * Giai đoạn 1: Chuẩn bị
 * Giai đoạn 2: Triển khai
 * Giai đoạn 3: Tổng kết – Hoàn thành
 */

import { TaskPhaseId } from '../types/task';

export type TaskDomain =
  | 'sports'
  | 'procurement'
  | 'inspection'
  | 'legal_policy'
  | 'media_design'
  | 'survey_research'
  | 'maintenance'
  | 'recruitment_hr'
  | 'partnership'
  | 'health_safety'
  | 'tech'
  | 'youth'
  | 'event'
  | 'commerce'
  | 'education'
  | 'finance'
  | 'general';

export const CANONICAL_PHASES: { id: TaskPhaseId; label: string; shortLabel: string; icon: string }[] = [
  { id: 'preparation', label: 'Giai đoạn 1: Chuẩn bị', shortLabel: 'Chuẩn bị', icon: '📋' },
  { id: 'execution', label: 'Giai đoạn 2: Triển khai', shortLabel: 'Triển khai', icon: '⚡' },
  { id: 'conclusion', label: 'Giai đoạn 3: Tổng kết – Hoàn thành', shortLabel: 'Tổng kết – Hoàn thành', icon: '🏁' },
];

export function normalizeSubtaskPhase(phase?: string, phaseId?: TaskPhaseId): { id: TaskPhaseId; label: string } {
  if (phaseId && (phaseId === 'preparation' || phaseId === 'execution' || phaseId === 'conclusion')) {
    const match = CANONICAL_PHASES.find((p) => p.id === phaseId);
    if (match) return { id: match.id, label: match.label };
  }
  const lower = (phase || '').toLowerCase();
  if (lower.includes('chuẩn bị') || lower.includes('giai đoạn 1') || lower.includes('gđ 1') || lower.includes('phase 1')) {
    return { id: 'preparation', label: 'Giai đoạn 1: Chuẩn bị' };
  }
  if (lower.includes('tổng kết') || lower.includes('hoàn thành') || lower.includes('nghiệm thu') || lower.includes('giai đoạn 3') || lower.includes('gđ 3') || lower.includes('phase 3')) {
    return { id: 'conclusion', label: 'Giai đoạn 3: Tổng kết – Hoàn thành' };
  }
  return { id: 'execution', label: 'Giai đoạn 2: Triển khai' };
}

export function detectTaskDomain(taskTitle: string): TaskDomain {
  const lower = (taskTitle || '').toLowerCase();

  if (/quy chế|quy định|soạn thảo văn bản|quyết định|nghị định|thông tư|chính sách|thể chế|nội quy|điều lệ|hướng dẫn liên tịch/i.test(lower)) {
    return 'legal_policy';
  }
  if (/bóng đá|đá banh|bóng chuyền|cầu lông|hội thao|giải đấu|giải bơi|chạy bộ|marathon|thể thao|tennis|điền kinh|thi đấu/i.test(lower)) {
    return 'sports';
  }
  if (/mua sắm|trang thiết bị|vật tư|máy in|máy tính|bàn ghế|văn phòng phẩm|đấu thầu|báo giá|nhà cung cấp|mua hàng|mua máy|mua xe|tài sản công/i.test(lower)) {
    return 'procurement';
  }
  if (/thanh tra|kiểm tra|giám sát|hậu kiểm|kiểm định|xác minh|tiếp công dân|đơn thư|kỷ luật/i.test(lower)) {
    return 'inspection';
  }
  if (/thiết kế|đồ họa|poster|banner|video|quay phim|chụp ảnh|truyền thông|fanpage|bài viết|ấn phẩm|flyer|standee|infographic/i.test(lower)) {
    return 'media_design';
  }
  if (/khảo sát|điều tra|thăm dò|lấy phiếu|phiếu hỏi|ý kiến người dân|nghiên cứu khoa học|đề tài|thu thập số liệu/i.test(lower)) {
    return 'survey_research';
  }
  if (/sửa chữa|bảo dưỡng|bảo trì|điện nước|máy lạnh|điều hòa|pccc|phòng cháy|cơ sở vật chất|cải tạo|sơn sửa|hỏng|khắc phục sự cố/i.test(lower)) {
    return 'maintenance';
  }
  if (/tuyển dụng|phỏng vấn|tiếp nhận cán bộ|nhân sự|đánh giá cán bộ|quy hoạch|bổ nhiệm|khen thưởng|thi đua/i.test(lower)) {
    return 'recruitment_hr';
  }
  if (/hợp tác|ký kết|biên bản ghi nhớ|mou|đối tác|tiếp đoàn|làm việc với|ngoại giao|giao lưu hữu nghị/i.test(lower)) {
    return 'partnership';
  }
  if (/y tế|sức khỏe|khám sức khỏe|vệ sinh an toàn|phòng chống dịch|an toàn lao động|khử khuẩn|tiêm chủng/i.test(lower)) {
    return 'health_safety';
  }
  if (/website|web|app|phần mềm|api|hệ thống|database|máy chủ|server|cloud|frontend|backend|ui|ux|it|số hóa|mã nguồn|cntt|code|bug|devops|mạng/i.test(lower)) {
    return 'tech';
  }
  if (/đoàn|đại hội|nghị quyết|chi bộ|chi đoàn|thanh niên|cán bộ|hội nghị|tuyên truyền|chính trị|học tập|chỉ thị/i.test(lower)) {
    return 'youth';
  }
  if (/sự kiện|hội thảo|workshop|tổ chức|khai mạc|lễ|chương trình|hội thi|diễn đàn|tọa đàm/i.test(lower)) {
    return 'event';
  }
  if (/kinh doanh|bán hàng|marketing|thị trường|doanh số|sản phẩm|ocop|quảng cáo|khách hàng|thương mại/i.test(lower)) {
    return 'commerce';
  }
  if (/đào tạo|tập huấn|khóa học|giáo trình|bài giảng|chuyên đề|học phần|hướng dẫn/i.test(lower)) {
    return 'education';
  }
  if (/báo cáo|thống kê|tài chính|ngân sách|thu chi|kế toán|kiểm toán|quyết toán|chi phí/i.test(lower)) {
    return 'finance';
  }

  return 'general';
}

export interface GeneratedSubtask {
  title: string;
  phase: string;
  phaseId: TaskPhaseId;
  completionCriteria?: string;
  implementationSteps?: string[];
  deliverable?: string;
  relatedDocuments?: string;
  completed: boolean;
  resource?: {
    title: string;
    url: string;
    description: string;
  };
}

interface RawSubtaskTemplate {
  phase: string;
  phaseId: TaskPhaseId;
  title: string;
  completionCriteria: string;
  implementationSteps: string[];
  deliverable: string;
  relatedDocuments: string;
  docTitle: string;
  query: string;
  desc: string;
}

export function generateDynamicSubtasks(
  taskTitle: string,
  taskUnit: string,
  mode: 'phased' | 'standard' | 'detailed' | 'deliverables' = 'phased'
): { analysis: string; subtasks: GeneratedSubtask[]; domain: TaskDomain } {
  const cleanTitle = (taskTitle || 'Nhiệm vụ trọng tâm').trim();
  const cleanSubject = cleanTitle.replace(/^(tôi|nhiệm vụ|kế hoạch|triển khai|thực hiện)\s+/i, '').trim();
  const subject = cleanSubject.length > 55 ? `${cleanSubject.slice(0, 52)}...` : cleanSubject;
  const unitLabel = (taskUnit || 'đơn vị').trim();
  const domain = detectTaskDomain(cleanTitle);

  let analysis = `Tham mưu kế hoạch cho bạn về "${subject}" (thuộc mảng việc cho ${unitLabel}): Bạn cần làm chủ tiến độ qua 3 giai đoạn chuẩn bị kỹ lưỡng, trực tiếp triển khai đồng bộ và hoàn tất hồ sơ nghiệm thu đúng thời hạn.`;
  let defs: RawSubtaskTemplate[] = [];

  switch (domain) {
    case 'sports':
      analysis = `Tham mưu mảng thể thao cho bạn (${unitLabel}): Điểm then chốt của giải đấu là điều lệ công bằng, kiểm soát chặt chẽ danh sách vận động viên và đảm bảo an toàn y tế sân bãi cho "${subject}".`;
      defs = [
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi xây dựng dự thảo điều lệ giải và cơ cấu khen thưởng cho "${subject}"`,
          completionCriteria: 'Điều lệ ban hành có đủ thể thức thi đấu, cơ cấu giải thưởng và tiêu chuẩn VĐV hợp lệ.',
          implementationSteps: [
            'Thu thập ý kiến các đơn vị tham gia về thời gian và thể thức thi đấu.',
            'Soạn thảo văn bản điều lệ giải chi tiết và bảng dự toán giải thưởng.',
            'Trình lãnh đạo phê duyệt và gửi thông báo chính thức đến các đội thi.',
          ],
          deliverable: 'Văn bản Điều lệ giải đấu và Thông báo triệu tập VĐV.',
          relatedDocuments: 'Mẫu điều lệ giải đấu thể thao phong trào; Quy chế khen thưởng.',
          docTitle: 'Mẫu điều lệ giải đấu thể thao phong trào',
          query: `mẫu điều lệ giải bóng đá hội thao`,
          desc: 'Văn bản quy định thể thức thi đấu và độ tuổi',
        },
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi khảo sát thuê sân bãi, liên hệ tổ trọng tài chuyên môn và chuẩn bị bóng/dụng cụ thi đấu`,
          completionCriteria: 'Có hợp đồng thuê sân bãi đạt chuẩn và văn bản xác nhận phân công của tổ trọng tài.',
          implementationSteps: [
            'Khảo sát chất lượng mặt sân cỏ/nhà thi đấu và hệ thống chiếu sáng.',
            'Làm việc với trung tâm thể thao hoặc liên đoàn để mời trọng tài có chứng chỉ.',
            'Kiểm tra và chuẩn bị số lượng bóng thi đấu, đồng hồ bấm giờ, còi và cờ biên.',
          ],
          deliverable: 'Biên bản thỏa thuận thuê sân bãi và danh sách tổ trọng tài.',
          relatedDocuments: 'Hợp đồng thuê sân bãi; Biên bản phân công trọng tài.',
          docTitle: 'Hợp đồng thuê sân bãi và tổ trọng tài',
          query: `kinh nghiệm thuê trọng tài và sân thi đấu`,
          desc: 'Đảm bảo điều kiện chuyên môn đạt chuẩn',
        },
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi tổ chức họp bốc thăm chia bảng, phổ biến luật thi đấu và chốt danh sách vận động viên`,
          completionCriteria: '100% các đội thi có đại diện bốc thăm và ký xác nhận danh sách VĐV không tranh chấp.',
          implementationSteps: [
            'Kiểm tra hồ sơ nhân sự, căn cước công dân và giấy khám sức khỏe VĐV.',
            'Điều hành phiên bốc thăm công khai và lập mã số lịch thi đấu.',
            'Lập biên bản họp bốc thăm có chữ ký đại diện các trưởng đoàn.',
          ],
          deliverable: 'Biên bản bốc thăm và Lịch thi đấu chính thức toàn giải.',
          relatedDocuments: 'Biên bản bốc thăm; Danh sách đăng ký VĐV.',
          docTitle: 'Biên bản bốc thăm và bảng mã lịch thi đấu',
          query: `cách xếp lịch thi đấu vòng tròn và loại trực tiếp`,
          desc: 'Lập lịch thi đấu công bằng và minh bạch',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi chuẩn bị cờ lưu niệm, cúp huy chương, nước uống và bố trí tổ y tế trực cấp cứu`,
          completionCriteria: 'Có đủ cúp, cờ lưu niệm, túi y tế sơ cứu cơ bản và nhân sự trực y tế trong suốt giải.',
          implementationSteps: [
            'Kiểm tra số lượng cúp vô địch, huy chương vàng/bạc/đồng và cờ lưu niệm.',
            'Bố trí nước uống đóng chai tại từng khu vực kỹ thuật của các đội.',
            'Lắp đặt bàn y tế sơ cứu chấn thương kèm đầy đủ bình xịt lạnh, băng nẹp.',
          ],
          deliverable: 'Khu vực hậu cần - y tế hoàn chỉnh sẵn sàng phục vụ.',
          relatedDocuments: 'Checklist hậu cần y tế; Danh mục thuốc sơ cứu.',
          docTitle: 'Checklist chuẩn bị y tế và hậu cần giải thể thao',
          query: `túi sơ cứu chấn thương thể thao sân bãi`,
          desc: 'Đảm bảo an toàn sức khỏe cho vận động viên',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi trực tiếp điều hành lễ khai mạc và giám sát diễn biến các trận đấu theo đúng lịch`,
          completionCriteria: 'Lễ khai mạc đúng nghi thức, các trận đấu diễn ra an toàn, đúng giờ và đúng điều lệ.',
          implementationSteps: [
            'Điều phối các đội tập hợp hàng ngũ, chào cờ và tuyên bố khai mạc ngắn gọn.',
            'Phối hợp với giám sát trận đấu và tổ trọng tài ghi nhận kết quả từng hiệp.',
            'Giải quyết kịp thời các tình huống khiếu nại phát sinh trên sân.',
          ],
          deliverable: 'Biên bản kết quả thi đấu từng trận có xác nhận trọng tài.',
          relatedDocuments: 'Kịch bản khai mạc; Biên bản giám sát trận đấu.',
          docTitle: 'Kịch bản khai mạc và điều hành giải đấu',
          query: `kịch bản khai mạc giải thể thao phong trào`,
          desc: 'Bao quát sân thi đấu và xử lý tình huống phát sinh',
        },
        {
          phase: 'Giai đoạn 3: Tổng kết – Hoàn thành',
          phaseId: 'conclusion',
          title: `Tôi tổ chức lễ bế mạc, trao huy chương giải thưởng và quyết toán kinh phí`,
          completionCriteria: 'Trao thưởng chính xác cho các đội đoạt giải và hoàn tất bảng quyết toán tài chính kèm hóa đơn.',
          implementationSteps: [
            'Điều hành lễ trao giải thưởng, cúp, huy chương và chụp ảnh lưu niệm.',
            'Tổng hợp bảng kê điểm số, danh hiệu cá nhân và danh hiệu tập thể.',
            'Hoàn thiện toàn bộ chứng từ thanh toán tiền sân bãi, trọng tài và giải thưởng.',
          ],
          deliverable: 'Báo cáo tổng kết giải đấu và Hồ sơ chứng từ quyết toán kinh phí.',
          relatedDocuments: 'Báo cáo kết quả giải thi đấu; Bảng kê chứng từ thanh quyết toán.',
          docTitle: 'Biên bản tổng kết và trao giải thưởng thể thao',
          query: `mẫu báo cáo tổng kết giải thể thao phong trào`,
          desc: 'Tổng hợp thứ hạng và hoàn tất giải đấu trọn vẹn',
        },
      ];
      break;

    case 'procurement':
      analysis = `Tham mưu mua sắm/vật tư cho bạn (${unitLabel}): Yếu tố cốt lõi là minh bạch báo giá, đúng quy chuẩn kỹ thuật và kiểm tra kỹ tem bảo hành khi nghiệm thu bàn giao cho "${subject}".`;
      defs = [
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi khảo sát nhu cầu thực tế và lập danh mục quy cách kỹ thuật chi tiết của "${subject}"`,
          completionCriteria: 'Bảng đặc tính kỹ thuật đáp ứng đúng nhu cầu sử dụng và định mức của đơn vị.',
          implementationSteps: [
            'Tổng hợp số lượng và yêu cầu tính năng kỹ thuật từ các bộ phận trực tiếp sử dụng.',
            'Rà soát tiêu chuẩn định mức trang thiết bị theo quy định hiện hành.',
            'Lập bảng mô tả quy cách kỹ thuật chi tiết làm cơ sở lấy báo giá.',
          ],
          deliverable: 'Bản yêu cầu kỹ thuật và dự toán mua sắm sơ bộ.',
          relatedDocuments: 'Phiếu đề xuất mua sắm; Tiêu chuẩn định mức tài sản chuyên môn.',
          docTitle: 'Biểu mẫu khảo sát nhu cầu trang thiết bị văn phòng',
          query: `mẫu đề xuất mua sắm trang thiết bị văn phòng`,
          desc: 'Làm rõ số lượng và tiêu chuẩn kỹ thuật',
        },
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi thu thập tối thiểu 3 bảng báo giá hợp lệ từ các đơn vị cung cấp độc lập`,
          completionCriteria: 'Có đủ 3 bảng báo giá có mộc đỏ hoặc xác nhận hợp lệ cùng thông số kỹ thuật.',
          implementationSteps: [
            'Gửi bản yêu cầu kỹ thuật đến ít nhất 3 nhà cung cấp uy tín trên thị trường.',
            'Theo dõi và đôn đốc các đơn vị gửi bảng báo giá cạnh tranh trước hạn.',
            'Lập bảng so sánh thông số, giá cả, thời gian giao hàng và chế độ bảo hành.',
          ],
          deliverable: 'Bảng tổng hợp so sánh báo giá của 3 nhà cung cấp.',
          relatedDocuments: 'Bảng báo giá của các nhà cung cấp; Bảng phân tích so sánh giá.',
          docTitle: 'Bảng tổng hợp so sánh 3 báo giá cạnh tranh',
          query: `mẫu bảng so sánh báo giá mua sắm tài sản`,
          desc: 'So sánh minh bạch thông số kỹ thuật và giá cả',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi soạn thảo tờ trình mua sắm, dự thảo hợp đồng cung cấp và trình lãnh đạo phê duyệt`,
          completionCriteria: 'Tờ trình và hợp đồng mua bán được ký kết đúng thẩm quyền quy định.',
          implementationSteps: [
            'Soạn thảo Tờ trình xin chủ trương và phê duyệt đơn vị trúng thầu/cung ứng.',
            'Rà soát các điều khoản hợp đồng về bảo hành, vận chuyển và phương thức thanh toán.',
            'Ký hợp đồng chính thức và thông báo thời gian bàn giao lắp đặt.',
          ],
          deliverable: 'Hợp đồng mua bán hàng hóa đã ký kèm Tờ trình phê duyệt.',
          relatedDocuments: 'Mẫu hợp đồng mua bán hàng hóa; Tờ trình phê duyệt mua sắm.',
          docTitle: 'Mẫu tờ trình phê duyệt mua sắm trang thiết bị',
          query: `mẫu tờ trình phê duyệt mua sắm trang thiết bị`,
          desc: 'Tờ trình nêu rõ sự cần thiết và lựa chọn tối ưu',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi trực tiếp kiểm tra tem mác, chạy thử thiết bị và ký biên bản nghiệm thu bàn giao`,
          completionCriteria: 'Thiết bị hoạt động ổn định, đủ phụ kiện, nguyên tem bảo hành và có chữ ký xác nhận của các bên.',
          implementationSteps: [
            'Kiểm tra ngoại quan, tem chống hàng giả, số serial và phụ kiện đi kèm.',
            'Cắm nguồn chạy thử các tính năng thực tế đạt chuẩn yêu cầu kỹ thuật.',
            'Lập biên bản bàn giao và dán tem quản lý tài sản đơn vị.',
          ],
          deliverable: 'Biên bản nghiệm thu bàn giao tài sản có đầy đủ chữ ký.',
          relatedDocuments: 'Biên bản bàn giao và nghiệm thu thiết bị; Phiếu bảo hành chính hãng.',
          docTitle: 'Biên bản nghiệm thu và bàn giao trang thiết bị',
          query: `mẫu biên bản nghiệm thu bàn giao thiết bị máy tính máy in`,
          desc: 'Xác nhận thiết bị hoạt động tốt và đúng thông số',
        },
        {
          phase: 'Giai đoạn 3: Tổng kết – Hoàn thành',
          phaseId: 'conclusion',
          title: `Tôi hoàn thiện hồ sơ chứng từ thanh toán kế toán và cập nhật sổ theo dõi tài sản`,
          completionCriteria: 'Bộ hồ sơ thanh toán đầy đủ hóa đơn điện tử hợp lệ và tài sản được ghi nhận vào sổ quản lý.',
          implementationSteps: [
            'Kiểm tra hóa đơn GTGT điện tử, hợp đồng, biên bản nghiệm thu và báo giá.',
            'Trình phòng tài chính kế toán làm thủ tục thanh toán cho nhà cung cấp.',
            'Cập nhật thông tin tài sản vào sổ theo dõi tài sản công của đơn vị.',
          ],
          deliverable: 'Hồ sơ thanh toán hoàn tất và Sổ theo dõi tài sản đã cập nhật.',
          relatedDocuments: 'Hóa đơn điện tử; Giấy đề nghị thanh toán; Sổ tài sản.',
          docTitle: 'Hồ sơ thanh toán và sổ theo dõi tài sản cơ quan',
          query: `quy trình thanh toán mua sắm tài sản công`,
          desc: 'Đảm bảo minh chứng kế toán đúng luật và lưu trữ an toàn',
        },
      ];
      break;

    default:
      // General adaptable 3-phase template
      analysis = `Tham mưu kế hoạch hành động cho bạn (${unitLabel}): Với nhiệm vụ "${subject}", giải pháp hiệu quả nhất là chia nhỏ theo 3 giai đoạn: Chuẩn bị điều kiện cơ sở, Trực tiếp triển khai dứt điểm và Nghiệm thu bàn giao hoàn tất trước hạn.`;
      defs = [
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi làm rõ mục tiêu cụ thể, tiêu chuẩn đầu ra và thống nhất đầu mối phối hợp cho "${subject}"`,
          completionCriteria: 'Có bản tóm tắt mục tiêu cụ thể và kế hoạch hành động phân công rõ ràng.',
          implementationSteps: [
            'Rà soát kỹ yêu cầu của cấp trên và phạm vi công việc cần thực hiện.',
            'Xác định rõ tiêu chuẩn chất lượng sản phẩm cần đạt khi kết thúc.',
            'Liên hệ các bộ phận/cá nhân phối hợp để thống nhất cách thức triển khai.',
          ],
          deliverable: 'Bản kế hoạch triển khai công việc chi tiết.',
          relatedDocuments: 'Kế hoạch hành động; Hướng dẫn nghiệp vụ chuyên môn.',
          docTitle: 'Khung xác định mục tiêu công việc cá nhân',
          query: `hướng dẫn lập kế hoạch hành động cá nhân ${encodeURIComponent(cleanSubject)}`,
          desc: 'Bản ghi nhớ rõ ràng những việc mình cần nộp',
        },
        {
          phase: 'Giai đoạn 1: Chuẩn bị',
          phaseId: 'preparation',
          title: `Tôi thu thập tài liệu gốc, số liệu đầu vào và biểu mẫu cần thiết đối với "${subject}"`,
          completionCriteria: 'Số liệu và tài liệu đầu vào đầy đủ, xác thực và sẵn sàng đưa vào xử lý.',
          implementationSteps: [
            'Tổng hợp các văn bản chỉ đạo, hồ sơ lưu trữ và số liệu liên quan.',
            'Kiểm tra tính chính xác và đối chiếu độ tin cậy của các nguồn dữ liệu.',
            'Sắp xếp tài liệu vào thư mục công tác để tra cứu nhanh khi triển khai.',
          ],
          deliverable: 'Bộ tài liệu và số liệu đầu vào hoàn chỉnh.',
          relatedDocuments: 'Biểu mẫu thu thập thông tin; Báo cáo dữ liệu kỳ trước.',
          docTitle: 'Checklist chuẩn bị dữ liệu và tài liệu chuyên môn',
          query: `checklist chuẩn bị công việc chuyên môn ${encodeURIComponent(cleanSubject)}`,
          desc: 'Thu thập sẵn sàng để khi làm không bị gián đoạn',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi trực tiếp xử lý nội dung trọng tâm và soạn thảo dự thảo kết quả của "${subject}"`,
          completionCriteria: 'Nội dung dự thảo hoàn thành đúng tiến độ, đáp ứng đủ các nội dung chuyên môn yêu cầu.',
          implementationSteps: [
            'Tập trung xử lý lần lượt từng nội dung trọng tâm theo kế hoạch.',
            'Soạn thảo văn bản/dự thảo báo cáo hoặc hoàn thiện sản phẩm chuyên môn.',
            'Chủ động xử lý các vướng mắc phát sinh trong quá trình thực hiện.',
          ],
          deliverable: 'Bản dự thảo kết quả công việc hoàn chỉnh lần 1.',
          relatedDocuments: 'Đề cương chi tiết; Mẫu văn bản chuyên ngành.',
          docTitle: 'Phương pháp tập trung xử lý công việc dứt điểm',
          query: `phương pháp làm việc tập trung dứt điểm`,
          desc: 'Mẹo xử lý dứt điểm từng đầu việc trong ngày',
        },
        {
          phase: 'Giai đoạn 2: Triển khai',
          phaseId: 'execution',
          title: `Tôi tự rà soát đối chiếu tiêu chuẩn và gửi xin ý kiến góp ý của các bên liên quan`,
          completionCriteria: 'Sản phẩm được chỉnh lý hoàn thiện sau khi tiếp thu các ý kiến đóng góp xác đáng.',
          implementationSteps: [
            'Tự kiểm tra lại câu từ, số liệu, tính logic và hình thức trình bày.',
            'Gửi xin ý kiến góp ý của đồng nghiệp hoặc bộ phận phối hợp.',
            'Tiếp thu và hoàn thiện dự thảo chính thức sẵn sàng trình duyệt.',
          ],
          deliverable: 'Bản hoàn chỉnh đã được tiếp thu chỉnh lý.',
          relatedDocuments: 'Bảng tổng hợp ý kiến đóng góp; Bản rà soát chất lượng.',
          docTitle: 'Checklist tự kiểm tra chất lượng sản phẩm',
          query: `cách tự kiểm tra công việc trước khi nộp`,
          desc: 'Bộ tiêu chí rà soát để đảm bảo chất lượng cao nhất',
        },
        {
          phase: 'Giai đoạn 3: Tổng kết – Hoàn thành',
          phaseId: 'conclusion',
          title: `Tôi trình ký phê duyệt, bàn giao kết quả cho ${unitLabel} và lưu trữ hồ sơ minh chứng`,
          completionCriteria: 'Kết quả được cấp có thẩm quyền phê duyệt/nghiệm thu và hồ sơ được lưu trữ an toàn.',
          implementationSteps: [
            'In ấn, ký phát hành hoặc gửi chuyển giao sản phẩm cho bộ phận tiếp nhận.',
            'Xác nhận nghiệm thu hoàn thành công việc trên hệ thống quản lý.',
            'Lưu trữ hồ sơ điện tử và bản cứng phục vụ tra cứu lâu dài.',
          ],
          deliverable: 'Biên bản bàn giao/Văn bản đã phê duyệt và Hồ sơ lưu trữ.',
          relatedDocuments: 'Biên bản nghiệm thu; Sổ theo dõi bàn giao công việc.',
          docTitle: 'Mẫu biên bản bàn giao và lưu trữ minh chứng',
          query: `mẫu báo cáo hoàn thành công việc chuyên môn`,
          desc: 'Ghi nhận công việc hoàn thành xuất sắc và đúng hạn',
        },
      ];
      break;
  }

  let selected = defs;
  if (mode === 'standard') {
    selected = defs.slice(0, 5);
  } else if (mode === 'detailed') {
    selected = defs;
  } else if (mode === 'deliverables') {
    selected = defs.map((st) => ({
      ...st,
      title: `Sản phẩm hoàn thành: ${st.title.replace(/^Tôi\s+/i, '')}`,
    }));
  }

  const subtasks: GeneratedSubtask[] = selected.map((s) => ({
    title: s.title,
    phase: s.phase,
    phaseId: s.phaseId,
    completionCriteria: s.completionCriteria,
    implementationSteps: s.implementationSteps,
    deliverable: s.deliverable,
    relatedDocuments: s.relatedDocuments,
    completed: false,
    resource: {
      title: s.docTitle,
      url: `https://www.google.com/search?q=${encodeURIComponent(s.query)}`,
      description: s.desc,
    },
  }));

  return { analysis, subtasks, domain };
}
