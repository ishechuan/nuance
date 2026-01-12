import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Nuance',
    description: 'AI-powered English learning assistant - Extract, Analyze, Master',
    permissions: ['storage', 'activeTab', 'sidePanel', 'contextMenus'],
    host_permissions: ['https://api.deepseek.com/*', 'https://api.github.com/*'],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000; object-src 'self'; connect-src 'self' https://api.deepseek.com https://api.github.com;",
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: 'Open Nuance',
    },
  },
});
