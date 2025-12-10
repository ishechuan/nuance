import { handleMessage } from '@/lib/background/handlers/message-handler';
import { setupAuthStateListener, initializeSession } from '@/lib/background/services/auth-service';
import type { Message } from '@/lib/messages';

// Storage key for pending custom entry data
const PENDING_ENTRY_KEY = 'nuance_pending_entry';

export interface PendingEntryData {
  selectedText: string;
  url: string;
  title: string;
  timestamp: number;
}

export default defineBackground(() => {
  // Setup auth state change listener
  setupAuthStateListener();
  
  // Initialize session on startup
  initializeSession().then((session) => {
    console.log('[Nuance] Session initialized:', session ? 'logged in' : 'not logged in');
  });

  // Create context menu on install/startup
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'add-to-nuance',
      title: '添加到 Nuance',
      contexts: ['selection'],
    });
    console.log('[Nuance] Context menu created');
  });

  // Handle context menu click
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'add-to-nuance' && info.selectionText && tab?.id) {
      // Store the selected text and page info
      const pendingEntry: PendingEntryData = {
        selectedText: info.selectionText,
        url: tab.url || '',
        title: tab.title || '',
        timestamp: Date.now(),
      };
      
      // Save to storage so sidepanel can access it
      await browser.storage.local.set({ [PENDING_ENTRY_KEY]: pendingEntry });
      
      // Open the side panel
      await browser.sidePanel.open({ tabId: tab.id });
      
      console.log('[Nuance] Context menu clicked, pending entry saved:', pendingEntry.selectedText);
    }
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
