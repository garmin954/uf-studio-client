import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();
let mediaQueryStyleElement: HTMLStyleElement | null = null; // 存储媒体查询样式元素的引用

export function useScaleFactor() {
    const [scaleFactor, setScaleFactor] = useState(1.0);

    useEffect(() => {
        async function updateScaleFactor() {
            try {
                const factor = await appWindow.scaleFactor();
                setScaleFactor(factor);
            } catch (error) {
                console.error('Failed to get scale factor:', error);
                setScaleFactor(1.0); // 默认使用1.0
            }
        }

        updateScaleFactor();

        // 监听缩放变化事件
        const eventHandler = appWindow.onScaleChanged(({ payload }) => {
            console.log('Scale factor changed:', payload.scaleFactor);
            setScaleFactor(payload.scaleFactor);
        });

        return () => {
            eventHandler.then(handler => handler());
            removeMediaQueryStyle(); // 组件卸载时移除媒体查询样式
        };
    }, []);

    useEffect(() => {
        const rootElement = document.getElementById('root');
        if (rootElement) {
            if (scaleFactor === 1) {
                // 设置#root 
                addMediaQueryStyle();
            } else {
                removeMediaQueryStyle(); // 缩放因子变化时，如果不是1则移除媒体查询样式
                const baseFontSize = 12 / scaleFactor;
                rootElement.style.fontSize = `${baseFontSize}px`;
            }
        }
    }, [scaleFactor])

    // 添加媒体查询样式的辅助函数
    const addMediaQueryStyle = () => {
        if (mediaQueryStyleElement) return; // 避免重复添加

        const style = document.createElement('style');
        style.textContent = `
            @media screen and (min-width: 1440px) {
                html, body, #root {
                    font-size: 16px!important;
                }
            }
        `;

        document.head.appendChild(style);
        mediaQueryStyleElement = style; // 保存引用以便后续删除
    };

    // 删除媒体查询样式的辅助函数
    const removeMediaQueryStyle = () => {
        if (mediaQueryStyleElement) {
            mediaQueryStyleElement.remove();
            mediaQueryStyleElement = null; // 重置引用
        }
    };

    return scaleFactor;
}