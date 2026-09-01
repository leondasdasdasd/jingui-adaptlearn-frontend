const OPENMAIC_RUNTIME_PATHS = [
  "/api/anonymous-runtime",
  "/api/classroom-media",
  "/api/classroom",
  "/api/access-code",
  "/api/server-providers",
  "/api/quiz-grade",
  "/api/chat",
  "/api/generate/tts",
  "/avatars",
  "/logo-horizontal.png",
  "/favicon.ico",
  "/apple-icon.png",
];

const openMaicRuntimeProxies = (target) =>
  Object.fromEntries(
    OPENMAIC_RUNTIME_PATHS.map((path) => [
      path,
      { target, changeOrigin: true },
    ]),
  );

export function createDevelopmentProxy({
  adaptiveBffTarget,
  openMaicTarget,
  quizApiTarget,
}) {
  return {
    // OpenMAIC iframe 使用这些绝对同源路径，必须在通用测验 API 之前分流。
    ...openMaicRuntimeProxies(openMaicTarget),
    "/adaptive-api": {
      target: adaptiveBffTarget,
      changeOrigin: true,
      ws: true,
      rewrite: (requestPath) =>
        requestPath.replace(/^\/adaptive-api/, "/api"),
    },
    "/classroom-api": {
      target: adaptiveBffTarget,
      changeOrigin: true,
    },
    "/openmaic": {
      target: openMaicTarget,
      changeOrigin: true,
      rewrite: (requestPath) => requestPath.replace(/^\/openmaic/, ""),
    },
    "/_next": {
      target: openMaicTarget,
      changeOrigin: true,
    },
    "/api": {
      target: quizApiTarget,
      changeOrigin: true,
      secure: false,
    },
  };
}
