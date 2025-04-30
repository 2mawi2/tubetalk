
function updateStatus(type = 'status') {
  console.log(`Status update (${type})`);
  
  const messageDiv = document.getElementById('message');
  if (!messageDiv) {
    console.error('Message div not found');
    return;
  }
  
  const spinner = document.querySelector('.spinner');
  
  if (type === 'error') {
    messageDiv.innerHTML = `<div class="error"></div>`;
    if (spinner) spinner.style.display = 'none';
    // Auto-close after a delay
    setTimeout(() => window.close(), 5000);
  } else if (type === 'success') {
    messageDiv.innerHTML = `<div class="success"></div>`;
    if (spinner) spinner.style.display = 'none';
    // Auto-close on success after a short delay
    setTimeout(() => window.close(), 2000);
  } else {
    messageDiv.innerHTML = `<div class="status"></div>`;
  }
}

// Log the full callback URL for debugging purposes
console.log('OAuth callback URL:', window.location.href);

// Extract code from URL as documented in OpenRouter docs
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const error = urlParams.get('error');
const error_description = urlParams.get('error_description');

console.log('OAuth callback received:', {
  code: code ? `${code.substring(0, 6)}...` : null,
  error: error || 'none',
  error_description: error_description || 'none'
});

if (error) {
  console.error('OAuth error from OpenRouter:', error, error_description);
  updateStatus('error');
} else if (code) {
  console.log('Received auth code, exchanging for API key');
  updateStatus('status');
  
  // Send code to background script for exchange
  chrome.runtime.sendMessage({ 
    type: 'openrouter_oauth_code', 
    code 
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message to background script:', chrome.runtime.lastError);
      updateStatus('error');
    }
  });

  // Listen for response from background script
  chrome.runtime.onMessage.addListener((message) => {
    console.log('Received message from background script:', message);
    
    if (message.type === 'auth_success') {
      console.log('Authentication successful!');
      updateStatus('success');
    } else if (message.type === 'auth_error') {
      const errorMessage = message.error || 'Unknown error during token exchange';
      console.error('Auth error:', errorMessage);
      updateStatus('error');
    }
  });
} else {
  console.error('No code or error received in URL parameters');
  updateStatus('error');
} 
