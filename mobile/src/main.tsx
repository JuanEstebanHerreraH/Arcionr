import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Tema inicial según el sistema.
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
