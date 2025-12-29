import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import "github-markdown-css/github-markdown.css";
import { useTranslation } from "react-i18next";

type Props = {
  children?: React.ReactNode;
  onInstall: () => void;
  onClose: () => void;
  className?: string;
  show: boolean;
  version: string;
  content: string;
};

export default function ReleaseDescDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("updater");

  function close() {
    props?.onClose();
    setOpen(false);
  }

  useEffect(() => {
    setOpen(props.show);
  }, [props.show]);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[40rem] !rounded-sm !px-6">
        <DialogHeader>
          <DialogTitle className="text-center text-large flex items-end justify-center">
            {t("title_update_info")}

            {/* new 标签 */}
            <div className="text-sm text-gray-500">
              {t("version_prefix", { version: props.version })}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div
            className="py-6 h-[60vh] overflow-y-auto text-xl markdown-body !bg-transparent"
            dangerouslySetInnerHTML={{
              __html: props.content ?? t("no_content"),
            }}
          ></div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => close()}
            className="min-w-[6rem] text-sm !h-[2.5rem] rounded-sm"
          >
            {t("cancel")}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              close();
              props.onInstall();
            }}
            className="min-w-[6rem] text-sm !h-[2.5rem] rounded-sm"
          >
            {t("download_now")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

