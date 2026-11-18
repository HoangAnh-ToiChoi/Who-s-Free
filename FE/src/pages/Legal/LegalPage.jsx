import { Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { Card } from "~/components/ui/card";
import { LEGAL_CONTACT_EMAIL, LEGAL_UPDATED_AT } from "~/constants/legal";

function Block({ block }) {
  if (typeof block === "string") return <p>{block}</p>;
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Khung chung cho Điều khoản dịch vụ / Chính sách bảo mật: tiêu đề, ngày cập nhật, lưu ý đồ án, các mục và Liên hệ.
 * sections: [{ heading, blocks }] — xem pages/Legal/content.
 */
function LegalPage({ title, sections, other }) {
  return (
    <Card className="gap-0 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-9">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">Cập nhật lần cuối: {LEGAL_UPDATED_AT}</p>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 text-xs leading-relaxed text-indigo-900">
        <GraduationCap size={16} className="mt-0.5 shrink-0 text-indigo-600" />
        <p>
          Who&apos;s Free là đồ án học tập do sinh viên tự phát triển, miễn phí và phi thương mại. Nội dung dưới đây
          mô tả đúng cách ứng dụng đang hoạt động, là cam kết của chúng tôi với người dùng.
        </p>
      </div>

      <div className="mt-6 space-y-7 text-sm leading-relaxed text-slate-600">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-2.5">
            <h2 className="text-base font-bold text-slate-900">{section.heading}</h2>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </section>
        ))}

        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">Liên hệ</h2>
          {LEGAL_CONTACT_EMAIL ? (
            <p>
              Mọi câu hỏi, yêu cầu về dữ liệu cá nhân hoặc báo lỗi bảo mật, vui lòng gửi email tới{" "}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-indigo-600 hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          ) : (
            <p>Mọi câu hỏi, yêu cầu về dữ liệu cá nhân hoặc báo lỗi bảo mật, vui lòng liên hệ người phụ trách dự án.</p>
          )}
        </section>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-5 text-xs text-slate-500">
        Xem thêm:{" "}
        <Link to={other.to} className="font-semibold text-indigo-600 hover:underline">
          {other.label}
        </Link>
      </div>
    </Card>
  );
}

export default LegalPage;
