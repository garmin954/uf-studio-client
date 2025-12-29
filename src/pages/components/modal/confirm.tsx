import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store, } from "@/store";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import clsx from "clsx";
import AsyncButton from "../async_button";

interface ModalOptions {
  content: string | React.ReactNode;
  cancelBtn?: string;
  confirmBtn?: string;
  showCancel?: boolean;
  showConfirm?: boolean;
  width?: string;
  onCancel?: () => void | Promise<void>;
  onConfirm?: () => void | Promise<void>;
  type?: "confirm" | "alert";
}

const Modal = {
  // 返回 Promise：点击确认 resolve，点击取消 reject
  // 仅当有 confirm/cancel 按钮时才会触发 resolve/reject
  confirm: (title: string | null, options: ModalOptions) => {
    const {
      cancelBtn = "取消",
      confirmBtn = "确认",
      onCancel,
      onConfirm,
      content = "",
      width = "",
      showCancel = true,
      showConfirm = true,
      type = "confirm",
    } = options;

    return new Promise<void>(async (resolve, reject) => {
      const mountPoint = document.createElement("div");
      document.body.appendChild(mountPoint);

      const root = ReactDOM.createRoot(mountPoint as HTMLElement);
      let settled = false;

      const closeModal = () => {
        root.unmount();
        document.body.removeChild(mountPoint);
        // 关闭弹窗时恢复返回首页能力
        // store.dispatch(setPreventBack(false));
      };

      const handleConfirm = async () => {
        try {
          if (!showConfirm) return; // 仅在有确认按钮时生效
          await onConfirm?.()
          if (!settled) {
            settled = true;
            resolve();
          }
          closeModal();
        } catch (error) {
          // onConfirm 异步报错：不关闭弹框，不 settle 外部 Promise
        }
      };

      const handleCancel = async () => {
        if (!showCancel) return; // 仅在有取消按钮时生效
        await onCancel?.();

        if (!settled) {
          settled = true;
          reject(new Error("cancel"));
        }
        closeModal();
      };

      const isPlainText = typeof content === "string";

      // 打开弹窗时禁止返回首页
      // store.dispatch(setPreventBack(true));

      root.render(
        <Provider store={store}>
          {/* 不允许通过 ESC/遮罩关闭，避免 Promise 非预期 settle */}
          <Dialog open={true}>
            <DialogContent
              top={10}
              className={clsx("max-w-none", type === "alert" ? "!rounded-2xl" : "")}
              width={width ?? "30rem"}
            >
              <DialogHeader>
                {title && (
                  <DialogTitle className={clsx("text-large mb-4 text-center", type === "alert" ? "text-max" : "")}>{title}</DialogTitle>
                )}
                {isPlainText ? (
                  <DialogDescription className="text-medium text-center">
                    {content as string}
                  </DialogDescription>
                ) : (
                  <div className="text-medium text-center">{content as React.ReactNode}</div>
                )}
              </DialogHeader>
              <DialogFooter className="flex gap-4 justify-center mt-4">
                {showCancel && (
                  <AsyncButton
                    className={clsx(type === "alert" ? "min-w-[9.5rem]" : "min-w-[6.5rem]")}
                    variant="outline"
                    onClick={handleCancel}
                  >
                    {cancelBtn}
                  </AsyncButton>
                )}
                {showConfirm && (
                  <AsyncButton className={clsx(type === "alert" ? "min-w-[9.5rem]" : "min-w-[6.5rem]")} onClick={handleConfirm}>
                    {confirmBtn}
                  </AsyncButton>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Provider>
      );
    });
  },
};

export default Modal;
