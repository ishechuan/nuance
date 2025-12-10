import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Nuance',
    description: 'AI-powered English learning assistant - Extract, Analyze, Master',
    permissions: ['storage', 'activeTab', 'sidePanel', 'contextMenus'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: 'Open Nuance',
    },
  },
});
