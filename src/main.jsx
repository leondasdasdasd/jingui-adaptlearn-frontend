import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AdaptiveLearningRoot from "./adaptiveLearning/AdaptiveLearningRoot";
import ErrorBoundary from "./adaptiveLearning/components/ErrorBoundary";
import { syncDocumentLocale } from "./utils/i18n";

try {
  syncDocumentLocale();
} catch (error) {
  console.warn("Failed to sync locale:", error);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <AdaptiveLearningRoot />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
