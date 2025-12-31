import { useSearchParams } from "react-router-dom";

export default function LayoutContainer() {
  const [searchParams] = useSearchParams();

  let url = searchParams.get("url");
  // 获取语言缓存
  const language = localStorage.getItem("language");
  if (language) {
    // 替换 url 中的 lang 参数
    url = url?.replace("lang=cn", `lang=${language}`) ?? url;
    url = url?.replace("lang=en", `lang=${language}`) ?? url;
  }

  if (url) {
    return (
      <div className="w-full h-full bg-white">
        <iframe
          src={url}
          className="w-full h-full"
        />
      </div>
    );
  }

  return null;
}
