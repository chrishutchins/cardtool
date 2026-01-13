// ==UserScript==
// @name         CardTool Points Importer
// @namespace    https://cardtool.chrishutchins.com
// @version      2.3.0
// @description  Sync loyalty program balances and credit report data to CardTool
// @author       CardTool
// @match        *://*/*
// @exclude      *://localhost:*/*
// @exclude      *://cardtool.chrishutchins.com/*
// @exclude      *://www.google.com/*
// @exclude      *://www.google.com.*/*
// @exclude      *://*.github.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      cardtool.chrishutchins.com
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    // Change this to localhost:3000 for development
    const CARDTOOL_URL = 'https://cardtool.chrishutchins.com';

    // Server-loaded configs (populated on init)
    let serverConfigs = [];

    // Fallback site configurations (used if server configs unavailable)
    const FALLBACK_CONFIGS = [
        // ============================================
        // AIRLINES
        // ============================================
        {
            name: "United MileagePlus",
            currencyCode: "UA",
            sitePattern: /united\.com/i,
            balancePageUrl: "https://www.united.com/en/us/account/overview",
            selector: "[data-testid='miles-balance'], .miles-balance, .mileage-balance",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "Delta SkyMiles",
            currencyCode: "DL",
            sitePattern: /delta\.com/i,
            balancePageUrl: "https://www.delta.com/myprofile/personal",
            selector: ".skymiles-balance, [data-testid='skymiles-balance']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "American AAdvantage",
            currencyCode: "AA",
            sitePattern: /aa\.com/i,
            balancePageUrl: "https://www.aa.com/aadvantage-program/profile/account-summary",
            selector: ".aadvantage-miles, .miles-balance",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "Southwest Rapid Rewards",
            currencyCode: "SW",
            sitePattern: /southwest\.com/i,
            balancePageUrl: "https://www.southwest.com/myaccount/",
            selector: ".points-balance, [data-testid='points-balance']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "JetBlue TrueBlue",
            currencyCode: "B6",
            sitePattern: /jetblue\.com/i,
            balancePageUrl: "https://trueblue.jetblue.com/",
            selector: ".points-balance, .trueblue-points",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "Alaska Mileage Plan",
            currencyCode: "AS",
            sitePattern: /alaskaair\.com/i,
            balancePageUrl: "https://www.alaskaair.com/account/overview",
            selector: ".miles-balance, [data-testid='miles-balance']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },

        // ============================================
        // TRANSFERABLE POINTS
        // ============================================
        {
            name: "Amex Membership Rewards",
            currencyCode: "MR",
            sitePattern: /americanexpress\.com/i,
            balancePageUrl: "https://global.americanexpress.com/rewards/summary",
            selector: "[data-testid='points-balance'], .points-balance, .membership-rewards-balance",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "Chase Ultimate Rewards",
            currencyCode: "UR",
            sitePattern: /chase\.com/i,
            balancePageUrl: "https://ultimaterewards.chase.com/",
            selector: ".point-balance, [data-testid='ur-points']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },

        // ============================================
        // HOTELS
        // ============================================
        {
            name: "Marriott Bonvoy",
            currencyCode: "MB",
            sitePattern: /marriott\.com/i,
            balancePageUrl: "https://www.marriott.com/loyalty/myAccount/default.mi",
            selector: ".points-balance, [data-testid='points-balance']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "Hilton Honors",
            currencyCode: "HH",
            sitePattern: /hilton\.com/i,
            balancePageUrl: "https://www.hilton.com/en/hilton-honors/guest/my-account/",
            selector: ".points-balance, [data-testid='hhonors-points']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },
        {
            name: "World of Hyatt",
            currencyCode: "WOH",
            sitePattern: /hyatt\.com/i,
            balancePageUrl: "https://world.hyatt.com/content/gp/en/member-dashboard.html",
            selector: ".points-balance, [data-testid='woh-points']",
            parseBalance: (text) => parseInt(text.replace(/[^0-9]/g, "")) || 0
        },

        // ============================================
        // ADD MORE CONFIGS HERE
        // Use the CardTool Admin Helper script to generate configs
        // ============================================
    ];

    // ============================================
    // STYLES
    // ============================================

    const styles = `
        #cardtool-badge, #cardtool-toast {
            all: initial !important;
            display: block !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            color: #e4e4e7 !important;
            line-height: 1.4 !important;
        }
        #cardtool-badge *, #cardtool-toast * {
            box-sizing: border-box !important;
            font-family: inherit !important;
            line-height: inherit !important;
        }
        #cardtool-badge {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            background: #18181b !important;
            border: 1px solid #3f3f46 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            color: #e4e4e7 !important;
            z-index: 999998 !important;
            overflow: hidden !important;
            min-width: 200px !important;
            max-width: 280px !important;
            transition: all 0.2s ease !important;
            line-height: 1.4 !important;
            text-align: left !important;
        }
        #cardtool-badge:hover {
            border-color: #10b981 !important;
        }
        .cardtool-badge-header {
            background: #27272a !important;
            padding: 10px 14px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-bottom: 1px solid #3f3f46 !important;
            margin: 0 !important;
        }
        .cardtool-badge-logo {
            width: 18px !important;
            height: 18px !important;
            background: #10b981 !important;
            border-radius: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: bold !important;
            font-size: 11px !important;
            color: white !important;
            line-height: 1 !important;
        }
        .cardtool-badge-title {
            font-weight: 600 !important;
            font-size: 12px !important;
            color: #10b981 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .cardtool-badge-refresh {
            margin-left: auto;
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            padding: 4px;
        }
        .cardtool-badge-refresh:hover {
            color: #10b981;
        }
        .cardtool-badge-close {
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px;
        }
        .cardtool-badge-close:hover {
            color: #e4e4e7;
        }
        .cardtool-badge-body {
            padding: 12px 14px !important;
            background: #18181b !important;
        }
        .cardtool-badge-balance {
            font-size: 20px !important;
            font-weight: 700 !important;
            color: #fbbf24 !important;
            margin: 0 0 4px 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
        }
        .cardtool-badge-currency {
            font-size: 12px !important;
            color: #a1a1aa !important;
            margin: 0 0 12px 0 !important;
            padding: 0 !important;
        }
        .cardtool-badge-btn {
            width: 100% !important;
            padding: 10px 14px !important;
            background: #10b981 !important;
            border: none !important;
            border-radius: 6px !important;
            color: white !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: background 0.15s ease !important;
            text-align: center !important;
            display: block !important;
            text-decoration: none !important;
        }
        .cardtool-badge-btn:hover {
            background: #059669 !important;
        }
        .cardtool-badge-btn:disabled {
            background: #3f3f46 !important;
            color: #71717a !important;
            cursor: not-allowed !important;
        }
        .cardtool-badge-link {
            display: block !important;
            text-align: center !important;
            padding: 10px 14px !important;
            color: #10b981 !important;
            text-decoration: none !important;
            font-size: 13px !important;
            background: transparent !important;
        }
        .cardtool-badge-link:hover {
            text-decoration: underline !important;
        }
        .cardtool-badge-status {
            text-align: center !important;
            font-size: 12px !important;
            color: #71717a !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .cardtool-badge-error {
            color: #f87171 !important;
        }
        .cardtool-badge-success {
            color: #10b981 !important;
        }
        #cardtool-badge .cardtool-player-select,
        #cardtool-badge select.cardtool-player-select {
            width: 100% !important;
            padding: 8px 10px !important;
            background: #27272a !important;
            background-color: #27272a !important;
            border: 1px solid #3f3f46 !important;
            border-radius: 6px !important;
            color: #e4e4e7 !important;
            font-size: 13px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            margin: 0 0 10px 0 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            opacity: 1 !important;
            -webkit-text-fill-color: #e4e4e7 !important;
        }
        #cardtool-badge .cardtool-player-select option,
        #cardtool-badge select.cardtool-player-select option {
            background: #27272a !important;
            background-color: #27272a !important;
            color: #e4e4e7 !important;
            -webkit-text-fill-color: #e4e4e7 !important;
        }
        .cardtool-player-label {
            font-size: 11px !important;
            color: #a1a1aa !important;
            margin: 0 0 6px 0 !important;
            padding: 0 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            display: block !important;
        }
        
        /* Options container */
        #cardtool-badge .cardtool-options {
            margin: 10px 0 !important;
            padding: 10px !important;
            background: #27272a !important;
            border-radius: 6px !important;
            font-size: 12px !important;
        }
        #cardtool-badge .cardtool-option-row {
            display: flex !important;
            align-items: center !important;
            margin-bottom: 8px !important;
        }
        #cardtool-badge .cardtool-option-row:last-child {
            margin-bottom: 0 !important;
        }
        #cardtool-badge .cardtool-checkbox {
            width: 16px !important;
            height: 16px !important;
            margin: 0 8px 0 0 !important;
            accent-color: #10b981 !important;
            cursor: pointer !important;
        }
        #cardtool-badge .cardtool-option-label {
            color: #a1a1aa !important;
            font-size: 12px !important;
            cursor: pointer !important;
            flex: 1 !important;
            -webkit-text-fill-color: #a1a1aa !important;
        }
        #cardtool-badge .cardtool-date-input {
            width: 120px !important;
            padding: 4px 6px !important;
            background: #18181b !important;
            border: 1px solid #3f3f46 !important;
            border-radius: 4px !important;
            color: #e4e4e7 !important;
            font-size: 11px !important;
            margin: 0 !important;
            -webkit-text-fill-color: #e4e4e7 !important;
        }
        #cardtool-badge .cardtool-date-input::-webkit-calendar-picker-indicator {
            filter: invert(1) !important;
            cursor: pointer !important;
        }
        #cardtool-badge .cardtool-options-toggle {
            font-size: 11px !important;
            color: #71717a !important;
            cursor: pointer !important;
            text-align: center !important;
            margin: 8px 0 !important;
            -webkit-text-fill-color: #71717a !important;
        }
        #cardtool-badge .cardtool-options-toggle:hover {
            color: #a1a1aa !important;
            -webkit-text-fill-color: #a1a1aa !important;
        }

        /* Toast notification */
        #cardtool-toast {
            position: fixed !important;
            bottom: 100px !important;
            right: 20px !important;
            background: #18181b !important;
            border: 1px solid #10b981 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            color: #e4e4e7 !important;
            z-index: 999999 !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            animation: cardtool-slide-in 0.3s ease !important;
            line-height: 1.4 !important;
        }
        #cardtool-toast.error {
            border-color: #f87171 !important;
        }
        #cardtool-toast .icon {
            font-size: 18px !important;
        }
        @keyframes cardtool-slide-in {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;

    // ============================================
    // STATE
    // ============================================

    let matchingConfigs = [];  // All configs that match this domain
    let currentConfig = null;  // The config that found a balance (or first match for display)
    let players = null;
    let extractedBalance = null;
    let lastDisplayedBalance = null;  // Track what's shown to avoid UI flicker
    let badgeElement = null;

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Prevent duplicate initialization (can happen with iframes or script re-runs)
        if (document.getElementById('cardtool-badge')) {
            console.log('CardTool: Badge already exists, skipping initialization');
            return;
        }
        
        // Only run in top frame, not iframes
        if (window.self !== window.top) {
            console.log('CardTool: Skipping iframe');
            return;
        }
        
        // Load server configs first, then initialize
        loadServerConfigs(() => {
            // Find ALL matching site configs by domain
            matchingConfigs = findMatchingConfigs(window.location.hostname);

            if (matchingConfigs.length === 0) {
                return; // Site not configured
            }

            // Use first config as default for display purposes
            currentConfig = matchingConfigs[0];

            // Inject styles
            const styleEl = document.createElement('style');
            styleEl.textContent = styles;
            document.head.appendChild(styleEl);

            // Create badge
            createBadge();

            // Try to find balance on page (wait longer for SPAs to load)
            console.log('CardTool: Found', matchingConfigs.length, 'config(s) for this domain');
            setTimeout(tryExtractBalance, 2000);

            // Re-check periodically for up to 15 seconds (5 checks at 3s intervals)
            let checkCount = 0;
            const maxChecks = 5;
            const intervalId = setInterval(() => {
                checkCount++;
                if (checkCount >= maxChecks || extractedBalance !== null) {
                    clearInterval(intervalId);
                    console.log('CardTool: Stopped checking after', checkCount, 'checks');
                    return;
                }
                tryExtractBalance();
            }, 3000);
            console.log('CardTool: Interval started, ID:', intervalId);
        });
    }

    function loadServerConfigs(callback) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CARDTOOL_URL}/api/points/site-configs`,
            withCredentials: true,
            onload: function(response) {
                try {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        serverConfigs = (data.configs || [])
                            .filter(config => config.is_active !== false)
                            .map(config => ({
                                name: config.name,
                                currencyCode: config.currency_code,
                                domain: config.domain,
                                balancePageUrl: config.balance_page_url,
                                selector: config.selector,
                                attribute: config.attribute || null,  // Read from attribute instead of textContent
                                aggregate: config.aggregate || false,
                                parseBalance: (text) => {
                                    // Normalize: replace nbsp and other whitespace between digits
                                    const normalized = text.replace(/[\u00A0\s]+/g, ' ');
                                    // Default regex handles US (1,000), European (1.000), and Scandinavian (1 000) formats
                                    const regex = new RegExp(config.parse_regex || '[\\d][\\d.,\\s]*');
                                    const match = normalized.match(regex);
                                    return match ? parseInt(match[0].replace(/[^0-9]/g, '')) || 0 : 0;
                                }
                            }));
                    }
                } catch (e) {
                    console.error('CardTool: Error parsing server configs', e);
                }
                callback();
            },
            onerror: function() {
                console.warn('CardTool: Could not load server configs, using fallbacks');
                callback();
            }
        });
    }

    function findMatchingConfigs(hostname) {
        // Normalize hostname (remove www. and lowercase)
        const normalizedHost = hostname.replace(/^www\./, '').toLowerCase();
        const matches = [];
        
        // Server configs take priority (more up-to-date)
        for (const config of serverConfigs) {
            // Normalize config domain for case-insensitive comparison
            const configDomain = (config.domain || '').toLowerCase();
            // Match if hostname ends with the config domain
            if (normalizedHost === configDomain || normalizedHost.endsWith('.' + configDomain)) {
                matches.push(config);
            }
        }
        
        // Fall back to hardcoded configs if no server matches
        if (matches.length === 0) {
            for (const config of FALLBACK_CONFIGS) {
                if (config.sitePattern.test(hostname)) {
                    matches.push(config);
                }
            }
        }
        
        return matches;
    }
    
    // For backward compatibility - returns first match
    function findMatchingConfig(hostname) {
        const matches = findMatchingConfigs(hostname);
        return matches.length > 0 ? matches[0] : null;
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    function createBadge() {
        // Check if badge already exists (defensive check)
        const existing = document.getElementById('cardtool-badge');
        if (existing) {
            badgeElement = existing;
            return;
        }
        
        badgeElement = document.createElement('div');
        badgeElement.id = 'cardtool-badge';
        badgeElement.innerHTML = `
            <div class="cardtool-badge-header">
                <div class="cardtool-badge-logo">C</div>
                <span class="cardtool-badge-title">CardTool</span>
                <button class="cardtool-badge-refresh" title="Refresh balance">&#8635;</button>
                <button class="cardtool-badge-close" title="Close">&times;</button>
            </div>
            <div class="cardtool-badge-body" id="cardtool-badge-content">
                <div class="cardtool-badge-status">Looking for balance...</div>
            </div>
        `;
        document.body.appendChild(badgeElement);

        // Refresh button - re-scan page for balance
        badgeElement.querySelector('.cardtool-badge-refresh').addEventListener('click', () => {
            extractedBalance = null;
            lastDisplayedBalance = null;
            currentConfig = null;
            updateBadgeContent('<div class="cardtool-badge-status">Scanning...</div>');
            setTimeout(tryExtractBalance, 500);
        });

        // Close button
        badgeElement.querySelector('.cardtool-badge-close').addEventListener('click', () => {
            badgeElement.remove();
        });
    }

    function updateBadgeContent(html) {
        const content = document.getElementById('cardtool-badge-content');
        if (content) {
            content.innerHTML = html;
        }
    }

    function showBalanceFound(balance) {
        const formattedBalance = balance.toLocaleString();
        updateBadgeContent(`
            <div class="cardtool-badge-balance">${formattedBalance}</div>
            <div class="cardtool-badge-currency">${currentConfig.name}</div>
            <div id="cardtool-player-container"></div>
            <div class="cardtool-options-toggle" id="cardtool-options-toggle">▼ Options</div>
            <div class="cardtool-options" id="cardtool-options" style="display: none;">
                <div class="cardtool-option-row">
                    <input type="checkbox" class="cardtool-checkbox" id="cardtool-additive">
                    <label class="cardtool-option-label" for="cardtool-additive">Add to existing balance</label>
                </div>
                <div class="cardtool-option-row">
                    <label class="cardtool-option-label" for="cardtool-expiration">Expires</label>
                    <input type="date" class="cardtool-date-input" id="cardtool-expiration">
                </div>
            </div>
            <button class="cardtool-badge-btn" id="cardtool-sync-btn">
                Sync to CardTool
            </button>
        `);

        // Options toggle
        document.getElementById('cardtool-options-toggle').addEventListener('click', () => {
            const options = document.getElementById('cardtool-options');
            const toggle = document.getElementById('cardtool-options-toggle');
            if (options.style.display === 'none') {
                options.style.display = 'block';
                toggle.textContent = '▲ Options';
            } else {
                options.style.display = 'none';
                toggle.textContent = '▼ Options';
            }
        });

        document.getElementById('cardtool-sync-btn').addEventListener('click', handleSync);

        // Load players
        loadPlayers();
    }

    function showNoBalance() {
        // Find the first config with a balance page URL to show as the link
        const configWithUrl = matchingConfigs.find(c => c.balancePageUrl);
        const balancePageUrl = configWithUrl ? configWithUrl.balancePageUrl : null;
        
        const linkHtml = balancePageUrl
            ? `<a href="${balancePageUrl}" class="cardtool-badge-link">View your balance &rarr;</a>`
            : '';
        
        updateBadgeContent(`
            <div class="cardtool-badge-status">Balance not found on this page</div>
            ${linkHtml}
        `);
    }

    function showNotLoggedIn() {
        updateBadgeContent(`
            <div class="cardtool-badge-status cardtool-badge-error">
                Not logged into CardTool
            </div>
            <a href="${CARDTOOL_URL}" class="cardtool-badge-link" target="_blank">
                Log in to CardTool &rarr;
            </a>
        `);
    }

    function showSyncing() {
        const btn = document.getElementById('cardtool-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }
    }

    function showSyncSuccess(data) {
        let message;
        if (data.added) {
            message = `Added ${data.added.toLocaleString()} → Total: ${data.balance.toLocaleString()} ${data.currencyName}`;
        } else {
            message = `Synced ${data.balance.toLocaleString()} ${data.currencyName}`;
        }
        showToast(message, false);

        const btn = document.getElementById('cardtool-sync-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Synced!';
            btn.style.background = '#059669';

            setTimeout(() => {
                btn.textContent = 'Sync to CardTool';
                btn.style.background = '';
            }, 3000);
        }
    }

    function showSyncError(message) {
        showToast(message, true);

        const btn = document.getElementById('cardtool-sync-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sync to CardTool';
        }
    }

    function showToast(message, isError = false) {
        // Remove existing toast
        const existing = document.getElementById('cardtool-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'cardtool-toast';
        if (isError) toast.classList.add('error');

        toast.innerHTML = `
            <span class="icon">${isError ? '❌' : '✓'}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // ============================================
    // DATA FUNCTIONS
    // ============================================

    function tryExtractBalance() {
        if (matchingConfigs.length === 0) {
            console.log('CardTool: No configs matched');
            return;
        }

        try {
            // Try each matching config's selectors until one finds a balance
            for (const config of matchingConfigs) {
                const selectors = config.selector.split(',').map(s => s.trim());
                console.log('CardTool: Trying config:', config.name, 'selectors:', selectors, 'aggregate:', config.aggregate);

                for (const selector of selectors) {
                    // Helper to get text from element (supports attribute or textContent)
                    const getElementText = (el) => {
                        if (config.attribute) {
                            return el.getAttribute(config.attribute) || '';
                        }
                        return el.textContent.trim();
                    };

                    // Aggregate mode: find ALL matching elements and sum their values
                    if (config.aggregate) {
                        const elements = document.querySelectorAll(selector);
                        console.log('CardTool: Selector', selector, '-> found', elements.length, 'elements (aggregate mode)', config.attribute ? `(attr: ${config.attribute})` : '');
                        
                        if (elements.length > 0) {
                            let totalBalance = 0;
                            elements.forEach((el, idx) => {
                                const text = getElementText(el);
                                const balance = config.parseBalance(text);
                                console.log('CardTool: Element', idx, 'text:', text, '-> balance:', balance);
                                totalBalance += balance;
                            });
                            
                            console.log('CardTool: Total aggregated balance:', totalBalance);
                            
                            if (totalBalance > 0) {
                                currentConfig = config;
                                extractedBalance = totalBalance;
                                if (lastDisplayedBalance !== totalBalance) {
                                    lastDisplayedBalance = totalBalance;
                                    showBalanceFound(totalBalance);
                                }
                                return;
                            }
                        }
                    } else {
                        // Normal mode: find first matching element
                        const element = document.querySelector(selector);
                        console.log('CardTool: Selector', selector, '-> element:', element ? 'FOUND' : 'not found', config.attribute ? `(attr: ${config.attribute})` : '');
                        
                        if (element) {
                            const text = getElementText(element);
                            console.log('CardTool: Element text:', text);
                            const balance = config.parseBalance(text);
                            console.log('CardTool: Parsed balance:', balance);

                            if (balance > 0) {
                                // Found a balance - only update UI if balance changed
                                currentConfig = config;
                                extractedBalance = balance;
                                if (lastDisplayedBalance !== balance) {
                                    lastDisplayedBalance = balance;
                                    showBalanceFound(balance);
                                }
                                return;
                            }
                        }
                    }
                }
            }

            // No balance found on this page - only update UI if state changed
            if (extractedBalance !== null || lastDisplayedBalance !== 'no-balance') {
                extractedBalance = null;
                lastDisplayedBalance = 'no-balance';
                showNoBalance();
            }
        } catch (e) {
            console.error('CardTool: Error extracting balance', e);
        }
    }

    function getSyncToken() {
        let token = GM_getValue('syncToken', '');
        if (!token) {
            token = prompt(
                'Enter your CardTool Sync Token:\n\n' +
                'Get your token from CardTool Settings:\n' +
                CARDTOOL_URL + '/settings'
            );
            if (token) {
                GM_setValue('syncToken', token);
            }
        }
        return token;
    }

    function clearSyncToken() {
        GM_setValue('syncToken', '');
    }

    function loadPlayers() {
        const syncToken = getSyncToken();
        if (!syncToken) {
            showNotLoggedIn();
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CARDTOOL_URL}/api/points/players`,
            headers: {
                'x-sync-token': syncToken
            },
            onload: function(response) {
                try {
                    if (response.status === 401) {
                        clearSyncToken();
                        showNotLoggedIn();
                        return;
                    }

                    if (response.status !== 200) {
                        throw new Error('Failed to fetch players');
                    }

                    const data = JSON.parse(response.responseText);
                    players = data.players || [{ player_number: 1, description: 'Me' }];

                    // Only show player selector if multiple players
                    if (players.length > 1) {
                        const container = document.getElementById('cardtool-player-container');
                        if (container) {
                            const lastPlayer = GM_getValue('lastPlayerNumber', 1);
                            container.innerHTML = `
                                <div class="cardtool-player-label">Sync for</div>
                                <select class="cardtool-player-select" id="cardtool-player-select">
                                    ${players.map(p => `
                                        <option value="${p.player_number}" ${p.player_number === lastPlayer ? 'selected' : ''}>
                                            ${p.description || `Player ${p.player_number}`}
                                        </option>
                                    `).join('')}
                                </select>
                            `;
                        }
                    }
                } catch (error) {
                    console.error('CardTool: Error parsing players response', error);
                }
            },
            onerror: function(error) {
                console.error('CardTool: Error loading players', error);
            }
        });
    }

    function handleSync() {
        if (extractedBalance === null) {
            showSyncError('No balance to sync');
            return;
        }

        const syncToken = getSyncToken();
        if (!syncToken) {
            showNotLoggedIn();
            return;
        }

        showSyncing();

        // Get selected player and remember it
        const playerSelect = document.getElementById('cardtool-player-select');
        const playerNumber = playerSelect ? parseInt(playerSelect.value) : 1;
        GM_setValue('lastPlayerNumber', playerNumber);

        // Get options
        const additiveCheckbox = document.getElementById('cardtool-additive');
        const additive = additiveCheckbox ? additiveCheckbox.checked : false;
        
        const expirationInput = document.getElementById('cardtool-expiration');
        const expirationDate = expirationInput && expirationInput.value ? expirationInput.value : null;

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${CARDTOOL_URL}/api/points/import`,
            headers: {
                'Content-Type': 'application/json',
                'x-sync-token': syncToken
            },
            data: JSON.stringify({
                currencyCode: currentConfig.currencyCode,
                balance: extractedBalance,
                playerNumber: playerNumber,
                additive: additive,
                expirationDate: expirationDate
            }),
            onload: function(response) {
                try {
                    if (response.status === 401) {
                        clearSyncToken();
                        showNotLoggedIn();
                        return;
                    }

                    const data = JSON.parse(response.responseText);

                    if (response.status !== 200) {
                        throw new Error(data.error || 'Sync failed');
                    }

                    showSyncSuccess(data);
                } catch (error) {
                    console.error('CardTool: Sync error', error);
                    showSyncError(error.message || 'Failed to sync');
                }
            },
            onerror: function(error) {
                console.error('CardTool: Sync error', error);
                showSyncError('Network error - check your connection');
            }
        });
    }

    // ============================================
    // CREDIT REPORT TRACKING
    // ============================================

    // Credit bureau configurations
    const CREDIT_BUREAU_CONFIGS = {
        equifax: {
            name: 'Equifax',
            domain: 'my.equifax.com',
            apiPatterns: [
                /membercenter\/app\/data\/creditReport/,
                /membercenter\/.*\/creditReport/,
                /score\?featureName=/  // Credit score endpoint
            ],
            parseResponse: parseEquifaxResponse
        },
        experian: {
            name: 'Experian',
            domain: 'experian.com',
            apiPatterns: [
                /\/api\/report\/scores\//i,         // https://usa.experian.com/api/report/scores/history/CA or /latest/CA
                /\/api\/report\/credit/i,           // Credit report endpoints
                /\/api\/prequal\/wallet\/cards/i,   // Credit card wallet data
                /\/api\/report\/forcereload/i,      // Full credit report reload
                /api.*credit/i,
                /api.*score/i,
                /member.*profile/i,
                /dashboard/i,
                /creditReport/i
            ],
            parseResponse: parseExperianResponse
        },
        transunion: {
            name: 'TransUnion',
            domain: 'service.transunion.com',
            apiPatterns: [
                /creditreport/i,
                /dashboard/i
            ],
            parseResponse: parseTransUnionResponse,
            useHtmlScraping: true
        }
    };

    // Credit report state
    let creditReportData = null;
    let creditBadgeElement = null;
    let currentBureau = null;

    // ============================================
    // XHR INTERCEPTOR FOR CREDIT BUREAUS
    // ============================================

    function setupCreditReportInterceptor() {
        const hostname = window.location.hostname.toLowerCase();
        
        // Determine which bureau we're on
        for (const [bureauKey, config] of Object.entries(CREDIT_BUREAU_CONFIGS)) {
            if (hostname.includes(config.domain.replace('www.', ''))) {
                currentBureau = bureauKey;
                console.log('CardTool Credit: Detected bureau:', config.name);
                
                if (config.useHtmlScraping) {
                    // For TransUnion, use HTML scraping instead of XHR interception
                    setTimeout(() => tryScrapeCreditReport(bureauKey), 3000);
                } else {
                    // Set up XHR interception for Equifax and Experian
                    interceptXHR(config);
                }
                return true;
            }
        }
        return false;
    }

    function interceptXHR(config) {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
            this._cardtool_url = url;
            return origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const url = xhr._cardtool_url || '';

            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    // Check if this URL matches any of our API patterns
                    const matchesPattern = config.apiPatterns.some(pattern => pattern.test(url));
                    
                    if (matchesPattern) {
                        console.log('CardTool Credit: Intercepted API call:', url);
                        try {
                            const data = JSON.parse(xhr.responseText);
                            processInterceptedData(data, url, config);
                        } catch (e) {
                            console.warn('CardTool Credit: Failed to parse response', e);
                        }
                    }
                }
            });

            return origSend.apply(this, arguments);
        };

        console.log('CardTool Credit: XHR interceptor installed for', config.name);
    }

    function processInterceptedData(data, url, config) {
        try {
            const parsed = config.parseResponse(data, url);
            if (parsed && (parsed.accounts?.length > 0 || parsed.scores?.length > 0 || parsed.inquiries?.length > 0)) {
                // Merge with existing data
                if (!creditReportData) {
                    creditReportData = { scores: [], accounts: [], inquiries: [], rawData: {} };
                }
                
                if (parsed.scores) {
                    creditReportData.scores = [...creditReportData.scores, ...parsed.scores];
                }
                if (parsed.accounts) {
                    // Dedupe by account name + number
                    const existingKeys = new Set(creditReportData.accounts.map(a => `${a.name}-${a.numberMasked}`));
                    const newAccounts = parsed.accounts.filter(a => !existingKeys.has(`${a.name}-${a.numberMasked}`));
                    creditReportData.accounts = [...creditReportData.accounts, ...newAccounts];
                }
                if (parsed.inquiries) {
                    // Dedupe by company + date
                    const existingKeys = new Set(creditReportData.inquiries.map(i => `${i.company}-${i.date}`));
                    const newInquiries = parsed.inquiries.filter(i => !existingKeys.has(`${i.company}-${i.date}`));
                    creditReportData.inquiries = [...creditReportData.inquiries, ...newInquiries];
                }
                if (parsed.reportDate) {
                    creditReportData.reportDate = parsed.reportDate;
                }
                
                // Store raw data for debugging
                creditReportData.rawData[url] = data;
                
                console.log('CardTool Credit: Data collected -', 
                    creditReportData.scores.length, 'scores,',
                    creditReportData.accounts.length, 'accounts,',
                    creditReportData.inquiries.length, 'inquiries');
                
                // Show or update credit badge
                showCreditBadge();
            }
        } catch (e) {
            console.error('CardTool Credit: Error processing data', e);
        }
    }

    // ============================================
    // EQUIFAX PARSER
    // ============================================

    function parseEquifaxResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null };

        // Handle array of accounts (revolving, installment, etc.)
        let accounts = [];
        if (Array.isArray(data)) {
            accounts = data;
        } else if (Array.isArray(data.accounts)) {
            accounts = data.accounts;
        } else if (Array.isArray(data.revolvingAccounts)) {
            accounts = data.revolvingAccounts;
        } else if (data.accountDetails) {
            accounts = [data];
        } else {
            // Try to find any array that looks like accounts
            const arrayVal = Object.values(data).find(v => 
                Array.isArray(v) && v.some(x => x && (x.accountName || x.displayDateOpen))
            );
            if (arrayVal) accounts = arrayVal;
        }

        // Parse accounts
        for (const acct of accounts) {
            if (!acct) continue;
            
            const details = acct.accountDetails || acct;
            
            // Helper to extract dollar amount from nested objects like { amount: 30000, displayAmount: "$30,000" }
            const extractAmount = (obj) => {
                if (!obj) return null;
                if (typeof obj === 'number') return obj;
                if (typeof obj === 'object' && obj.amount !== undefined) return obj.amount;
                if (typeof obj === 'string') return parseFloat(obj.replace(/[^0-9.-]/g, '')) || null;
                return null;
            };
            
            result.accounts.push({
                name: acct.accountName || acct.creditorName || 'Unknown',
                numberMasked: acct.accountNumber || details.accountNumber || null,
                creditorName: acct.creditorName || acct.accountName || null,
                status: mapEquifaxStatus(acct.accountStatus),
                dateOpened: parseEquifaxDate(acct.displayDateOpen || details.displayDateOpen),
                dateUpdated: parseEquifaxDate(acct.displayDateReported || details.displayDateReported),
                dateClosed: parseEquifaxDate(details.displayDateClose || details.displayDateClosed),
                creditLimitCents: dollarsToCents(extractAmount(details.creditLimit)),
                highBalanceCents: dollarsToCents(extractAmount(details.highCredit || details.highBalance)),
                balanceCents: dollarsToCents(extractAmount(details.balance) || extractAmount(acct.reportedBalance)),
                monthlyPaymentCents: dollarsToCents(extractAmount(details.schedulePayment || details.monthlyPayment)),
                accountType: mapEquifaxAccountType(acct.accountType),
                loanType: mapEquifaxLoanType(details.loanType),
                responsibility: mapEquifaxOwnership(details.owner),
                terms: details.terms || null,
                paymentStatus: acct.paymentStatus || details.paymentStatus || details.rateStatus || null
            });
        }

        // Parse score if present - handle multiple response formats
        // Format 1: score?featureName= endpoint returns { view: { score: "648", bureau: "VANTAGE", datePulled: timestamp } }
        if (data.view && data.view.score) {
            const scoreValue = parseInt(data.view.score, 10);
            if (scoreValue >= 300 && scoreValue <= 850) {
                // Map bureau name to our score type
                const bureauType = (data.view.bureau || '').toLowerCase();
                let scoreType = 'vantage_3';  // Default for Equifax
                if (bureauType.includes('fico')) scoreType = 'fico_8';
                
                // Convert timestamp to date
                let scoreDate = null;
                if (data.view.datePulled) {
                    const d = new Date(data.view.datePulled);
                    if (!isNaN(d.getTime())) {
                        scoreDate = d.toISOString().split('T')[0];
                    }
                }
                
                result.scores.push({
                    type: scoreType,
                    score: scoreValue,
                    date: scoreDate
                });
            }
        }
        // Format 2: Direct score field
        else if (data.score || data.creditScore) {
            const score = data.score || data.creditScore;
            const scoreValue = typeof score === 'object' ? score.value : parseInt(score, 10);
            if (scoreValue >= 300 && scoreValue <= 850) {
                result.scores.push({
                    type: 'vantage_3',
                    score: scoreValue,
                    date: parseEquifaxDate(data.scoreDate || data.asOfDate)
                });
            }
        }

        // Parse inquiries if present (hardInquiries from Equifax API)
        if (data.hardInquiries || data.inquiries) {
            const inquiries = data.hardInquiries || data.inquiries || [];
            for (const inq of inquiries) {
                // Equifax uses companyName and displayDateReported
                const company = inq.companyName || inq.creditorName || inq.subscriberName || 'Unknown';
                const date = parseEquifaxDate(inq.displayDateReported || inq.displayDate || inq.inquiryDate);
                
                // Only add if we have a valid date (required field)
                if (date) {
                    result.inquiries.push({
                        company: company,
                        date: date,
                        type: inq.type?.toLowerCase() || 'hard'
                    });
                } else {
                    console.warn('CardTool Credit: Skipping inquiry without date:', company);
                }
            }
        }

        return result;
    }

    function parseEquifaxDate(str) {
        if (!str) return null;
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
        return null;
    }

    function mapEquifaxStatus(status) {
        if (!status) return 'unknown';
        const s = status.toUpperCase();
        if (s === 'OPEN' || s === 'ACTIVE') return 'open';
        if (s === 'CLOSED') return 'closed';
        if (s === 'PAID') return 'paid';
        return 'unknown';
    }

    function mapEquifaxAccountType(type) {
        if (!type) return 'other';
        const t = type.toUpperCase();
        if (t === 'REVOLVING') return 'revolving';
        if (t === 'INSTALLMENT') return 'installment';
        if (t === 'MORTGAGE') return 'mortgage';
        if (t === 'COLLECTION') return 'collection';
        return 'other';
    }

    function mapEquifaxLoanType(type) {
        if (!type) return 'other';
        const t = type.toUpperCase();
        if (t === 'CREDIT_CARD') return 'credit_card';
        if (t === 'FLEXIBLE_CREDIT_CARD') return 'flexible_credit_card';
        if (t === 'CHARGE_CARD' || t === 'CHARGE') return 'charge_card';
        if (t.includes('AUTO') || t.includes('CAR')) return 'auto_loan';
        if (t.includes('MORTGAGE') || t.includes('HOME')) return 'mortgage';
        if (t.includes('STUDENT')) return 'student_loan';
        if (t.includes('PERSONAL')) return 'personal_loan';
        if (t.includes('EQUITY')) return 'home_equity';
        if (t.includes('RETAIL')) return 'retail';
        return 'other';
    }

    function mapEquifaxOwnership(owner) {
        if (!owner) return 'unknown';
        const o = owner.toUpperCase();
        if (o === 'INDIVIDUAL' || o === 'PRIMARY') return 'individual';
        if (o === 'JOINT') return 'joint';
        if (o === 'AUTHORIZED' || o.includes('AUTH')) return 'authorized_user';
        if (o === 'COSIGNER' || o.includes('CO-SIGN')) return 'cosigner';
        return 'unknown';
    }

    // ============================================
    // EXPERIAN PARSER
    // ============================================

    function parseExperianResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null };
        
        console.log('CardTool Credit: Parsing Experian response from:', url);

        // Helper to parse Experian date formats
        const parseExperianDate = (dateVal) => {
            if (!dateVal) return null;
            // Handle timestamp (milliseconds)
            if (typeof dateVal === 'number') {
                const d = new Date(dateVal);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
            // Handle string formats
            if (typeof dateVal === 'string') {
                const d = new Date(dateVal);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
            return null;
        };

        // =============================================
        // FORMAT: /api/report/forcereload - Full credit report
        // Structure: { reportInfo: { creditFileInfo: [{ accounts: [], creditInquiries: [] }] } }
        // =============================================
        if (data.reportInfo?.creditFileInfo?.[0]) {
            console.log('CardTool Credit: Parsing forcereload format');
            const creditFile = data.reportInfo.creditFileInfo[0];
            
            // Parse accounts
            if (creditFile.accounts && Array.isArray(creditFile.accounts)) {
                for (const acct of creditFile.accounts) {
                    if (!acct) continue;
                    
                    result.accounts.push({
                        name: acct.accountName || acct.creditorInfo?.name || 'Unknown',
                        numberMasked: acct.accountNumber || null,
                        creditorName: acct.creditorInfo?.name || acct.accountName || null,
                        status: mapExperianStatus(acct.openClosed || acct.accountStatus),
                        dateOpened: parseExperianDate(acct.dateOpened),
                        dateUpdated: parseExperianDate(acct.balanceDate || acct.statusDate),
                        dateClosed: parseExperianDate(acct.dateClosed),
                        creditLimitCents: parseDollarsToCents(acct.limit || acct.creditLimit),
                        highBalanceCents: parseDollarsToCents(acct.highBalance),
                        balanceCents: parseDollarsToCents(acct.balance),
                        monthlyPaymentCents: parseDollarsToCents(acct.monthlyPayment),
                        accountType: mapExperianAccountType(acct.classification || acct.accountType),
                        loanType: mapExperianLoanType(acct.businessType_internalID || acct.type_internalID || acct.industryCode),
                        responsibility: mapExperianResponsibility(acct.responsibility || acct.ecoaDesignator),
                        terms: acct.terms || null,
                        paymentStatus: acct.paymentStatus || null
                    });
                }
                console.log('CardTool Credit: Parsed', result.accounts.length, 'accounts from forcereload');
            }
            
            // Parse inquiries - creditInquiries array
            if (creditFile.creditInquiries && Array.isArray(creditFile.creditInquiries)) {
                for (const inq of creditFile.creditInquiries) {
                    if (!inq) continue;
                    
                    const company = inq.companyName || inq.creditorInfo?.name || inq.subscriberName || 'Unknown';
                    const date = parseExperianDate(inq.dateOfInquiry || inq.inquiryDate);
                    
                    if (date) {
                        result.inquiries.push({
                            company: company,
                            date: date,
                            type: inq.type?.toLowerCase() || 'hard'
                        });
                    }
                }
                console.log('CardTool Credit: Parsed', result.inquiries.length, 'inquiries from forcereload');
            }
            
            return result;
        }

        // =============================================
        // FORMAT: Score history { experian: [], transunion: [], equifax: [] }
        // =============================================
        if (data.experian && Array.isArray(data.experian)) {
            console.log('CardTool Credit: Parsing Experian score history format');
            for (const scoreEntry of data.experian) {
                if (!scoreEntry || !scoreEntry.score) continue;
                
                const scoreValue = parseInt(scoreEntry.score, 10);
                if (scoreValue < 300 || scoreValue > 850) continue;
                
                // Map brand + version to score type
                let scoreType = 'fico_8';  // Default for Experian
                const brand = (scoreEntry.brand || '').toUpperCase();
                const version = scoreEntry.version || scoreEntry.scoreVersion || '';
                if (brand === 'FICO') {
                    scoreType = version === '8' ? 'fico_8' : 'fico_9';
                } else if (brand.includes('VANTAGE')) {
                    scoreType = 'vantage_3';
                }
                
                result.scores.push({
                    type: scoreType,
                    score: scoreValue,
                    date: parseExperianDate(scoreEntry.date || scoreEntry.scoreDate),
                    rating: scoreEntry.scoreRating || null
                });
            }
            
            // Also check for TransUnion and Equifax scores in the same response
            if (data.transunion && Array.isArray(data.transunion)) {
                for (const scoreEntry of data.transunion) {
                    if (!scoreEntry || !scoreEntry.score) continue;
                    const scoreValue = parseInt(scoreEntry.score, 10);
                    if (scoreValue < 300 || scoreValue > 850) continue;
                    
                    result.scores.push({
                        type: scoreEntry.brand === 'FICO' ? 'fico_8' : 'vantage_3',
                        score: scoreValue,
                        date: parseExperianDate(scoreEntry.date),
                        rating: scoreEntry.scoreRating || null,
                        bureau: 'transunion'
                    });
                }
            }
            
            return result;
        }
        
        // =============================================
        // FORMAT: Detailed single score entry
        // =============================================
        if (data.score || (Array.isArray(data) && data[0]?.score)) {
            console.log('CardTool Credit: Parsing Experian detailed report format');
            
            const scoreEntries = Array.isArray(data) ? data : [data];
            
            for (const entry of scoreEntries) {
                if (!entry || !entry.score) continue;
                
                const scoreValue = parseInt(entry.score, 10);
                if (scoreValue < 300 || scoreValue > 850) continue;
                
                let scoreType = 'fico_8';
                const brand = (entry.brand || '').toUpperCase();
                const version = entry.scoreVersion || entry.version || '';
                if (brand === 'FICO') {
                    scoreType = version === '8' ? 'fico_8' : 'fico_9';
                } else if (brand.includes('VANTAGE')) {
                    scoreType = 'vantage_3';
                }
                
                result.scores.push({
                    type: scoreType,
                    score: scoreValue,
                    date: parseExperianDate(entry.scoreDate || entry.date),
                    rating: entry.scoreRating || null
                });
            }
        }

        // =============================================
        // Legacy format: tradeLines, accounts, inquiries at root level
        // =============================================
        const tradeLines = data.tradeLines || data.accounts || data.creditAccounts || [];
        const hardInquiries = data.inquiries || data.hardInquiries || [];

        // Parse accounts from legacy format
        for (const acct of tradeLines) {
            if (!acct) continue;
            
            result.accounts.push({
                name: acct.creditorName || acct.accountName || acct.subscriberName || 'Unknown',
                numberMasked: acct.accountNumber || null,
                creditorName: acct.creditorName || null,
                status: mapExperianStatus(acct.accountStatus || acct.status),
                dateOpened: parseExperianDate(acct.dateOpened || acct.openDate),
                dateUpdated: parseExperianDate(acct.dateReported || acct.lastUpdated),
                dateClosed: parseExperianDate(acct.dateClosed),
                creditLimitCents: parseDollarsToCents(acct.creditLimit || acct.highCredit),
                balanceCents: parseDollarsToCents(acct.balance || acct.currentBalance),
                monthlyPaymentCents: parseDollarsToCents(acct.monthlyPayment || acct.scheduledPayment),
                accountType: mapExperianAccountType(acct.accountType || acct.portfolioType),
                loanType: mapExperianLoanType(acct.industryCode || acct.accountType),
                responsibility: mapExperianResponsibility(acct.ecoaDesignator || acct.responsibility),
                paymentStatus: acct.paymentStatus || null
            });
        }

        // Parse inquiries from legacy format
        for (const inq of hardInquiries) {
            if (!inq) continue;
            const date = parseExperianDate(inq.inquiryDate || inq.date);
            if (date) {
                result.inquiries.push({
                    company: inq.subscriberName || inq.creditorName || 'Unknown',
                    date: date,
                    type: 'hard'
                });
            }
        }

        return result;
    }

    function mapExperianStatus(status) {
        if (!status) return 'unknown';
        const s = String(status).toUpperCase();
        if (s.includes('OPEN') || s === 'O') return 'open';
        if (s.includes('CLOSED') || s === 'C') return 'closed';
        if (s.includes('PAID')) return 'paid';
        return 'unknown';
    }

    function mapExperianAccountType(type) {
        if (!type) return 'other';
        const t = String(type).toUpperCase();
        if (t.includes('REVOLV') || t === 'R') return 'revolving';
        if (t.includes('INSTALL') || t === 'I') return 'installment';
        if (t.includes('MORTG') || t === 'M') return 'mortgage';
        return 'other';
    }

    function mapExperianLoanType(code) {
        if (!code) return 'other';
        const c = String(code).toUpperCase();
        if (c.includes('BANK') || c.includes('CREDIT CARD') || c === 'BC') return 'credit_card';
        if (c.includes('AUTO') || c === 'AU') return 'auto_loan';
        if (c.includes('MORTGAGE') || c.includes('REAL ESTATE')) return 'mortgage';
        if (c.includes('STUDENT') || c === 'SL') return 'student_loan';
        if (c.includes('RETAIL')) return 'retail';
        return 'other';
    }

    function mapExperianResponsibility(ecoa) {
        if (!ecoa) return 'unknown';
        const e = String(ecoa).toUpperCase();
        if (e === 'I' || e === '1' || e.includes('INDIVIDUAL')) return 'individual';
        if (e === 'J' || e === '2' || e.includes('JOINT')) return 'joint';
        if (e === 'A' || e === '3' || e.includes('AUTH')) return 'authorized_user';
        if (e === 'C' || e.includes('CO-SIGN') || e.includes('COSIGN')) return 'cosigner';
        return 'unknown';
    }

    // ============================================
    // TRANSUNION PARSER (HTML SCRAPING)
    // ============================================

    function parseTransUnionResponse(data, url) {
        // TransUnion typically returns HTML or uses a different structure
        // This is a placeholder - actual implementation depends on their API structure
        return { scores: [], accounts: [], inquiries: [], reportDate: null };
    }

    function tryScrapeCreditReport(bureau) {
        if (bureau !== 'transunion') return;
        
        console.log('CardTool Credit: Attempting to parse TransUnion UserData');
        
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null };
        let rawData = null;
        
        // Look for the UserData script tag that contains the JSON data
        const userDataScript = document.getElementById('UserData');
        if (!userDataScript || !userDataScript.textContent) {
            console.log('CardTool Credit: No UserData script found');
            return;
        }
        
        try {
            const scriptContent = userDataScript.textContent;
            // Extract the JSON object from "var ud = {...};"
            const udMatch = scriptContent.match(/var\s+ud\s*=\s*(\{[\s\S]*?\});/);
            if (!udMatch || !udMatch[1]) {
                console.log('CardTool Credit: Could not extract ud variable from UserData script');
                return;
            }
            
            const ud = JSON.parse(udMatch[1]);
            rawData = ud;
            console.log('CardTool Credit: Successfully parsed TransUnion UserData:', ud);
            
            // Navigate to the credit data
            const creditData = ud?.TU_CONSUMER_DISCLOSURE?.reportData?.product?.[0]?.subject?.[0]?.subjectRecord?.[0]?.custom?.credit;
            
            if (!creditData) {
                console.log('CardTool Credit: Could not find credit data in UserData');
                return;
            }
            
            // Parse trade accounts
            const trades = creditData.trade || [];
            console.log('CardTool Credit: Found', trades.length, 'trade accounts');
            
            for (const trade of trades) {
                if (!trade) continue;
                
                const subscriber = trade.subscriber || {};
                const account = trade.account || {};
                const terms = trade.terms || {};
                
                result.accounts.push({
                    name: subscriber.name?.unparsed || 'Unknown',
                    numberMasked: trade.accountNumber || null,
                    creditorName: subscriber.name?.unparsed || null,
                    status: mapTransUnionStatus(trade.portfolioType, trade.accountRatingDescription),
                    dateOpened: parseTransUnionDate(trade.dateOpened?.value),
                    dateUpdated: parseTransUnionDate(trade.dateEffective?.value || trade.dateReported?.value),
                    dateClosed: parseTransUnionDate(trade.dateClosed?.value),
                    creditLimitCents: parseDollarsToCents(trade.creditLimit),
                    highBalanceCents: parseDollarsToCents(trade.highCredit),
                    balanceCents: parseDollarsToCents(trade.currentBalance),
                    monthlyPaymentCents: parseDollarsToCents(terms.scheduledMonthlyPayment),
                    accountType: mapTransUnionAccountType(trade.portfolioType),
                    loanType: mapTransUnionLoanType(account.type),
                    responsibility: mapTransUnionResponsibility(trade.ECOADesignator),
                    terms: terms.description || null,
                    paymentStatus: trade.accountRatingDescription || null
                });
            }
            
            // Parse hard inquiries
            const hardInquiries = creditData.inquiry || [];
            console.log('CardTool Credit: Found', hardInquiries.length, 'hard inquiries');
            
            for (const inq of hardInquiries) {
                if (!inq) continue;
                
                const subscriber = inq.subscriber || {};
                // combinedDates might be comma-separated dates
                const dateStr = inq.combinedDates || '';
                const dates = dateStr.split(',').map(d => parseTransUnionDate(d.trim())).filter(Boolean);
                
                // If no dates found from combinedDates, try other fields
                if (dates.length === 0) {
                    const singleDate = parseTransUnionDate(inq.date?.value || inq.dateOfInquiry);
                    if (singleDate) dates.push(singleDate);
                }
                
                for (const date of dates) {
                    result.inquiries.push({
                        company: subscriber.name?.unparsed || 'Unknown',
                        date: date,
                        type: 'hard'
                    });
                }
            }
            
            // Parse promotional inquiries (soft)
            const promoInquiries = creditData.promotionalInquiry || [];
            for (const inq of promoInquiries) {
                if (!inq) continue;
                const subscriber = inq.subscriber || {};
                const dateStr = inq.inquiryDates || '';
                const dates = dateStr.split(',').map(d => parseTransUnionDate(d.trim())).filter(Boolean);
                
                for (const date of dates) {
                    result.inquiries.push({
                        company: subscriber.name?.unparsed || 'Unknown',
                        date: date,
                        type: 'soft'
                    });
                }
            }
            
            // Parse account review inquiries (soft)
            const reviewInquiries = creditData.accountReviewInquiry || [];
            for (const inq of reviewInquiries) {
                if (!inq) continue;
                const subscriber = inq.subscriber || {};
                const dateStr = inq.requestedOnDates || '';
                const dates = dateStr.split(',').map(d => parseTransUnionDate(d.trim())).filter(Boolean);
                
                for (const date of dates) {
                    result.inquiries.push({
                        company: subscriber.name?.unparsed || 'Unknown',
                        date: date,
                        type: 'soft'
                    });
                }
            }
            
            // Report timestamp
            const timestamp = ud?.TU_CONSUMER_DISCLOSURE?.reportData?.transactionControl?.tracking?.transactionTimeStamp;
            if (timestamp) {
                result.reportDate = parseTransUnionDate(timestamp);
            }
            
            console.log('CardTool Credit: Parsed TransUnion data -', 
                result.accounts.length, 'accounts,',
                result.inquiries.length, 'inquiries');
            
            if (result.accounts.length > 0 || result.inquiries.length > 0) {
                creditReportData = {
                    ...result,
                    rawData: rawData
                };
                showCreditBadge();
            }
            
        } catch (e) {
            console.error('CardTool Credit: Error parsing TransUnion UserData:', e);
        }
    }

    function mapTransUnionStatus(portfolioType, ratingDesc) {
        if (!portfolioType && !ratingDesc) return 'unknown';
        const combined = ((portfolioType || '') + ' ' + (ratingDesc || '')).toUpperCase();
        if (combined.includes('CURRENT') || combined.includes('AS AGREED')) return 'open';
        if (combined.includes('CLOSED') || combined.includes('TERMINATED')) return 'closed';
        if (combined.includes('PAID')) return 'paid';
        if (combined.includes('COLLECTION')) return 'collection';
        if (combined.includes('REVOLVING') || combined.includes('INSTALLMENT') || combined.includes('OPEN')) return 'open';
        return 'unknown';
    }
    
    function mapTransUnionAccountType(portfolioType) {
        if (!portfolioType) return 'other';
        const t = portfolioType.toUpperCase();
        if (t.includes('REVOLVING')) return 'revolving';
        if (t.includes('INSTALLMENT')) return 'installment';
        if (t.includes('MORTGAGE')) return 'mortgage';
        if (t.includes('OPEN')) return 'open';
        return 'other';
    }
    
    function mapTransUnionLoanType(accountType) {
        if (!accountType) return 'other';
        const t = accountType.toUpperCase();
        if (t === 'CC' || t.includes('CREDIT CARD')) return 'credit_card';
        if (t === 'FX' || t.includes('FLEX')) return 'flexible_credit_card';
        if (t === 'AU' || t.includes('AUTO')) return 'auto_loan';
        if (t.includes('MORTGAGE') || t === 'CV') return 'mortgage';
        if (t.includes('STUDENT')) return 'student_loan';
        if (t.includes('PERSONAL')) return 'personal_loan';
        return 'other';
    }
    
    function mapTransUnionResponsibility(ecoa) {
        if (!ecoa) return 'unknown';
        const e = ecoa.toUpperCase();
        if (e === 'I' || e.includes('INDIVIDUAL')) return 'individual';
        if (e === 'J' || e.includes('JOINT')) return 'joint';
        if (e === 'A' || e.includes('AUTHORIZED')) return 'authorized_user';
        if (e === 'C' || e.includes('COSIGNER')) return 'cosigner';
        if (e === 'T' || e.includes('TERMINATED')) return 'terminated';
        return 'unknown';
    }

    function parseTransUnionDate(value) {
        if (!value) return null;
        
        // Handle ISO format (e.g., "2025-02-28T08:00:00.000+0000")
        if (typeof value === 'string' && value.includes('T')) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        }
        
        // Handle MM/DD/YYYY format
        const match = String(value).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (match) {
            const [, month, day, year] = match;
            const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' + year : '20' + year) : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return null;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    // Convert dollar amount to cents (Equifax sends amounts in dollars)
    function dollarsToCents(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return Math.round(value * 100);
        return null;
    }

    function parseDollarsToCents(value) {
        if (!value) return null;
        if (typeof value === 'number') return Math.round(value * 100);
        
        const str = String(value).replace(/[^0-9.-]/g, '');
        const num = parseFloat(str);
        if (isNaN(num)) return null;
        return Math.round(num * 100);
    }

    // ============================================
    // CREDIT REPORT BADGE UI
    // ============================================

    const creditBadgeStyles = `
        #cardtool-credit-badge {
            all: initial !important;
            display: block !important;
            position: fixed !important;
            bottom: 20px !important;
            left: 20px !important;
            background: #18181b !important;
            border: 1px solid #3f3f46 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 13px !important;
            color: #e4e4e7 !important;
            z-index: 999998 !important;
            overflow: hidden !important;
            min-width: 240px !important;
            max-width: 320px !important;
            line-height: 1.4 !important;
        }
        #cardtool-credit-badge * {
            box-sizing: border-box !important;
            font-family: inherit !important;
        }
        .cardtool-credit-header {
            background: #1e3a5f !important;
            padding: 10px 14px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-bottom: 1px solid #3f3f46 !important;
        }
        .cardtool-credit-logo {
            width: 18px !important;
            height: 18px !important;
            background: #3b82f6 !important;
            border-radius: 4px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: bold !important;
            font-size: 11px !important;
            color: white !important;
        }
        .cardtool-credit-title {
            font-weight: 600 !important;
            font-size: 12px !important;
            color: #60a5fa !important;
        }
        .cardtool-credit-close {
            margin-left: auto !important;
            background: none !important;
            border: none !important;
            color: #71717a !important;
            cursor: pointer !important;
            font-size: 18px !important;
            padding: 4px !important;
        }
        .cardtool-credit-body {
            padding: 12px 14px !important;
            background: #18181b !important;
        }
        .cardtool-credit-stats {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
        }
        .cardtool-credit-stat {
            text-align: center !important;
            padding: 8px !important;
            background: #27272a !important;
            border-radius: 6px !important;
        }
        .cardtool-credit-stat-value {
            font-size: 18px !important;
            font-weight: 700 !important;
            color: #60a5fa !important;
        }
        .cardtool-credit-stat-label {
            font-size: 10px !important;
            color: #71717a !important;
            text-transform: uppercase !important;
        }
        .cardtool-credit-btn {
            width: 100% !important;
            padding: 10px 14px !important;
            background: #3b82f6 !important;
            border: none !important;
            border-radius: 6px !important;
            color: white !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
        }
        .cardtool-credit-btn:hover {
            background: #2563eb !important;
        }
        .cardtool-credit-btn:disabled {
            background: #3f3f46 !important;
            color: #71717a !important;
            cursor: not-allowed !important;
        }
        .cardtool-credit-status {
            font-size: 11px !important;
            color: #71717a !important;
            text-align: center !important;
            margin-top: 8px !important;
        }
    `;

    function showCreditBadge() {
        if (!creditReportData) return;
        
        // Inject styles if not already done
        if (!document.getElementById('cardtool-credit-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'cardtool-credit-styles';
            styleEl.textContent = creditBadgeStyles;
            document.head.appendChild(styleEl);
        }

        // Create or update badge
        if (!creditBadgeElement) {
            creditBadgeElement = document.createElement('div');
            creditBadgeElement.id = 'cardtool-credit-badge';
            document.body.appendChild(creditBadgeElement);
        }

        const bureauName = CREDIT_BUREAU_CONFIGS[currentBureau]?.name || 'Unknown';
        const scoreDisplay = creditReportData.scores.length > 0 
            ? creditReportData.scores[0].score 
            : '—';

        creditBadgeElement.innerHTML = `
            <div class="cardtool-credit-header">
                <div class="cardtool-credit-logo">C</div>
                <span class="cardtool-credit-title">CardTool • ${bureauName}</span>
                <button class="cardtool-credit-close" title="Close">&times;</button>
            </div>
            <div class="cardtool-credit-body">
                <div class="cardtool-credit-stats">
                    <div class="cardtool-credit-stat">
                        <div class="cardtool-credit-stat-value">${scoreDisplay}</div>
                        <div class="cardtool-credit-stat-label">Score</div>
                    </div>
                    <div class="cardtool-credit-stat">
                        <div class="cardtool-credit-stat-value">${creditReportData.accounts.length}</div>
                        <div class="cardtool-credit-stat-label">Accounts</div>
                    </div>
                    <div class="cardtool-credit-stat">
                        <div class="cardtool-credit-stat-value">${creditReportData.inquiries.length}</div>
                        <div class="cardtool-credit-stat-label">Inquiries</div>
                    </div>
                </div>
                <div id="cardtool-credit-player-container"></div>
                <button class="cardtool-credit-btn" id="cardtool-credit-sync-btn">
                    Sync to CardTool
                </button>
                <div class="cardtool-credit-status" id="cardtool-credit-status">
                    Data captured. Click to sync.
                </div>
            </div>
        `;

        // Event listeners
        creditBadgeElement.querySelector('.cardtool-credit-close').addEventListener('click', () => {
            creditBadgeElement.remove();
            creditBadgeElement = null;
        });

        creditBadgeElement.querySelector('#cardtool-credit-sync-btn').addEventListener('click', handleCreditSync);

        // Load players for selection
        loadCreditPlayers();
    }

    function loadCreditPlayers() {
        const syncToken = getSyncToken();
        if (!syncToken) return;

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CARDTOOL_URL}/api/points/players`,
            headers: { 'x-sync-token': syncToken },
            onload: function(response) {
                try {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        const players = data.players || [{ player_number: 1, description: 'Me' }];
                        
                        if (players.length > 1) {
                            const container = document.getElementById('cardtool-credit-player-container');
                            if (container) {
                                const lastPlayer = GM_getValue('lastPlayerNumber', 1);
                                container.innerHTML = `
                                    <select id="cardtool-credit-player" style="
                                        width: 100%;
                                        padding: 8px;
                                        margin-bottom: 10px;
                                        background: #27272a;
                                        border: 1px solid #3f3f46;
                                        border-radius: 6px;
                                        color: #e4e4e7;
                                        font-size: 13px;
                                    ">
                                        ${players.map(p => `
                                            <option value="${p.player_number}" ${p.player_number === lastPlayer ? 'selected' : ''}>
                                                ${p.description || `Player ${p.player_number}`}
                                            </option>
                                        `).join('')}
                                    </select>
                                `;
                            }
                        }
                    }
                } catch (e) {
                    console.error('CardTool Credit: Error loading players', e);
                }
            }
        });
    }

    function handleCreditSync() {
        if (!creditReportData || !currentBureau) {
            updateCreditStatus('No data to sync', true);
            return;
        }

        const syncToken = getSyncToken();
        if (!syncToken) {
            updateCreditStatus('Not logged in - get token from CardTool settings', true);
            return;
        }

        const btn = document.getElementById('cardtool-credit-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }
        updateCreditStatus('Uploading credit report data...');

        const playerSelect = document.getElementById('cardtool-credit-player');
        const playerNumber = playerSelect ? parseInt(playerSelect.value) : 1;
        GM_setValue('lastPlayerNumber', playerNumber);

        GM_xmlhttpRequest({
            method: 'POST',
            url: `${CARDTOOL_URL}/api/credit-report/import`,
            headers: {
                'Content-Type': 'application/json',
                'x-sync-token': syncToken
            },
            data: JSON.stringify({
                bureau: currentBureau,
                playerNumber: playerNumber,
                reportDate: creditReportData.reportDate || new Date().toISOString().split('T')[0],
                scores: creditReportData.scores,
                accounts: creditReportData.accounts,
                inquiries: creditReportData.inquiries,
                rawData: creditReportData.rawData
            }),
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    
                    if (response.status === 200 && data.success) {
                        const summary = data.summary;
                        updateCreditStatus(`Synced: ${summary.scores} scores, ${summary.accounts} accounts, ${summary.inquiries} inquiries ✓`);
                        if (btn) {
                            btn.textContent = 'Synced!';
                            btn.style.background = '#059669';
                            setTimeout(() => {
                                btn.disabled = false;
                                btn.textContent = 'Sync to CardTool';
                                btn.style.background = '';
                            }, 3000);
                        }
                    } else {
                        updateCreditStatus(data.error || 'Sync failed', true);
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = 'Sync to CardTool';
                        }
                    }
                } catch (e) {
                    console.error('CardTool Credit: Sync error', e);
                    updateCreditStatus('Failed to sync', true);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Sync to CardTool';
                    }
                }
            },
            onerror: function() {
                updateCreditStatus('Network error', true);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Sync to CardTool';
                }
            }
        });
    }

    function updateCreditStatus(message, isError = false) {
        const statusEl = document.getElementById('cardtool-credit-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = isError ? '#f87171' : '#71717a';
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initCreditReportTracking() {
        // Check if we're on a credit bureau site
        const isCreditBureauSite = setupCreditReportInterceptor();
        
        if (isCreditBureauSite) {
            console.log('CardTool Credit: Initialized on credit bureau site');
        }
    }

    // ============================================
    // START
    // ============================================

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            initCreditReportTracking();
        });
    } else {
        init();
        initCreditReportTracking();
    }
})();
