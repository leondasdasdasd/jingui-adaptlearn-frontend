import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";

import { createDevelopmentProxy } from "./build/vite/proxy.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5180,
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
      port: 4180,
      allowedHosts: ["leon.local.yungu-inc.org"],
    },
  };
});
