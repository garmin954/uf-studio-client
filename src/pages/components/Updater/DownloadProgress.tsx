import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { UPDATER_STEP } from "@/lib/constant";
import { formatBytes, formatSpeed } from "@/lib/utils";
import { RootDispatch, RootState } from "@/store";
import { installApp, UpdaterState } from "@/store/features/updater";
import { useThrottleEffect } from "ahooks";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

export default function DownloadProgress() {
  const state = useSelector<RootState, UpdaterState>((state) => state.updater);
  const dispatch = useDispatch<RootDispatch>();
  const { t } = useTranslation("updater");

  // 安装包大小
  const total = useMemo(() => {
    return formatBytes(state.download.totalSize);
  }, [state.download.totalSize]);

  // 已下载大小
  const download = useMemo(() => {
    return formatBytes(state.download.downloaded);
  }, [state.download.downloaded]);

  // 下载速度
  const [speed, setSpeed] = useState("");
  useThrottleEffect(
    () => {
      const currentTime = Date.now();
      const elapsedTimeInSeconds =
        (currentTime - state.download.startTime) / 1000;
      const speed = state.download.downloaded / elapsedTimeInSeconds;
      const s = formatSpeed(speed);
      setSpeed(s);
    },
    [state.download.downloaded],
    { wait: 1000 }
  );

  return (
    <Dialog open={state.download.showDialog}>
      <DialogContent className="sm:max-w-[25rem] rounded-sm" top={10}>
        <DialogHeader>
          <DialogTitle className="text-center text-large">
            {t("software_update")}
          </DialogTitle>
        </DialogHeader>

        {state.step === UPDATER_STEP.DOWNLOAD ? (
          <div className="flex flex-col gap-4 py-[1rem] h-[5rem] box-border">
            <Progress className="h-[1.5rem]" value={state.download.progress} />
            <div className="flex justify-between uf-font-regular">
              <span>
                {t("speed_label")}
                {speed}
              </span>
              <span>
                {download}/{total}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between flex-col gap-4 items-center">
            <div className="text-center text-default ">
              {t("download_complete_tip")}
            </div>
            <Button
              className="min-w-[6rem] text-sm !h-[2.5rem] rounded-sm"
              onClick={() => {
                dispatch(installApp());
              }}
            >
              {t("install_now")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

