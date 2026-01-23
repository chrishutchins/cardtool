const http = require('http');
const https = require('https');

const PORT = 8890;
const MX_BASE_URL = 'int-api.mx.com';
const MX_AUTH = 'Basic NjZlNzAzNGMtMjNiYy00YzQ2LTgwMmEtMWRmMTFlOTI0N2MwOmQ3OTUzZDY3NDRmYWQyODBkMjczMTBjMGZiMWQyM2JhZWRkOWFlODU=';

// Helper to make MX API requests
function mxRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MX_BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/vnd.mx.api.v1+json',
        'Content-Type': 'application/json',
        'Authorization': MX_AUTH
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Store user/member info
let currentUser = null;
let currentMember = null;

const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
  <title>MX Platform Test v2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #e5e5e5; }
    h1 { color: #fff; }
    button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 5px; }
    button:hover { background: #2563eb; }
    button:disabled { background: #4b5563; cursor: not-allowed; }
    .card { background: #262626; border-radius: 8px; padding: 20px; margin: 20px 0; }
    pre { background: #171717; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .success { background: #166534; }
    .error { background: #991b1b; }
    .info { background: #1e40af; }
    #connect-widget { width: 100%; height: 600px; border: none; border-radius: 8px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <h1>MX Platform API Test</h1>
  
  <div class="card">
    <h2>Step 1: Create User</h2>
    <p>Create a test user in MX to link accounts</p>
    <button onclick="createUser()">Create User</button>
    <div id="user-status"></div>
  </div>

  <div class="card">
    <h2>Step 2: Connect Account</h2>
    <p>Use the MX Connect widget to link a financial account</p>
    <button onclick="loadConnectWidget()" id="connect-btn" disabled>Open Connect Widget</button>
    <div id="widget-container" class="hidden">
      <iframe id="connect-widget"></iframe>
    </div>
    <div id="connect-status"></div>
  </div>

  <div class="card">
    <h2>Step 3: View Data</h2>
    <button onclick="fetchAccounts()" id="accounts-btn" disabled>Fetch Accounts</button>
    <button onclick="fetchTransactions()" id="txn-btn" disabled>Fetch Transactions</button>
    <div id="data-output"></div>
  </div>

  <script>
    let userGuid = null;
    let memberGuid = null;

    async function createUser() {
      const status = document.getElementById('user-status');
      status.innerHTML = '<div class="status info">Creating user...</div>';
      
      try {
        const res = await fetch('/api/create-user', { method: 'POST' });
        const data = await res.json();
        
        if (data.user) {
          userGuid = data.user.guid;
          status.innerHTML = '<div class="status success">User created: ' + userGuid + '</div>';
          document.getElementById('connect-btn').disabled = false;
        } else {
          status.innerHTML = '<div class="status error">Error: ' + JSON.stringify(data) + '</div>';
        }
      } catch (e) {
        status.innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
      }
    }

    async function loadConnectWidget() {
      const status = document.getElementById('connect-status');
      status.innerHTML = '<div class="status info">Loading widget (v2)...</div>';
      
      try {
        const res = await fetch('/api/connect-widget?user_guid=' + userGuid);
        const text = await res.text();
        console.log('Raw response:', text);
        
        const data = JSON.parse(text);
        console.log('Parsed data:', data);
        console.log('data.user:', data.user);
        console.log('connect_widget_url:', data.user ? data.user.connect_widget_url : 'no user');
        
        // Response structure: { user: { connect_widget_url: "...", guid: "..." } }
        let widgetUrl = null;
        if (data.user && data.user.connect_widget_url) {
          widgetUrl = data.user.connect_widget_url;
        }
        
        console.log('Final widgetUrl:', widgetUrl);
        
        if (widgetUrl && widgetUrl.startsWith('http')) {
          document.getElementById('widget-container').classList.remove('hidden');
          document.getElementById('connect-widget').src = widgetUrl;
          status.innerHTML = '<div class="status success">Widget loaded (v2). Complete the connection flow above.</div>';
          window.addEventListener('message', handleWidgetMessage);
        } else {
          status.innerHTML = '<div class="status error">No valid URL found. Raw: ' + text.substring(0, 200) + '</div>';
        }
      } catch (e) {
        console.error('Error:', e);
        status.innerHTML = '<div class="status error">Exception: ' + e.message + '</div>';
      }
    }

    function handleWidgetMessage(event) {
      if (event.data && event.data.mx) {
        const msg = event.data;
        console.log('MX Widget message:', msg);
        
        if (msg.type === 'mx/connect/memberConnected') {
          memberGuid = msg.metadata.member_guid;
          document.getElementById('connect-status').innerHTML = 
            '<div class="status success">Account connected! Member GUID: ' + memberGuid + '</div>';
          document.getElementById('accounts-btn').disabled = false;
          document.getElementById('txn-btn').disabled = false;
        } else if (msg.type === 'mx/connect/loaded') {
          console.log('Widget loaded');
        }
      }
    }

    async function fetchAccounts() {
      const output = document.getElementById('data-output');
      output.innerHTML = '<div class="status info">Fetching accounts...</div>';
      
      try {
        const res = await fetch('/api/accounts?user_guid=' + userGuid + '&member_guid=' + memberGuid);
        const data = await res.json();
        output.innerHTML = '<h3>Accounts</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        output.innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
      }
    }

    async function fetchTransactions() {
      const output = document.getElementById('data-output');
      output.innerHTML = '<div class="status info">Fetching transactions...</div>';
      
      try {
        const res = await fetch('/api/transactions?user_guid=' + userGuid);
        const data = await res.json();
        output.innerHTML = '<h3>Transactions</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        output.innerHTML = '<div class="status error">Error: ' + e.message + '</div>';
      }
    }
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Serve HTML page
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(HTML_PAGE);
    return;
  }

  // Create user
  if (url.pathname === '/api/create-user' && req.method === 'POST') {
    const userId = 'test_user_' + Date.now();
    const result = await mxRequest('POST', '/users', {
      user: {
        id: userId,
        is_disabled: false
      }
    });
    
    if (result.data.user) {
      currentUser = result.data.user;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.data));
    return;
  }

  // Get Connect widget URL
  if (url.pathname === '/api/connect-widget' && req.method === 'GET') {
    const userGuid = url.searchParams.get('user_guid');
    
    const result = await mxRequest('POST', `/users/${userGuid}/connect_widget_url`, {
      widget_url: {
        widget_type: 'connect_widget',
        mode: 'aggregation',
        include_transactions: true,
        wait_for_full_aggregation: false
      }
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.data));
    return;
  }

  // Get accounts
  if (url.pathname === '/api/accounts' && req.method === 'GET') {
    const userGuid = url.searchParams.get('user_guid');
    const memberGuid = url.searchParams.get('member_guid');
    
    const result = await mxRequest('GET', `/users/${userGuid}/members/${memberGuid}/accounts`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.data));
    return;
  }

  // Get transactions
  if (url.pathname === '/api/transactions' && req.method === 'GET') {
    const userGuid = url.searchParams.get('user_guid');
    
    // Get transactions for the user (across all accounts)
    const result = await mxRequest('GET', `/users/${userGuid}/transactions?page=1&records_per_page=25`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.data));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`MX Test Server running at http://localhost:${PORT}`);
  console.log('Open this URL in your browser to test MX account linking');
});
