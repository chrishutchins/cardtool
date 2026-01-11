// ==UserScript==
// @name         CardTool Points Importer
// @namespace    https://cardtool.chrishutchins.com
// @version      1.3.0
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
        #cardtool-badge {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #18181b;
            border: 1px solid #3f3f46;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: #e4e4e7;
            z-index: 999998;
            overflow: hidden;
            min-width: 200px;
            transition: all 0.2s ease;
        }
        #cardtool-badge:hover {
            border-color: #10b981;
        }
        #cardtool-badge * {
            box-sizing: border-box;
        }
        .cardtool-badge-header {
            background: #27272a;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #3f3f46;
        }
        .cardtool-badge-logo {
            width: 18px;
            height: 18px;
            background: #10b981;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 11px;
            color: white;
        }
        .cardtool-badge-title {
            font-weight: 600;
            font-size: 12px;
            color: #10b981;
        }
        .cardtool-badge-close {
            margin-left: auto;
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            padding: 2px;
        }
        .cardtool-badge-close:hover {
            color: #e4e4e7;
        }
        .cardtool-badge-body {
            padding: 12px 14px;
        }
        .cardtool-badge-balance {
            font-size: 20px;
            font-weight: 700;
            color: #fbbf24;
            margin-bottom: 4px;
        }
        .cardtool-badge-currency {
            font-size: 12px;
            color: #a1a1aa;
            margin-bottom: 12px;
        }
        .cardtool-badge-btn {
            width: 100%;
            padding: 10px 14px;
            background: #10b981;
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .cardtool-badge-btn:hover {
            background: #059669;
        }
        .cardtool-badge-btn:disabled {
            background: #3f3f46;
            color: #71717a;
            cursor: not-allowed;
        }
        .cardtool-badge-link {
            display: block;
            text-align: center;
            padding: 10px 14px;
            color: #10b981;
            text-decoration: none;
            font-size: 13px;
        }
        .cardtool-badge-link:hover {
            text-decoration: underline;
        }
        .cardtool-badge-status {
            text-align: center;
            font-size: 12px;
            color: #71717a;
        }
        .cardtool-badge-error {
            color: #f87171;
        }
        .cardtool-badge-success {
            color: #10b981;
        }
        .cardtool-player-select {
            width: 100%;
            padding: 8px 10px;
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            color: #e4e4e7;
            font-size: 13px;
            margin-bottom: 10px;
        }
        .cardtool-player-label {
            font-size: 11px;
            color: #a1a1aa;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Toast notification */
        #cardtool-toast {
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: #18181b;
            border: 1px solid #10b981;
            border-radius: 8px;
            padding: 12px 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: #e4e4e7;
            z-index: 999999;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: cardtool-slide-in 0.3s ease;
        }
        #cardtool-toast.error {
            border-color: #f87171;
        }
        #cardtool-toast .icon {
            font-size: 18px;
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

    let currentConfig = null;
    let players = null;
    let extractedBalance = null;
    let badgeElement = null;

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Load server configs first, then initialize
        loadServerConfigs(() => {
            // Find matching site config (server configs take priority)
            // Use hostname + pathname to support path-specific patterns
            currentConfig = findMatchingConfig(window.location.hostname + window.location.pathname);

            if (!currentConfig) {
                return; // Site not configured
            }

            // Inject styles
            const styleEl = document.createElement('style');
            styleEl.textContent = styles;
            document.head.appendChild(styleEl);

            // Create badge
            createBadge();

            // Try to find balance on page
            setTimeout(tryExtractBalance, 1000);

            // Re-check periodically (for SPAs)
            setInterval(tryExtractBalance, 5000);
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
                        serverConfigs = (data.configs || []).map(config => ({
                            name: config.name,
                            currencyCode: config.currency_code,
                            sitePattern: new RegExp(config.url_pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
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

    function findMatchingConfig(url) {
        // Server configs take priority (more up-to-date)
        for (const config of serverConfigs) {
            if (config.sitePattern.test(url)) {
                return config;
            }
        }
        // Fall back to hardcoded configs
        for (const config of FALLBACK_CONFIGS) {
            if (config.sitePattern.test(url)) {
                return config;
            }
        }
        return null;
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
        updateBadgeContent(`
            <div class="cardtool-badge-status">Balance not found on this page</div>
            <a href="${currentConfig.balancePageUrl}" class="cardtool-badge-link">
                View your balance &rarr;
            </a>
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
        if (!currentConfig) return;

        try {
            const selectors = currentConfig.selector.split(',').map(s => s.trim());

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent.trim();
                    const balance = currentConfig.parseBalance(text);

                    if (balance > 0) {
                        extractedBalance = balance;
                        showBalanceFound(balance);
                        return;
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
