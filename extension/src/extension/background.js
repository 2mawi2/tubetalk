// background.js
import { startOpenRouterOAuthFlow, exchangeOpenRouterCode } from '../auth/openrouterAuthService.js';

async function handleToggleSidebar(tabId) {
    console.log('Attempting to toggle sidebar for tab:', tabId);
    try {
        await chrome.tabs.sendMessage(tabId, { action: "toggleSidebar" });
        console.log('Message sent successfully');
    } catch (error) {
        console.log('Error sending message:', error);
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url?.includes("youtube.com")) {
        await handleToggleSidebar(tab.id);
    } else {
        console.log('TubeTalk action clicked on non-YouTube page:', tab.url);
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-sidebar-from-key-combination") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url?.includes("youtube.com")) {
            await handleToggleSidebar(tab.id);
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message, 'from sender:', sender);
  
  if (message.action === 'start_openrouter_oauth') {
    console.log('Starting OAuth flow from user action');
    startOpenRouterOAuthFlow();
  } else if (message.type === 'openrouter_oauth_code') {
    console.log('Received OAuth code, starting exchange');
    exchangeOpenRouterCode(message.code, sender.tab?.id);
  } else if (message.action === 'open_settings') {
    console.log('Opening settings with provider:', message.provider);
    // Send message to open settings panel with pre-selected provider
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { 
        action: 'showSettings',
        provider: message.provider 
      });
    }
  }
  
  return true;
});
