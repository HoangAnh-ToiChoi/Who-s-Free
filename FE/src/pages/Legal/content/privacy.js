import { SERVICE_PROVIDERS } from "~/constants/legal";

// Nội dung Chính sách bảo mật. Mỗi mục: { heading, blocks } — block là đoạn văn (chuỗi) hoặc { list: [...] }.
export const privacySections = [
  {
    heading: "1. Chính sách này áp dụng cho ai",
    blocks: [
      "Who's Free là đồ án học tập do sinh viên tự phát triển, phục vụ việc khảo sát lịch rảnh và chốt lịch họp cho nhóm. Dự án miễn phí, không nhằm mục đích thương mại và không phải là doanh nghiệp.",
      "Chính sách này giải thích chúng tôi thu thập dữ liệu nào, dùng để làm gì, lưu ở đâu, giữ bao lâu và bạn có những quyền gì. Chúng tôi cố gắng xử lý dữ liệu cá nhân theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bao gồm Luật Bảo vệ dữ liệu cá nhân năm 2025 và các văn bản hướng dẫn.",
    ],
  },
  {
    heading: "2. Dữ liệu chúng tôi thu thập",
    blocks: [
      {
        list: [
          "Thông tin tài khoản: họ tên và email. Nếu đăng ký bằng email, bạn đặt mật khẩu; mật khẩu được hệ thống đăng nhập (Supabase Auth) lưu ở dạng đã băm, người phát triển không xem được mật khẩu gốc.",
          "Nếu đăng nhập bằng Google: tên, email và ảnh đại diện do Google cung cấp. Chúng tôi không bao giờ nhận mật khẩu Google của bạn.",
          "Nội dung bạn tạo khi dùng ứng dụng: nhóm và vai trò trong nhóm, phiên khảo sát, các khung giờ rảnh bạn chọn, ghi chú, lịch đã chốt, email của người bạn mời vào nhóm.",
          "Dữ liệu kỹ thuật để giữ an toàn tài khoản: địa chỉ IP, loại thiết bị và trình duyệt (User-Agent), thời điểm đăng nhập, nhật ký gửi và nhập mã xác thực email.",
        ],
      },
      "Chúng tôi không thu thập số điện thoại, địa chỉ nhà, giấy tờ tuỳ thân, thông tin thanh toán hay vị trí của bạn, và không gắn công cụ quảng cáo hoặc theo dõi của bên thứ ba.",
    ],
  },
  {
    heading: "3. Chúng tôi dùng dữ liệu để làm gì",
    blocks: [
      {
        list: [
          "Tạo tài khoản, xác thực email, đăng nhập và giữ phiên đăng nhập trên thiết bị của bạn.",
          "Hiển thị lịch rảnh của các thành viên để Trưởng nhóm (Owner/Lead) tìm và chốt khung giờ họp.",
          "Gửi email cần thiết cho việc dùng ứng dụng: mã xác thực, mã đặt lại mật khẩu, lời mời vào nhóm, thông báo lịch đã chốt, nhắc hạn và thông báo phiên đã đóng.",
          "Bảo vệ hệ thống: giới hạn số lần gửi mã, phát hiện đăng nhập bất thường, truy vết khi có sự cố.",
          "Sao lưu để khôi phục dữ liệu khi hệ thống gặp lỗi.",
        ],
      },
      "Chúng tôi không bán, cho thuê hay chia sẻ dữ liệu của bạn để quảng cáo, và không dùng dữ liệu cho mục đích nào ngoài các mục đích trên.",
    ],
  },
  {
    heading: "4. Ai có thể thấy dữ liệu của bạn",
    blocks: [
      {
        list: [
          "Thành viên trong cùng nhóm: có thể thấy thông tin hồ sơ (tên, ảnh đại diện, email) và các khung giờ rảnh, ghi chú bạn chọn trong phiên của nhóm đó. Owner/Lead có thể xuất bảng lịch của nhóm ra file Excel.",
          "Người ngoài nhóm không xem được lịch hay thông tin của nhóm.",
          "Nhà cung cấp hạ tầng (bên xử lý dữ liệu) chỉ xử lý dữ liệu để vận hành dịch vụ, theo bảng dưới đây. Một số máy chủ đặt ngoài Việt Nam, nên dữ liệu của bạn có thể được chuyển ra nước ngoài để lưu trữ và xử lý.",
          "Cơ quan nhà nước có thẩm quyền, khi có yêu cầu hợp pháp theo quy định của pháp luật.",
        ],
      },
      { providers: SERVICE_PROVIDERS },
    ],
  },
  {
    heading: "5. Lưu trữ bao lâu",
    blocks: [
      {
        list: [
          "Tài khoản và nội dung của bạn: được giữ cho tới khi bạn yêu cầu xoá hoặc dự án ngừng hoạt động.",
          "Phiên đăng nhập: tự hết hạn sau 15 ngày không sử dụng. Mỗi loại thiết bị (điện thoại, máy tính bảng, máy tính) giữ một phiên.",
          "Mã xác thực và mã đặt lại mật khẩu: chỉ có hiệu lực 10 phút; mã đã băm được xoá sau 3 ngày. Nhật ký gửi mã (không chứa mã) được giữ lại để truy vết bảo mật.",
          "Tài khoản đăng ký bằng email nhưng không xác thực: tự động xoá sau 7 ngày.",
          "Bản sao lưu cơ sở dữ liệu: được mã hoá và tự xoá sau 14 ngày.",
          "Khi dự án ngừng hoạt động, chúng tôi sẽ thông báo trước và xoá dữ liệu.",
        ],
      },
    ],
  },
  {
    heading: "6. Chúng tôi bảo vệ dữ liệu thế nào",
    blocks: [
      {
        list: [
          "Toàn bộ kết nối dùng HTTPS.",
          "Mật khẩu được băm; mã xác thực chỉ lưu dạng băm, hết hạn sau 10 phút và bị khoá sau 5 lần nhập sai.",
          "Phiên đăng nhập lưu trong cookie HttpOnly, mã JavaScript trên trang không đọc được.",
          "Bản sao lưu được mã hoá AES-256 trước khi lưu trữ.",
          "Chỉ người phụ trách dự án có quyền truy cập cơ sở dữ liệu.",
        ],
      },
      "Không hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố làm lộ dữ liệu, chúng tôi sẽ thông báo cho người dùng bị ảnh hưởng và cơ quan có thẩm quyền theo quy định của pháp luật.",
    ],
  },
  {
    heading: "7. Cookie và dữ liệu lưu trên trình duyệt",
    blocks: [
      {
        list: [
          "Cookie đăng nhập (HttpOnly) để giữ phiên, và một cookie tạm khi đăng nhập bằng Google để quay về đúng trang.",
          "Bộ nhớ của trình duyệt (localStorage) lưu ngôn ngữ bạn chọn, thông tin hồ sơ rút gọn để hiển thị nhanh, dữ liệu tạm của nhóm và lịch, và việc bạn đã tắt một số hướng dẫn.",
        ],
      },
      "Chúng tôi không dùng cookie quảng cáo hay cookie theo dõi của bên thứ ba. Đăng xuất sẽ xoá phiên trên thiết bị đó.",
    ],
  },
  {
    heading: "8. Quyền của bạn",
    blocks: [
      "Bạn có quyền được biết về việc xử lý dữ liệu, xem và yêu cầu chỉnh sửa dữ liệu, yêu cầu xoá dữ liệu, rút lại sự đồng ý, phản đối hoặc yêu cầu hạn chế xử lý, và khiếu nại khi quyền lợi bị xâm phạm.",
      "Bạn có thể tự rời nhóm ngay trong ứng dụng. Hiện ứng dụng chưa có nút tự xoá tài khoản, nên để xoá tài khoản hoặc thực hiện các quyền khác, bạn gửi yêu cầu theo thông tin ở mục Liên hệ. Chúng tôi sẽ phản hồi trong vòng 7 ngày làm việc.",
      "Lưu ý: rút lại sự đồng ý hoặc xoá tài khoản đồng nghĩa với việc bạn không thể tiếp tục dùng ứng dụng.",
    ],
  },
  {
    heading: "9. Người dùng chưa đủ 16 tuổi",
    blocks: [
      "Nếu bạn chưa đủ 16 tuổi, bạn chỉ nên dùng Who's Free khi đã có sự đồng ý của cha mẹ hoặc người giám hộ.",
    ],
  },
  {
    heading: "10. Thay đổi chính sách",
    blocks: [
      "Chúng tôi có thể cập nhật chính sách khi ứng dụng thay đổi. Ngày cập nhật luôn ghi ở đầu trang. Nếu thay đổi ảnh hưởng đáng kể tới cách xử lý dữ liệu, chúng tôi sẽ báo qua email hoặc trong ứng dụng.",
    ],
  },
];
