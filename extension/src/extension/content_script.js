import { initializeSidebar } from './extension.jsx';
import { PlayerIcon } from '../common/components/icons/PlayerIcon';

let sidebarRoot = null;
let wasInCinemaMode = false;

const resetYouTubeLayout = () => {
  const elements = [
    document.querySelector('ytd-app'),
    document.querySelector('ytd-masthead'),
    document.getElementById('player')
  ];

  elements.forEach(element => {
    if (element) {
      element.style.removeProperty('margin-right');
      element.style.removeProperty('width');
      element.style.removeProperty('position');
      element.style.removeProperty('z-index');
      element.style.removeProperty('box-sizing');
    }
  });

  // Trigger resize to ensure YouTube updates its layout
  window.dispatchEvent(new Event('resize'));
};

const waitForElement = (selector, maxAttempts = 10) => {
  let attempts = 0;
  return new Promise((resolve) => {
    const check = () => {
      const element = document.querySelector(selector);
      attempts++;
      if (element || attempts >= maxAttempts) {
        resolve(element || null);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
};

let lastCinemaModeCheck = {
  timestamp: 0,
  result: false
};

const isCinemaModeEnabled = () => {
  // Use cached result if recent (within 500ms)
  if (Date.now() - lastCinemaModeCheck.timestamp < 500) {
    return lastCinemaModeCheck.result;
  }

  const player = document.querySelector('ytd-watch-flexy');
  const isEnabled = player && (
    player.hasAttribute('theater') || 
    player.classList.contains('theater') ||
    player.getAttribute('theater') !== null ||
    document.querySelector('ytd-watch-flexy[theater]')
  );
  
  lastCinemaModeCheck = {
    timestamp: Date.now(),
    result: isEnabled
  };
  
  console.log('[TubeTalk] Cinema mode check:', isEnabled);
  return isEnabled;
};

const toggleCinemaMode = async () => {
  console.log('[TubeTalk] Attempting to toggle cinema mode...');
  const button = await waitForElement('.ytp-size-button');
  
  if (button) {
    console.log('[TubeTalk] Found cinema mode button, clicking...');
    button.click();
    return true;
  }
  
  console.log('[TubeTalk] Cinema mode button not found');
  return false;
};

const ensureCinemaModeEnabled = async () => {
  const currentState = isCinemaModeEnabled();
  
  if (!currentState) {
    console.log('[TubeTalk] Enabling cinema mode...');
    await toggleCinemaMode();
    return true;
  }
  
  return true;
};

const toggleSidebar = async () => {
  if (sidebarRoot) {
    console.log('[TubeTalk] Closing sidebar...');
    if (!wasInCinemaMode && isCinemaModeEnabled()) {
      await toggleCinemaMode();
    }
    resetYouTubeLayout();
    sidebarRoot.remove();
    sidebarRoot = null;
    return;
  }

  console.log('[TubeTalk] Opening sidebar...');
  wasInCinemaMode = isCinemaModeEnabled();
  
  // Only toggle cinema mode if not already enabled
  if (!wasInCinemaMode) {
    await ensureCinemaModeEnabled();
  }

  sidebarRoot = document.createElement('div');
  sidebarRoot.id = 'yt-sidebar-root';
  document.body.appendChild(sidebarRoot);
  
  initializeSidebar(() => {
    if (!wasInCinemaMode && isCinemaModeEnabled()) {
      toggleCinemaMode();
    }
    resetYouTubeLayout();
    sidebarRoot.remove();
    sidebarRoot = null;
  });
};

// Update the message listener to handle storage updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TubeTalk] Received message:', request);
  
  if (request.action === "toggleSidebar") {
    toggleSidebar();
  } else if (request.action === "showSettings") {
    // Open sidebar if not already open
    if (!sidebarRoot) {
      toggleSidebar();
    }
    // Dispatch event to show settings with provider
    setTimeout(() => {
      const event = new CustomEvent('tubetalk-show-settings', {
        detail: {
          provider: request.provider
        }
      });
      window.dispatchEvent(event);
    }, 500); // Wait for sidebar to initialize
  } else if (request.type === 'storage_updated' && request.key === 'openaiApiKey') {
    console.log('[TubeTalk] Broadcasting API key update to React components');
    
    // First dispatch the event for React components
    const event = new CustomEvent('tubetalk-storage-update', {
      detail: {
        key: request.key,
        value: request.value
      }
    });
    window.dispatchEvent(event);
    
    // Then refresh the sidebar if it's open
    if (sidebarRoot) {
      console.log('[TubeTalk] Refreshing sidebar with new API key');
      const oldRoot = sidebarRoot;
      sidebarRoot = document.createElement('div');
      sidebarRoot.id = 'yt-sidebar-root';
      oldRoot.replaceWith(sidebarRoot);
      
      initializeSidebar(() => {
        if (!wasInCinemaMode && isCinemaModeEnabled()) {
          toggleCinemaMode();
        }
        resetYouTubeLayout();
        sidebarRoot.remove();
        sidebarRoot = null;
      });
    }
  }
});

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'y') {
    toggleSidebar();
  }
});

// Listen for extension messages from e2e tests
window.addEventListener('message', (event) => {
  if (event.data.type === 'EXTENSION_MESSAGE' && event.data.message?.action === 'toggleSidebar') {
    toggleSidebar();
  }
});

// Add this function to inject the button
const injectPlayerButton = () => {
  const rightControls = document.querySelector('.ytp-right-controls');
  console.log('[TubeTalk] Found right controls:', !!rightControls);
  if (!rightControls || document.getElementById('tubetalk-player-button')) return;

  const button = document.createElement('button');
  button.id = 'tubetalk-player-button';
  button.className = 'ytp-button';
  button.setAttribute('aria-label', 'Open TubeTalk Summary');
  button.setAttribute('title', 'Open TubeTalk Summary');
  button.style.cssText = `
    background: transparent;
    border: none;
    outline: none;
    padding: 0px;
    cursor: pointer;
    width: 48px;
    height: 100%;
  `;

  // Insert the icon SVG
  button.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; transform: translateY(-12px);">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4.5" fill="white"/>
        <path d="M16.5 12L10 15.8971V8.10289L16.5 12Z" fill="#3B82F6"/>
      </svg>
    </div>
  `;

  // Add click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  });

  // Insert as first child of right controls
  const firstChild = rightControls.firstChild;
  if (firstChild) {
    rightControls.insertBefore(button, firstChild);
    console.log('[TubeTalk] Button injected as first child');
  } else {
    rightControls.appendChild(button);
    console.log('[TubeTalk] Button appended to right controls');
  }
};

// Add observer to handle dynamic player loading
const observePlayer = () => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        if (!document.getElementById('tubetalk-player-button')) {
          injectPlayerButton();
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial injection attempt
  injectPlayerButton();
};

// Modify the existing code to start observing
const initializeExtension = () => {
  observePlayer();
  console.log('[TubeTalk] Initializing extension and observing player');
  // ... any other initialization code ...
};

// Call initialization when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
