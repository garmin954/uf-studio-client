import { useSearchParams } from "react-router-dom";

export default function LayoutContainer() {
  const [searchParams] = useSearchParams();

  let url = searchParams.get("url");

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
