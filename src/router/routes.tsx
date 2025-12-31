import { RouteObject } from "react-router-dom";
import React, { lazy } from "react";
const Container = lazy(() => import("@/pages/Layouts/Container"));
const Splash = lazy(() => import("@/pages/Layouts/Splash"));
const StudioHome = lazy(() => import("@/Studio/Home"));
const Studio = lazy(() => import("@/Studio/index"));

export const routes: RouteObject[] = [
  {
    path: "/splash",
    element: <Splash />,
  },
  {
    path: "*",
    element: React.createElement("div", {}, "404"),
  },
  {
    path: "/app",
    element: <Container />,
    children: [
      {
        path: "home",
        element: <StudioHome />,
      },
      {
        path: "studio",
        element: <Studio />,
      },
    ],
  },

];
