// ==UserScript==
// @name         CardTool Admin Helper
// @namespace    https://cardtool.chrishutchins.com
// @version      1.3.1
// @description  Admin tool to discover balance selectors on loyalty program sites
// @author       CardTool
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      cardtool.chrishutchins.com
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    const CARDTOOL_URL = 'https://cardtool.chrishutchins.com';

    // State
    let isPickMode = false;
    let hoveredElement = null;
    let currencies = [];

    // Styles
    const styles = `
        #cardtool-admin-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 380px;
            background: #18181b;
            border: 1px solid #3f3f46;
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            color: #e4e4e7;
            z-index: 999999;
            overflow: hidden;
        }
        #cardtool-admin-panel * {
            box-sizing: border-box;
        }
        .cardtool-header {
            background: #27272a;
            padding: 12px 16px;
            border-bottom: 1px solid #3f3f46;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }
        .cardtool-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #10b981;
        }
        .cardtool-close {
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px;
        }
        .cardtool-close:hover {
            color: #e4e4e7;
        }
        .cardtool-body {
            padding: 16px;
        }
        .cardtool-section {
            margin-bottom: 16px;
        }
        .cardtool-label {
            display: block;
            font-size: 12px;
            color: #a1a1aa;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cardtool-input {
            width: 100%;
            padding: 8px 12px;
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            color: #e4e4e7;
            font-size: 13px;
            font-family: monospace;
        }
        .cardtool-input:focus {
            outline: none;
            border-color: #10b981;
        }
        .cardtool-select {
            width: 100%;
            padding: 8px 12px;
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            color: #e4e4e7;
            font-size: 13px;
        }
        .cardtool-btn {
            width: 100%;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .cardtool-btn-primary {
            background: #10b981;
            color: white;
        }
        .cardtool-btn-primary:hover {
            background: #059669;
        }
        .cardtool-btn-primary:disabled {
            background: #3f3f46;
            color: #71717a;
            cursor: not-allowed;
        }
        .cardtool-btn-secondary {
            background: #3f3f46;
            color: #e4e4e7;
        }
        .cardtool-btn-secondary:hover {
            background: #52525b;
        }
        .cardtool-btn-secondary.active {
            background: #f59e0b;
            color: #18181b;
        }
        .cardtool-value {
            padding: 8px 12px;
            background: #27272a;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            color: #fbbf24;
            word-break: break-all;
        }
        .cardtool-row {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        .cardtool-row > * {
            flex: 1;
        }
        .cardtool-highlight {
            outline: 3px solid #f59e0b !important;
            outline-offset: 2px !important;
            background-color: rgba(245, 158, 11, 0.1) !important;
        }
        .cardtool-code {
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            padding: 12px;
            font-family: monospace;
            font-size: 11px;
            color: #a1a1aa;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow-y: auto;
        }
        .cardtool-notice {
            background: #422006;
            border: 1px solid #92400e;
            border-radius: 6px;
            padding: 10px 12px;
            font-size: 12px;
            color: #fcd34d;
            margin-bottom: 16px;
        }
        .cardtool-hint {
            font-size: 11px;
            color: #71717a;
            margin-top: 4px;
        }
    `;

    // Extract base domain from hostname (strip www. and subdomains for common patterns)
    function extractBaseDomain(hostname) {
        // Remove www.
        let domain = hostname.replace(/^www\./, '');
        
        // For common bank subdomains, extract base domain
        // e.g., secure.bankofamerica.com -> bankofamerica.com
        // e.g., onlinebanking.usbank.com -> usbank.com
        const parts = domain.split('.');
        if (parts.length > 2) {
            // Keep last two parts for most domains
            // Special case for co.uk, com.au, etc.
            const tld = parts.slice(-2).join('.');
            if (['co.uk', 'com.au', 'co.nz', 'co.jp'].includes(tld)) {
                domain = parts.slice(-3).join('.');
            } else {
                domain = parts.slice(-2).join('.');
            }
        }
        
        return domain;
    }

    // Create the UI
    function createUI() {
        // Add styles
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);

        // Create panel
        const panel = document.createElement('div');
        panel.id = 'cardtool-admin-panel';
        panel.innerHTML = `
            <div class="cardtool-header">
                <h3>CardTool Admin Helper</h3>
                <button class="cardtool-close" id="cardtool-close">&times;</button>
            </div>
            <div class="cardtool-body">
                <div class="cardtool-notice">
                    Use this tool to create site configs for the CardTool importer script.
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Domain</label>
                    <input type="text" class="cardtool-input" id="cardtool-domain" placeholder="e.g., united.com">
                    <div class="cardtool-hint">Base domain only - matches all subdomains and paths</div>
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Balance Page URL (optional)</label>
                    <input type="text" class="cardtool-input" id="cardtool-balance-url" placeholder="URL where balance is shown">
                    <div class="cardtool-hint">Shown as "View Balance" link when balance not found</div>
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Currency</label>
                    <select class="cardtool-select" id="cardtool-currency">
                        <option value="">Loading currencies...</option>
                    </select>
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Balance Selector</label>
                    <div class="cardtool-row">
                        <input type="text" class="cardtool-input" id="cardtool-selector" placeholder="CSS selector">
                    </div>
                    <button class="cardtool-btn cardtool-btn-secondary" id="cardtool-pick" style="margin-top: 8px;">
                        Pick Element
                    </button>
                </div>

                <div class="cardtool-section" id="cardtool-preview-section" style="display: none;">
                    <label class="cardtool-label">Extracted Value</label>
                    <div class="cardtool-value" id="cardtool-preview">—</div>
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Program Name</label>
                    <input type="text" class="cardtool-input" id="cardtool-name" placeholder="e.g., United MileagePlus">
                </div>

                <div class="cardtool-section">
                    <label class="cardtool-label">Generated Config</label>
                    <pre class="cardtool-code" id="cardtool-output">Fill in the fields above...</pre>
                </div>

                <button class="cardtool-btn cardtool-btn-primary" id="cardtool-save">
                    Save to CardTool
                </button>
                <button class="cardtool-btn cardtool-btn-secondary" id="cardtool-copy" style="margin-top: 8px;">
                    Copy Config to Clipboard
                </button>
                <button class="cardtool-btn cardtool-btn-secondary" id="cardtool-reset-key" style="margin-top: 8px; font-size: 11px; padding: 6px 12px;">
                    Reset API Key
                </button>
            </div>
        `;
        document.body.appendChild(panel);

        // Make draggable
        makeDraggable(panel);

        // Set up event listeners
        setupEventListeners();

        // Load currencies
        loadCurrencies();

        // Auto-fill domain and balance URL
        document.getElementById('cardtool-domain').value = extractBaseDomain(window.location.hostname);
        document.getElementById('cardtool-balance-url').value = window.location.href;
        
        // Track URL changes for SPAs
        let lastUrl = window.location.href;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                document.getElementById('cardtool-balance-url').value = window.location.href;
                updateOutput();
            }
        });
        urlObserver.observe(document.body, { childList: true, subtree: true });
        
        // Also listen for history changes
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            document.getElementById('cardtool-balance-url').value = window.location.href;
            updateOutput();
        };
        
        window.addEventListener('popstate', () => {
            document.getElementById('cardtool-balance-url').value = window.location.href;
            updateOutput();
        });
    }

    function makeDraggable(panel) {
        const header = panel.querySelector('.cardtool-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('cardtool-close')) return;
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    function setupEventListeners() {
        // Close button
        document.getElementById('cardtool-close').addEventListener('click', () => {
            document.getElementById('cardtool-admin-panel').remove();
        });

        // Pick element button
        document.getElementById('cardtool-pick').addEventListener('click', togglePickMode);

        // Save button
        document.getElementById('cardtool-save').addEventListener('click', saveConfig);

        // Copy button
        document.getElementById('cardtool-copy').addEventListener('click', copyConfig);

        // Reset API key button
        document.getElementById('cardtool-reset-key').addEventListener('click', () => {
            GM_setValue('adminApiKey', '');
            alert('API key cleared. You will be prompted for a new key on next save.');
        });

        // Input changes
        ['cardtool-selector', 'cardtool-currency', 'cardtool-name', 'cardtool-balance-url', 'cardtool-domain']
            .forEach(id => {
                document.getElementById(id).addEventListener('input', updateOutput);
                document.getElementById(id).addEventListener('change', updateOutput);
            });

        // Auto-fill program name when currency is selected
        document.getElementById('cardtool-currency').addEventListener('change', (e) => {
            const select = e.target;
            const selectedOption = select.options[select.selectedIndex];
            const nameInput = document.getElementById('cardtool-name');
            
            // Always auto-fill from currency name
            if (selectedOption && selectedOption.dataset.name) {
                nameInput.value = selectedOption.dataset.name;
                updateOutput();
            }
        });

        // Selector input - test on change
        document.getElementById('cardtool-selector').addEventListener('input', testSelector);
    }

    function loadCurrencies() {
        // Use GM_xmlhttpRequest to bypass CORS and send cookies cross-origin
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CARDTOOL_URL}/api/points/currencies`,
            withCredentials: true,
            onload: function(response) {
                try {
                    if (response.status !== 200) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = JSON.parse(response.responseText);
                    currencies = data.currencies || [];

                    const select = document.getElementById('cardtool-currency');
                    select.innerHTML = '<option value="">Select a currency...</option>';

                    // Group by type
                    const groups = {
                        'transferable_points': 'Transferable Points',
                        'airline_miles': 'Airlines',
                        'hotel_points': 'Hotels',
                        'cash_back': 'Cash Back'
                    };

                    Object.entries(groups).forEach(([type, label]) => {
                        const group = document.createElement('optgroup');
                        group.label = label;

                        currencies
                            .filter(c => c.currency_type === type)
                            .forEach(c => {
                                const opt = document.createElement('option');
                                opt.value = c.code;
                                opt.dataset.name = c.name; // Store name for auto-fill
                                opt.textContent = `${c.name} (${c.code})`;
                                group.appendChild(opt);
                            });

                        if (group.children.length > 0) {
                            select.appendChild(group);
                        }
                    });

                } catch (error) {
                    console.error('Failed to parse currencies:', error);
                    document.getElementById('cardtool-currency').innerHTML =
                        '<option value="">Error loading - enter code manually</option>';
                }
            },
            onerror: function(error) {
                console.error('Failed to load currencies:', error);
                document.getElementById('cardtool-currency').innerHTML =
                    '<option value="">Error loading - enter code manually</option>';
            }
        });
    }

    function togglePickMode() {
        isPickMode = !isPickMode;
        const btn = document.getElementById('cardtool-pick');

        if (isPickMode) {
            btn.classList.add('active');
            btn.textContent = 'Click an element...';
            document.addEventListener('mouseover', handleHover);
            document.addEventListener('mouseout', handleHoverOut);
            document.addEventListener('click', handlePick, true);
        } else {
            btn.classList.remove('active');
            btn.textContent = 'Pick Element';
            document.removeEventListener('mouseover', handleHover);
            document.removeEventListener('mouseout', handleHoverOut);
            document.removeEventListener('click', handlePick, true);
            if (hoveredElement) {
                hoveredElement.classList.remove('cardtool-highlight');
                hoveredElement = null;
            }
        }
    }

    function handleHover(e) {
        if (!isPickMode) return;
        if (e.target.closest('#cardtool-admin-panel')) return;

        if (hoveredElement) {
            hoveredElement.classList.remove('cardtool-highlight');
        }
        hoveredElement = e.target;
        hoveredElement.classList.add('cardtool-highlight');
    }

    function handleHoverOut(e) {
        if (!isPickMode) return;
        if (e.target.closest('#cardtool-admin-panel')) return;

        if (e.target === hoveredElement) {
            e.target.classList.remove('cardtool-highlight');
        }
    }

    function handlePick(e) {
        if (!isPickMode) return;
        if (e.target.closest('#cardtool-admin-panel')) return;

        e.preventDefault();
        e.stopPropagation();

        const selector = generateSelector(e.target);
        document.getElementById('cardtool-selector').value = selector;

        togglePickMode();
        testSelector();
        updateOutput();
    }

    function generateSelector(element) {
        // Try ID first
        if (element.id) {
            return '#' + element.id;
        }

        // Try unique class combination
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ')
                .filter(c => c && !c.includes('cardtool'))
                .slice(0, 3);
            if (classes.length > 0) {
                const selector = '.' + classes.join('.');
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
        }

        // Build path from ancestors
        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
                selector = '#' + current.id;
                path.unshift(selector);
                break;
            } else if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(' ')
                    .filter(c => c && !c.includes('cardtool'))
                    .slice(0, 2);
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        return path.slice(-4).join(' > ');
    }

    function testSelector() {
        const selector = document.getElementById('cardtool-selector').value;
        const previewSection = document.getElementById('cardtool-preview-section');
        const preview = document.getElementById('cardtool-preview');

        if (!selector) {
            previewSection.style.display = 'none';
            return;
        }

        try {
            const el = document.querySelector(selector);
            if (el) {
                const text = el.textContent.trim();
                const parsed = parseBalance(text);
                preview.textContent = `Raw: "${text}"\nParsed: ${parsed.toLocaleString()}`;
                previewSection.style.display = 'block';
            } else {
                preview.textContent = 'Element not found';
                previewSection.style.display = 'block';
            }
        } catch (e) {
            preview.textContent = 'Invalid selector';
            previewSection.style.display = 'block';
        }
    }

    function parseBalance(text) {
        // Remove currency symbols, commas, and other non-numeric chars except decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        return parseInt(cleaned) || 0;
    }

    function updateOutput() {
        const name = document.getElementById('cardtool-name').value || 'Program Name';
        const currencyCode = document.getElementById('cardtool-currency').value || 'CODE';
        const domain = document.getElementById('cardtool-domain').value || 'example.com';
        const balanceUrl = document.getElementById('cardtool-balance-url').value || '';
        const selector = document.getElementById('cardtool-selector').value || '.balance-selector';

        const config = `{
  name: "${name}",
  currencyCode: "${currencyCode}",
  domain: "${domain}",
  balancePageUrl: "${balanceUrl}",
  selector: "${selector}"
}`;

        document.getElementById('cardtool-output').textContent = config;
    }

    function copyConfig() {
        const config = document.getElementById('cardtool-output').textContent;

        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(config);
        } else {
            navigator.clipboard.writeText(config);
        }

        const btn = document.getElementById('cardtool-copy');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#059669';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    function getAdminKey() {
        let key = GM_getValue('adminApiKey', '');
        if (!key) {
            key = prompt('Enter your CardTool Admin API Key:\n(Get this from your CardTool environment settings)');
            if (key) {
                GM_setValue('adminApiKey', key);
            }
        }
        return key;
    }

    function saveConfig() {
        const name = document.getElementById('cardtool-name').value;
        const currencyCode = document.getElementById('cardtool-currency').value;
        const domain = document.getElementById('cardtool-domain').value;
        const balancePageUrl = document.getElementById('cardtool-balance-url').value;
        const selector = document.getElementById('cardtool-selector').value;

        // Validate required fields
        if (!name || !currencyCode || !domain || !selector) {
            alert('Please fill in all required fields: Program Name, Currency, Domain, and Selector');
            return;
        }

        // Get admin API key
        const adminKey = getAdminKey();
        if (!adminKey) {
            alert('Admin API key is required to save configs');
            return;
        }

        const btn = document.getElementById('cardtool-save');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${CARDTOOL_URL}/api/points/site-configs`,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            data: JSON.stringify({
                name,
                currencyCode,
                domain,
                balancePageUrl: balancePageUrl || null,
                selector,
                parseRegex: '[\\d,]+'
            }),
            onload: function(response) {
                btn.disabled = false;
                
                if (response.status === 401) {
                    // Clear invalid key
                    GM_setValue('adminApiKey', '');
                    btn.textContent = 'Invalid API key!';
                    btn.style.background = '#dc2626';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.background = '';
                    }, 3000);
                    return;
                }

                try {
                    const data = JSON.parse(response.responseText);
                    
                    if (response.status === 200 && data.success) {
                        btn.textContent = 'Saved!';
                        btn.style.background = '#059669';
                        
                        if (typeof GM_notification !== 'undefined') {
                            GM_notification({
                                title: 'CardTool',
                                text: `Config saved for ${name}`,
                                timeout: 3000
                            });
                        }
                    } else {
                        btn.textContent = data.error || 'Error!';
                        btn.style.background = '#dc2626';
                    }
                } catch (e) {
                    btn.textContent = 'Error!';
                    btn.style.background = '#dc2626';
                }

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 3000);
            },
            onerror: function(error) {
                btn.disabled = false;
                btn.textContent = 'Network Error!';
                btn.style.background = '#dc2626';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 3000);
            }
        });
    }

    // Initialize
    createUI();
})();
