import { ToastProvider } from "@juninmd/sonido";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// O CSS do Sonido vem antes do do console: a ponte de tokens em styles.css
// precisa vir depois para redefinir `--sn-*` com a identidade do evo-agent.
import "@juninmd/sonido/styles.css";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("elemento #root ausente no index.html");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
