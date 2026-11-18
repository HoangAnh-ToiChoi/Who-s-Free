import LegalPage from "./LegalPage";
import { privacySections } from "./content/privacy";

function Privacy() {
  return (
    <LegalPage
      title="Chính sách bảo mật"
      sections={privacySections}
      other={{ to: "/terms", label: "Điều khoản dịch vụ" }}
    />
  );
}

export default Privacy;
