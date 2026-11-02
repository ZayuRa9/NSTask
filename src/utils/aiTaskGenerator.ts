/**
 * AI Task Generator Utility
 * Dynamically analyzes task title context and generates domain-specific,
 * actionable subtasks customized to the exact keywords of the task.
 */

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
  completed: boolean;
  resource?: {
    title: string;
    url: string;
    description: string;
  };
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

  let analysis = `Tham mưu cá nhân cho bạn về "${subject}" (thuộc mảng việc cho ${unitLabel}): Bạn cần làm chủ tiến độ qua từng bước chuẩn bị điều kiện, trực tiếp triển khai và hoàn tất hồ sơ nghiệm thu đúng thời hạn.`;
  let defs: Array<{ phase: string; title: string; docTitle: string; query: string; desc: string }> = [];

  switch (domain) {
    case 'sports':
      analysis = `Tham mưu mảng thể thao cho bạn (${unitLabel}): Điểm then chốt của giải đấu là điều lệ công bằng, kiểm soát chặt chẽ danh sách vận động viên và đảm bảo an toàn y tế sân bãi cho "${subject}".`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi xây dựng dự thảo điều lệ giải và cơ cấu khen thưởng cho "${subject}"`,
          docTitle: 'Mẫu điều lệ giải đấu thể thao phong trào',
          query: `mẫu điều lệ giải bóng đá hội thao`,
          desc: 'Văn bản quy định thể thức thi đấu và độ tuổi',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi khảo sát thuê sân bãi, liên hệ tổ trọng tài chuyên môn và chuẩn bị bóng/dụng cụ thi đấu`,
          docTitle: 'Hợp đồng thuê sân bãi và tổ trọng tài',
          query: `kinh nghiệm thuê trọng tài và sân thi đấu`,
          desc: 'Đảm bảo điều kiện chuyên môn đạt chuẩn',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi tổ chức họp bốc thăm chia bảng, phổ biến luật thi đấu và chốt danh sách vận động viên`,
          docTitle: 'Biên bản bốc thăm và bảng mã lịch thi đấu',
          query: `cách xếp lịch thi đấu vòng tròn và loại trực tiếp`,
          desc: 'Lập lịch thi đấu công bằng và minh bạch',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi chuẩn bị cờ lưu niệm, cúp huy chương, nước uống và bố trí tổ y tế trực cấp cứu`,
          docTitle: 'Checklist chuẩn bị y tế và hậu cần giải thể thao',
          query: `túi sơ cứu chấn thương thể thao sân bãi`,
          desc: 'Đảm bảo an toàn sức khỏe cho vận động viên',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi trực tiếp điều hành lễ khai mạc và giám sát diễn biến các trận đấu theo đúng lịch`,
          docTitle: 'Kịch bản khai mạc và điều hành giải đấu',
          query: `kịch bản khai mạc giải thể thao phong trào`,
          desc: 'Bao quát sân thi đấu và xử lý tình huống phát sinh',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi tổ chức lễ bế mạc trao giải, thanh toán chi phí và hoàn tất báo cáo tổng kết`,
          docTitle: 'Biên bản trao giải và quyết toán kinh phí giải đấu',
          query: `mẫu báo cáo tổng kết giải thi đấu thể thao`,
          desc: 'Lưu trữ hồ sơ chứng từ thanh quyết toán',
        },
      ];
      break;

    case 'procurement':
      analysis = `Tham mưu mua sắm vật tư cho bạn (${unitLabel}): Yếu tố cốt lõi là thu thập đủ 3 bảng báo giá độc lập, lập tờ trình dự toán và kiểm đếm thực tế đúng quy cách kỹ thuật đối với "${subject}".`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi khảo sát nhu cầu thực tế, xác định quy cách kỹ thuật chi tiết đối với "${subject}"`,
          docTitle: 'Bản mô tả yêu cầu kỹ thuật và số lượng mua sắm',
          query: `mẫu bảng đặc tính kỹ thuật hàng hóa mua sắm`,
          desc: 'Bảng thông số cấu hình và chủng loại vật tư',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi liên hệ thu thập ít nhất 3 bảng báo giá cạnh tranh từ các nhà cung cấp uy tín`,
          docTitle: 'Bảng tổng hợp so sánh báo giá các đơn vị',
          query: `mẫu bảng so sánh báo giá nhà cung cấp`,
          desc: 'So sánh giá thành, bảo hành và tiến độ giao hàng',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi soạn thảo tờ trình xin phê duyệt chủ trương và dự toán kinh phí mua sắm`,
          docTitle: 'Mẫu tờ trình xin phê duyệt dự toán mua sắm tài sản',
          query: `mẫu tờ trình mua sắm trang thiết bị văn phòng`,
          desc: 'Hồ sơ pháp lý trình cấp thẩm quyền ký duyệt',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi phối hợp thương thảo hợp đồng mua bán và hẹn lịch bàn giao hàng hóa`,
          docTitle: 'Mẫu hợp đồng mua sắm trang thiết bị tài sản',
          query: `mẫu hợp đồng mua bán trang thiết bị văn phòng`,
          desc: 'Ràng buộc trách nhiệm bảo hành và hóa đơn hợp lệ',
        },
        {
          phase: 'Kiểm tra',
          title: `Tôi trực tiếp kiểm tra niêm phong, kiểm đếm số lượng và lập biên bản nghiệm thu bàn giao`,
          docTitle: 'Biên bản nghiệm thu và bàn giao tài sản',
          query: `mẫu biên bản giao nhận thiết bị văn phòng`,
          desc: 'Ký xác nhận đúng cấu hình cam kết',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi hoàn tất hồ sơ thanh quyết toán, nhập kho và vào sổ theo dõi tài sản đơn vị`,
          docTitle: 'Bộ hồ sơ thanh toán chứng từ mua sắm',
          query: `hồ sơ thanh toán mua sắm cơ quan đơn vị`,
          desc: 'Hóa đơn VAT và chứng từ chuyển khoản lưu trữ',
        },
      ];
      break;

    case 'inspection':
      analysis = `Tham mưu kiểm tra/thanh tra cho bạn (${unitLabel}): Tính khách quan, căn cứ văn bản rõ ràng và biên bản có chữ ký xác nhận của đại diện đơn vị tại chỗ là yêu cầu số 1 cho "${subject}".`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi nghiên cứu căn cứ pháp lý và xây dựng đề cương kiểm tra đối với "${subject}"`,
          docTitle: 'Đề cương kiểm tra chuyên đề nghiệp vụ',
          query: `mẫu đề cương kiểm tra chuyên đề đơn vị`,
          desc: 'Xác định rõ đối tượng, thời kỳ và nội dung kiểm tra',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi soạn thảo quyết định thành lập tổ công tác và thông báo lịch kiểm tra gửi đơn vị`,
          docTitle: 'Thông báo lịch kiểm tra và yêu cầu chuẩn bị hồ sơ',
          query: `mẫu thông báo kiểm tra chuyên môn cơ sở`,
          desc: 'Gửi trước để đơn vị cơ sở chuẩn bị báo cáo số liệu',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi trực tiếp kiểm tra hồ sơ thực tế, đối chiếu số liệu và rà soát các quy trình tại chỗ`,
          docTitle: 'Checklist kiểm tra hồ sơ nghiệp vụ tại chỗ',
          query: `phương pháp kiểm tra rà soát hồ sơ hành chính`,
          desc: 'Ghi chép cụ thể các tồn tại, hạn chế nếu có',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi lập biên bản làm việc ghi nhận kết quả kiểm tra với sự chứng kiến của các bên`,
          docTitle: 'Mẫu biên bản làm việc kiểm tra xác minh',
          query: `mẫu biên bản làm việc kiểm tra cơ sở`,
          desc: 'Biên bản có chữ ký xác nhận của đại diện đơn vị',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi tổng hợp kết quả, xây dựng dự thảo thông báo kết luận kiểm tra và kiến nghị xử lý`,
          docTitle: 'Mẫu thông báo kết luận kiểm tra chuyên môn',
          query: `mẫu kết luận kiểm tra cơ quan đơn vị`,
          desc: 'Báo cáo trình lãnh đạo ký ban hành kết luận',
        },
      ];
      break;

    case 'legal_policy':
      analysis = `Tham mưu soạn thảo quy chế/chính sách cho bạn (${unitLabel}): Cần đối chiếu kỹ với văn bản cấp trên và lấy ý kiến góp ý rộng rãi từ các bộ phận thực thi để quy chế có tính khả thi cao đối với "${subject}".`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi thu thập các văn bản quy phạm pháp luật cấp trên làm căn cứ pháp lý cho "${subject}"`,
          docTitle: 'Bảng hệ thống hóa căn cứ pháp lý liên quan',
          query: `cách tra cứu văn bản quy phạm pháp luật chuẩn xác`,
          desc: 'Rà soát tránh trái thẩm quyền hoặc mâu thuẫn chính sách',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi soạn thảo đề cương chi tiết các chương, điều khoản quy định của "${subject}"`,
          docTitle: 'Đề cương chi tiết quy chế nội bộ',
          query: `kỹ thuật soạn thảo quy chế quản lý nội bộ`,
          desc: 'Bố cục rõ ràng: quy định chung, nội dung cụ thể, trách nhiệm thi hành',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi chấp bút viết dự thảo lần 1 và lập phiếu lấy ý kiến góp ý của các phòng ban`,
          docTitle: 'Mẫu phiếu lấy ý kiến góp ý dự thảo quy chế',
          query: `quy trình lấy ý kiến góp ý văn bản nội bộ`,
          desc: 'Gửi dự thảo lấy ý kiến trong 5-7 ngày làm việc',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi tổng hợp bảng tiếp thu, giải trình ý kiến góp ý và hoàn thiện dự thảo lần 2`,
          docTitle: 'Bản tổng hợp tiếp thu và giải trình ý kiến',
          query: `mẫu báo cáo giải trình tiếp thu ý kiến góp ý`,
          desc: 'Giải thích rõ nội dung nào tiếp thu, nội dung nào giữ nguyên',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi trình ký quyết định ban hành, gửi văn bản đến các đơn vị và lưu hồ sơ lưu trữ`,
          docTitle: 'Tờ trình ban hành quy chế và quyết định kèm theo',
          query: `mẫu quyết định ban hành quy chế nội bộ`,
          desc: 'Văn bản chính thức có hiệu lực thi hành',
        },
      ];
      break;

    case 'media_design':
      analysis = `Tham mưu thiết kế/truyền thông cho bạn (${unitLabel}): Hãy chốt sớm kích thước hiển thị, bảng màu chuẩn và nội dung chữ duyệt trước để bản thiết kế "${subject}" đạt hiệu ứng cao nhất.`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi xác định thông điệp trọng tâm, kích thước hiển thị và bảng màu thiết kế cho "${subject}"`,
          docTitle: 'Bản định hướng ý tưởng thiết kế (Creative Brief)',
          query: `mẫu creative brief thiết kế truyền thông`,
          desc: 'Tóm tắt yêu cầu thị giác và nội dung bắt buộc',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi chuẩn bị nội dung câu chữ (copywriting), logo chuẩn vector và hình ảnh tư liệu chất lượng cao`,
          docTitle: 'Kho tài nguyên hình ảnh và quy chuẩn logo',
          query: `nguyên tắc sắp xếp bố cục thiết kế poster banner`,
          desc: 'Tránh vỡ ảnh hoặc sai quy chuẩn logo thương hiệu',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi tiến hành phác thảo layout bố cục và hoàn thiện bản thiết kế demo`,
          docTitle: 'File phác thảo thiết kế và bố cục typography',
          query: `hướng dẫn thiết kế ấn phẩm truyền thông chuyên nghiệp`,
          desc: 'Bản thiết kế trực quan sắc nét',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi gửi xin ý kiến duyệt mẫu, tiếp thu chỉnh sửa các chi tiết để chốt phương án chính thức`,
          docTitle: 'Biên bản duyệt market mẫu thiết kế',
          query: `quy trình duyệt market in ấn truyền thông`,
          desc: 'Chốt chính xác màu sắc và lỗi chính tả',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi xuất file in ấn chuẩn CMYK và file số RGB, bàn giao tài nguyên cho các bộ phận sử dụng`,
          docTitle: 'Quy chuẩn xuất file in và file truyền thông mạng xã hội',
          query: `cách xuất file in ấn chất lượng cao không lệch màu`,
          desc: 'Lưu trữ file gốc và bàn giao đúng hẹn',
        },
      ];
      break;

    case 'tech':
      analysis = `Tham mưu kỹ thuật công nghệ cho bạn (${unitLabel}): Rủi ro thường gặp là phát sinh lỗi trong môi trường thực tế. Hãy chốt danh sách tính năng tối thiểu (MVP) cho "${subject}", cấu hình môi trường chuẩn và kiểm thử từng module.`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi rà soát yêu cầu kỹ thuật và xác định danh sách tính năng trọng tâm cho "${subject}"`,
          docTitle: 'Khung mô tả yêu cầu tính năng kỹ thuật',
          query: `hướng dẫn xác định yêu cầu tính năng phần mềm`,
          desc: 'Tài liệu tóm tắt các tính năng cốt lõi cần làm',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi thiết kế luồng xử lý dữ liệu và cấu trúc giao diện làm việc`,
          docTitle: 'Mẫu phác thảo luồng dữ liệu và wireframe',
          query: `cách vẽ luồng xử lý ứng dụng đơn giản`,
          desc: 'Sơ đồ hình dung các bước trước khi bắt tay lập trình',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi cài đặt môi trường, cấu hình thư viện và chuẩn bị công cụ thực thi`,
          docTitle: 'Checklist cấu hình môi trường phát triển',
          query: `checklist thiết lập môi trường phát triển`,
          desc: 'Danh mục công cụ cần cài đặt để làm việc nhanh',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi trực tiếp phát triển các module tính năng cốt lõi theo thứ tự ưu tiên`,
          docTitle: 'Nguyên tắc triển khai tính năng theo module',
          query: `kinh nghiệm lập trình module tính năng hiệu quả`,
          desc: 'Mẹo tập trung giải quyết dứt điểm từng phần việc',
        },
        {
          phase: 'Kiểm tra',
          title: `Tôi tự kiểm thử các tình huống dữ liệu thực tế, sửa lỗi và tối ưu hiệu năng`,
          docTitle: 'Bảng kiểm tra lỗi trước khi nghiệm thu',
          query: `bảng kiểm thử phần mềm cho chuyên viên`,
          desc: 'Checklist kiểm tra kỹ thuật không bỏ sót lỗi',
        },
        {
          phase: 'Bàn giao',
          title: `Tôi soạn tài liệu tóm tắt hướng dẫn sử dụng và bàn giao sản phẩm hoàn thiện`,
          docTitle: 'Mẫu biên bản bàn giao và hướng dẫn vận hành',
          query: `mẫu hướng dẫn sử dụng phần mềm ngắn gọn`,
          desc: 'Tài liệu ngắn gọn giúp người tiếp nhận dùng được ngay',
        },
      ];
      break;

    default:
      // Dynamically tailored general domain embedding subject
      analysis = `Tham mưu kế hoạch hành động cho bạn (${unitLabel}): Đối với "${subject}", chìa khóa thành công là bạn chủ động làm rõ tiêu chuẩn đầu ra, chuẩn bị kỹ tài liệu và phối hợp chặt chẽ để bàn giao kết quả đúng hạn.`;
      defs = [
        {
          phase: 'Chuẩn bị',
          title: `Tôi làm rõ mục tiêu cụ thể, tiêu chuẩn đầu ra và thời hạn cam kết cho "${subject}"`,
          docTitle: 'Khung xác định mục tiêu công việc cá nhân',
          query: `hướng dẫn lập kế hoạch hành động cá nhân ${encodeURIComponent(cleanSubject)}`,
          desc: 'Bản ghi nhớ rõ ràng những việc mình cần nộp',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi thu thập tài liệu gốc, biểu mẫu và các điều kiện cần thiết đối với "${subject}"`,
          docTitle: 'Checklist chuẩn bị dữ liệu và tài liệu chuyên môn',
          query: `checklist chuẩn bị công việc chuyên môn ${encodeURIComponent(cleanSubject)}`,
          desc: 'Thu thập sẵn sàng để khi làm không bị gián đoạn',
        },
        {
          phase: 'Chuẩn bị',
          title: `Tôi chủ động liên hệ trước với các bên liên quan để thống nhất mốc thời gian phối hợp`,
          docTitle: 'Mẫu trao đổi và phối hợp công tác',
          query: `cách phối hợp công việc hiệu quả đúng hẹn`,
          desc: 'Chủ động hẹn mốc phối hợp để không phải chờ đợi',
        },
        {
          phase: 'Thực hiện',
          title: `Tôi trực tiếp tập trung triển khai các phần việc trọng tâm của "${subject}"`,
          docTitle: 'Phương pháp tập trung xử lý công việc dứt điểm',
          query: `phương pháp làm việc tập trung dứt điểm`,
          desc: 'Mẹo xử lý dứt điểm từng đầu việc trong ngày',
        },
        {
          phase: 'Kiểm tra',
          title: `Tôi tự rà soát lại toàn bộ kết quả của "${subject}", chỉnh sửa các chi tiết chưa đạt yêu cầu`,
          docTitle: 'Checklist tự kiểm tra chất lượng sản phẩm',
          query: `cách tự kiểm tra công việc trước khi nộp`,
          desc: 'Bộ tiêu chí rà soát để đảm bảo chất lượng cao nhất',
        },
        {
          phase: 'Hoàn thành',
          title: `Tôi bàn giao kết quả nghiệm thu hoàn chỉnh cho ${unitLabel} và lưu trữ minh chứng`,
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
    completed: false,
    resource: {
      title: s.docTitle,
      url: `https://www.google.com/search?q=${encodeURIComponent(s.query)}`,
      description: s.desc,
    },
  }));

  return { analysis, subtasks, domain };
}
