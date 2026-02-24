import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/jira-api': {
        target: 'https://jira-local.ots.vn',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/jira-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove User-Agent to avoid Jira XSRF check treating this as browser request
            proxyReq.removeHeader('user-agent');
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            // Ensure XSRF bypass header is set
            if (!proxyReq.getHeader('x-atlassian-token')) {
              proxyReq.setHeader('X-Atlassian-Token', 'no-check');
            }
          });
        },
      },
    },
  },
})
