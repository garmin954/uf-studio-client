

import { ErrorBoundaryWrapper } from "./pages/components/ErrorBoundary";
// import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import RouterConfig from "./router";
import { useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Provider } from "react-redux";
import { store } from "./store";
import { ThemeProvider } from "./pages/components/theme/ThemeProvider";
import { Toaster } from "./components/ui/sonner";

function App() {
  useEffect(() => {
    WebviewWindow.getByLabel("main").then(async (win) => {
      win?.show();
      win?.setFocus();
    });
    return () => {
    };
  }, []);

  // useKeyPress("ctrl.alt.i", () => {
  //   invoke("open_devtools")
  // });

  return (
    <ErrorBoundaryWrapper>
      <ThemeProvider>
        <Provider store={store}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <RouterConfig />
            <Toaster />
          </BrowserRouter>
        </Provider>
      </ThemeProvider>
    </ErrorBoundaryWrapper>
  );
}

export default App;
