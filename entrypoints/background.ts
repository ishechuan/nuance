import { handleMessage } from '@/lib/background/handlers/message-handler';
import { setupAuthStateListener, initializeSession } from '@/lib/background/services/auth-service';
import type { Message } from '@/lib/messages';

export default defineBackground(() => {
  // Setup auth state change listener
  setupAuthStateListener();
  
  // Initialize session on startup
  initializeSession().then((session) => {
    console.log('[Nuance] Session initialized:', session ? 'logged in' : 'not logged in');
  });

  // Handle extension icon click - open side panel
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });
  
  // Handle messages from sidepanel
  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    
    // Return true to indicate async response
    return true;
  });
  
  console.log('[Nuance] Background service worker started');
});
