// ==UserScript==
// @name         CardTool Points Importer
// @namespace    https://cardtool.chrishutchins.com
// @version      1.6.0
// @description  Automatically sync your loyalty program balances to CardTool
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
        .cardtool-badge-close {
            margin-left: auto !important;
            background: none !important;
            border: none !important;
            color: #71717a !important;
            cursor: pointer !important;
            font-size: 16px !important;
            line-height: 1 !important;
            padding: 2px !important;
        }
        .cardtool-badge-close:hover {
            color: #e4e4e7 !important;
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
        .cardtool-player-select {
            width: 100% !important;
            padding: 8px 10px !important;
            background: #27272a !important;
            border: 1px solid #3f3f46 !important;
            border-radius: 6px !important;
            color: #e4e4e7 !important;
            font-size: 13px !important;
            margin: 0 0 10px 0 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
        }
        .cardtool-player-select option {
            background: #27272a !important;
            color: #e4e4e7 !important;
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
    let badgeElement = null;

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
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

            // Re-check periodically (for SPAs that load content dynamically)
            const intervalId = setInterval(tryExtractBalance, 3000);
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
                                parseBalance: (text) => {
                                    const regex = new RegExp(config.parse_regex || '[\\d,]+');
                                    const match = text.match(regex);
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
        badgeElement = document.createElement('div');
        badgeElement.id = 'cardtool-badge';
        badgeElement.innerHTML = `
            <div class="cardtool-badge-header">
                <div class="cardtool-badge-logo">C</div>
                <span class="cardtool-badge-title">CardTool</span>
                <button class="cardtool-badge-close" id="cardtool-badge-close">&times;</button>
            </div>
            <div class="cardtool-badge-body" id="cardtool-badge-content">
                <div class="cardtool-badge-status">Looking for balance...</div>
            </div>
        `;
        document.body.appendChild(badgeElement);

        // Close button
        document.getElementById('cardtool-badge-close').addEventListener('click', () => {
            badgeElement.style.display = 'none';
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
            <button class="cardtool-badge-btn" id="cardtool-sync-btn">
                Sync to CardTool
            </button>
        `);

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
        showToast(`Synced ${data.balance.toLocaleString()} ${data.currencyName}`, false);

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
                console.log('CardTool: Trying config:', config.name, 'selectors:', selectors);

                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    console.log('CardTool: Selector', selector, '-> element:', element ? 'FOUND' : 'not found');
                    
                    if (element) {
                        const text = element.textContent.trim();
                        console.log('CardTool: Element text:', text);
                        const balance = config.parseBalance(text);
                        console.log('CardTool: Parsed balance:', balance);

                        if (balance > 0) {
                            // Found a balance - use this config
                            currentConfig = config;
                            extractedBalance = balance;
                            showBalanceFound(balance);
                            return;
                        }
                    }
                }
            }

            // No balance found on this page - reset any stale balance
            extractedBalance = null;
            showNoBalance();
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
                            container.innerHTML = `
                                <div class="cardtool-player-label">Sync for</div>
                                <select class="cardtool-player-select" id="cardtool-player-select">
                                    ${players.map(p => `
                                        <option value="${p.player_number}">
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

        // Get selected player
        const playerSelect = document.getElementById('cardtool-player-select');
        const playerNumber = playerSelect ? parseInt(playerSelect.value) : 1;

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
                playerNumber: playerNumber
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
    // START
    // ============================================

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
