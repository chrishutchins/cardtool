const http = require('http');
const https = require('https');

// Akoya sandbox credentials
const AKOYA_CLIENT_ID = '52d5dc75-98e0-4df4-b1ff-809a2c06a387';
const AKOYA_CLIENT_SECRET = 'jJBEwwl2mgSQ4IfL~UooyLij0C';
const PORT = 8889;
const REDIRECT_URI = 'http://localhost:' + PORT + '/callback';

// HTML page
const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
  <title>Akoya API Test</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    button { background: #0066cc; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 6px; cursor: pointer; margin: 5px; }
    button:hover { background: #0052a3; }
    .provider-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
    .provider-btn { background: #2d3748; padding: 15px; text-align: center; }
    .provider-btn:hover { background: #4a5568; }
    h1 { color: #333; }
    .instructions { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0066cc; }
    .section { margin: 30px 0; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; }
    input { padding: 10px; font-size: 14px; width: 300px; margin-right: 10px; border: 1px solid #ccc; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Akoya Connect Test (Standalone)</h1>
  
  <div class="instructions">
    <strong>Instructions:</strong>
    <ol>
      <li>Select a provider (bank) below to connect</li>
      <li>Authenticate with sandbox credentials (try: <code>mikomo / mikomo</code>)</li>
      <li>After redirect, the page will fetch and display your data</li>
    </ol>
  </div>

  <div class="section">
    <h2>Select a Provider</h2>
    <p>Common sandbox providers:</p>
    <div class="provider-grid">
      <button class="provider-btn" onclick="connect('mikomo')">Mikomo (Test Bank)</button>
      <button class="provider-btn" onclick="connect('chase')">Chase</button>
      <button class="provider-btn" onclick="connect('capitalone')">Capital One</button>
      <button class="provider-btn" onclick="connect('citi')">Citi</button>
      <button class="provider-btn" onclick="connect('amex')">American Express</button>
      <button class="provider-btn" onclick="connect('bankofamerica')">Bank of America</button>
    </div>
    <p style="margin-top:20px">Or enter a provider ID manually:</p>
    <input type="text" id="custom-provider" placeholder="e.g., mikomo">
    <button onclick="connect(document.getElementById('custom-provider').value)">Connect</button>
  </div>

  <script>
    const CLIENT_ID = '` + AKOYA_CLIENT_ID + `';
    const REDIRECT_URI = '` + REDIRECT_URI + `';
    
    function connect(providerId) {
      if (!providerId) {
        alert('Please enter a provider ID');
        return;
      }
      
      // State must be at least 8 characters
      const state = 'provider_' + providerId + '_' + Date.now();
      
      const params = new URLSearchParams({
        connector: providerId,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'openid offline_access',
        state: state
      });
      
      window.location.href = 'https://sandbox-idp.ddp.akoya.com/auth?' + params.toString();
    }
  </script>
</body>
</html>`;

// Helper to make HTTPS requests
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Create server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = urlObj.pathname;
  const query = Object.fromEntries(urlObj.searchParams);

  console.log(new Date().toISOString() + ' - ' + req.method + ' ' + pathname);

  // Serve main page
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML_PAGE);
    return;
  }

  // Handle OAuth callback
  if (pathname === '/callback') {
    const code = query.code;
    const state = query.state;
    const error = query.error;

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body><h1>Error</h1><pre>' + escapeHtml(error) + ': ' + escapeHtml(query.error_description || '') + '</pre><a href="/">Try again</a></body></html>');
      return;
    }

    if (!code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body><h1>Error</h1><pre>No authorization code received</pre><a href="/">Try again</a></body></html>');
      return;
    }

    // Parse provider from state (format: provider_NAME_timestamp)
    let provider = 'mikomo';
    if (state && state.startsWith('provider_')) {
      const parts = state.split('_');
      if (parts.length >= 2) {
        provider = parts[1];
      }
    }
    console.log('Exchanging code for provider: ' + provider);

    try {
      // Exchange code for tokens
      const tokenPostData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }).toString();

      const tokenResponse = await httpsRequest({
        hostname: 'sandbox-idp.ddp.akoya.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(AKOYA_CLIENT_ID + ':' + AKOYA_CLIENT_SECRET).toString('base64'),
          'Content-Length': Buffer.byteLength(tokenPostData),
        },
      }, tokenPostData);

      console.log('Token response status:', tokenResponse.status);

      if (tokenResponse.status !== 200) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><body><h1>Token Exchange Failed</h1><pre>Status: ' + tokenResponse.status + '\n' + escapeHtml(tokenResponse.body) + '</pre><a href="/">Try again</a></body></html>');
        return;
      }

      const tokens = JSON.parse(tokenResponse.body);
      const idToken = tokens.id_token;
      console.log('Got ID token:', idToken ? 'yes' : 'no');

      // Fetch accounts
      const accountsResponse = await httpsRequest({
        hostname: 'sandbox-products.ddp.akoya.com',
        path: '/accounts-info/v2/' + provider,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Accept': 'application/json',
        },
      });

      console.log('Accounts response status:', accountsResponse.status);
      let accountsData = accountsResponse.body;
      let accountsJson = null;
      try {
        accountsJson = JSON.parse(accountsData);
      } catch (e) {
        // Keep as string
      }

      // Try to get first account ID for transactions
      let transactionsData = 'No transactions fetched';
      if (accountsJson) {
        const accounts = accountsJson.accounts || accountsJson.depositAccounts || accountsJson.loanAccounts || accountsJson.creditCardAccounts || [];
        const firstAccount = accounts[0];
        const accountId = firstAccount ? firstAccount.accountId : null;
        
        if (accountId) {
          console.log('Fetching transactions for account: ' + accountId);
          const txnResponse = await httpsRequest({
            hostname: 'sandbox-products.ddp.akoya.com',
            path: '/transactions/v2/' + provider + '/' + accountId,
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + idToken,
              'Accept': 'application/json',
            },
          });
          console.log('Transactions response status:', txnResponse.status);
          transactionsData = txnResponse.body;
        }
      }

      // Format JSON nicely
      let formattedAccounts = accountsData;
      let formattedTransactions = transactionsData;
      try {
        formattedAccounts = JSON.stringify(JSON.parse(accountsData), null, 2);
      } catch (e) {}
      try {
        formattedTransactions = JSON.stringify(JSON.parse(transactionsData), null, 2);
      } catch (e) {}

      // Return results page
      const resultsHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Akoya Results - ` + escapeHtml(provider) + `</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    pre { background: #1a1a2e; color: #00ff88; padding: 20px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; max-height: 600px; overflow-y: auto; font-size: 12px; }
    h1 { color: #333; }
    .success { background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .section { margin: 30px 0; padding: 20px; background: white; border-radius: 8px; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Akoya Data for ` + escapeHtml(provider) + `</h1>
  <div class="success">Successfully connected and fetched data!</div>
  <p><a href="/">Connect another provider</a></p>
  
  <div class="section">
    <h2>Accounts</h2>
    <pre>` + escapeHtml(formattedAccounts) + `</pre>
  </div>
  
  <div class="section">
    <h2>Transactions</h2>
    <pre>` + escapeHtml(formattedTransactions) + `</pre>
  </div>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(resultsHtml);

    } catch (err) {
      console.error('Callback error:', err);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body><h1>Error</h1><pre>' + escapeHtml(err.message) + '</pre><a href="/">Try again</a></body></html>');
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('Akoya Test Server running at http://localhost:' + PORT);
  console.log('Redirect URI: ' + REDIRECT_URI);
  console.log('========================================');
  console.log('');
});
