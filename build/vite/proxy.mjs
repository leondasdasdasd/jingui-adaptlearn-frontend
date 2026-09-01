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

const createOpenMaicRuntimeProxies = (target) =>
  Object.fromEntries(
    OPENMAIC_RUNTIME_PATHS.map((path) => [
      path,
      { target, changeOrigin: true },
    ]),
  );

export const createDevelopmentProxy = ({
  adaptiveBffTarget,
  openMaicTarget,
  quizApiTarget,
}) => ({
  ...createOpenMaicRuntimeProxies(openMaicTarget),
  "/adaptive-api": {
    target: adaptiveBffTarget,
    changeOrigin: true,
    ws: true,
    rewrite: (path) => path.replace(/^\/adaptive-api/, "/api"),
  },
  "/classroom-api": {
    target: adaptiveBffTarget,
    changeOrigin: true,
  },
  "/openmaic": {
    target: openMaicTarget,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/openmaic/, ""),
  },
  "/_next": { target: openMaicTarget, changeOrigin: true },
  "/api": { target: quizApiTarget, changeOrigin: true, secure: false },
  "/course/api": {
    target: quizApiTarget,
    changeOrigin: true,
    secure: false,
  },
});
