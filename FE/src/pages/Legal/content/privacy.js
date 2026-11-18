// Nội dung Chính sách bảo mật, viết bằng ngôn ngữ phổ thông (không đi vào chi tiết kỹ thuật).
// Mỗi mục: { heading, blocks } — block là đoạn văn (chuỗi) hoặc { list: [...] }.
export const privacySections = [
  {
    heading: "Tóm tắt nhanh",
    blocks: [
      {
        list: [
          "Chúng tôi chỉ thu thập những gì cần để bạn và nhóm chốt được lịch họp: tên, email, ảnh đại diện (nếu đăng nhập Google) và lịch rảnh bạn chọn.",
          "Lịch rảnh của bạn chỉ hiện cho các thành viên trong cùng nhóm.",
          "Chúng tôi không bán dữ liệu, không chạy quảng cáo, không theo dõi bạn.",
          "Bạn có thể yêu cầu xem, sửa hoặc xoá dữ liệu của mình bất cứ lúc nào.",
        ],
      },
    ],
  },
  {
    heading: "1. Giới thiệu",
    blocks: [
      "Who's Free là đồ án học tập do sinh viên tự phát triển, giúp các nhóm khảo sát lịch rảnh và chốt lịch họp. Dự án miễn phí và không nhằm mục đích thương mại.",
      "Chính sách này cho bạn biết chúng tôi thu thập thông tin gì, dùng vào việc gì và bạn có những quyền gì. Chúng tôi tuân thủ pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, gồm Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.",
    ],
  },
  {
    heading: "2. Thông tin chúng tôi thu thập",
    blocks: [
      {
        list: [
          "Thông tin tài khoản: họ tên, email và mật khẩu (nếu bạn đăng ký bằng email). Mật khẩu được mã hoá, kể cả chúng tôi cũng không xem được.",
          "Nếu bạn đăng nhập bằng Google: tên, email và ảnh đại diện từ tài khoản Google. Chúng tôi không nhận mật khẩu Google của bạn.",
          "Thông tin bạn nhập khi sử dụng: nhóm bạn tham gia, khung giờ rảnh, ghi chú, lịch đã chốt và email của người bạn mời vào nhóm.",
          "Thông tin về lần đăng nhập (thiết bị, trình duyệt, địa chỉ IP) để giữ an toàn cho tài khoản.",
        ],
      },
      "Chúng tôi không thu thập số điện thoại, địa chỉ, giấy tờ tuỳ thân, thông tin thanh toán hay vị trí của bạn.",
    ],
  },
  {
    heading: "3. Chúng tôi dùng thông tin để làm gì",
    blocks: [
      {
        list: [
          "Tạo và quản lý tài khoản, giúp bạn đăng nhập.",
          "Tổng hợp lịch rảnh để nhóm tìm được giờ họp phù hợp.",
          "Gửi email cần thiết: mã xác thực, lời mời vào nhóm, thông báo lịch đã chốt, nhắc hạn.",
          "Bảo vệ tài khoản và phát hiện hành vi lạm dụng.",
        ],
      },
      "Chúng tôi không dùng thông tin của bạn cho quảng cáo hay bất kỳ mục đích nào khác ngoài các mục trên.",
    ],
  },
  {
    heading: "4. Chúng tôi chia sẻ thông tin với ai",
    blocks: [
      {
        list: [
          "Thành viên trong cùng nhóm: thấy tên, ảnh đại diện, email và lịch rảnh bạn chọn trong nhóm đó. Trưởng nhóm có thể tải bảng lịch của nhóm về máy.",
          "Các dịch vụ giúp ứng dụng hoạt động, như lưu trữ dữ liệu, gửi email và đăng nhập bằng Google (Supabase, Render, Vercel, Brevo, Google). Họ chỉ được dùng thông tin để phục vụ Who's Free. Một số máy chủ đặt ở nước ngoài (ví dụ Nhật Bản).",
          "Cơ quan nhà nước có thẩm quyền, khi có yêu cầu hợp pháp.",
        ],
      },
      "Ngoài các trường hợp trên, chúng tôi không chia sẻ, bán hay cho thuê thông tin của bạn.",
    ],
  },
  {
    heading: "5. Lưu trữ trong bao lâu",
    blocks: [
      {
        list: [
          "Thông tin tài khoản và nhóm được giữ cho tới khi bạn yêu cầu xoá.",
          "Tài khoản đăng ký nhưng không xác thực email sẽ tự xoá sau 7 ngày.",
          "Bản sao lưu dự phòng tự xoá sau 14 ngày.",
          "Khi dự án kết thúc, chúng tôi sẽ thông báo trước và xoá toàn bộ dữ liệu.",
        ],
      },
    ],
  },
  {
    heading: "6. Bảo vệ thông tin",
    blocks: [
      "Chúng tôi dùng kết nối mã hoá, mã hoá mật khẩu và giới hạn người có quyền truy cập dữ liệu. Tuy vậy, không hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố làm lộ thông tin, chúng tôi sẽ báo cho bạn và cơ quan chức năng theo quy định.",
    ],
  },
  {
    heading: "7. Cookie",
    blocks: [
      "Chúng tôi chỉ dùng cookie và bộ nhớ trình duyệt để giữ bạn đăng nhập và nhớ lựa chọn của bạn (ví dụ ngôn ngữ). Không có cookie quảng cáo hay theo dõi.",
    ],
  },
  {
    heading: "8. Quyền của bạn",
    blocks: [
      "Bạn có quyền được biết, xem, chỉnh sửa, yêu cầu xoá thông tin của mình, rút lại sự đồng ý, phản đối hoặc yêu cầu hạn chế việc xử lý, và khiếu nại nếu quyền lợi bị ảnh hưởng.",
      "Để thực hiện các quyền này (kể cả xoá tài khoản), hãy liên hệ theo thông tin ở cuối trang. Chúng tôi sẽ phản hồi trong vòng 7 ngày làm việc.",
    ],
  },
  {
    heading: "9. Người dùng dưới 16 tuổi",
    blocks: ["Nếu bạn chưa đủ 16 tuổi, vui lòng chỉ sử dụng Who's Free khi đã có sự đồng ý của cha mẹ hoặc người giám hộ."],
  },
  {
    heading: "10. Thay đổi chính sách",
    blocks: [
      "Khi chính sách thay đổi, chúng tôi sẽ cập nhật ngày ở đầu trang. Nếu thay đổi quan trọng, chúng tôi sẽ báo cho bạn qua email hoặc trong ứng dụng.",
    ],
  },
];
