// openrouterAuthService.js
// This module contains all OpenRouter OAuth-related functionality

// PKCE Code Generation Utilities
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(digest);
}

function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

// OAuth Flow Initiation
async function startOpenRouterOAuthFlow() {
  console.log('Starting OAuth flow...');
  const extensionId = chrome.runtime.id;
  const redirectUri = `chrome-extension://${extensionId}/src/auth/openrouter-callback.html`;
  console.log('Using redirect URI:', redirectUri);
  
  try {
    // Generate PKCE code verifier (random string for security)
    const codeVerifier = generateCodeVerifier();
    console.log('Generated code verifier:', codeVerifier);
    
    // Store code verifier in local storage
    await chrome.storage.local.set({ 'openrouter_code_verifier': codeVerifier });
    console.log('Stored code verifier in local storage');
    
    // Compute code challenge using S256 method
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log('Generated S256 code challenge:', codeChallenge);
    
    // Create auth URL with necessary parameters
    const authUrl = new URL('https://openrouter.ai/auth');
    
    // Add parameters exactly as shown in the docs
    authUrl.searchParams.append('callback_url', redirectUri);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    console.log('OAuth flow parameters:', {
      callback_url: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    const finalUrl = authUrl.toString();
    console.log('Opening auth URL:', finalUrl);
    chrome.tabs.create({ url: finalUrl });
  } catch (error) {
    console.error('Error setting up OAuth flow:', error);
  }
}

async function exchangeOpenRouterCode(code, senderId) {
  console.log('Received code for exchange:', code);
  
  try {
    // Retrieve the code verifier from storage
    const result = await chrome.storage.local.get('openrouter_code_verifier');
    const codeVerifier = result.openrouter_code_verifier;
    
    if (!codeVerifier) {
      console.error('No code verifier found in storage');
      handleExchangeError(new Error('No code verifier found. Please try authenticating again.'), senderId);
      return;
    }
    
    console.log('Retrieved code verifier:', codeVerifier);
    
    // Use the exact endpoint from the documentation
    const endpoint = 'https://openrouter.ai/api/v1/auth/keys';
    console.log('Performing token exchange with endpoint:', endpoint);
    
    const requestBody = {
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256'
    };
    
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorDetails = `: ${JSON.stringify(errorData.error)}`;
        } else if (errorData.message) {
          errorDetails = `: ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        if (responseText.includes('<!DOCTYPE html>')) {
          errorDetails = ': Received HTML response instead of JSON';
        }
      }
      throw new Error(`Token exchange failed: ${response.status}${errorDetails}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Successfully parsed response as JSON. Keys:', Object.keys(data));
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON response');
    }
    
    // Handle different potential API key formats
    const apiKey = data.key || data.api_key || (data.data && data.data.key);
    
    if (!apiKey) {
      console.error('No API key in response, response structure:', Object.keys(data));
      throw new Error('No API key in response');
    }
    
    // Clean up the stored code verifier
    await chrome.storage.local.remove('openrouter_code_verifier');
    console.log('Removed code verifier from storage');
    
    // Process successful exchange
    await processSuccessfulExchange(apiKey, senderId);
  } catch (error) {
    console.error('Token exchange failed:', error);
    handleExchangeError(error, senderId);
  }
}

// Helper function to process a successful token exchange
async function processSuccessfulExchange(apiKey, senderId) {
  // Store the API key
  await chrome.storage.sync.set({ openaiApiKey: apiKey });
  console.log('API key stored successfully');
  
  // Notify the callback page about successful auth
  if (senderId) {
    console.log('Sending success message to callback page');
    chrome.tabs.sendMessage(senderId, { type: 'auth_success' });
  }
  
  // Broadcast to all tabs that the API key was updated
  const tabs = await chrome.tabs.query({});
  console.log('Broadcasting API key update to all tabs');
  for (const tab of tabs) {
    if (tab.url?.includes('youtube.com')) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'storage_updated',
          key: 'openaiApiKey',
          value: apiKey
        });
        console.log('Sent update to tab:', tab.id);
      } catch (error) {
        console.log('Could not send to tab:', tab.id);
      }
    }
  }
}

// Helper function to handle token exchange errors
function handleExchangeError(error, senderId) {
  console.error('Token exchange failed:', error);
  if (senderId) {
    console.log('Sending error message to callback page');
    chrome.tabs.sendMessage(senderId, { 
      type: 'auth_error', 
      error: error.message || 'Unknown error during token exchange'
    });
  }
}

// Export functions for use in background script
export {
  startOpenRouterOAuthFlow,
  exchangeOpenRouterCode
}; 