import LegalPage from "./LegalPage";
import { termsSections } from "./content/terms";

function Terms() {
  return (
    <LegalPage
      title="Điều khoản dịch vụ"
      sections={termsSections}
      other={{ to: "/privacy", label: "Chính sách bảo mật" }}
    />
  );
}

export default Terms;
