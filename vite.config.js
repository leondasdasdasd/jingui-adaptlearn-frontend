import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    ssr: {
      noExternal: ['@yungu-fed/question-editor', '@yungu-fed/rich-text-editor'],
    },
    server: {
      host: '0.0.0.0',
      port: 5180,
      strictPort: true,
      allowedHosts: ['leon.local.yungu-inc.org'],
      proxy: {
        '/openmaic': {
          target: env.OPENMAIC_PROXY_TARGET || 'http://127.0.0.1:3100',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/openmaic/, ''),
        },
        '/_next': {
          target: env.OPENMAIC_PROXY_TARGET || 'http://127.0.0.1:3100',
          changeOrigin: true,
        },
        '/api/anonymous-runtime': {
          target: env.OPENMAIC_PROXY_TARGET || 'http://127.0.0.1:3100',
          changeOrigin: true,
        },
        '/classroom-api': {
          target: env.CLASSROOM_PROXY_TARGET || 'http://127.0.0.1:8788',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/classroom-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest, request) => {
              proxyRequest.removeHeader('origin');
              const hostname = String(request.headers.host || '').split(':')[0];
              const teacherApiKey = env.CLASSROOM_TEACHER_API_KEY || '';
              if (teacherApiKey && ['leon.local.yungu-inc.org', 'localhost', '127.0.0.1'].includes(hostname)) {
                proxyRequest.setHeader('X-Teacher-Api-Key', teacherApiKey);
              }
            });
          },
        },
        '/api': {
          target: env.BFF_PROXY_TARGET || 'http://127.0.0.1:8787',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4180,
      allowedHosts: ['leon.local.yungu-inc.org'],
    },
  };
});
