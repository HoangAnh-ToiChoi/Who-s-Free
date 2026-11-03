import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import viTranslation from "~/locales/vi/translation.json";
import enTranslation from "~/locales/en/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: viTranslation },
      en: { translation: enTranslation },
    },
    fallbackLng: "vi",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Thuộc tính lang của trang luôn khớp ngôn ngữ đang hiển thị (trình duyệt/trình đọc màn hình dựa vào đây)
const syncDocumentLang = (lng) => {
  if (typeof document !== "undefined") document.documentElement.lang = (lng || "vi").split("-")[0];
};
syncDocumentLang(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", syncDocumentLang);

export default i18n;
