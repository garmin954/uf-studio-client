
import { Outlet } from "react-router-dom";
import LogicUpdater from "../components/Updater/LogicUpdater";

export default function LayoutContainer() {
  return (
    <div
      className="h-full bg-background uf-font-regular text-foreground select-none theme-light"
    >
      <Outlet />
      <LogicUpdater />
    </div>
  );
}
