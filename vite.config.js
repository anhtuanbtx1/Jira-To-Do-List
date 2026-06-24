import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const jiraUrl = env.VITE_JIRA_BASE_URL || 'https://jira-local.ots.vn';

  const envSavePlugin = {
    name: 'env-save-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-env' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const envContent = [
                `VITE_JIRA_BASE_URL=${data.baseUrl || ''}`,
                `VITE_JIRA_BEARER_TOKEN=${data.bearerToken || ''}`,
                `VITE_JIRA_COOKIE=${data.cookie || ''}`,
                `VITE_JIRA_DEFAULT_PROJECT_KEY=${data.defaultProjectKey || ''}`,
                `VITE_JIRA_ISSUE_TYPE_NAME=${data.issueTypeName || 'Story'}`
              ].join('\n') + '\n';

              fs.writeFileSync(path.resolve(process.cwd(), '.env'), envContent, 'utf-8');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };

  return {
    plugins: [react(), envSavePlugin],
    server: {
      allowedHosts: true,
      proxy: {
        '/release-api': {
          target: 'http://localhost:8765',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/release-api/, '')
        },
        '/jira-api': {
          target: jiraUrl,
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
  };
})
