import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend, { HttpBackendOptions } from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// 统一从 localStorage 中读取语言，默认中文
// 这里只使用简写：cn / en，用于 i18n 和业务参数传递
const savedLanguage =
  (typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("language")) ||
  "en";

i18n
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init<HttpBackendOptions>({
    lng: savedLanguage,
    fallbackLng: "cn",
    interpolation: {
      escapeValue: false,
    },
    backend: {
      crossDomain: true,
      loadPath: (lng, ns) => {
        return `/locals/${lng}/${ns}.json`;
      },
      parse: (data) => JSON.parse(data),
    },
  });

export default i18n;
