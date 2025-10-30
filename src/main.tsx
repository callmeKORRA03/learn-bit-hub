// import { createRoot } from "react-dom/client";
// import App from "./App.tsx";
// import "./index.css";

// createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import "./index.css";

// Ensure Node polyfills are set BEFORE loading the app (and its deps)
import { Buffer } from "buffer";
import process from "process";

// @ts-ignore
window.Buffer = Buffer;
// @ts-ignore
window.process = process;
// @ts-ignore
window.global = window;

const rootEl = document.getElementById("root")!;

(async () => {
  const { default: App } = await import("./App.tsx");
  createRoot(rootEl).render(<App />);
})();
