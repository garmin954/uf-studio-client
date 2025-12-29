// src/components/ErrorBoundary.tsx
import { ErrorBoundary } from "react-error-boundary";
import React from "react";
import * as log from "@tauri-apps/plugin-log";

// 定义错误回退组件的props类型
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// 错误回退组件 - 显示错误信息并提供操作按钮
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="error-boundary-container p-5 text-center my-auto">
      <h2 className="text-xl font-bold text-red-600 mb-3">应用运行异常</h2>
      <p className="text-gray-700 mb-5">{error.message}</p>
      <div className="flex justify-center gap-3">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={resetErrorBoundary}
        >
          重试
        </button>
        {/* <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={handleRestartApp}
        >
          重启应用
        </button> */}
      </div>
    </div>
  );
};

// 保存会话状态的函数
const saveSessionState = async (_state: any) => {
  try {
    console.log("会话状态已保存");
  } catch (error) {
    console.error("保存会话状态失败:", error);
  }
};

// // 重启应用的函数
// const handleRestartApp = async () => {
//   try {
//     // 先保存关键状态
//     await saveSessionState({
//       timestamp: new Date().toISOString(),
//       // 这里添加需要保存的应用状态
//     });

//     // 调用Tauri窗口重启API
//     // await appWindow.restart();
//   } catch (error) {
//     console.error("重启应用失败:", error);
//     // 重启失败时的备选方案 - 刷新页面
//     window.location.reload();
//   }
// };

// 错误边界处理函数
const onError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error("捕获到组件错误:", error);
  console.error("错误组件堆栈:", errorInfo.componentStack);
  log.error(`捕获到组件错误: ${error.message}`);
  log.error(`错误组件堆栈: ${errorInfo.componentStack}`);
  // 记录错误日志(可扩展为发送到服务器)
  saveSessionState({
    error: {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  });

  // 可以添加错误报告逻辑
  // reportErrorToServer(error, errorInfo);
};

// 错误边界包装器组件
export function ErrorBoundaryWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(e, ei) => onError(e, ei)}
      // 可选: 设置重置条件
      resetKeys={[]}
    >
      {children}
    </ErrorBoundary>
  );
}
