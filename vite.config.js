import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteMockAdaptivePlugin } from "./src/adaptiveLearning/mock/viteMockPlugin.js";

function createDevelopmentProxy(options = {}) {
  const {
    adaptiveBffTarget = "http://127.0.0.1:8787",
    openMaicTarget = "http://127.0.0.1:3101",
    quizApiTarget = "https://task.daily.yungu-inc.org",
  } = options;

  return {
    "/adaptive-api": {
      target: adaptiveBffTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/adaptive-api/, "/api"),
    },
    "/openmaic-api": {
      target: openMaicTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/openmaic-api/, ""),
    },
    "/classroom-api": {
      target: adaptiveBffTarget,
      changeOrigin: true,
    },
    "/api": {
      target: quizApiTarget,
      changeOrigin: true,
      secure: false,
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const enableAdaptiveMocks = env.VITE_ENABLE_ADAPTIVE_MOCKS === "true";

  return {
    resolve: {
      alias: {
        "dva/router": "react-router-dom",
      },
    },
    plugins: [react(), enableAdaptiveMocks && viteMockAdaptivePlugin()].filter(
      Boolean,
    ),
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      server: {
        deps: {
          inline: [/@yungu-fed\/question-editor/, /@yungu-fed\/rich-text-editor/],
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: ["leon.local.yungu-inc.org"],
      proxy: createDevelopmentProxy({
        adaptiveBffTarget:
          env.DEV_ADAPTIVE_BFF_PROXY_TARGET || "http://127.0.0.1:8787",
        openMaicTarget:
          env.DEV_OPENMAIC_PROXY_TARGET || "http://127.0.0.1:3101",
        quizApiTarget:
          env.DEV_API_PROXY_TARGET || "https://task.daily.yungu-inc.org",
      }),
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: ["leon.local.yungu-inc.org"],
    },
  };
});
