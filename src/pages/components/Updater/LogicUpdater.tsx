import { UPDATER_STEP } from "@/lib/constant";
import { RootDispatch, RootState } from "@/store";
import {
  checkUpdater,
  UpdaterState,
  downloadApp,
} from "@/store/features/updater";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import "github-markdown-css/github-markdown.css";
import ReleaseDescDialog from "./ReleaseDescDialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import DownloadProgress from "./DownloadProgress";

interface Props {
  className?: string;
  isBeta?: boolean;
}
export default function LogicUpdater(props: Props) {
  const { isBeta = false } = props;
  const state = useSelector<RootState, UpdaterState>((state) => state.updater);
  const dispatch = useDispatch<RootDispatch>();
  const [showDesc, setShowDesc] = useState(false);

  async function onUpdate() {
    switch (state.step) {
      case UPDATER_STEP.NORMAL:
      case UPDATER_STEP.CHECK:
        dispatch(checkUpdater(isBeta)).then(({ payload }) => {
          // 有新版本 弹出更新信息
          if (payload.code === 0 && !payload.data?.is_latest) {
            setShowDesc(true);
          }
        });
        break;
      case UPDATER_STEP.DOWNLOAD:
        setShowDesc(true);
        break;
      default:
        break;
    }
  }
  const upd = state.updater;

  useEffect(() => {
    WebviewWindow.getByLabel("main").then(async (win) => {
      win?.listen("check_updates", () => {
        onUpdate();
      });
    });
  });


  return (
    <>
      <ReleaseDescDialog
        show={showDesc}
        onInstall={() => dispatch(downloadApp())}
        onClose={() => setShowDesc(false)}
        content={upd.body.content}
        version={upd.version}
      />

      <DownloadProgress />
    </>
  );
}
