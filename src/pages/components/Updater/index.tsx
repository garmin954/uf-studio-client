import { RootDispatch, RootState } from "@/store";
import { UpdaterState, fetchHistoryReleases } from "@/store/features/updater";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import "github-markdown-css/github-markdown.css";
import LogicUpdater from "./LogicUpdater";

export default function Updater() {
  const state = useSelector<RootState, UpdaterState>((state) => state.updater);
  const dispatch = useDispatch<RootDispatch>();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then((v) => {
      setVersion(v);
      dispatch(fetchHistoryReleases(v));
    });
  }, []);

  const upd = state.updater;

  return (
    <div className="w-full h-full flex flex-col gap-[1.5rem]">
      <div className="bg-card shadow rounded-xl h-[8rem] px-[2.58rem] py-[1.75rem] flex justify-between items-center">
        <div className="flex items-baseline flex-col">
          <span className="text-[1.48rem] uf-font-medium">软件版本</span>
          <span className="text-subtext mt-4">
            UFACTORY Studio V{upd.currentVersion || version}
          </span>
        </div>

        <LogicUpdater isBeta={false} />
      </div>

      <div className="flex-1 bg-card shadow rounded-xl h-[6rem] py-[1.75rem] px-[2.58rem]">
        <h1 className=" text-[1.33rem] uf-font-medium">更新日志</h1>
        <div
          className="h-[95%] overflow-auto markdown-body text-default"
          dangerouslySetInnerHTML={{
            __html: upd.current.content ?? "暂无版本信息",
          }}
        ></div>
      </div>
    </div>
  );
}
