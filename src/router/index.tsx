import React, { Suspense, useEffect } from "react";
import { useLocation, useRoutes } from "react-router-dom";
import { routes } from "./routes";
import { PuffLoader } from "react-spinners";
import { useTauriInit } from "@/hooks/tauri";
import { useHotkeyInit, useSettingUnmounted } from "@/hooks/system";
import { info } from "@tauri-apps/plugin-log";

const RoutersList = () => {
  const RoutersList = useRoutes(routes);
  return RoutersList;
};
const RouterConfig: React.FC = () => {
  useTauriInit();
  useSettingUnmounted();
  useHotkeyInit();

  const location = useLocation();
  useEffect(() => {
    info(`[路由跳转]: ${location.pathname}`);
  }, [location]); // location 作为依赖项

  return (
    <Suspense
      fallback={
        <PuffLoader className="left-1/2 fixed top-1/3" color="#3662EC" />
      }
    >
      <RoutersList />
    </Suspense>
  );
};
export default RouterConfig;
