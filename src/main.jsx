import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AdaptiveLearningRoot from "./adaptiveLearning/AdaptiveLearningRoot";
import { syncDocumentLocale } from "./utils/i18n";

syncDocumentLocale();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AdaptiveLearningRoot />
    </HashRouter>
  </React.StrictMode>
);
