import { DragDropEvent, getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";


export function useDragDrop(onDrop: (paths: string[]) => void) {
    const ref = useRef<any>(null);
    const [isOverTarget, setIsOverTarget] = useState(false);


    useEffect(() => {
        const checkIsInside = async (event: DragDropEvent) => {
            const targetRect = ref.current?.getBoundingClientRect();
            if (!targetRect || event.type === "leave") {
                return false;
            }
            const factor = await getCurrentWindow().scaleFactor();
            const position = event.position.toLogical(factor);
            const isInside =
                position.x >= targetRect.left &&
                position.x <= targetRect.right &&
                position.y >= targetRect.top &&
                position.y <= targetRect.bottom;
            return isInside;
        };

        const setupListener = async () => {
            const unlisten = await getCurrentWebview().onDragDropEvent(
                async (event) => {
                    // 简化事件处理逻辑，减少异步操作
                    if (event.payload.type === "leave") {
                        setIsOverTarget(false);
                        return;
                    }

                    const isInside = await checkIsInside(event.payload);

                    if (event.payload.type === "over") {
                        setIsOverTarget(isInside);
                        return;
                    }

                    if (event.payload.type === "drop") {
                        if (isInside) {
                            // 直接调用回调，不使用防抖
                            onDrop(event.payload.paths);
                        }
                        setIsOverTarget(false);
                    }
                }
            );

            return unlisten;
        };

        let cleanup: (() => void) | undefined;
        let isComponentMounted = true; // 添加挂载状态标志

        setupListener().then((unlisten) => {
            if (isComponentMounted) { // 只在组件仍然挂载时设置清理函数
                cleanup = unlisten;
            } else {
                // 如果组件已卸载但监听器刚刚设置完成，立即清理
                unlisten?.();
            }
        });

        return () => {
            isComponentMounted = false; // 标记组件已卸载
            cleanup?.();
        };
    }, []);

    return { isOverTarget, ref };
}