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
    // 显式设置初始语言，避免 language 为 undefined
    lng: savedLanguage,
    fallbackLng: "cn",
    // 预加载常用命名空间，确保在非 React 环境（如 Redux slice）也可直接使用 i18n.t("updater.xxx")
    ns: ["home", "updater"],
    defaultNS: "home",
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
    // 让初始化同步完成，有利于在导入时立即获取语言和翻译
    initImmediate: false,
  });

export default i18n;
