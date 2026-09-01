import React from "react";
import { HashRouter, Route } from "dva/router";

import AdaptiveLearningRoot from "./adaptiveLearning/AdaptiveLearningRoot";

export default function App() {
  return (
    <HashRouter>
      <Route
        path="/"
        render={(routeProperties) => (
          <AdaptiveLearningRoot {...routeProperties} />
        )}
      />
    </HashRouter>
  );
}
