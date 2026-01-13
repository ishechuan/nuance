import { Readability } from '@mozilla/readability';
import type { 
  ExtractContentResponse, 
  HighlightTextResponse, 
  ClearHighlightsResponse,
  Message 
} from '@/lib/messages';

const HIGHLIGHT_CLASS = 'nuance-highlight';
const HIGHLIGHT_STYLE_ID = 'nuance-highlight-styles';

// Inject highlight styles
function injectStyles() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: linear-gradient(120deg, #ffd54f 0%, #ffeb3b 100%);
      padding: 2px 4px;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      animation: nuance-pulse 0.6s ease-out;
    }
    
    @keyframes nuance-pulse {
      0% {
        background: linear-gradient(120deg, #ff9800 0%, #ffc107 100%);
        transform: scale(1.05);
      }
      100% {
        background: linear-gradient(120deg, #ffd54f 0%, #ffeb3b 100%);
        transform: scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}

// Extract article content using Readability
function extractArticle(): ExtractContentResponse {
  try {
    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      return {
        success: false,
        errorCode: 'EXTRACT_NO_ARTICLE',
      };
    }
    
    return {
      success: true,
      data: {
        title: article.title || document.title,
        content: article.content || '',
        textContent: article.textContent || '',
        url: window.location.href,
      },
    };
  } catch (error) {
    return {
      success: false,
      errorCode: 'EXTRACT_FAILED',
      errorDetail: error instanceof Error ? error.message : String(error),
    };
  }
}

// Find and highlight text in the document
function highlightText(searchText: string): HighlightTextResponse {
  try {
    // First clear any existing highlights
    clearHighlights();
    injectStyles();
  
  const searchLower = searchText.toLowerCase().trim();
  if (!searchLower) {
    return { success: true, found: false };
  }
  
  // Use TreeWalker to find text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script, style, and already highlighted elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        if (parent.classList.contains(HIGHLIGHT_CLASS)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }
  
  let found = false;
  
  // Search for the text across text nodes
  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(searchLower);
    
    if (index !== -1) {
      // Found a match - split and wrap
      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + searchText.length);
      
      const highlight = document.createElement('mark');
      highlight.className = HIGHLIGHT_CLASS;
      
      try {
        range.surroundContents(highlight);
        
        // Scroll the highlight into view
        highlight.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        
        found = true;
        break; // Only highlight first match
      } catch (e) {
        // Range may cross element boundaries, try next match
        continue;
      }
    }
  }
  
  // If exact match not found, try to find a partial match (for longer sentences)
  if (!found && searchText.length > 50) {
    // Try with first 50 characters
    const shortSearch = searchText.slice(0, 50).toLowerCase();
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const textLower = text.toLowerCase();
      const index = textLower.indexOf(shortSearch);
      
      if (index !== -1) {
        const range = document.createRange();
        const endIndex = Math.min(index + searchText.length, text.length);
        range.setStart(textNode, index);
        range.setEnd(textNode, endIndex);
        
        const highlight = document.createElement('mark');
        highlight.className = HIGHLIGHT_CLASS;
        
        try {
          range.surroundContents(highlight);
          highlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          found = true;
          break;
        } catch (e) {
          continue;
        }
      }
    }
  }
  
    return { success: true, found };
  } catch (error) {
    return {
      success: false,
      found: false,
      errorCode: 'UNKNOWN_ERROR',
      errorDetail: error instanceof Error ? error.message : String(error),
    };
  }
}

// Clear all highlights
function clearHighlights(): ClearHighlightsResponse {
  try {
    const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
    highlights.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        const textNode = document.createTextNode(highlight.textContent || '');
        parent.replaceChild(textNode, highlight);
        parent.normalize();
      }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errorCode: 'UNKNOWN_ERROR',
      errorDetail: error instanceof Error ? error.message : String(error),
    };
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  
  main() {
    // Listen for messages from sidepanel/background
    browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
      switch (message.type) {
        case 'EXTRACT_CONTENT':
          sendResponse(extractArticle());
          break;
          
        case 'HIGHLIGHT_TEXT':
          sendResponse(highlightText(message.text));
          break;
          
        case 'CLEAR_HIGHLIGHTS':
          sendResponse(clearHighlights());
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
      
      // Return true to indicate async response
      return true;
    });
    
    console.log('[Nuance] Content script loaded');
  },
});
