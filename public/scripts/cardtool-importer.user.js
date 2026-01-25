// ==UserScript==
// @name         CardTool Points Importer
// @namespace    https://cardtool.app
// @version      2.51.0
// @description  Sync loyalty program balances and credit report data to CardTool
// @author       CardTool
// @match        *://*/*
// @exclude      *://localhost:*/*
// @exclude      *://cardtool.app/*
// @exclude      *://www.google.com/*
// @exclude      *://www.google.com.*/*
// @exclude      *://*.github.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      cardtool.app
// @connect      localhost
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('CardTool: Script loaded on', window.location.hostname, window.location.pathname);

    // ============================================
    // CONFIGURATION
    // ============================================

    // Change this to localhost:3000 for development
    const CARDTOOL_URL = 'https://cardtool.app';

    // Server-loaded configs (populated on init)
    let serverConfigs = [];

    // Server-loaded configs (populated on init from /api/points/site-configs)
    // No fallback configs - all configs managed via CardTool admin

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
        /* Minimized state */
        #cardtool-badge.cardtool-minimized {
            min-width: auto !important;
            max-width: none !important;
            border-radius: 20px !important;
            cursor: pointer !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-badge-header {
            padding: 8px 12px !important;
            border-bottom: none !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-badge-title,
        #cardtool-badge.cardtool-minimized .cardtool-badge-refresh,
        #cardtool-badge.cardtool-minimized .cardtool-badge-minimize {
            display: none !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-badge-close {
            font-size: 14px !important;
            padding: 2px !important;
            margin-left: 4px !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-badge-body {
            display: none !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-badge-logo {
            width: 22px !important;
            height: 22px !important;
            font-size: 12px !important;
        }
        #cardtool-badge.cardtool-minimized .cardtool-mini-balance {
            display: flex !important;
            align-items: center !important;
            margin-left: 8px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #fbbf24 !important;
        }
        .cardtool-mini-balance {
            display: none !important;
        }
        .cardtool-badge-minimize {
            background: none !important;
            border: none !important;
            color: #71717a !important;
            cursor: pointer !important;
            font-size: 14px !important;
            line-height: 1 !important;
            padding: 4px !important;
        }
        .cardtool-badge-minimize:hover {
            color: #e4e4e7 !important;
        }
        /* Multi-balance display */
        .cardtool-multi-balances {
            margin-bottom: 12px !important;
        }
        .cardtool-multi-balance-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 6px 0 !important;
            border-bottom: 1px solid #27272a !important;
        }
        .cardtool-multi-balance-row:last-child {
            border-bottom: none !important;
        }
        .cardtool-multi-balance-value {
            font-size: 18px !important;
            font-weight: 700 !important;
            color: #fbbf24 !important;
        }
        .cardtool-multi-balance-name {
            font-size: 11px !important;
            color: #a1a1aa !important;
            text-align: right !important;
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

        /* Toast notification - positioned left of the widget */
        #cardtool-toast {
            position: fixed !important;
            bottom: 20px !important;
            right: 340px !important;
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
        /* Inventory section styles */
        .cardtool-inventory-divider {
            height: 1px !important;
            background: #3f3f46 !important;
            margin: 12px 0 !important;
        }
        .cardtool-inventory-header {
            text-align: center !important;
            margin-bottom: 4px !important;
        }
        .cardtool-inventory-count {
            font-size: 20px !important;
            font-weight: 700 !important;
            color: #fbbf24 !important;
        }
        .cardtool-inventory-label {
            font-size: 12px !important;
            color: #a1a1aa !important;
            margin-left: 6px !important;
        }
        .cardtool-inventory-summary {
            font-size: 11px !important;
            color: #71717a !important;
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
        
        // Set up special API interceptors EARLY (before page makes API calls)
        // This needs to happen before loadServerConfigs since it's async
        const hasSpecialApi = setupSpecialApiInterceptors();
        
        // Set up inventory API interceptors (for awards/certificates)
        const hasInventoryApi = setupInventoryApiInterceptors();
        
        // Set up inventory DOM extraction (for sites that render awards in HTML)
        const inventoryDomMatch = setupInventoryDomExtraction();
        const hasInventoryDom = !!inventoryDomMatch;
        
        // Load server configs first, then initialize
        loadServerConfigs(() => {
            // Find ALL matching site configs by domain
            matchingConfigs = findMatchingConfigs(window.location.hostname);

            // If we have a special API config but no DOM configs, create a placeholder config
            if (matchingConfigs.length === 0 && hasSpecialApi && specialApiConfig) {
                matchingConfigs = [{
                    name: specialApiConfig.name,
                    currencyCode: specialApiConfig.currencyCode,
                    balancePageUrl: window.location.href,
                    selector: null // No DOM selector, balance comes from API
                }];
            }

            // If we have inventory API but no balance configs, create a placeholder for inventory-only sites
            if (matchingConfigs.length === 0 && hasInventoryApi && inventoryConfig) {
                matchingConfigs = [{
                    name: inventoryConfig.name,
                    currencyCode: null, // No currency, inventory only
                    balancePageUrl: window.location.href,
                    selector: null,
                    inventoryOnly: true
                }];
            }

            // If we have inventory DOM config but no balance configs, create a placeholder
            if (matchingConfigs.length === 0 && hasInventoryDom && inventoryDomConfig) {
                matchingConfigs = [{
                    name: inventoryDomConfig.name,
                    currencyCode: null, // No currency, inventory only
                    balancePageUrl: window.location.href,
                    selector: null,
                    inventoryOnly: true
                }];
            }

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

            // For special API configs, show "waiting for data" message
            if (hasSpecialApi && specialApiConfig) {
                updateBadgeContent('<div class="cardtool-badge-status">Waiting for balance data...</div>');
            }
            
            // For inventory-only sites, show "waiting for inventory" message
            if (hasInventoryApi && inventoryConfig && currentConfig && currentConfig.inventoryOnly) {
                updateBadgeContent('<div class="cardtool-badge-status">Waiting for inventory data...</div>');
            }

            // Try to find balance on page (wait longer for SPAs to load)
            console.log('CardTool: Found', matchingConfigs.length, 'config(s) for this domain');
            
            // Only do DOM extraction if we have selectors (not just API-based)
            if (matchingConfigs.some(c => c.selector)) {
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
            }
            
            // For DOM-based inventory extraction, run after page loads
            if (hasInventoryDom) {
                console.log('CardTool Inventory DOM: Will extract after page loads');
                // Wait for page to fully render (Hilton uses React)
                setTimeout(() => {
                    extractInventoryFromDom();
                }, 3000);
                
                // Re-check after a bit longer in case of slow loading
                setTimeout(() => {
                    if (!inventoryItems || inventoryItems.length === 0) {
                        console.log('CardTool Inventory DOM: Re-checking...');
                        extractInventoryFromDom();
                    }
                }, 6000);
            }
        });
    }

    function loadServerConfigs(callback) {
        console.log('CardTool: Loading server configs from', `${CARDTOOL_URL}/api/points/site-configs`);
        
        // Helper to transform raw config to usable format
        const transformConfig = (config) => ({
            name: config.name,
            currencyCode: config.currency_code,
            domain: config.domain,
            balancePageUrl: config.balance_page_url,
            selector: config.selector,
            attribute: config.attribute || null,
            aggregate: config.aggregate || false,
            format: config.format || 'points',
            parseRegex: config.parse_regex || null,
            parseBalance: function(text) {
                const normalized = text.replace(/[\u00A0\s]+/g, ' ');
                const regex = new RegExp(this.parseRegex || '[\\d][\\d.,\\s]*');
                const match = normalized.match(regex);
                if (!match) return 0;
                
                if (this.format === 'dollars') {
                    const numStr = match[0].replace(/[^0-9.]/g, '');
                    return Math.round(parseFloat(numStr)) || 0;
                }
                return parseInt(match[0].replace(/[^0-9]/g, '')) || 0;
            }
        });
        
        // Try to load cached configs first (in case API fails)
        const loadCachedConfigs = () => {
            try {
                const cached = GM_getValue('serverConfigsCache', null);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Cache is valid for 24 hours
                    if (parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
                        serverConfigs = parsed.configs.map(c => transformConfig(c));
                        console.log('CardTool: Loaded', serverConfigs.length, 'configs from cache');
                        return true;
                    }
                }
            } catch (e) {
                console.warn('CardTool: Failed to load cached configs', e);
            }
            return false;
        };
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CARDTOOL_URL}/api/points/site-configs`,
            withCredentials: true,
            onload: function(response) {
                console.log('CardTool: Server configs response status:', response.status);
                try {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        const rawConfigs = (data.configs || []).filter(config => config.is_active !== false);
                        serverConfigs = rawConfigs.map(c => transformConfig(c));
                        console.log('CardTool: Loaded', serverConfigs.length, 'server configs');
                        
                        // Cache the raw configs for offline use
                        GM_setValue('serverConfigsCache', JSON.stringify({
                            timestamp: Date.now(),
                            configs: rawConfigs
                        }));
                    } else {
                        console.warn('CardTool: Server configs returned status', response.status);
                        loadCachedConfigs();
                    }
                } catch (e) {
                    console.error('CardTool: Error parsing server configs', e);
                    loadCachedConfigs();
                }
                callback();
            },
            onerror: function(error) {
                console.warn('CardTool: Could not load server configs from API. Error:', error);
                if (!loadCachedConfigs()) {
                    console.warn('CardTool: No cached configs available');
                }
                callback();
            }
        });
    }

    function findMatchingConfigs(hostname) {
        // Normalize hostname (remove www. and lowercase)
        const normalizedHost = hostname.replace(/^www\./, '').toLowerCase();
        const matches = [];
        
        for (const config of serverConfigs) {
            // Normalize config domain for case-insensitive comparison
            const configDomain = (config.domain || '').toLowerCase();
            // Match if hostname ends with the config domain
            if (normalizedHost === configDomain || normalizedHost.endsWith('.' + configDomain)) {
                matches.push(config);
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
                <span class="cardtool-mini-balance" id="cardtool-mini-balance"></span>
                <span class="cardtool-badge-title">CardTool</span>
                <button class="cardtool-badge-refresh" title="Refresh balance">&#8635;</button>
                <button class="cardtool-badge-minimize" title="Minimize">&#8722;</button>
                <button class="cardtool-badge-close" title="Close">&times;</button>
            </div>
            <div class="cardtool-badge-body" id="cardtool-badge-content">
                <div class="cardtool-badge-status">Looking for balance...</div>
            </div>
        `;
        document.body.appendChild(badgeElement);

        // Check if user prefers minimized state (default to minimized)
        const isMinimized = GM_getValue('cardtool_minimized', true);
        if (isMinimized) {
            badgeElement.classList.add('cardtool-minimized');
        }

        // Click on minimized badge to expand
        badgeElement.addEventListener('click', (e) => {
            if (badgeElement.classList.contains('cardtool-minimized')) {
                // Only expand if clicking on the badge itself, not buttons
                if (!e.target.closest('button')) {
                    badgeElement.classList.remove('cardtool-minimized');
                    GM_setValue('cardtool_minimized', false);
                }
            }
        });

        // Minimize button
        badgeElement.querySelector('.cardtool-badge-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            badgeElement.classList.add('cardtool-minimized');
            GM_setValue('cardtool_minimized', true);
        });

        // Refresh button - re-scan page for balance
        badgeElement.querySelector('.cardtool-badge-refresh').addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Save API-captured data before resetting (API data can't be re-captured without page reload)
            const savedMultiBalanceData = hasMultiBalanceData;
            const savedApiBalances = specialApiBalances;
            const savedInventoryItems = inventoryItems;
            
            extractedBalance = null;
            lastDisplayedBalance = null;
            currentConfig = null;
            updateBadgeContent('<div class="cardtool-badge-status">Scanning...</div>');
            
            setTimeout(() => {
                // Try DOM extraction first
                tryExtractBalance();
                
                // If DOM didn't find anything and we have API data, restore it
                if (extractedBalance === null && savedMultiBalanceData && savedApiBalances && savedApiBalances.length > 0) {
                    console.log('CardTool: Restoring API-captured balance data');
                    specialApiBalances = savedApiBalances;
                    showMultipleBalancesFound(savedApiBalances);
                }
                
                // If we have inventory items, re-show them
                if (savedInventoryItems && savedInventoryItems.length > 0) {
                    console.log('CardTool: Restoring inventory items');
                    inventoryItems = savedInventoryItems;
                    showInventoryFound(savedInventoryItems);
                }
                
                // Also try DOM inventory extraction
                if (inventoryDomConfig) {
                    extractInventoryFromDom();
                }
            }, 500);
        });

        // Close button
        badgeElement.querySelector('.cardtool-badge-close').addEventListener('click', (e) => {
            e.stopPropagation();
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
        // Don't overwrite if we have multi-balance data from API interceptor
        if (hasMultiBalanceData) {
            console.log('CardTool: Skipping single balance display - multi-balance data already shown');
            return;
        }
        
        const formattedBalance = balance.toLocaleString();
        
        // Update mini-balance for minimized state
        const miniBalance = document.getElementById('cardtool-mini-balance');
        if (miniBalance) {
            let miniText = formattedBalance;
            // Add inventory count if we have inventory
            if (inventoryItems && inventoryItems.length > 0) {
                miniText += ' | ' + inventoryItems.length + ' inv';
            }
            miniBalance.textContent = miniText;
        }
        
        // Build inventory row if we have inventory items
        let inventoryRowHtml = '';
        if (inventoryItems && inventoryItems.length > 0) {
            const byType = {};
            for (const item of inventoryItems) {
                const type = item.type_slug === 'free_night' ? 'Free Nights' : 'Coupons/Upgrades';
                byType[type] = (byType[type] || 0) + 1;
            }
            const summaryText = Object.entries(byType).map(([type, count]) => `${count} ${type}`).join(', ');
            const brandName = inventoryConfig?.brand || inventoryDomConfig?.brand || 'Inventory';
            
            inventoryRowHtml = `
                <div class="cardtool-multi-balance-row">
                    <span class="cardtool-multi-balance-value">${inventoryItems.length}</span>
                    <span class="cardtool-multi-balance-name">${brandName} Inventory</span>
                </div>
                <div class="cardtool-inventory-summary" style="text-align: right; margin-bottom: 8px; margin-top: -4px;">${summaryText}</div>
            `;
        }
        
        const hasInventory = inventoryItems && inventoryItems.length > 0;
        const syncButtonText = hasInventory ? 'Sync All to CardTool' : 'Sync to CardTool';
        
        updateBadgeContent(`
            <div class="cardtool-multi-balance-row">
                <span class="cardtool-multi-balance-value">${formattedBalance}</span>
                <span class="cardtool-multi-balance-name">${currentConfig.name}</span>
            </div>
            ${inventoryRowHtml}
            <div id="cardtool-player-container"></div>
            <div class="cardtool-options-toggle" id="cardtool-options-toggle">▼ Options</div>
            <div class="cardtool-options" id="cardtool-options" style="display: none;">
                <div class="cardtool-option-row">
                    <label class="cardtool-option-label" for="cardtool-expiration">Points expire</label>
                    <input type="date" class="cardtool-date-input" id="cardtool-expiration">
                </div>
            </div>
            <button class="cardtool-badge-btn" id="cardtool-sync-btn">
                ${syncButtonText}
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

        // Combined sync handler - syncs both balance and inventory if available
        document.getElementById('cardtool-sync-btn').addEventListener('click', () => {
            const hasInventory = inventoryItems && inventoryItems.length > 0;
            handleCombinedSync(hasInventory ? inventoryItems : null);
        });

        // Load players
        loadPlayers();
    }

    function showNoBalance() {
        // Don't overwrite if we have multi-balance data from API interceptor
        if (hasMultiBalanceData) {
            console.log('CardTool: Skipping "no balance" display - multi-balance data already shown');
            return;
        }
        
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
                // Skip configs without DOM selectors (API-only configs)
                if (!config.selector) {
                    console.log('CardTool: Skipping config without selector:', config.name);
                    continue;
                }
                
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
                    console.log('CardTool: Loaded', players.length, 'player(s)');

                    // Only show player selector if multiple players
                    if (players.length > 1) {
                        const container = document.getElementById('cardtool-player-container');
                        console.log('CardTool: Player container found:', !!container);
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

        // Get expiration option
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
                additive: false,
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

    // Combined sync for balance + inventory with single toast (runs in parallel)
    function handleCombinedSync(inventoryToSync) {
        if (extractedBalance === null) {
            showSyncError('No balance to sync');
            return;
        }

        const syncToken = getSyncToken();
        if (!syncToken) {
            showNotLoggedIn();
            return;
        }

        const btn = document.getElementById('cardtool-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }

        // Get selected player and remember it
        const playerSelect = document.getElementById('cardtool-player-select');
        const playerNumber = playerSelect ? parseInt(playerSelect.value) : 1;
        GM_setValue('lastPlayerNumber', playerNumber);

        // Get expiration option
        const expirationInput = document.getElementById('cardtool-expiration');
        const expirationDate = expirationInput && expirationInput.value ? expirationInput.value : null;

        // Track results from parallel requests
        let balanceResult = null;
        let inventoryResult = null;
        let balanceDone = false;
        let inventoryDone = !inventoryToSync || inventoryToSync.length === 0; // Already done if no inventory

        function checkComplete() {
            if (!balanceDone || !inventoryDone) return;

            // Both done - show combined result
            if (balanceResult && balanceResult.success) {
                const balanceMsg = `${balanceResult.balance.toLocaleString()} ${balanceResult.currencyName}`;
                
                if (inventoryDone && !inventoryToSync) {
                    // No inventory to sync
                    showToast(`Synced ${balanceMsg}`);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Synced!';
                        btn.style.background = '#22c55e';
                    }
                } else if (inventoryResult && inventoryResult.success) {
                    // Both succeeded
                    showToast(`Synced ${balanceMsg} + ${inventoryResult.synced} inventory items`);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Synced!';
                        btn.style.background = '#22c55e';
                    }
                } else {
                    // Balance ok, inventory failed
                    showToast(`Synced ${balanceMsg}, inventory failed`, true);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = 'Partial Sync';
                        btn.style.background = '#f59e0b';
                    }
                }
            } else {
                // Balance failed
                showSyncError(balanceResult?.error || 'Sync failed');
            }
        }

        // Sync balance
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
                additive: false,
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
                    balanceResult = response.status === 200 ? { success: true, ...data } : { success: false, error: data.error };
                } catch (e) {
                    balanceResult = { success: false, error: 'Parse error' };
                }
                balanceDone = true;
                checkComplete();
            },
            onerror: function() {
                balanceResult = { success: false, error: 'Network error' };
                balanceDone = true;
                checkComplete();
            }
        });

        // Sync inventory in parallel (if any)
        if (inventoryToSync && inventoryToSync.length > 0) {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CARDTOOL_URL}/api/inventory/sync`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-sync-token': syncToken
                },
                data: JSON.stringify({
                    items: inventoryToSync,
                    playerNumber: playerNumber
                }),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        inventoryResult = response.status === 200 && data.success ? { success: true, ...data } : { success: false, error: data.error };
                    } catch (e) {
                        inventoryResult = { success: false, error: 'Parse error' };
                    }
                    inventoryDone = true;
                    checkComplete();
                },
                onerror: function() {
                    inventoryResult = { success: false, error: 'Network error' };
                    inventoryDone = true;
                    checkComplete();
                }
            });
        }
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
            domains: [
                'service.transunion.com',
                'annualcreditreport.transunion.com'
            ],
            apiPatterns: [
                /creditreport/i,
                /dashboard/i
            ],
            parseResponse: parseTransUnionResponse,
            useHtmlScraping: true
        }
    };

    // Score-only source configurations (for sites that provide scores but not full reports)
    const SCORE_SOURCE_CONFIGS = {
        creditkarma: {
            name: 'Credit Karma',
            domain: 'creditkarma.com',
            // Only activate on dashboard pages, NOT on login/auth pages
            pathPattern: /^\/(today|dashboard|credit-scores|credit-health)/i,
            excludePathPattern: /\/(login|auth|signin|signup)/i,
            apiPatterns: [
                /api\.creditkarma\.com/i,
                /creditkarma\.com.*graphql/i,
                /graphql/i  // Broad match - will filter by domain
            ],
            parseResponse: parseCreditKarmaResponse,
            // Also parse page for /credit-health/bureau/main pages which have historical data embedded
            parseFromPage: true,
            parseFromPagePattern: /\/credit-health\/(equifax|transunion)\/main/i,
            scoreOnly: true
        },
        myfico: {
            name: 'myFICO',
            domain: 'myfico.com',
            apiPatterns: [
                /\/v4\/users\/products/i,
                /\/v4\/users\/reports\/1b\//i,  // 1-bureau full credit report
                /\/v4\/users\/reports\/3b\//i,  // 3-bureau full credit report
                /\/v4\/users\/reports/i,        // Reports list (score-only)
                /\/v2\/users\/reports/i
            ],
            parseResponse: parseMyFicoResponse
            // Note: scoreOnly is determined dynamically based on response content
        },
        creditwise: {
            name: 'Capital One CreditWise',
            domain: 'creditwise.capitalone.com',
            apiPatterns: [
                /\/api\/pages/i,
                /creditwise.*\/api/i
            ],
            parseResponse: parseCreditWiseResponse,
            scoreOnly: true
        },
        creditjourney: {
            name: 'Chase Credit Journey',
            domain: 'chase.com',
            hashPattern: /creditjourney/i, // Credit Journey is in hash route, not path
            apiPatterns: [
                /credit-journey\/servicing/i,
                /credit-score-outlines/i,
                /real-time-score-changes/i
            ],
            parseResponse: parseCreditJourneyResponse,
            scoreOnly: true
        },
        bankofamerica: {
            name: 'Bank of America',
            domain: 'bankofamerica.com',
            pathPattern: /credit-score/i, // Must be on credit score page
            apiPatterns: [
                /\/ogateway\/finwell\/creditscore/i,
                /creditscore\/v1\/details/i,
                /\/finwell\/creditscore/i
            ],
            parseResponse: parseBankOfAmericaResponse,
            scoreOnly: true
        },
        citi: {
            name: 'Citi',
            domain: 'citi.com',
            apiPatterns: [
                /\/gcgapi\/.*\/ficoTilesData/i,
                /ficoTilesData\/retrieve/i
            ],
            parseResponse: parseCitiResponse,
            scoreOnly: true
        },
        usbank: {
            name: 'US Bank',
            domain: 'usbank.com',
            // No path/hash restrictions - detect by API call pattern only
            apiPatterns: [
                /usbank\.com.*graphql/i,
                /\/graphql/i,  // Broad match - will filter by domain
                /getCreditScoreService/i
            ],
            parseResponse: parseUSBankResponse,
            scoreOnly: true
        },
        amex: {
            name: 'Amex MyCredit Guide',
            domain: 'mycreditguide.americanexpress.com',
            apiPatterns: [
                /experiancs\.com.*scoreplan-score/i,
                /mycreditguide.*\/api\/.*\/credit\/scores/i,
                /\/credit\/scores/i
            ],
            parseResponse: parseAmexResponse,
            scoreOnly: true
        },
        wellsfargo: {
            name: 'Wells Fargo',
            domain: 'wellsfargo.com',
            // Match any page that might have credit score data
            pathPattern: /\/(fico|credit|services)/i,
            // Try both page parsing AND API interception
            parseFromPage: true,
            apiPatterns: [
                /fico/i,
                /creditscore/i,
                /credit.*score/i,
                /viewcreditscore/i
            ],
            parseResponse: parseWellsFargoResponse,
            scoreOnly: true
        },
    };

    // Credit report state
    let creditReportData = null;
    let creditBadgeElement = null;
    let currentBureau = null;

    // ============================================
    // SPECIAL API INTERCEPTORS FOR POINTS/BALANCES
    // ============================================

    // Special API interceptors for multi-balance endpoints
    const SPECIAL_API_CONFIGS = {
        unitedBalances: {
            domain: 'united.com',
            pathPattern: /\/myunited|\/offers\/travelbank/i,
            apiPattern: /\/api\/myunited\/user\/balances/i,
            name: 'United',
            // Map API currency types to our currency codes
            currencyMap: {
                'RDM': { code: 'UA', name: 'United MileagePlus', format: 'points' },
                'UBC': { code: 'UATB', name: 'United Travel Bank', format: 'dollars' }
            },
            parseResponse: (data) => {
                const results = [];
                const balances = data?.data?.Balances;
                
                if (balances && Array.isArray(balances)) {
                    for (const bal of balances) {
                        const currencyInfo = SPECIAL_API_CONFIGS.unitedBalances.currencyMap[bal.ProgramCurrencyType];
                        if (currencyInfo && bal.TotalBalance > 0) {
                            results.push({
                                currencyCode: currencyInfo.code,
                                name: currencyInfo.name,
                                balance: bal.TotalBalance,
                                format: currencyInfo.format,
                                expiration: bal.EarliestExpirationDate 
                                    ? bal.EarliestExpirationDate.split('T')[0] 
                                    : null
                            });
                        }
                    }
                }
                
                return results.length > 0 ? results : null;
            }
        },
        ihgBalance: {
            domain: 'ihg.com',
            pathPattern: /\/rewardsclub\/.*\/account-mgmt/i,
            apiPattern: /\/members\/v2\/profiles\/me/i,
            name: 'IHG',
            currencyCode: 'IHG',
            parseResponse: (data) => {
                const results = [];
                const programs = data?.programs || [];
                
                // Find the PC (Priority Club / One Rewards) program with points balance
                for (const program of programs) {
                    if (program.programCode === 'PC' && program.currentPointsBalance !== undefined) {
                        results.push({
                            currencyCode: 'IHG',
                            name: 'IHG One Rewards',
                            balance: program.currentPointsBalance,
                            format: 'points',
                            expiration: null
                        });
                        break;
                    }
                }
                
                return results.length > 0 ? results : null;
            }
        },
        alaskaWallet: {
            domain: 'alaskaair.com',
            pathPattern: /\/atmosrewards\/account/i,
            apiPattern: /\/loyaltymanagement\/wallet\/certificates/i,
            name: 'Alaska Wallet',
            currencyCode: 'ASWLT',
            parseResponse: (data) => {
                // Data is an array of certificates
                if (!Array.isArray(data)) return null;
                
                // Sum up all available balances
                let totalBalance = 0;
                for (const cert of data) {
                    if (cert.availableBalance) {
                        totalBalance += cert.availableBalance;
                    }
                }
                
                if (totalBalance > 0) {
                    return [{
                        currencyCode: 'ASWLT',
                        name: 'Alaska Wallet',
                        balance: totalBalance,
                        format: 'dollars',
                        expiration: null
                    }];
                }
                return null;
            }
        }
    };

    // State for special API interceptors (supports multiple balances)
    let specialApiBalances = null; // Array of { currencyCode, name, balance, format, expiration }
    let specialApiConfig = null;
    let hasMultiBalanceData = false; // Flag to prevent DOM detection from overwriting API data

    // ============================================
    // INVENTORY API INTERCEPTORS
    // ============================================

    // Inventory interceptor configs for importing awards/certificates from loyalty programs
    const INVENTORY_API_CONFIGS = {
        hyattAwards: {
            domain: 'hyatt.com',
            pathPattern: /\/profile\/.*\/awards/i,
            apiPattern: /\/profile\/api\/loyalty\/awarddetail/i,
            name: 'Hyatt',
            brand: 'Hyatt',
            parseResponse: (data) => {
                const items = [];
                for (const category of data.awardCategories || []) {
                    // NIGHTS = Free Night, everything else = Coupon
                    const typeSlug = category.category === 'NIGHTS' ? 'free_night' : 'coupon';
                    for (const award of category.awards || []) {
                        items.push({
                            external_id: award.code,
                            type_slug: typeSlug,
                            name: award.title,
                            brand: 'Hyatt',
                            expiration_date: award.expirationDate || null,
                            notes: award.terms || null
                        });
                    }
                }
                return items;
            }
        },
        marriottAwards: {
            domain: 'marriott.com',
            pathPattern: /\/loyalty\/myAccount\/activity/i,
            apiPattern: /\/mi\/query\/phoenixAccountDttGetMyActivityRewardsEarned/i,
            name: 'Marriott',
            brand: 'Marriott',
            parseResponse: (data) => {
                const items = [];
                const today = new Date().toISOString().split('T')[0];
                const loyalty = data?.data?.customer?.loyaltyInformation;
                if (!loyalty) return items;

                // Free Night Certificates
                // Track seen external_ids to handle duplicates (same type + same expiration)
                const seenIds = {};
                const certificates = loyalty.certificates?.edges || [];
                for (const edge of certificates) {
                    const cert = edge.node;
                    if (!cert) continue;
                    // Skip expired
                    if (cert.expirationDate && cert.expirationDate < today) continue;
                    
                    // Create base external_id from type code + expiration
                    const baseId = `${cert.awardType?.code || 'cert'}-${cert.expirationDate || 'noexp'}`;
                    // If we've seen this combo before, add a suffix
                    seenIds[baseId] = (seenIds[baseId] || 0) + 1;
                    const external_id = seenIds[baseId] > 1 ? `${baseId}-${seenIds[baseId]}` : baseId;
                    
                    items.push({
                        external_id,
                        type_slug: 'free_night',
                        name: cert.awardType?.description || 'Free Night Award',
                        brand: 'Marriott',
                        expiration_date: cert.expirationDate || null,
                        notes: cert.numberOfNights ? `${cert.numberOfNights} night(s)` : null
                    });
                }

                // Suite Night Awards (available only, not expired)
                const suiteNights = loyalty.nightlyUpgradeAwards?.available;
                if (suiteNights && suiteNights.count > 0) {
                    for (const detail of suiteNights.details || []) {
                        if (!detail.expirationDate || detail.expirationDate < today) continue;
                        // Create one item per expiration group
                        items.push({
                            external_id: `SNA-${detail.expirationDate}`,
                            type_slug: 'coupon',
                            name: `Suite Night Award (${detail.count}x)`,
                            brand: 'Marriott',
                            expiration_date: detail.expirationDate,
                            notes: `${detail.count} Suite Night Award(s)`
                        });
                    }
                }

                return items;
            }
        },
        ihgVouchers: {
            domain: 'ihg.com',
            pathPattern: /\/rewardsclub\/.*\/account-mgmt\/wallet/i,
            apiPattern: /\/members\/benefits\/v2\/vouchers/i,
            name: 'IHG',
            brand: 'IHG',
            parseResponse: (data) => {
                const items = [];
                const vouchers = data?.vouchers || [];
                
                for (const voucher of vouchers) {
                    // Only include "Issued" status vouchers
                    if (voucher.status?.status !== 'Issued') continue;
                    
                    // Skip point deposits (PTS-DPST) - these are just bonus points, not redeemable items
                    if (voucher.typeId === 'PTS-DPST') continue;
                    
                    // Determine type - IHG doesn't have free night vouchers in this API
                    const typeSlug = 'coupon';
                    
                    // Build notes with code and value
                    let notes = voucher.code ? `Code: ${voucher.code}` : null;
                    if (voucher.value?.amount) {
                        notes = (notes ? notes + ', ' : '') + `$${voucher.value.amount} ${voucher.value.unitCurrency || 'USD'}`;
                    }
                    
                    items.push({
                        external_id: voucher.id,
                        type_slug: typeSlug,
                        name: voucher.name,
                        brand: 'IHG',
                        expiration_date: voucher.usage?.expiryDate ? voucher.usage.expiryDate.split('T')[0] : null,
                        notes: notes
                    });
                }
                
                return items;
            }
        }
    };

    // DOM-based inventory configs (for sites that render awards in HTML or embedded JSON)
    const INVENTORY_DOM_CONFIGS = {
        hiltonAwards: {
            domain: 'hilton.com',
            pathPattern: /\/hilton-honors\/guest\/my-account/i,
            name: 'Hilton',
            brand: 'Hilton',
            // Hilton embeds data in __NEXT_DATA__ script tag - DOM only shows first item
            extractFromNextData: true,
            parseNextData: (nextData) => {
                const items = [];
                try {
                    // Navigate to amexCoupons.available in the deeply nested structure
                    const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
                    for (const query of queries) {
                        const guest = query?.state?.data?.guest;
                        if (guest?.hhonors?.amexCoupons?.available) {
                            const coupons = guest.hhonors.amexCoupons.available;
                            for (const coupon of coupons) {
                                // Extract last 4 digits from codeMasked (e.g., "••••• 4559" -> "4559")
                                const codeMasked = coupon.codeMasked || '';
                                const lastFourMatch = codeMasked.match(/(\d{4})$/);
                                const externalId = lastFourMatch ? lastFourMatch[1] : null;
                                
                                if (!externalId) continue; // Skip if no ID
                                
                                // Parse expiration date from endDate (e.g., "2026-07-29T23:59:59")
                                let expirationDate = null;
                                if (coupon.endDate) {
                                    expirationDate = coupon.endDate.split('T')[0];
                                }
                                
                                // Determine type: Free Night for names containing "Free Night", otherwise Coupon
                                const offerName = coupon.offerName || 'Unknown Award';
                                const typeSlug = offerName.toLowerCase().includes('free night') ? 'free_night' : 'coupon';
                                
                                items.push({
                                    external_id: externalId,
                                    type_slug: typeSlug,
                                    name: offerName,
                                    brand: 'Hilton',
                                    expiration_date: expirationDate,
                                    notes: `Certificate # ${codeMasked}`
                                });
                            }
                            break; // Found the data, stop searching
                        }
                    }
                } catch (e) {
                    console.warn('CardTool Inventory DOM: Failed to parse Hilton __NEXT_DATA__', e);
                }
                return items;
            }
        },
        ihgAmbassador: {
            domain: 'ihg.com',
            pathPattern: /\/rewardsclub\/.*\/account-mgmt\/wallet/i,
            name: 'IHG',
            brand: 'IHG',
            selector: '[data-slnm-ihg="AmbassadorWeekendNightsCardSID"]',
            parseElement: (el) => {
                // Get title
                const titleEl = el.querySelector('[data-slnm-ihg="AmbassadorWeekendNightsCardTitleSID"]');
                const name = titleEl ? titleEl.textContent.trim() : 'Ambassador Complimentary Weekend Night';
                
                // Get expiration date
                const dateEl = el.querySelector('[data-slnm-ihg="AmbassadorWeekendNightsWalletCardLink"]');
                let expirationDate = null;
                if (dateEl) {
                    // Parse "02/01/2026" format to "2026-02-01"
                    const dateText = dateEl.textContent.trim();
                    const match = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (match) {
                        expirationDate = `${match[3]}-${match[1]}-${match[2]}`;
                    }
                }
                
                return {
                    external_id: `IHG-AMB-WEEKEND-${expirationDate || 'unknown'}`,
                    type_slug: 'free_night',
                    name: name,
                    brand: 'IHG',
                    expiration_date: expirationDate,
                    notes: 'Ambassador membership benefit'
                };
            }
        }
    };

    // State for inventory interceptors
    let inventoryItems = null; // Array of parsed inventory items
    let inventoryConfig = null;
    let inventoryDomConfig = null; // For DOM-based inventory

    // Helper to merge inventory items (for sites with multiple sources like IHG)
    function mergeInventoryItems(newItems) {
        if (!inventoryItems) {
            inventoryItems = newItems;
        } else {
            // Merge, deduping by external_id
            const existingIds = new Set(inventoryItems.map(i => i.external_id));
            for (const item of newItems) {
                if (!existingIds.has(item.external_id)) {
                    inventoryItems.push(item);
                    existingIds.add(item.external_id);
                }
            }
        }
        return inventoryItems;
    }

    function setupSpecialApiInterceptors() {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        for (const [key, config] of Object.entries(SPECIAL_API_CONFIGS)) {
            if (hostname.includes(config.domain) && config.pathPattern.test(pathname)) {
                console.log('CardTool: Setting up special API interceptor for', config.name);
                specialApiConfig = config;
                interceptSpecialApi(config);
                return true;
            }
        }
        return false;
    }

    function interceptSpecialApi(config) {
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const cardtoolMarker = '__cardtool_special_api__';
        
        // Intercept XMLHttpRequest
        const origOpen = targetWindow.XMLHttpRequest.prototype.open;
        const origSend = targetWindow.XMLHttpRequest.prototype.send;
        
        if (origOpen[cardtoolMarker]) {
            console.log('CardTool: Special API interceptor already installed');
            return;
        }

        const patchedOpen = function(method, url, async, user, pass) {
            this._cardtool_special_url = url;
            return origOpen.apply(this, arguments);
        };
        patchedOpen[cardtoolMarker] = true;
        
        try {
            Object.defineProperty(targetWindow.XMLHttpRequest.prototype, 'open', {
                value: patchedOpen,
                writable: false,
                configurable: true
            });
        } catch (e) {
            targetWindow.XMLHttpRequest.prototype.open = patchedOpen;
        }

        const patchedSend = targetWindow.XMLHttpRequest.prototype.send;
        targetWindow.XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const url = xhr._cardtool_special_url || '';

            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    if (config.apiPattern.test(url)) {
                        console.log('CardTool: ✓ Intercepted special API call:', url.substring(0, 80));
                        try {
                            const data = JSON.parse(xhr.responseText);
                            const results = config.parseResponse(data);
                            if (results && results.length > 0) {
                                console.log('CardTool: Found', results.length, 'balance(s) from API');
                                specialApiBalances = results;
                                showMultipleBalancesFound(results);
                            }
                        } catch (e) {
                            console.warn('CardTool: Failed to parse special API response', e);
                        }
                    }
                }
            });

            return origSend.apply(this, arguments);
        };

        console.log('CardTool: Special API XHR interceptor installed for', config.name);
        
        // Also intercept Fetch API
        const origFetch = targetWindow.fetch;
        targetWindow.fetch = async function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            const response = await origFetch.apply(this, arguments);
            
            if (config.apiPattern.test(url) && response.ok) {
                console.log('CardTool: ✓ Intercepted special Fetch call:', url.substring(0, 80));
                try {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();
                    const results = config.parseResponse(data);
                    if (results && results.length > 0) {
                        console.log('CardTool: Found', results.length, 'balance(s) from Fetch API');
                        specialApiBalances = results;
                        showMultipleBalancesFound(results);
                    }
                } catch (e) {
                    console.warn('CardTool: Failed to parse special Fetch response', e);
                }
            }
            
            return response;
        };

        console.log('CardTool: Special API Fetch interceptor installed for', config.name);
    }

    // ============================================
    // INVENTORY API INTERCEPTOR FUNCTIONS
    // ============================================

    function setupInventoryApiInterceptors() {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        console.log('CardTool Inventory: Checking API interceptors for', hostname, pathname);
        
        for (const [key, config] of Object.entries(INVENTORY_API_CONFIGS)) {
            const domainMatch = hostname.includes(config.domain);
            const pathMatch = config.pathPattern.test(pathname);
            console.log('CardTool Inventory: Config', key, '- domain:', domainMatch, 'path:', pathMatch);
            if (domainMatch && pathMatch) {
                console.log('CardTool Inventory: Setting up interceptor for', config.name);
                inventoryConfig = config;
                interceptInventoryApi(config);
                return true;
            }
        }
        return false;
    }

    function interceptInventoryApi(config) {
        try {
            const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const cardtoolMarker = '__cardtool_inventory_api__';
            
            // Intercept XMLHttpRequest
            const origOpen = targetWindow.XMLHttpRequest.prototype.open;
            const origSend = targetWindow.XMLHttpRequest.prototype.send;
            
            // Check if already installed
            if (origOpen && origOpen[cardtoolMarker]) {
                console.log('CardTool Inventory: Interceptor already installed');
                return;
            }

        const patchedOpen = function(method, url, async, user, pass) {
            this._cardtool_inventory_url = url;
            return origOpen.apply(this, arguments);
        };
        patchedOpen[cardtoolMarker] = true;
        
        try {
            Object.defineProperty(targetWindow.XMLHttpRequest.prototype, 'open', {
                value: patchedOpen,
                writable: false,
                configurable: true
            });
        } catch (e) {
            targetWindow.XMLHttpRequest.prototype.open = patchedOpen;
        }

        targetWindow.XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const url = xhr._cardtool_inventory_url || '';

            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    if (config.apiPattern.test(url)) {
                        console.log('CardTool Inventory: Intercepted API call:', url.substring(0, 80));
                        try {
                            const data = JSON.parse(xhr.responseText);
                            const items = config.parseResponse(data);
                            if (items && items.length > 0) {
                                console.log('CardTool Inventory: Found', items.length, 'item(s)');
                                const merged = mergeInventoryItems(items);
                                showInventoryFound(merged);
                            }
                        } catch (e) {
                            console.warn('CardTool Inventory: Failed to parse response', e);
                        }
                    }
                }
            });

            return origSend.apply(this, arguments);
        };

        console.log('CardTool Inventory: XHR interceptor installed for', config.name);
        
        // Also intercept Fetch API
        const origFetch = targetWindow.fetch;
        targetWindow.fetch = async function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            const response = await origFetch.apply(this, arguments);
            
            if (config.apiPattern.test(url) && response.ok) {
                console.log('CardTool Inventory: Intercepted Fetch call:', url.substring(0, 80));
                try {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();
                    const items = config.parseResponse(data);
                    if (items && items.length > 0) {
                        console.log('CardTool Inventory: Found', items.length, 'item(s) from Fetch');
                        const merged = mergeInventoryItems(items);
                        showInventoryFound(merged);
                    }
                } catch (e) {
                    console.warn('CardTool Inventory: Failed to parse Fetch response', e);
                }
            }
            
            return response;
        };

        console.log('CardTool Inventory: Fetch interceptor installed for', config.name);
        } catch (e) {
            console.error('CardTool Inventory: Failed to install interceptor', e);
        }
    }

    // ============================================
    // INVENTORY DOM EXTRACTION FUNCTIONS
    // ============================================

    function setupInventoryDomExtraction() {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        console.log('CardTool Inventory DOM: Checking configs for', hostname, pathname);
        
        for (const [key, config] of Object.entries(INVENTORY_DOM_CONFIGS)) {
            const domainMatch = hostname.includes(config.domain);
            const pathMatch = config.pathPattern.test(pathname);
            console.log('CardTool Inventory DOM: Config', key, '- domain:', domainMatch, 'path:', pathMatch);
            if (domainMatch && pathMatch) {
                console.log('CardTool Inventory DOM: Found matching config for', config.name);
                inventoryDomConfig = config;
                return config;
            }
        }
        return null;
    }

    function extractInventoryFromDom() {
        if (!inventoryDomConfig) {
            console.log('CardTool Inventory DOM: No config found');
            return;
        }

        console.log('CardTool Inventory DOM: Extracting from', inventoryDomConfig.name);
        
        let items = [];
        
        // Check if we should extract from __NEXT_DATA__ (React SSR data)
        if (inventoryDomConfig.extractFromNextData) {
            const nextDataScript = document.getElementById('__NEXT_DATA__');
            if (nextDataScript) {
                try {
                    const nextData = JSON.parse(nextDataScript.textContent);
                    console.log('CardTool Inventory DOM: Found __NEXT_DATA__, parsing...');
                    items = inventoryDomConfig.parseNextData(nextData);
                } catch (e) {
                    console.warn('CardTool Inventory DOM: Failed to parse __NEXT_DATA__', e);
                }
            } else {
                console.log('CardTool Inventory DOM: No __NEXT_DATA__ script found');
            }
        } else {
            // Standard DOM element extraction
            const cards = document.querySelectorAll(inventoryDomConfig.selector);
            
            if (!cards || cards.length === 0) {
                console.log('CardTool Inventory DOM: No award cards found with selector', inventoryDomConfig.selector);
                return;
            }

            console.log('CardTool Inventory DOM: Found', cards.length, 'award card(s)');
            
            for (const card of cards) {
                try {
                    const item = inventoryDomConfig.parseElement(card);
                    if (item && item.external_id) {
                        items.push(item);
                    } else {
                        console.warn('CardTool Inventory DOM: Skipping card without external_id', item);
                    }
                } catch (e) {
                    console.warn('CardTool Inventory DOM: Failed to parse card', e);
                }
            }
        }

        if (items.length > 0) {
            console.log('CardTool Inventory DOM: Extracted', items.length, 'item(s)');
            const merged = mergeInventoryItems(items);
            inventoryConfig = inventoryDomConfig; // Use DOM config as inventory config
            showInventoryFound(merged);
        } else {
            console.log('CardTool Inventory DOM: No items found');
        }
    }

    // Show inventory count in the badge
    function showInventoryFound(items) {
        // Check if badge exists, if not create it
        let badge = document.getElementById('cardtool-badge');
        if (!badge) {
            createBadge();
            badge = document.getElementById('cardtool-badge');
        }

        // Check if this is an inventory-only site (no balance data)
        const isInventoryOnly = currentConfig && currentConfig.inventoryOnly;

        // If we already have a balance displayed, re-render the combined view
        // This handles the case where DOM inventory loads after DOM balance
        if (extractedBalance !== null && !isInventoryOnly) {
            console.log('CardTool Inventory: Re-rendering combined view with balance');
            showBalanceFound(extractedBalance);
            return;
        }

        // Update mini-badge text
        const miniBalance = document.getElementById('cardtool-mini-balance');
        if (miniBalance) {
            if (isInventoryOnly) {
                // For inventory-only, just show the count
                miniBalance.textContent = items.length + ' inv';
            } else {
                // For sites with balances, append to existing
                const currentText = miniBalance.textContent || '';
                if (!currentText.includes('inv')) {
                    miniBalance.textContent = currentText + (currentText ? ' | ' : '') + items.length + ' inv';
                }
            }
        }

        // For inventory-only sites, replace the entire badge content
        if (isInventoryOnly) {
            updateBadgeContent(buildInventorySectionHtml(items, true));
            // Add click handler for sync button
            const syncBtn = document.getElementById('cardtool-inventory-sync-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => handleInventorySync(items));
            }
            return;
        }

        // For sites with balances, add/update inventory section
        const existingInventorySection = document.getElementById('cardtool-inventory-section');
        if (existingInventorySection) {
            existingInventorySection.innerHTML = buildInventorySectionHtml(items, false);
        } else {
            // Append inventory section to badge content
            const badgeContent = document.getElementById('cardtool-badge-content');
            if (badgeContent) {
                const inventoryDiv = document.createElement('div');
                inventoryDiv.id = 'cardtool-inventory-section';
                inventoryDiv.innerHTML = buildInventorySectionHtml(items, false);
                badgeContent.appendChild(inventoryDiv);
            }
        }
        
        // Add click handler for sync button
        const syncBtn = document.getElementById('cardtool-inventory-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => handleInventorySync(items));
        }
    }

    function buildInventorySectionHtml(items, isInventoryOnly = false) {
        // Group items by type for display
        const byType = {};
        for (const item of items) {
            const type = item.type_slug === 'free_night' ? 'Free Nights' : 'Coupons/Upgrades';
            byType[type] = (byType[type] || 0) + 1;
        }
        
        const summaryText = Object.entries(byType)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');

        const brandName = inventoryConfig?.brand || inventoryDomConfig?.brand || 'Inventory';

        // Use consistent row format (value left, label right) like United balances
        if (isInventoryOnly) {
            return `
                <div class="cardtool-multi-balance-row">
                    <span class="cardtool-multi-balance-value">${items.length}</span>
                    <span class="cardtool-multi-balance-name">${brandName} Inventory</span>
                </div>
                <div class="cardtool-inventory-summary" style="text-align: right; margin-bottom: 12px; margin-top: -4px;">${summaryText}</div>
                <button class="cardtool-badge-btn" id="cardtool-inventory-sync-btn">
                    Sync ${items.length} Items to CardTool
                </button>
            `;
        }

        // If showing alongside balances, use divider format
        return `
            <div class="cardtool-inventory-divider"></div>
            <div class="cardtool-multi-balance-row">
                <span class="cardtool-multi-balance-value">${items.length}</span>
                <span class="cardtool-multi-balance-name">${brandName} Inventory</span>
            </div>
            <div class="cardtool-inventory-summary" style="text-align: right; margin-bottom: 10px; margin-top: -4px;">${summaryText}</div>
            <button class="cardtool-badge-btn" id="cardtool-inventory-sync-btn">
                Sync ${items.length} Items to CardTool
            </button>
        `;
    }

    // Sync inventory items to CardTool
    async function handleInventorySync(items) {
        const syncToken = getSyncToken();
        if (!syncToken) {
            showNotLoggedIn();
            return;
        }

        const btn = document.getElementById('cardtool-inventory-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }

        try {
            await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${CARDTOOL_URL}/api/inventory/sync`,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-sync-token': syncToken
                    },
                    data: JSON.stringify({ items }),
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (response.status === 200 && data.success) {
                                console.log('CardTool Inventory: Synced', data.synced, 'items (', data.created, 'new,', data.updated, 'updated)');
                                showToast(`Synced ${data.synced} inventory items (${data.created} new, ${data.updated} updated)`);
                                if (btn) {
                                    btn.textContent = 'Synced!';
                                    btn.style.background = '#22c55e';
                                }
                                resolve(data);
                            } else {
                                console.error('CardTool Inventory: Sync failed', data.error);
                                showToast(data.error || 'Sync failed', true);
                                if (btn) {
                                    btn.disabled = false;
                                    btn.textContent = `Sync ${items.length} Items to CardTool`;
                                }
                                reject(new Error(data.error));
                            }
                        } catch (e) {
                            console.error('CardTool Inventory: Failed to parse response', e);
                            reject(e);
                        }
                    },
                    onerror: function(error) {
                        console.error('CardTool Inventory: Request failed', error);
                        showToast('Network error - please try again', true);
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = `Sync ${items.length} Items to CardTool`;
                        }
                        reject(error);
                    }
                });
            });
        } catch (e) {
            console.error('CardTool Inventory: Sync error', e);
        }
    }

    // Show multiple balances in the badge (e.g., miles + TravelBank)
    function showMultipleBalancesFound(balances) {
        // Set flag to prevent DOM detection from overwriting
        hasMultiBalanceData = true;
        
        // Build the balance display HTML
        const balanceRowsHtml = balances.map((bal, idx) => {
            const formattedBalance = bal.format === 'dollars' 
                ? '$' + bal.balance.toLocaleString()
                : bal.balance.toLocaleString();
            return `
                <div class="cardtool-multi-balance-row" data-idx="${idx}">
                    <span class="cardtool-multi-balance-value">${formattedBalance}</span>
                    <span class="cardtool-multi-balance-name">${bal.name}</span>
                </div>
            `;
        }).join('');

        // Update the mini-balance for minimized state (show primary balance)
        const miniBalance = document.getElementById('cardtool-mini-balance');
        if (miniBalance) {
            const primaryBal = balances[0];
            const miniText = primaryBal.format === 'dollars'
                ? '$' + primaryBal.balance.toLocaleString()
                : primaryBal.balance.toLocaleString();
            miniBalance.textContent = miniText + (balances.length > 1 ? ' +' + (balances.length - 1) : '');
        }

        const syncBtnText = balances.length > 1 
            ? `Sync All ${balances.length} Balances to CardTool`
            : 'Sync to CardTool';
        
        // Build expiration inputs for each balance
        const expirationRowsHtml = balances.map((bal, idx) => {
            const shortName = bal.name.split(' ').pop(); // "United MileagePlus" -> "MileagePlus"
            return `
                <div class="cardtool-option-row">
                    <label class="cardtool-option-label" for="cardtool-expiration-${idx}">${shortName} expires</label>
                    <input type="date" class="cardtool-date-input" id="cardtool-expiration-${idx}" value="${bal.expiration || ''}">
                </div>
            `;
        }).join('');
        
        updateBadgeContent(`
            <div class="cardtool-multi-balances">
                ${balanceRowsHtml}
            </div>
            <div id="cardtool-player-container"></div>
            <div class="cardtool-options-toggle" id="cardtool-options-toggle">▼ Options</div>
            <div class="cardtool-options" id="cardtool-options" style="display: none;">
                ${expirationRowsHtml}
            </div>
            <button class="cardtool-badge-btn" id="cardtool-sync-btn">
                ${syncBtnText}
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

        document.getElementById('cardtool-sync-btn').addEventListener('click', () => handleMultiSync(balances));

        // Load players
        loadPlayers();
        
        // Store for single-balance compatibility
        extractedBalance = balances[0].balance;
        currentConfig = {
            name: balances[0].name,
            currencyCode: balances[0].currencyCode,
            balancePageUrl: window.location.href
        };
    }

    // Sync multiple balances
    async function handleMultiSync(balances) {
        const syncToken = getSyncToken();
        if (!syncToken) {
            showNotLoggedIn();
            return;
        }

        const btn = document.getElementById('cardtool-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }

        // Get selected player and remember it
        const playerSelect = document.getElementById('cardtool-player-select');
        const playerNumber = playerSelect ? parseInt(playerSelect.value) : 1;
        GM_setValue('lastPlayerNumber', playerNumber);

        let successCount = 0;
        let lastError = null;

        for (let idx = 0; idx < balances.length; idx++) {
            const bal = balances[idx];
            
            // Get expiration from the UI (which may have been edited by user)
            const expirationInput = document.getElementById(`cardtool-expiration-${idx}`);
            const expirationDate = expirationInput && expirationInput.value ? expirationInput.value : null;
            
            try {
                await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `${CARDTOOL_URL}/api/points/import`,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-sync-token': syncToken
                        },
                        data: JSON.stringify({
                            currencyCode: bal.currencyCode,
                            balance: bal.balance,
                            playerNumber: playerNumber,
                            additive: false,
                            expirationDate: expirationDate
                        }),
                        onload: function(response) {
                            if (response.status === 200) {
                                console.log('CardTool: Synced', bal.name, ':', bal.balance);
                                successCount++;
                                resolve();
                            } else {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    reject(new Error(data.error || 'Sync failed'));
                                } catch {
                                    reject(new Error('Sync failed'));
                                }
                            }
                        },
                        onerror: function(error) {
                            reject(new Error('Network error'));
                        }
                    });
                });
            } catch (e) {
                console.error('CardTool: Failed to sync', bal.name, e);
                lastError = e.message;
            }
        }

        if (btn) {
            btn.disabled = false;
            if (successCount === balances.length) {
                btn.textContent = 'All Synced!';
                btn.style.background = '#059669';
                showToast(`Synced ${successCount} balance${successCount > 1 ? 's' : ''}`, false);
            } else if (successCount > 0) {
                btn.textContent = `Synced ${successCount}/${balances.length}`;
                btn.style.background = '#f59e0b';
                showToast(`Synced ${successCount}/${balances.length} balances`, true);
            } else {
                btn.textContent = 'Sync Failed';
                btn.style.background = '#dc2626';
                showToast(lastError || 'Failed to sync', true);
            }

            setTimeout(() => {
                btn.textContent = balances.length > 1 
                    ? `Sync All ${balances.length} Balances to CardTool`
                    : 'Sync to CardTool';
                btn.style.background = '';
            }, 3000);
        }
    }

    // ============================================
    // XHR INTERCEPTOR FOR CREDIT BUREAUS
    // ============================================

    function setupCreditReportInterceptor() {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        // Determine which bureau we're on
        for (const [bureauKey, config] of Object.entries(CREDIT_BUREAU_CONFIGS)) {
            // Support both single domain and array of domains
            const domains = config.domains || [config.domain];
            const domainMatch = domains.some(d => hostname.includes(d.replace('www.', '')));
            
            if (domainMatch) {
                currentBureau = bureauKey;
                console.log('CardTool Credit: Detected bureau:', config.name);
                
                if (config.useHtmlScraping) {
                    // For TransUnion, use HTML scraping instead of XHR interception
                    // Must wait for DOM to be ready before showing badge
                    const startHtmlScraping = () => {
                        creditReportData = { scores: [], accounts: [], inquiries: [], reportDate: null, status: 'scanning' };
                        showCreditBadge();
                        setTimeout(() => tryScrapeCreditReport(bureauKey), 3000);
                    };
                    
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', startHtmlScraping);
                    } else {
                        startHtmlScraping();
                    }
                } else {
                    // Set up XHR interception for Equifax and Experian
                    interceptXHR(config);
                }
                return true;
            }
        }
        
        // Check score-only sources
        const hash = window.location.hash.toLowerCase();
        
        console.log('CardTool Credit: Checking score sources. Hostname:', hostname, 'Path:', pathname, 'Hash:', hash);
        
        for (const [sourceKey, config] of Object.entries(SCORE_SOURCE_CONFIGS)) {
            const domainMatch = hostname.includes(config.domain.replace('www.', ''));
            const pathMatch = !config.pathPattern || config.pathPattern.test(pathname);
            const hashMatch = !config.hashPattern || config.hashPattern.test(hash);
            const notExcluded = !config.excludePathPattern || !config.excludePathPattern.test(pathname);
            
            if (domainMatch) {
                console.log('CardTool Credit: Domain match for', config.name, '- pathMatch:', pathMatch, 'hashMatch:', hashMatch, 'notExcluded:', notExcluded);
            }
            
            if (domainMatch && pathMatch && hashMatch && notExcluded) {
                currentBureau = sourceKey; // Use source key as identifier
                console.log('CardTool Credit: Detected score source:', config.name);
                
                // Always install interceptors if apiPatterns exist
                if (config.apiPatterns) {
                    interceptXHR(config, true); // true = scoreOnly mode (includes Fetch interception)
                }
                
                // Also try page parsing if configured
                if (config.parseFromPage) {
                    setTimeout(() => parseScoreFromPage(sourceKey, config), 2000);
                }
                return true;
            }
        }
        console.log('CardTool Credit: No score source matched');
        return false;
    }
    
    // Parse score data embedded in page HTML
    function parseScoreFromPage(sourceKey, config, retryCount = 0) {
        console.log('CardTool Credit: Parsing score from page for', config.name, '(attempt', retryCount + 1, ')');
        
        // Check if this page matches the parseFromPagePattern (if specified)
        if (config.parseFromPagePattern && !config.parseFromPagePattern.test(window.location.pathname)) {
            console.log('CardTool Credit: Page does not match parseFromPagePattern, skipping');
            return;
        }
        
        // Use unsafeWindow to access the real page's window object
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        
        try {
            let payload = null;
            let parsed = null;
            
            // Credit Karma embeds historical data in page HTML as KPLLineGraphDataPoint
            if (sourceKey === 'creditkarma') {
                console.log('CardTool Credit: Looking for CK embedded data on /credit-health page');
                const html = document.documentElement.innerHTML;
                
                // Determine bureau from URL
                const bureauMatch = window.location.pathname.match(/credit-health\/(equifax|transunion)/i);
                const bureau = bureauMatch ? bureauMatch[1].toLowerCase() : null;
                
                if (!bureau) {
                    console.log('CardTool Credit: Could not determine bureau from URL');
                    return;
                }
                
                // Find all KPLLineGraphDataPoint entries with scores (yValue 300-850)
                const dataPointRegex = /"xValueLabel"\s*:\s*"([^"]+)"\s*,\s*"yValueLabel"\s*:\s*"(\d{3})"/g;
                const scores = [];
                const seenDates = new Set();
                let match;
                
                while ((match = dataPointRegex.exec(html)) !== null) {
                    const dateStr = match[1]; // e.g., "Jan 2, 2026"
                    const score = parseInt(match[2], 10);
                    
                    if (score >= 300 && score <= 850) {
                        // Parse date like "Jan 2, 2026" to ISO format
                        const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
                        if (dateMatch) {
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const month = monthNames.indexOf(dateMatch[1].substring(0, 3));
                            if (month !== -1) {
                                const isoDate = `${dateMatch[3]}-${String(month + 1).padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
                                const key = `${isoDate}-${score}`;
                                if (!seenDates.has(key)) {
                                    seenDates.add(key);
                                    scores.push({
                                        type: 'vantage_3',
                                        score: score,
                                        date: isoDate,
                                        bureau: bureau
                                    });
                                    console.log('CardTool Credit: Found CK historical score:', score, 'on', isoDate, 'for', bureau);
                                }
                            }
                        }
                    }
                }
                
                if (scores.length > 0) {
                    parsed = {
                        scores: scores,
                        accounts: [],
                        inquiries: [],
                        reportDate: null,
                        scoreOnly: true
                    };
                } else {
                    console.log('CardTool Credit: No historical scores found in CK page');
                }
            }
            
            // Wells Fargo stores data in window._wfPayload
            else if (sourceKey === 'wellsfargo') {
                console.log('CardTool Credit: Looking for _wfPayload on', typeof unsafeWindow !== 'undefined' ? 'unsafeWindow' : 'window');
                if (targetWindow._wfPayload) {
                    payload = targetWindow._wfPayload;
                    console.log('CardTool Credit: Found _wfPayload:', JSON.stringify(payload).substring(0, 200));
                } else {
                    // Also try to find it in the HTML source
                    const scripts = document.querySelectorAll('script');
                    for (const script of scripts) {
                        const content = script.textContent || '';
                        const match = content.match(/window\._wfPayload\s*=\s*({[\s\S]*?});/);
                        if (match) {
                            try {
                                payload = JSON.parse(match[1]);
                                console.log('CardTool Credit: Found _wfPayload in script tag');
                                break;
                            } catch (e) {
                                console.log('CardTool Credit: Failed to parse _wfPayload from script');
                            }
                        }
                    }
                    if (!payload) {
                        console.log('CardTool Credit: _wfPayload not found yet');
                    }
                }
                
                if (payload) {
                    parsed = config.parseResponse(payload, window.location.href);
                }
            }
            
            if (parsed && parsed.scores && parsed.scores.length > 0) {
                creditReportData = {
                    ...parsed,
                    status: 'ready'
                };
                showCreditBadge();
                console.log('CardTool Credit: Parsed', parsed.scores.length, 'scores from page');
            } else if (!parsed) {
                // Retry up to 5 times with increasing delays
                if (retryCount < 5) {
                    const delay = (retryCount + 1) * 2000;
                    console.log('CardTool Credit: Retrying in', delay, 'ms');
                    setTimeout(() => parseScoreFromPage(sourceKey, config, retryCount + 1), delay);
                } else {
                    console.log('CardTool Credit: Could not find embedded payload after retries');
                }
            } else {
                console.log('CardTool Credit: No scores found in page payload');
            }
        } catch (e) {
            console.warn('CardTool Credit: Error parsing page data', e);
        }
    }

    function interceptXHR(config) {
        // Use unsafeWindow to access the real window object (bypasses site sandboxing)
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        console.log('CardTool Credit: Using', typeof unsafeWindow !== 'undefined' ? 'unsafeWindow' : 'window', 'for interceptors');
        
        // Store reference to our patched functions to detect if they get overwritten
        const cardtoolMarker = '__cardtool_intercepted__';
        
        // Intercept XMLHttpRequest
        const origOpen = targetWindow.XMLHttpRequest.prototype.open;
        const origSend = targetWindow.XMLHttpRequest.prototype.send;
        
        // Skip if already intercepted
        if (origOpen[cardtoolMarker]) {
            console.log('CardTool Credit: XHR already intercepted, skipping');
            return;
        }

        const patchedOpen = function(method, url, async, user, pass) {
            this._cardtool_url = url;
            return origOpen.apply(this, arguments);
        };
        patchedOpen[cardtoolMarker] = true;
        
        // Try to make the interceptor non-overwritable
        try {
            Object.defineProperty(targetWindow.XMLHttpRequest.prototype, 'open', {
                value: patchedOpen,
                writable: false,
                configurable: true
            });
        } catch (e) {
            // Fall back to simple assignment if defineProperty fails
            targetWindow.XMLHttpRequest.prototype.open = patchedOpen;
        }

        targetWindow.XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const url = xhr._cardtool_url || '';

            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    // Log all XHR URLs for debugging (only first 100 chars)
                    if (url && !url.includes('taboola') && !url.includes('doubleclick') && !url.includes('google')) {
                        console.log('CardTool Credit: XHR completed:', url.substring(0, 100));
                    }
                    
                    // Check if this URL matches any of our API patterns
                    const matchesPattern = config.apiPatterns.some(pattern => pattern.test(url));
                    
                    if (matchesPattern) {
                        console.log('CardTool Credit: ✓ Intercepted XHR call:', url);
                        try {
                            // Handle HTML responses if configured
                            if (config.parseHtml) {
                                // Pass raw HTML to parser
                                processInterceptedData(xhr.responseText, url, config);
                            } else {
                                const data = JSON.parse(xhr.responseText);
                                processInterceptedData(data, url, config);
                            }
                        } catch (e) {
                            console.warn('CardTool Credit: Failed to parse XHR response', e);
                        }
                    }
                }
            });

            return origSend.apply(this, arguments);
        };

        console.log('CardTool Credit: XHR interceptor installed for', config.name);
        
        // Also intercept Fetch API (used by modern sites like Credit Karma)
        const origFetch = targetWindow.fetch;
        targetWindow.fetch = async function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            const response = await origFetch.apply(this, arguments);
            
            // Log all Fetch URLs for debugging (only first 100 chars)
            if (url && !url.includes('taboola') && !url.includes('doubleclick') && !url.includes('google')) {
                console.log('CardTool Credit: Fetch completed:', url.substring(0, 100));
            }
            
            // Check if this URL matches any of our API patterns
            const matchesPattern = config.apiPatterns.some(pattern => pattern.test(url));
            
            if (matchesPattern && response.ok) {
                console.log('CardTool Credit: ✓ Intercepted Fetch call:', url);
                try {
                    // Clone the response so we can read it without consuming it
                    const clonedResponse = response.clone();
                    // Handle HTML responses if configured
                    if (config.parseHtml) {
                        const text = await clonedResponse.text();
                        processInterceptedData(text, url, config);
                    } else {
                        const data = await clonedResponse.json();
                        processInterceptedData(data, url, config);
                    }
                } catch (e) {
                    console.warn('CardTool Credit: Failed to parse Fetch response', e);
                }
            }
            
            return response;
        };
        
        console.log('CardTool Credit: Fetch interceptor installed for', config.name);
        
        // Set up periodic reinstallation check (some sites overwrite fetch/XHR after page load)
        let reinstallCount = 0;
        const maxReinstalls = 3;
        const reinstallInterval = setInterval(() => {
            if (reinstallCount >= maxReinstalls) {
                clearInterval(reinstallInterval);
                return;
            }
            
            // Check if our XHR interceptor was overwritten
            if (!targetWindow.XMLHttpRequest.prototype.open[cardtoolMarker]) {
                console.log('CardTool Credit: XHR interceptor was overwritten, reinstalling...');
                reinstallCount++;
                interceptXHR(config);
                clearInterval(reinstallInterval);
            }
        }, 1000);
    }

    function processInterceptedData(data, url, config) {
        try {
            const parsed = config.parseResponse(data, url);
            
            // Check for multi-bureau data (like myFICO full reports) or regular data
            const hasMultiBureauData = parsed?.bureauData && Object.keys(parsed.bureauData).length > 0;
            const hasRegularData = parsed?.accounts?.length > 0 || parsed?.scores?.length > 0 || parsed?.inquiries?.length > 0;
            
            if (parsed && (hasMultiBureauData || hasRegularData)) {
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
                // Track if this is a score-only source (for multi-bureau score handling)
                if (parsed.scoreOnly) {
                    creditReportData.scoreOnly = true;
                }
                // Track multi-bureau data (like myFICO full reports)
                if (parsed.multiBureau) {
                    creditReportData.multiBureau = true;
                }
                // Only update bureauData if it has actual data (not empty object)
                // This prevents score-only requests from wiping out account data
                if (parsed.bureauData && Object.keys(parsed.bureauData).length > 0) {
                    // Merge with existing bureauData instead of overwriting
                    creditReportData.bureauData = creditReportData.bureauData || {};
                    for (const [bureau, data] of Object.entries(parsed.bureauData)) {
                        if (!creditReportData.bureauData[bureau]) {
                            creditReportData.bureauData[bureau] = data;
                        } else {
                            // Merge accounts and inquiries
                            creditReportData.bureauData[bureau].accounts = [
                                ...(creditReportData.bureauData[bureau].accounts || []),
                                ...(data.accounts || [])
                            ];
                            creditReportData.bureauData[bureau].inquiries = [
                                ...(creditReportData.bureauData[bureau].inquiries || []),
                                ...(data.inquiries || [])
                            ];
                        }
                    }
                }
                
                // Store raw data for debugging (but not the full raw data which may contain PII)
                creditReportData.rawData[url] = { parsed: true, timestamp: Date.now() };
                
                // Calculate total counts for logging
                let totalAccounts = creditReportData.accounts.length;
                let totalInquiries = creditReportData.inquiries.length;
                if (creditReportData.bureauData) {
                    totalAccounts = Object.values(creditReportData.bureauData)
                        .reduce((sum, bd) => sum + (bd.accounts?.length || 0), 0);
                    totalInquiries = Object.values(creditReportData.bureauData)
                        .reduce((sum, bd) => sum + (bd.inquiries?.length || 0), 0);
                }
                
                console.log('CardTool Credit: Data collected -', 
                    creditReportData.scores.length, 'scores,',
                    totalAccounts, 'accounts,',
                    totalInquiries, 'inquiries',
                    creditReportData.multiBureau ? '(multi-bureau)' : '');
                
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

        // Extract report date from displayReportDate field (may be in overview, top level, or creditFileInfo)
        const reportDateStr = data.overview?.displayReportDate
            || data.displayReportDate 
            || data.creditFileInfo?.[0]?.displayReportDate
            || data.dateOfReport;
        if (reportDateStr) {
            result.reportDate = parseEquifaxDate(reportDateStr);
            console.log('CardTool Credit: Extracted Equifax report date:', result.reportDate);
        }

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

        // Parse hard inquiries from Equifax API
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
        
        // Parse soft inquiries (account review, promotional) from Equifax
        const softInquiryArrays = [
            { arr: data.softInquiries, type: 'soft' },
            { arr: data.accountReviewInquiries, type: 'account_review' },
            { arr: data.promotionalInquiries, type: 'promotional' }
        ];
        
        for (const { arr, type } of softInquiryArrays) {
            if (arr && Array.isArray(arr)) {
                for (const inq of arr) {
                    const company = inq.companyName || inq.creditorName || inq.subscriberName || 'Unknown';
                    const date = parseEquifaxDate(inq.displayDateReported || inq.displayDate || inq.inquiryDate);
                    if (date) {
                        result.inquiries.push({
                            company: company,
                            date: date,
                            type: type
                        });
                    }
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
            
            // Extract report date from top-level dateOfReport field
            if (data.dateOfReport) {
                result.reportDate = parseExperianDate(data.dateOfReport);
                console.log('CardTool Credit: Extracted Experian report date:', result.reportDate);
            }
            
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
            
            // Parse hard inquiries - creditInquiries array
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
                console.log('CardTool Credit: Parsed', result.inquiries.length, 'hard inquiries from forcereload');
            }
            
            // Parse soft inquiries from Experian (accountReviewInquiries, consumerStatementInquiries)
            const experianSoftInquiryArrays = [
                { arr: creditFile.accountReviewInquiries, type: 'account_review' },
                { arr: creditFile.consumerStatementInquiries, type: 'soft' },
                { arr: creditFile.promotionalInquiries, type: 'promotional' }
            ];
            
            let softCount = 0;
            for (const { arr, type } of experianSoftInquiryArrays) {
                if (arr && Array.isArray(arr)) {
                    for (const inq of arr) {
                        if (!inq) continue;
                        const company = inq.companyName || inq.creditorInfo?.name || inq.subscriberName || 'Unknown';
                        const date = parseExperianDate(inq.dateOfInquiry || inq.inquiryDate);
                        if (date) {
                            result.inquiries.push({
                                company: company,
                                date: date,
                                type: type
                            });
                            softCount++;
                        }
                    }
                }
            }
            if (softCount > 0) {
                console.log('CardTool Credit: Parsed', softCount, 'soft inquiries from forcereload');
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
                highBalanceCents: parseDollarsToCents(acct.highBalance || acct.highCredit),
                balanceCents: parseDollarsToCents(acct.balance || acct.currentBalance),
                monthlyPaymentCents: parseDollarsToCents(acct.monthlyPayment || acct.scheduledPayment),
                accountType: mapExperianAccountType(acct.accountType || acct.portfolioType),
                loanType: mapExperianLoanType(acct.industryCode || acct.accountType),
                responsibility: mapExperianResponsibility(acct.ecoaDesignator || acct.responsibility),
                paymentStatus: acct.paymentStatus || null
            });
        }

        // Parse hard inquiries from legacy format
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
        
        // Parse soft inquiries from legacy format
        const legacySoftArrays = [
            { arr: data.softInquiries, type: 'soft' },
            { arr: data.accountReviewInquiries, type: 'account_review' },
            { arr: data.promotionalInquiries, type: 'promotional' }
        ];
        
        for (const { arr, type } of legacySoftArrays) {
            if (arr && Array.isArray(arr)) {
                for (const inq of arr) {
                    if (!inq) continue;
                    const date = parseExperianDate(inq.inquiryDate || inq.date);
                    if (date) {
                        result.inquiries.push({
                            company: inq.subscriberName || inq.creditorName || 'Unknown',
                            date: date,
                            type: type
                        });
                    }
                }
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

    // ============================================
    // SCORE-ONLY SOURCE PARSERS
    // ============================================

    // Credit Karma - VantageScore 3 for TransUnion and Equifax
    function parseCreditKarmaResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Credit Karma response', url);
        
        try {
            // Helper to convert Unix timestamp to date string
            const timestampToDate = (ts) => {
                if (!ts) return new Date().toISOString().split('T')[0];
                // Credit Karma uses seconds, not milliseconds
                const date = new Date(ts * 1000);
                return date.toISOString().split('T')[0];
            };
            
            // Credit Karma GraphQL response - look for FabricScoreDialsEntry
            // Structure: data.*.components[].entries[].creditScores.{transunion, equifax}
            const findScores = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                
                // Check if this object has creditScores with transunion/equifax
                if (obj.creditScores) {
                    const scores = obj.creditScores;
                    
                    // TransUnion score
                    if (scores.transunion && scores.transunion.value) {
                        const scoreValue = scores.transunion.value;
                        if (scoreValue >= 300 && scoreValue <= 850) {
                            result.scores.push({
                                type: 'vantage_3',
                                score: scoreValue,
                                date: timestampToDate(scores.transunion.timestamp),
                                bureau: 'transunion'
                            });
                            console.log('CardTool Credit: Found TU score:', scoreValue);
                        }
                    }
                    
                    // Equifax score
                    if (scores.equifax && scores.equifax.value) {
                        const scoreValue = scores.equifax.value;
                        if (scoreValue >= 300 && scoreValue <= 850) {
                            result.scores.push({
                                type: 'vantage_3',
                                score: scoreValue,
                                date: timestampToDate(scores.equifax.timestamp),
                                bureau: 'equifax'
                            });
                            console.log('CardTool Credit: Found EQ score:', scoreValue);
                        }
                    }
                    return; // Found creditScores, no need to recurse further in this branch
                }
                
                // Recursively search arrays and objects
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        findScores(item);
                    }
                } else {
                    for (const key of Object.keys(obj)) {
                        findScores(obj[key]);
                    }
                }
            };
            
            findScores(data);
            
            // Deduplicate scores (same bureau + type)
            const seen = new Set();
            result.scores = result.scores.filter(s => {
                const key = `${s.bureau}-${s.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from Credit Karma');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Credit Karma response', e);
        }
        
        return result;
    }

    // myFICO - FICO scores and full credit reports (Equifax free tier available)
    function parseMyFicoResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, bureauData: {} };
        console.log('CardTool Credit: Parsing myFICO response', url);
        
        try {
            // Helper to map datasource to bureau
            const mapBureau = (ds) => {
                if (!ds) return null;
                const lower = ds.toLowerCase();
                if (lower === 'efx' || lower.includes('equi')) return 'equifax';
                if (lower === 'exp' || lower.includes('exper')) return 'experian';
                if (lower === 'tu' || lower.includes('trans')) return 'transunion';
                return null;
            };
            
            // Helper to parse myFICO date format (2026-01-12T20:41:35.840 or "November 13, 2025")
            const parseDate = (dateStr) => {
                if (!dateStr) return null;
                // ISO format
                if (dateStr.includes('T')) {
                    return dateStr.split('T')[0];
                }
                // "November 13, 2025" format
                const parsed = new Date(dateStr);
                if (!isNaN(parsed.getTime())) {
                    return parsed.toISOString().split('T')[0];
                }
                return null;
            };
            
            // Helper to map account status
            const mapStatus = (condition) => {
                if (!condition) return 'unknown';
                const lower = condition.toLowerCase();
                if (lower === 'open' || lower === 'active') return 'open';
                if (lower === 'closed') return 'closed';
                if (lower.includes('paid')) return 'paid';
                return 'unknown';
            };
            
            // Helper to map account type
            const mapAccountType = (acctType, subType) => {
                const type = (acctType || '').toLowerCase();
                const sub = (subType || '').toLowerCase();
                if (type === 'revolving' || sub.includes('credit card')) return 'revolving';
                if (type === 'installment' || sub.includes('loan')) return 'installment';
                if (sub.includes('mortgage')) return 'mortgage';
                return 'other';
            };
            
            // Helper to map loan type to valid enum values
            const mapLoanType = (loanType, subType) => {
                const type = (loanType || '').toLowerCase();
                const sub = (subType || '').toLowerCase();
                if (type.includes('credit card') || sub.includes('credit card')) return 'credit_card';
                if (type.includes('charge') || sub.includes('charge')) return 'charge_card';
                if (type.includes('auto') || sub.includes('auto')) return 'auto_loan';
                if (type.includes('mortgage') || sub.includes('mortgage')) return 'mortgage';
                if (type.includes('student') || sub.includes('student')) return 'student_loan';
                if (type.includes('personal') || sub.includes('personal')) return 'personal_loan';
                if (type.includes('home equity') || sub.includes('heloc') || sub.includes('home equity')) return 'home_equity';
                if (type.includes('retail') || sub.includes('retail')) return 'retail';
                return 'other';
            };
            
            // Helper to map responsibility to valid enum values
            const mapResponsibility = (holder) => {
                const h = (holder || '').toLowerCase();
                if (h.includes('individual') || h.includes('borrower') || h === 'i') return 'individual';
                if (h.includes('joint') || h === 'j') return 'joint';
                if (h.includes('authorized') || h === 'a') return 'authorized_user';
                if (h.includes('cosign') || h === 'c') return 'cosigner';
                return 'unknown';
            };
            
            // Helper to map myFICO score type to our internal type
            const mapScoreType = (scoreType, scoreVersion) => {
                const type = (scoreType || '').toUpperCase();
                // Lowercase version for consistency (10T -> 10t)
                const version = (scoreVersion || '8').toString().toLowerCase();
                
                if (type === 'AUTO') {
                    return `fico_auto_${version}`;
                } else if (type === 'BANKCARD') {
                    return `fico_bankcard_${version}`;
                } else if (type === 'MORTGAGE') {
                    // Mortgage scores use base FICO versions (2, 4, 5, 9, 10, 10t)
                    return `fico_${version}`;
                } else {
                    // Default FICO 8
                    return version === '9' ? 'fico_9' : 'fico_8';
                }
            };
            
            // =============================================
            // Format 1: Full credit report (/v4/users/reports/1b/{reportId})
            // Structure has report_date, scores.fico_scores.{efx,tu,exp}, accounts[].{efx,tu,exp}, inquiries.{efx,tu,exp}
            // Paid accounts also have merged_other_scores with additional score types
            // =============================================
            if (data.report_date && (data.scores || data.accounts)) {
                console.log('CardTool Credit: Parsing myFICO full report format');
                result.reportDate = parseDate(data.report_date);
                
                // Parse FICO 8 scores from scores.fico_scores.{efx,tu,exp}
                if (data.scores?.fico_scores) {
                    for (const [bureauKey, scoreData] of Object.entries(data.scores.fico_scores)) {
                        const bureau = mapBureau(bureauKey);
                        if (!bureau || !scoreData?.score) continue;
                        
                        result.scores.push({
                            type: 'fico_8',
                            score: scoreData.score,
                            date: parseDate(scoreData.score_date) || result.reportDate,
                            bureau: bureau
                        });
                        console.log('CardTool Credit: Found myFICO FICO 8 score:', scoreData.score, bureau);
                    }
                }
                
                // Parse additional scores from merged_other_scores (for paid users)
                // Structure: { auto: [{efx:{score,score_version,...}, tu:{...}, exp:{...}}, ...], bankcard: [...], mortgage: [...], newly_released: [...] }
                if (data.scores?.merged_other_scores) {
                    const categories = ['auto', 'bankcard', 'mortgage', 'newly_released'];
                    
                    for (const category of categories) {
                        const scoreRows = data.scores.merged_other_scores[category];
                        if (!Array.isArray(scoreRows)) continue;
                        
                        for (const scoreRow of scoreRows) {
                            // Each row has bureau keys (efx, tu, exp) with score data
                            for (const [bureauKey, scoreData] of Object.entries(scoreRow)) {
                                const bureau = mapBureau(bureauKey);
                                // Only process if there's an actual score value (paid users)
                                if (!bureau || typeof scoreData?.score !== 'number') continue;
                                
                                const scoreType = mapScoreType(scoreData.score_type, scoreData.score_version);
                                
                                // Validate score is in reasonable range
                                const minScore = scoreData.score_min || 250;
                                const maxScore = scoreData.score_max || 900;
                                if (scoreData.score < minScore || scoreData.score > maxScore) continue;
                                
                                result.scores.push({
                                    type: scoreType,
                                    score: scoreData.score,
                                    date: parseDate(scoreData.score_date) || result.reportDate,
                                    bureau: bureau
                                });
                                console.log('CardTool Credit: Found myFICO', scoreType, 'score:', scoreData.score, bureau);
                            }
                        }
                    }
                }
                
                // Parse accounts - each account object has bureau keys (efx, tu, exp) with nested data
                if (data.accounts && Array.isArray(data.accounts)) {
                    for (const acctGroup of data.accounts) {
                        for (const [bureauKey, acctData] of Object.entries(acctGroup)) {
                            const bureau = mapBureau(bureauKey);
                            if (!bureau || !acctData) continue;
                            
                            const profile = acctData.profile || {};
                            const status = acctData.status || {};
                            const terms = acctData.terms_and_remarks || {};
                            
                            // Initialize bureau data structure if needed
                            if (!result.bureauData[bureau]) {
                                result.bureauData[bureau] = { accounts: [], inquiries: [] };
                            }
                            
                            result.bureauData[bureau].accounts.push({
                                name: profile.company || 'Unknown',
                                numberMasked: profile.account_number || null,
                                creditorName: profile.company || null,
                                status: mapStatus(status.condition),
                                dateOpened: parseDate(profile.date_opened),
                                dateUpdated: parseDate(profile.date_reported),
                                dateClosed: parseDate(status.closed_date),
                                creditLimitCents: terms.credit_limit ? Math.round(terms.credit_limit * 100) : null,
                                highBalanceCents: status.largest_past_balance ? Math.round(status.largest_past_balance * 100) : null,
                                balanceCents: status.balance !== undefined ? Math.round(status.balance * 100) : null,
                                monthlyPaymentCents: terms.scheduled_payment_amount ? Math.round(terms.scheduled_payment_amount * 100) : null,
                                accountType: mapAccountType(profile.account_type, profile.account_sub_type),
                                loanType: mapLoanType(profile.loan_type, profile.account_sub_type),
                                responsibility: mapResponsibility(profile.account_holder),
                                paymentStatus: status.status || null,
                                bureau: bureau
                            });
                        }
                    }
                }
                
                // Parse inquiries - organized by bureau key
                if (data.inquiries) {
                    for (const [bureauKey, inquiryList] of Object.entries(data.inquiries)) {
                        const bureau = mapBureau(bureauKey);
                        if (!bureau || !Array.isArray(inquiryList)) continue;
                        
                        // Initialize bureau data structure if needed
                        if (!result.bureauData[bureau]) {
                            result.bureauData[bureau] = { accounts: [], inquiries: [] };
                        }
                        
                        for (const inq of inquiryList) {
                            const date = parseDate(inq.date);
                            if (date) {
                                result.bureauData[bureau].inquiries.push({
                                    company: inq.company || 'Unknown',
                                    date: date,
                                    type: 'hard',
                                    bureau: bureau
                                });
                            }
                        }
                    }
                }
                
                // Log summary
                const bureaus = Object.keys(result.bureauData);
                console.log('CardTool Credit: myFICO full report has data for bureaus:', bureaus);
                for (const bureau of bureaus) {
                    const bd = result.bureauData[bureau];
                    console.log(`  ${bureau}: ${bd.accounts.length} accounts, ${bd.inquiries.length} inquiries`);
                }
                
                // Set flag indicating this is a multi-bureau full report
                result.multiBureau = bureaus.length > 0;
                result.scoreOnly = false;
            }
            // =============================================
            // Format 2: /v4/users/products endpoint with "latest" array (score-only)
            // Structure: { products: [...], latest: [{ score, datasource, score_version, score_date }] }
            // =============================================
            else if (data.latest && Array.isArray(data.latest)) {
                result.scoreOnly = true;
                for (const item of data.latest) {
                    const score = item.score;
                    const bureau = mapBureau(item.datasource);
                    const scoreVersion = item.score_version;
                    
                    if (score >= 300 && score <= 850 && bureau) {
                        // Determine score type from score_version
                        const scoreType = scoreVersion === '8' ? 'fico_8' : 
                                          scoreVersion === '9' ? 'fico_9' : 'fico_8';
                        
                        result.scores.push({
                            type: scoreType,
                            score: score,
                            date: parseDate(item.score_date) || new Date().toISOString().split('T')[0],
                            bureau: bureau
                        });
                        console.log('CardTool Credit: Found myFICO score:', score, bureau, scoreType);
                    }
                }
            }
            // =============================================
            // Format 3: /v4/users/reports endpoint with "response.reports" array (score-only)
            // Structure: { response: { reports: [{ score, datasource, score_version, report_date }] } }
            // =============================================
            else if (data.response?.reports && Array.isArray(data.response.reports)) {
                result.scoreOnly = true;
                for (const report of data.response.reports) {
                    const score = report.score;
                    const bureau = mapBureau(report.datasource);
                    const scoreVersion = report.score_version;
                    
                    if (score >= 300 && score <= 850 && bureau) {
                        const scoreType = scoreVersion === '8' ? 'fico_8' : 
                                          scoreVersion === '9' ? 'fico_9' : 'fico_8';
                        
                        result.scores.push({
                            type: scoreType,
                            score: score,
                            date: parseDate(report.report_date) || new Date().toISOString().split('T')[0],
                            bureau: bureau
                        });
                        console.log('CardTool Credit: Found myFICO historical score:', score, bureau);
                    }
                }
            }
            
            // Deduplicate scores by bureau+type+date
            const scoreMap = new Map();
            for (const s of result.scores) {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (!scoreMap.has(key)) {
                    scoreMap.set(key, s);
                }
            }
            result.scores = Array.from(scoreMap.values());
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from myFICO');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing myFICO response', e);
        }
        
        return result;
    }

    // Capital One CreditWise - FICO 8 for TransUnion (NOT VantageScore!)
    function parseCreditWiseResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing CreditWise response', url);
        
        try {
            // CreditWise /api/pages response structure:
            // { summary: { components: [{ view: { creditScore: 751, dateUpdatedLabel: {...} } }] } }
            
            // Helper to parse date from "Updated on January 12, 2026" format
            const parseDateLabel = (label) => {
                if (!label) return new Date().toISOString().split('T')[0];
                const match = label.match(/(\w+)\s+(\d+),\s+(\d+)/);
                if (match) {
                    const months = ['January','February','March','April','May','June',
                                    'July','August','September','October','November','December'];
                    const monthIdx = months.indexOf(match[1]);
                    if (monthIdx >= 0) {
                        const month = String(monthIdx + 1).padStart(2, '0');
                        const day = String(match[2]).padStart(2, '0');
                        return `${match[3]}-${month}-${day}`;
                    }
                }
                return new Date().toISOString().split('T')[0];
            };
            
            // Search for SCORE_BAR component in the nested structure
            const findScoreBar = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                
                // Check if this is a SCORE_BAR component
                if (obj.componentType === 'SCORE_BAR' && obj.creditScore !== undefined) {
                    return {
                        score: obj.creditScore,
                        dateLabel: obj.dateUpdatedLabel?.template,
                        titleLabel: obj.titleLabel?.template
                    };
                }
                
                // Check view property
                if (obj.view?.componentType === 'SCORE_BAR' && obj.view?.creditScore !== undefined) {
                    return {
                        score: obj.view.creditScore,
                        dateLabel: obj.view.dateUpdatedLabel?.template,
                        titleLabel: obj.view.titleLabel?.template
                    };
                }
                
                // Recursively search
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findScoreBar(item);
                        if (found) return found;
                    }
                } else {
                    for (const key of Object.keys(obj)) {
                        const found = findScoreBar(obj[key]);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const scoreData = findScoreBar(data);
            
            if (scoreData && scoreData.score >= 300 && scoreData.score <= 850) {
                // Verify it's FICO 8 from the title label
                const isFico8 = scoreData.titleLabel?.includes('FICO') && 
                                scoreData.titleLabel?.includes('8');
                
                result.scores.push({
                    type: isFico8 ? 'fico_8' : 'fico_8', // CreditWise always provides FICO 8
                    score: scoreData.score,
                    date: parseDateLabel(scoreData.dateLabel),
                    bureau: 'transunion' // CreditWise uses TransUnion data
                });
                console.log('CardTool Credit: Found CreditWise FICO 8 score:', scoreData.score);
            }
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from CreditWise');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing CreditWise response', e);
        }
        
        return result;
    }

    // Chase Credit Journey - VantageScore 3 for Experian
    function parseCreditJourneyResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Credit Journey response', url);
        
        try {
            // Helper to parse YYYYMMDD format to YYYY-MM-DD
            const parseChaseDate = (dateStr) => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                if (dateStr.length === 8) {
                    return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                }
                return dateStr;
            };
            
            // Format 1: credit-score-outlines endpoint
            // { creditBureauName, creditScore: { currentCreditScoreSummary: { creditRiskScore } }, 
            //   creditScoreModelIdentifier: { riskModelName, riskModelVersionNumber }, updateDate }
            if (data.creditScore?.currentCreditScoreSummary?.creditRiskScore) {
                const score = data.creditScore.currentCreditScoreSummary.creditRiskScore;
                const bureau = (data.creditBureauName || 'EXPERIAN').toLowerCase();
                const modelName = data.creditScoreModelIdentifier?.riskModelName || '';
                const modelVersion = data.creditScoreModelIdentifier?.riskModelVersionNumber || '';
                
                // Determine score type
                let scoreType = 'vantage_3';
                if (modelName.toLowerCase().includes('vantage')) {
                    scoreType = modelVersion === '3.0' || modelVersion === '3' ? 'vantage_3' : 
                                modelVersion === '4.0' || modelVersion === '4' ? 'vantage_4' : 'vantage_3';
                }
                
                if (score >= 300 && score <= 850) {
                    result.scores.push({
                        type: scoreType,
                        score: score,
                        date: parseChaseDate(data.updateDate),
                        bureau: bureau
                    });
                    console.log('CardTool Credit: Found Credit Journey score:', score, bureau);
                }
            }
            
            // Format 2: real-time-score-changes endpoint (has history)
            // { vscrReportDetails: [{ alertGeneratedTimeStamp, creditScores: { currentValueNumber } }] }
            if (data.vscrReportDetails && Array.isArray(data.vscrReportDetails)) {
                for (const report of data.vscrReportDetails) {
                    if (report.creditScores?.currentValueNumber) {
                        const score = report.creditScores.currentValueNumber;
                        const dateStr = report.alertGeneratedTimeStamp; // YYYYMMDD format
                        
                        if (score >= 300 && score <= 850) {
                            result.scores.push({
                                type: 'vantage_3',
                                score: score,
                                date: parseChaseDate(dateStr),
                                bureau: 'experian' // Credit Journey uses Experian
                            });
                        }
                    }
                }
                console.log('CardTool Credit: Found', result.scores.length, 'historical scores from Credit Journey');
            }
            
            // Deduplicate - keep latest for each date
            const scoreMap = new Map();
            for (const s of result.scores) {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (!scoreMap.has(key)) {
                    scoreMap.set(key, s);
                }
            }
            result.scores = Array.from(scoreMap.values());
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from Credit Journey');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Credit Journey response', e);
        }
        
        return result;
    }

    // Bank of America - FICO 8 for TransUnion
    function parseBankOfAmericaResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Bank of America response', url);
        
        try {
            // BOA /ogateway/finwell/creditscore/v1/details endpoint
            // { payload: { currentCreditScore, currentCreditScoreDate, scores: [{rating, assessmentDate}] } }
            
            // Helper to parse BOA timestamp (milliseconds since epoch)
            const parseBoaDate = (timestamp) => {
                if (!timestamp) return new Date().toISOString().split('T')[0];
                return new Date(timestamp).toISOString().split('T')[0];
            };
            
            const payload = data.payload || data;
            
            // Current score
            if (payload.currentCreditScore) {
                const score = parseInt(payload.currentCreditScore, 10);
                if (score >= 300 && score <= 850) {
                    result.scores.push({
                        type: 'fico_8',
                        score: score,
                        date: parseBoaDate(payload.currentCreditScoreDate),
                        bureau: 'transunion' // BOA uses TransUnion
                    });
                    console.log('CardTool Credit: Found BOA current score:', score);
                }
            }
            
            // Historical scores
            if (payload.scores && Array.isArray(payload.scores)) {
                for (const item of payload.scores) {
                    const score = item.rating;
                    if (score >= 300 && score <= 850) {
                        result.scores.push({
                            type: 'fico_8',
                            score: score,
                            date: parseBoaDate(item.assessmentDate),
                            bureau: 'transunion'
                        });
                    }
                }
                console.log('CardTool Credit: Found', payload.scores.length, 'historical scores from BOA');
            }
            
            // Deduplicate by date
            const scoreMap = new Map();
            for (const s of result.scores) {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (!scoreMap.has(key)) {
                    scoreMap.set(key, s);
                }
            }
            result.scores = Array.from(scoreMap.values());
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from Bank of America');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Bank of America response', e);
        }
        
        return result;
    }

    // Citi - FICO Bankcard Score 8 for Equifax
    function parseCitiResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Citi response', url);
        
        try {
            // Citi /gcgapi/prod/public/v1/ficoTilesData/retrieve endpoint
            // Returns array with tile data, score is nested in successResponse
            
            // Helper to parse "as of MM/DD/YYYY" format
            const parseCitiDate = (dateStr) => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (match) {
                    const month = String(match[1]).padStart(2, '0');
                    const day = String(match[2]).padStart(2, '0');
                    return `${match[3]}-${month}-${day}`;
                }
                return new Date().toISOString().split('T')[0];
            };
            
            // Search for score in the nested structure
            const findScore = (obj) => {
                if (!obj || typeof obj !== 'object') return null;
                
                // Look for elements array with score label
                if (obj.elements && Array.isArray(obj.elements)) {
                    let score = null;
                    let dateLabel = null;
                    let scoreType = 'fico_bankcard_8'; // Default for Citi
                    
                    for (const elem of obj.elements) {
                        // Score is in label1.text (e.g., "742")
                        if (elem.id === 'label1' && elem.text && /^\d+$/.test(elem.text)) {
                            score = parseInt(elem.text, 10);
                        }
                        // Date is in label3.text (e.g., "as of 12/23/2025")
                        if (elem.id === 'label3' && elem.text) {
                            dateLabel = elem.text;
                        }
                        // Score type info in label6 (e.g., "FICO® Bankcard Score 8 based on Equifax data.")
                        if (elem.id === 'label6' && elem.text) {
                            if (elem.text.toLowerCase().includes('bankcard')) {
                                scoreType = 'fico_bankcard_8';
                            }
                        }
                    }
                    
                    if (score && score >= 250 && score <= 900) {
                        return {
                            score: score,
                            date: parseCitiDate(dateLabel),
                            type: scoreType
                        };
                    }
                }
                
                // Recursively search
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findScore(item);
                        if (found) return found;
                    }
                } else {
                    for (const key of Object.keys(obj)) {
                        // Check successResponse specifically
                        if (key === 'successResponse') {
                            const found = findScore(obj[key]);
                            if (found) return found;
                        }
                    }
                    // General recursion
                    for (const key of Object.keys(obj)) {
                        const found = findScore(obj[key]);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const scoreData = findScore(data);
            
            if (scoreData) {
                result.scores.push({
                    type: scoreData.type,
                    score: scoreData.score,
                    date: scoreData.date,
                    bureau: 'equifax' // Citi uses Equifax for their FICO Bankcard score
                });
                console.log('CardTool Credit: Found Citi FICO Bankcard score:', scoreData.score);
            }
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from Citi');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Citi response', e);
        }
        
        return result;
    }

    // Wells Fargo Credit Close-Up - FICO 8 for Experian (embedded in HTML)
    function parseWellsFargoResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Wells Fargo response');
        
        try {
            // Data comes from window._wfPayload embedded in HTML
            const payload = data;
            
            // Helper to parse WF date format "2026/01/09" to ISO
            const parseWFDate = (dateStr) => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                return dateStr.replace(/\//g, '-');
            };
            
            // Current score from scoreMeter
            // Wells Fargo provides FICO Score 9 from Experian
            if (payload.applicationData?.scoreMeter) {
                const meter = payload.applicationData.scoreMeter;
                const score = parseInt(meter.score, 10);
                if (score >= 300 && score <= 850) {
                    result.scores.push({
                        type: 'fico_9',  // Wells Fargo uses FICO 9
                        score: score,
                        date: parseWFDate(meter.scoreDate),
                        bureau: 'experian' // Wells Fargo uses Experian
                    });
                    console.log('CardTool Credit: Found WF current score:', score);
                }
            }
            
            // Historical scores from scoreHistory.historyChart
            if (payload.applicationData?.scoreHistory?.historyChart) {
                const history = payload.applicationData.scoreHistory.historyChart;
                for (const entry of history) {
                    const score = parseInt(entry.scoreValue, 10);
                    if (score >= 300 && score <= 850) {
                        result.scores.push({
                            type: 'fico_9',  // Wells Fargo uses FICO 9
                            score: score,
                            date: parseWFDate(entry.scoreDate),
                            bureau: 'experian'
                        });
                    }
                }
                console.log('CardTool Credit: Found', history.length, 'historical WF scores');
            }
            
            // Deduplicate by date
            const seen = new Set();
            result.scores = result.scores.filter(s => {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'unique scores from Wells Fargo');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Wells Fargo response', e);
        }
        
        return result;
    }
    // Amex MyCredit Guide - FICO 8 for Experian
    function parseAmexResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing Amex MyCredit Guide response', url);
        
        try {
            // Helper to parse ISO date
            const parseDate = (dateStr) => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                return dateStr.split('T')[0];
            };
            
            // Format 1: scoreplan-score endpoint (simpler)
            // { score_model: "Fico8", current_score: 751, current_score_date: "2026-01-12T00:00:00.000+00:00" }
            if (data.current_score !== undefined) {
                const score = parseInt(data.current_score, 10);
                if (score >= 300 && score <= 850) {
                    const scoreType = (data.score_model || '').toLowerCase().includes('fico8') ? 'fico_8' : 
                                      (data.score_model || '').toLowerCase().includes('fico9') ? 'fico_9' : 'fico_8';
                    result.scores.push({
                        type: scoreType,
                        score: score,
                        date: parseDate(data.current_score_date),
                        bureau: 'experian' // Amex uses Experian (via experiancs.com)
                    });
                    console.log('CardTool Credit: Found Amex current score:', score);
                }
            }
            
            // Format 2: /api/v1/credit/scores endpoint (detailed)
            // { score_model: "Fico8", score: "751", score_date: "...", credit_score_content: { score: 751, ... } }
            if (data.score !== undefined) {
                const score = parseInt(data.score, 10);
                if (score >= 300 && score <= 850) {
                    const scoreType = (data.score_model || '').toLowerCase().includes('fico8') ? 'fico_8' : 
                                      (data.score_model || '').toLowerCase().includes('fico9') ? 'fico_9' : 'fico_8';
                    result.scores.push({
                        type: scoreType,
                        score: score,
                        date: parseDate(data.score_date),
                        bureau: 'experian'
                    });
                    console.log('CardTool Credit: Found Amex detailed score:', score);
                }
            }
            
            // Also check nested credit_score_content
            if (data.credit_score_content?.score) {
                const score = parseInt(data.credit_score_content.score, 10);
                if (score >= 300 && score <= 850 && result.scores.length === 0) {
                    result.scores.push({
                        type: 'fico_8',
                        score: score,
                        date: parseDate(data.credit_score_content.score_date),
                        bureau: 'experian'
                    });
                }
            }
            
            // Deduplicate
            const seen = new Set();
            result.scores = result.scores.filter(s => {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from Amex MyCredit Guide');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing Amex response', e);
        }
        
        return result;
    }

    // US Bank - VantageScore 3 for TransUnion
    function parseUSBankResponse(data, url) {
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null, scoreOnly: true };
        console.log('CardTool Credit: Parsing US Bank response', url);
        
        try {
            // US Bank GraphQL endpoint
            // { data: { getCreditScoreService: { valCurr, prdtMtrcRfrshdDt, scoreTrendPoints: [{score, scoreDate}] } } }
            
            const scoreService = data.data?.getCreditScoreService || data.getCreditScoreService;
            
            if (!scoreService) {
                console.log('CardTool Credit: No getCreditScoreService found in US Bank response');
                return result;
            }
            
            // Current score
            if (scoreService.valCurr) {
                const score = parseInt(scoreService.valCurr, 10);
                if (score >= 300 && score <= 850) {
                    result.scores.push({
                        type: 'vantage_3',
                        score: score,
                        date: scoreService.prdtMtrcRfrshdDt || new Date().toISOString().split('T')[0],
                        bureau: 'transunion' // US Bank uses TransUnion
                    });
                    console.log('CardTool Credit: Found US Bank current score:', score);
                }
            }
            
            // Historical scores (weekly updates!)
            if (scoreService.scoreTrendPoints && Array.isArray(scoreService.scoreTrendPoints)) {
                for (const point of scoreService.scoreTrendPoints) {
                    const score = parseInt(point.score, 10);
                    if (score >= 300 && score <= 850) {
                        result.scores.push({
                            type: 'vantage_3',
                            score: score,
                            date: point.scoreDate,
                            bureau: 'transunion'
                        });
                    }
                }
                console.log('CardTool Credit: Found', scoreService.scoreTrendPoints.length, 'historical scores from US Bank');
            }
            
            // Deduplicate by date
            const scoreMap = new Map();
            for (const s of result.scores) {
                const key = `${s.bureau}-${s.type}-${s.date}`;
                if (!scoreMap.has(key)) {
                    scoreMap.set(key, s);
                }
            }
            result.scores = Array.from(scoreMap.values());
            
            console.log('CardTool Credit: Parsed', result.scores.length, 'scores from US Bank');
        } catch (e) {
            console.warn('CardTool Credit: Error parsing US Bank response', e);
        }
        
        return result;
    }

    // ============================================
    // TRANSUNION HTML SCRAPING
    // ============================================

    function tryScrapeCreditReport(bureau) {
        if (bureau !== 'transunion') return;
        
        console.log('CardTool Credit: Attempting to parse TransUnion UserData');
        
        const result = { scores: [], accounts: [], inquiries: [], reportDate: null };
        let rawData = null;
        
        // Look for the UserData script tag that contains the JSON data
        const userDataScript = document.getElementById('UserData');
        if (!userDataScript || !userDataScript.textContent) {
            console.log('CardTool Credit: No UserData script found on this page');
            console.log('CardTool Credit: Available script tags:', 
                Array.from(document.querySelectorAll('script[id]')).map(s => s.id));
            creditReportData = { ...result, status: 'no_data', message: 'No UserData found on this page' };
            showCreditBadge();
            return;
        }
        
        console.log('CardTool Credit: Found UserData script, length:', userDataScript.textContent.length);
        
        try {
            const scriptContent = userDataScript.textContent;
            // Extract the JSON object from "var ud = {...};"
            // Use a greedy match to capture the entire object
            const udMatch = scriptContent.match(/var\s+ud\s*=\s*(\{[\s\S]*\});?\s*$/);
            if (!udMatch || !udMatch[1]) {
                console.log('CardTool Credit: Could not extract ud variable. Script preview:', 
                    scriptContent.substring(0, 500));
                creditReportData = { ...result, status: 'parse_error', message: 'Could not parse UserData' };
                showCreditBadge();
                return;
            }
            
            const ud = JSON.parse(udMatch[1]);
            rawData = ud;
            console.log('CardTool Credit: Successfully parsed TransUnion UserData');
            console.log('CardTool Credit: Keys in ud:', Object.keys(ud));
            
            // Navigate to the credit data - try multiple paths
            let creditData = ud?.TU_CONSUMER_DISCLOSURE?.reportData?.product?.[0]?.subject?.[0]?.subjectRecord?.[0]?.custom?.credit;
            
            // Alternative path 1: Direct access
            if (!creditData) {
                creditData = ud?.creditData || ud?.credit;
            }
            
            // Alternative path 2: Look for trade array directly
            if (!creditData && ud?.TU_CONSUMER_DISCLOSURE?.reportData?.product?.[0]?.subject?.[0]?.subjectRecord?.[0]) {
                const subjectRecord = ud.TU_CONSUMER_DISCLOSURE.reportData.product[0].subject[0].subjectRecord[0];
                console.log('CardTool Credit: SubjectRecord keys:', Object.keys(subjectRecord));
                console.log('CardTool Credit: SubjectRecord.custom keys:', subjectRecord.custom ? Object.keys(subjectRecord.custom) : 'no custom');
                
                // Check if trade data exists elsewhere
                if (subjectRecord.custom) {
                    creditData = subjectRecord.custom.credit || subjectRecord.custom;
                }
            }
            
            // Log structure for debugging
            if (ud?.TU_CONSUMER_DISCLOSURE?.reportData?.product?.[0]?.subject?.[0]?.subjectRecord?.[0]?.custom?.credit?.trade?.[0]) {
                const sampleTrade = ud.TU_CONSUMER_DISCLOSURE.reportData.product[0].subject[0].subjectRecord[0].custom.credit.trade[0];
                console.log('CardTool Credit: Sample trade keys:', Object.keys(sampleTrade));
                // Log the entire first trade for debugging
                console.log('CardTool Credit: Full sample trade:', JSON.stringify(sampleTrade, null, 2));
            }
            
            if (!creditData) {
                console.log('CardTool Credit: Could not find credit data in UserData');
                console.log('CardTool Credit: TU_CONSUMER_DISCLOSURE exists:', !!ud?.TU_CONSUMER_DISCLOSURE);
                console.log('CardTool Credit: reportData exists:', !!ud?.TU_CONSUMER_DISCLOSURE?.reportData);
                console.log('CardTool Credit: UserData top-level keys:', Object.keys(ud));
                creditReportData = { ...result, status: 'no_credit_data', message: 'Credit data not found in report', rawData };
                showCreditBadge();
                return;
            }
            
            console.log('CardTool Credit: Found credit data, keys:', Object.keys(creditData));
            
            // Parse trade accounts
            const trades = creditData.trade || [];
            console.log('CardTool Credit: Found', trades.length, 'trade accounts');
            
            for (const trade of trades) {
                if (!trade) continue;
                
                const subscriber = trade.subscriber || {};
                const account = trade.account || {};
                const terms = trade.terms || {};
                
                // Debug: log first account structure
                if (result.accounts.length === 0) {
                    console.log('CardTool Credit: Sample trade keys:', Object.keys(trade));
                }
                
                // ========== CREDIT LIMIT ==========
                // TU stores credit limit in histCreditLimitStmt as text: "Credit limit of $2,000 from 07/2023 to 12/2025"
                let creditLimit = null;
                if (trade.creditLimit !== undefined && trade.creditLimit !== null) {
                    creditLimit = trade.creditLimit;
                } else if (trade.histCreditLimitStmt) {
                    // Parse from statement like "Credit limit of $11,000 from 03/2025 to 12/2025"
                    // Get the LAST dollar amount (most recent)
                    const limitMatches = trade.histCreditLimitStmt.match(/\$[\d,]+/g);
                    if (limitMatches && limitMatches.length > 0) {
                        // Last match is most recent
                        creditLimit = limitMatches[limitMatches.length - 1];
                    }
                }
                
                // ========== BALANCE ==========
                // TU stores balance history in histBalanceList as semicolon-separated: "0;620;0;0;..."
                // First value is most recent
                let balance = null;
                if (trade.currentBalance !== undefined && trade.currentBalance !== null) {
                    balance = trade.currentBalance;
                } else if (trade.histBalanceList) {
                    const balances = trade.histBalanceList.split(';').filter(b => b !== '');
                    if (balances.length > 0) {
                        // First non-empty value is most recent
                        balance = balances[0];
                    }
                }
                
                // ========== HIGH BALANCE ==========
                // TU stores in histHighCreditStmt: "High balance of $0 from 07/2023...; $620 from 11/2025 to 12/2025"
                let highBalance = null;
                if (trade.highCredit !== undefined && trade.highCredit !== null) {
                    highBalance = trade.highCredit;
                } else if (trade.histHighCreditStmt) {
                    // Get the LAST dollar amount (most recent high balance)
                    const highMatches = trade.histHighCreditStmt.match(/\$[\d,]+/g);
                    if (highMatches && highMatches.length > 0) {
                        highBalance = highMatches[highMatches.length - 1];
                    }
                }
                
                // ========== MONTHLY PAYMENT ==========
                // TU stores in histPaymentDueList as semicolon-separated: ";40;;;;;;;;;;;;35"
                // Also check terms.scheduledMonthlyPayment and terms.description
                let monthlyPayment = null;
                if (terms.scheduledMonthlyPayment !== undefined && terms.scheduledMonthlyPayment !== null) {
                    monthlyPayment = terms.scheduledMonthlyPayment;
                } else if (trade.histPaymentDueList) {
                    const payments = trade.histPaymentDueList.split(';').filter(p => p !== '' && p !== '0');
                    if (payments.length > 0) {
                        // First non-empty, non-zero value
                        monthlyPayment = payments[0];
                    }
                } else if (terms.description) {
                    // Parse from terms description like "$105 per month; paid Monthly"
                    const termMatch = terms.description.match(/\$[\d,]+/);
                    if (termMatch) {
                        monthlyPayment = termMatch[0];
                    }
                }
                
                // ========== DATES ==========
                const dateOpened = parseTransUnionDate(
                    trade.dateOpened?.value || 
                    trade.dateOpened || 
                    trade.DateOpened?.value ||
                    trade.DateOpened ||
                    trade.openDate
                );
                
                const dateUpdated = parseTransUnionDate(
                    trade.dateEffective?.value || 
                    trade.dateReported?.value ||
                    trade.dateEffective ||
                    trade.dateReported ||
                    trade.lastUpdated ||
                    trade.dateUpdated
                );
                
                const dateClosed = parseTransUnionDate(
                    trade.dateClosed?.value || 
                    trade.dateClosed ||
                    trade.DateClosed?.value ||
                    trade.DateClosed ||
                    trade.closeDate
                );
                
                // ========== RESPONSIBILITY (ECOA) ==========
                // TU uses ecoadesignator field (lowercase), not ECOADesignator
                const responsibility = mapTransUnionResponsibility(
                    trade.ecoadesignator || trade.ECOADesignator || trade.ecoaDesignator
                );
                
                console.log('CardTool Credit: Trade -', 
                    subscriber.name?.unparsed || 'Unknown',
                    '| Limit:', creditLimit,
                    '| Balance:', balance,
                    '| High:', highBalance,
                    '| Payment:', monthlyPayment,
                    '| Opened:', dateOpened);
                
                // Get ecoa for status check
                const ecoaValue = trade.ecoadesignator || trade.ECOADesignator || trade.ecoaDesignator;
                
                result.accounts.push({
                    name: subscriber.name?.unparsed || 'Unknown',
                    numberMasked: trade.accountNumber || null,
                    creditorName: subscriber.name?.unparsed || null,
                    status: mapTransUnionStatus(trade.portfolioType, trade.accountRatingDescription, ecoaValue, dateClosed),
                    dateOpened: dateOpened,
                    dateUpdated: dateUpdated,
                    dateClosed: dateClosed,
                    creditLimitCents: parseDollarsToCents(creditLimit),
                    highBalanceCents: parseDollarsToCents(highBalance),
                    balanceCents: parseDollarsToCents(balance),
                    monthlyPaymentCents: parseDollarsToCents(monthlyPayment),
                    accountType: mapTransUnionAccountType(trade.portfolioType),
                    loanType: mapTransUnionLoanType(account.type),
                    responsibility: responsibility,
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
            
            // Parse soft inquiries (promotional and account review)
            const promotionalInquiries = creditData.promotionalInquiry || [];
            const accountReviewInquiries = creditData.accountReviewInquiry || [];
            console.log('CardTool Credit: Found', promotionalInquiries.length, 'promotional +', accountReviewInquiries.length, 'account review (soft) inquiries');
            
            // Helper to parse soft inquiries
            const parseSoftInquiries = (inquiries, subType) => {
                for (const inq of inquiries) {
                    if (!inq) continue;
                    const subscriber = inq.subscriber || {};
                    // Promotional inquiries use 'inquiryDates', account review uses 'requestedOnDates'
                    const dateStr = inq.inquiryDates || inq.requestedOnDates || inq.combinedDates || '';
                    const dates = dateStr.split(',').map(d => parseTransUnionDate(d.trim())).filter(Boolean);
                    
                    if (dates.length === 0) {
                        const singleDate = parseTransUnionDate(inq.inquiryDate || inq.requestedOn || inq.date?.value || inq.dateOfInquiry);
                        if (singleDate) dates.push(singleDate);
                    }
                    
                    for (const date of dates) {
                        result.inquiries.push({
                            company: subscriber.name?.unparsed || 'Unknown',
                            date: date,
                            type: subType // 'promotional' or 'account_review'
                        });
                    }
                }
            };
            
            parseSoftInquiries(promotionalInquiries, 'promotional');
            parseSoftInquiries(accountReviewInquiries, 'account_review');
            
            // Report timestamp
            const timestamp = ud?.TU_CONSUMER_DISCLOSURE?.reportData?.transactionControl?.tracking?.transactionTimeStamp;
            if (timestamp) {
                result.reportDate = parseTransUnionDate(timestamp);
            }
            
            console.log('CardTool Credit: Parsed TransUnion data -', 
                result.accounts.length, 'accounts,',
                result.inquiries.length, 'inquiries');
            
            // Check if we're missing key data (limit/balance) and try HTML scraping as fallback
            const accountsMissingData = result.accounts.filter(a => 
                !a.creditLimitCents && !a.balanceCents && a.accountType === 'revolving'
            );
            
            if (accountsMissingData.length > 0) {
                console.log('CardTool Credit: Some accounts missing limit/balance, trying HTML scrape');
                const htmlData = scrapeTransUnionHtml();
                if (htmlData.length > 0) {
                    // Try to merge HTML data with parsed accounts
                    for (const account of result.accounts) {
                        const htmlMatch = htmlData.find(h => 
                            h.accountNumber && account.numberMasked && 
                            h.accountNumber.includes(account.numberMasked.replace(/\*/g, '').slice(-4))
                        );
                        if (htmlMatch) {
                            if (!account.creditLimitCents && htmlMatch.creditLimitCents) {
                                account.creditLimitCents = htmlMatch.creditLimitCents;
                            }
                            if (!account.balanceCents && htmlMatch.balanceCents) {
                                account.balanceCents = htmlMatch.balanceCents;
                            }
                            if (!account.monthlyPaymentCents && htmlMatch.monthlyPaymentCents) {
                                account.monthlyPaymentCents = htmlMatch.monthlyPaymentCents;
                            }
                            if (!account.dateOpened && htmlMatch.dateOpened) {
                                account.dateOpened = htmlMatch.dateOpened;
                            }
                            if (!account.dateUpdated && htmlMatch.dateUpdated) {
                                account.dateUpdated = htmlMatch.dateUpdated;
                            }
                            console.log('CardTool Credit: Merged HTML data for', account.name);
                        }
                    }
                }
            }
            
            // Always update and show badge with results
            creditReportData = {
                ...result,
                rawData: rawData,
                status: (result.accounts.length > 0 || result.inquiries.length > 0) ? 'ready' : 'empty'
            };
            showCreditBadge();
            
        } catch (e) {
            console.error('CardTool Credit: Error parsing TransUnion UserData:', e);
            creditReportData = { 
                scores: [], accounts: [], inquiries: [], reportDate: null,
                status: 'error', 
                message: e.message 
            };
            showCreditBadge();
        }
    }

    // Valid enums: open, closed, paid, unknown
    function mapTransUnionStatus(portfolioType, ratingDesc, ecoadesignator, dateClosed) {
        // If dateClosed is set, the account is definitely closed
        // This is the most reliable indicator
        if (dateClosed) return 'closed';
        
        // Check ecoadesignator - "Relationship Terminated" means account is closed
        if (ecoadesignator) {
            const ecoa = ecoadesignator.toUpperCase();
            if (ecoa.includes('TERMINATED') || ecoa === 'T') return 'closed';
        }
        
        if (!portfolioType && !ratingDesc) return 'unknown';
        const combined = ((portfolioType || '') + ' ' + (ratingDesc || '')).toUpperCase();
        // Check CLOSED/TERMINATED first - takes precedence over "AS AGREED" 
        // (e.g. "Paid, Closed; was Paid as agreed" should be closed, not open)
        if (combined.includes('CLOSED') || combined.includes('TERMINATED')) return 'closed';
        // 'collection' maps to 'closed' since it's not a valid status enum
        if (combined.includes('COLLECTION')) return 'closed';
        if (combined.includes('CURRENT') || combined.includes('AS AGREED')) return 'open';
        if (combined.includes('PAID')) return 'paid';
        if (combined.includes('REVOLVING') || combined.includes('INSTALLMENT') || combined.includes('OPEN')) return 'open';
        return 'unknown';
    }
    
    // Valid enums: revolving, installment, mortgage, collection, other
    function mapTransUnionAccountType(portfolioType) {
        if (!portfolioType) return 'other';
        const t = portfolioType.toUpperCase();
        if (t.includes('REVOLVING')) return 'revolving';
        if (t.includes('INSTALLMENT')) return 'installment';
        if (t.includes('MORTGAGE')) return 'mortgage';
        // 'open' portfolio type maps to 'other' since it's not a valid account type enum
        if (t.includes('OPEN')) return 'other';
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
    
    // Valid enums: individual, joint, authorized_user, cosigner, unknown
    function mapTransUnionResponsibility(ecoa) {
        if (!ecoa) return 'unknown';
        const e = ecoa.toUpperCase();
        if (e === 'I' || e.includes('INDIVIDUAL')) return 'individual';
        if (e === 'J' || e.includes('JOINT')) return 'joint';
        if (e === 'A' || e.includes('AUTHORIZED')) return 'authorized_user';
        if (e === 'C' || e.includes('COSIGNER')) return 'cosigner';
        // 'terminated' maps to 'unknown' since it's not a valid responsibility enum
        if (e === 'T' || e.includes('TERMINATED')) return 'unknown';
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

    // Scrape TransUnion account details from visible HTML (fallback method)
    function scrapeTransUnionHtml() {
        const results = [];
        
        try {
            // Look for account detail tables on the page
            // TU uses various table structures for account information
            
            // Method 1: Look for "Account Information" sections
            const accountInfoSections = document.querySelectorAll('.account-info, .trade-detail, [class*="account"]');
            
            // Method 2: Look for dl/dt/dd pairs which TU often uses
            const definitionLists = document.querySelectorAll('dl');
            
            for (const dl of definitionLists) {
                const accountData = {};
                const terms = dl.querySelectorAll('dt');
                const definitions = dl.querySelectorAll('dd');
                
                for (let i = 0; i < terms.length && i < definitions.length; i++) {
                    const term = terms[i].textContent.trim().toLowerCase();
                    const value = definitions[i].textContent.trim();
                    
                    if (term.includes('credit limit') || term.includes('credit line')) {
                        accountData.creditLimitCents = parseDollarsToCents(value);
                    }
                    if (term.includes('balance') && !term.includes('high')) {
                        accountData.balanceCents = parseDollarsToCents(value);
                    }
                    if (term.includes('high balance')) {
                        accountData.highBalanceCents = parseDollarsToCents(value);
                    }
                    if (term.includes('monthly payment') || term.includes('terms')) {
                        const paymentMatch = value.match(/\$[\d,]+/);
                        if (paymentMatch) {
                            accountData.monthlyPaymentCents = parseDollarsToCents(paymentMatch[0]);
                        }
                    }
                    if (term.includes('date opened') || term.includes('open date')) {
                        accountData.dateOpened = parseTransUnionDate(value);
                    }
                    if (term.includes('date updated') || term.includes('last updated')) {
                        accountData.dateUpdated = parseTransUnionDate(value);
                    }
                    if (term.includes('account') && term.includes('number')) {
                        accountData.accountNumber = value;
                    }
                }
                
                if (Object.keys(accountData).length > 0) {
                    results.push(accountData);
                }
            }
            
            // Method 3: Look for table rows with label/value structure
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                const rows = table.querySelectorAll('tr');
                const accountData = {};
                
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const label = cells[0].textContent.trim().toLowerCase();
                        const value = cells[1].textContent.trim();
                        
                        if (label.includes('credit limit')) {
                            accountData.creditLimitCents = parseDollarsToCents(value);
                        }
                        if (label === 'balance' || label.includes('current balance')) {
                            accountData.balanceCents = parseDollarsToCents(value);
                        }
                        if (label.includes('high balance')) {
                            accountData.highBalanceCents = parseDollarsToCents(value);
                        }
                        if (label.includes('payment') && !label.includes('status')) {
                            accountData.monthlyPaymentCents = parseDollarsToCents(value);
                        }
                        if (label.includes('date opened')) {
                            accountData.dateOpened = parseTransUnionDate(value);
                        }
                        if (label.includes('date updated')) {
                            accountData.dateUpdated = parseTransUnionDate(value);
                        }
                    }
                }
                
                if (Object.keys(accountData).length > 0) {
                    results.push(accountData);
                }
            }
            
            console.log('CardTool Credit: HTML scraping found', results.length, 'account data sets');
            
        } catch (e) {
            console.error('CardTool Credit: HTML scraping error:', e);
        }
        
        return results;
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
        if (value === null || value === undefined || value === '') return null;
        
        // If already a number, convert dollars to cents
        if (typeof value === 'number') {
            return Math.round(value * 100);
        }
        
        const str = String(value);
        
        // Check if it looks like it's already in cents (no decimal, no $ sign, large number)
        // e.g., "620" from histBalanceList is in dollars, not cents
        
        // Remove $ and commas, keep decimal and minus
        const cleaned = str.replace(/[$,]/g, '').trim();
        const num = parseFloat(cleaned);
        
        if (isNaN(num)) return null;
        
        // Convert dollars to cents
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
            width: 280px !important;
            line-height: 1.4 !important;
            transition: all 0.2s ease !important;
        }
        #cardtool-credit-badge:hover {
            border-color: #3b82f6 !important;
        }
        #cardtool-credit-badge * {
            box-sizing: border-box !important;
            font-family: inherit !important;
        }
        /* Minimized state */
        #cardtool-credit-badge.cardtool-credit-minimized {
            min-width: auto !important;
            max-width: none !important;
            border-radius: 20px !important;
            cursor: pointer !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-header {
            padding: 8px 12px !important;
            border-bottom: none !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-title,
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-debug,
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-minimize {
            display: none !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-close {
            font-size: 14px !important;
            padding: 2px !important;
            margin-left: 4px !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-body {
            display: none !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-logo {
            width: 22px !important;
            height: 22px !important;
            font-size: 12px !important;
        }
        #cardtool-credit-badge.cardtool-credit-minimized .cardtool-credit-mini-summary {
            display: flex !important;
            align-items: center !important;
            margin-left: 8px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #60a5fa !important;
            gap: 6px !important;
        }
        .cardtool-credit-mini-summary {
            display: none !important;
        }
        .cardtool-credit-minimize {
            background: none !important;
            border: none !important;
            color: #71717a !important;
            cursor: pointer !important;
            font-size: 14px !important;
            line-height: 1 !important;
            padding: 4px !important;
        }
        .cardtool-credit-minimize:hover {
            color: #e4e4e7 !important;
        }
        .cardtool-credit-header {
            background: #1e3a5f !important;
            padding: 10px 14px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border-bottom: 1px solid #3f3f46 !important;
        }
        .cardtool-credit-header-actions {
            margin-left: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
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
        .cardtool-credit-stat-value.score-range {
            font-size: 15px !important;
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

        // Track if this is a new badge creation
        const isNewBadge = !creditBadgeElement;

        // Create or update badge
        if (!creditBadgeElement) {
            creditBadgeElement = document.createElement('div');
            creditBadgeElement.id = 'cardtool-credit-badge';
            document.body.appendChild(creditBadgeElement);
            
            // Check if user prefers minimized state (default to minimized)
            const isMinimized = GM_getValue('cardtool_credit_minimized', true);
            if (isMinimized) {
                creditBadgeElement.classList.add('cardtool-credit-minimized');
            }
        }

        // Determine if this is multi-bureau data
        const bureauKeys = creditReportData.bureauData ? Object.keys(creditReportData.bureauData) : [];
        const isMultiBureau = bureauKeys.length > 1;
        
        // Get display name - show bureau count for multi-bureau reports
        let bureauName;
        if (isMultiBureau) {
            bureauName = `${bureauKeys.length} Bureaus`;
        } else {
            bureauName = CREDIT_BUREAU_CONFIGS[currentBureau]?.name || 
                         SCORE_SOURCE_CONFIGS[currentBureau]?.name || 
                         'Unknown';
        }
        
        // For multi-bureau reports, show score range; otherwise show first score
        let scoreDisplay;
        let scoreLabel = 'Score';
        const allScores = creditReportData.scores || [];
        
        // Count unique score types (bureau+type combinations) not total historical scores
        const uniqueScoreTypes = new Set();
        for (const s of allScores) {
            const key = s.bureau ? `${s.bureau}-${s.type}` : s.type;
            uniqueScoreTypes.add(key);
        }
        const uniqueScoreCount = uniqueScoreTypes.size;
        
        let isScoreRange = false;
        if (allScores.length > 1) {
            // Multiple scores - show range
            const scoreValues = allScores.map(s => s.score).sort((a,b) => a - b);
            const minScore = scoreValues[0];
            const maxScore = scoreValues[scoreValues.length - 1];
            if (minScore === maxScore) {
                scoreDisplay = minScore;
            } else {
                scoreDisplay = `${minScore}-${maxScore}`;
                isScoreRange = true;
            }
            // Show count of unique score types, not total historical scores
            scoreLabel = uniqueScoreCount > 1 ? `${uniqueScoreCount} Scores` : 'Score';
        } else if (allScores.length === 1) {
            scoreDisplay = allScores[0].score;
            scoreLabel = 'Score';
        } else {
            scoreDisplay = '—';
            scoreLabel = 'Score';
        }
        
        // Calculate counts - for multi-bureau data, sum across all bureaus
        let accountCount = creditReportData.accounts?.length || 0;
        let inquiryCount = creditReportData.inquiries?.length || 0;
        if (creditReportData.bureauData) {
            accountCount = Object.values(creditReportData.bureauData)
                .reduce((sum, bd) => sum + (bd.accounts?.length || 0), 0);
            // Skip inquiry count for myFICO since we don't import them
            if (currentBureau !== 'myfico') {
                inquiryCount = Object.values(creditReportData.bureauData)
                    .reduce((sum, bd) => sum + (bd.inquiries?.length || 0), 0);
            } else {
                inquiryCount = 0; // myFICO inquiries not imported
            }
        }
        
        // Count total scores for display
        const totalScoreCount = creditReportData.scores?.length || 0;
        
        // Site-specific instructions for when data hasn't been collected yet
        // Only for sites where users need to navigate to specific pages
        const siteInstructions = {
            equifax: 'Navigate to Credit Report Summary, Credit Accounts (and each type), and Inquiries to collect all data.',
            myfico: 'Navigate to Reports and click on your latest report to collect all data.'
        };
        
        // Determine status message
        let statusMessage = 'Data captured. Click to sync.';
        let showSyncButton = true;
        
        // Check if we have meaningful data to sync
        const hasData = allScores.length > 0 || accountCount > 0 || inquiryCount > 0;
        // Check if we have scores but missing accounts (user needs to navigate to full report)
        const hasScoresButNoAccounts = allScores.length > 0 && accountCount === 0;
        
        if (creditReportData.status === 'scanning') {
            // Show site-specific instructions while waiting for data
            const instructions = siteInstructions[currentBureau];
            if (instructions) {
                statusMessage = `Waiting for data... ${instructions}`;
            } else {
                statusMessage = 'Scanning page for credit data...';
            }
            showSyncButton = false;
        } else if (hasScoresButNoAccounts && siteInstructions[currentBureau]) {
            // Has scores but no accounts - show simple message (instructions shown above)
            statusMessage = 'Scores captured. Click to sync.';
            // Still allow sync for scores-only
            showSyncButton = true;
        } else if (creditReportData.status === 'no_data' || creditReportData.status === 'no_credit_data') {
            // Show site-specific instructions
            const instructions = siteInstructions[currentBureau];
            if (instructions) {
                statusMessage = instructions;
            } else {
                statusMessage = creditReportData.message || 'No credit data found. Try navigating to the full report.';
            }
            showSyncButton = false;
        } else if (creditReportData.status === 'parse_error') {
            statusMessage = creditReportData.message || 'Error parsing page data.';
            showSyncButton = false;
        } else if (creditReportData.status === 'error') {
            statusMessage = 'Error: ' + (creditReportData.message || 'Unknown error');
            showSyncButton = false;
        } else if (creditReportData.status === 'empty' || !hasData) {
            // No data captured yet - show instructions
            const instructions = siteInstructions[currentBureau];
            if (instructions) {
                statusMessage = instructions;
            } else {
                statusMessage = 'No data captured yet. Navigate to your credit report.';
            }
            showSyncButton = false;
        }

        // Check if any accounts are missing limit/balance data
        const accountsMissingData = (creditReportData.accounts || []).filter(a => 
            !a.creditLimitCents && !a.balanceCents
        ).length;
        // Consistent warning style for all messages
        const warningStyle = 'color: #fbbf24; font-size: 11px; margin-bottom: 8px;';
        
        const dataWarning = accountsMissingData > 0 
            ? `<div style="${warningStyle}">⚠️ ${accountsMissingData} accounts missing limit/balance</div>`
            : '';
        
        // myFICO inquiry note - show when there's data to sync
        const inquiryNote = (currentBureau === 'myfico' && hasData) 
            ? `<div style="${warningStyle}">⚠️ Inquiries not imported from myFICO</div>`
            : '';
        
        // Instruction message for sites that need user navigation
        let instructionMessage = '';
        if (hasScoresButNoAccounts && siteInstructions[currentBureau]) {
            instructionMessage = `<div style="${warningStyle}">⚠️ ${siteInstructions[currentBureau]}</div>`;
        }

        // Build mini-summary text for minimized state
        const miniSummaryParts = [];
        if (scoreDisplay !== '—') miniSummaryParts.push(scoreDisplay);
        if (accountCount > 0) miniSummaryParts.push(`${accountCount}A`);
        if (inquiryCount > 0) miniSummaryParts.push(`${inquiryCount}I`);
        const miniSummaryText = miniSummaryParts.length > 0 ? miniSummaryParts.join(' · ') : 'Credit';

        // Build stats section
        const scoreValueClass = isScoreRange ? 'cardtool-credit-stat-value score-range' : 'cardtool-credit-stat-value';
        const statsHtml = `
            <div class="cardtool-credit-stats">
                <div class="cardtool-credit-stat">
                    <div class="${scoreValueClass}">${scoreDisplay}</div>
                    <div class="cardtool-credit-stat-label">${scoreLabel}</div>
                </div>
                <div class="cardtool-credit-stat">
                    <div class="cardtool-credit-stat-value">${accountCount}</div>
                    <div class="cardtool-credit-stat-label">Accounts</div>
                </div>
                <div class="cardtool-credit-stat">
                    <div class="cardtool-credit-stat-value">${inquiryCount}</div>
                    <div class="cardtool-credit-stat-label">Inquiries</div>
                </div>
            </div>`;
        
        creditBadgeElement.innerHTML = `
            <div class="cardtool-credit-header">
                <div class="cardtool-credit-logo">C</div>
                <span class="cardtool-credit-mini-summary">${miniSummaryText}</span>
                <span class="cardtool-credit-title">CardTool • ${bureauName}</span>
                <div class="cardtool-credit-header-actions">
                    <button class="cardtool-credit-minimize" title="Minimize">&#8722;</button>
                    <button class="cardtool-credit-close" title="Close">&times;</button>
                </div>
            </div>
            <div class="cardtool-credit-body">
                ${statsHtml}
                ${dataWarning}
                ${instructionMessage}
                ${inquiryNote}
                <div id="cardtool-credit-player-container"></div>
                ${showSyncButton ? `
                    <button class="cardtool-credit-btn" id="cardtool-credit-sync-btn">
                        Sync to CardTool
                    </button>
                ` : ''}
                <div class="cardtool-credit-status" id="cardtool-credit-status">
                    ${statusMessage}
                </div>
            </div>
        `;

        // Event listeners
        
        // Click on minimized badge to expand (only add once on new badge)
        if (isNewBadge) {
            creditBadgeElement.addEventListener('click', (e) => {
                if (creditBadgeElement.classList.contains('cardtool-credit-minimized')) {
                    // Only expand if clicking on the badge itself, not buttons
                    if (!e.target.closest('button')) {
                        creditBadgeElement.classList.remove('cardtool-credit-minimized');
                        GM_setValue('cardtool_credit_minimized', false);
                    }
                }
            });
        }

        // Minimize button
        const minimizeBtn = creditBadgeElement.querySelector('.cardtool-credit-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                creditBadgeElement.classList.add('cardtool-credit-minimized');
                GM_setValue('cardtool_credit_minimized', true);
            });
        }

        // Close button
        creditBadgeElement.querySelector('.cardtool-credit-close').addEventListener('click', (e) => {
            e.stopPropagation();
            creditBadgeElement.remove();
            creditBadgeElement = null;
        });

        // Debug export button
        const debugBtn = creditBadgeElement.querySelector('.cardtool-credit-debug');
        if (debugBtn) {
            debugBtn.addEventListener('click', () => {
                // Export parsed data and sample of raw data
                const debugData = {
                    bureau: currentBureau,
                    status: creditReportData.status,
                    parsedAccounts: creditReportData.accounts?.slice(0, 3), // First 3 accounts
                    parsedInquiries: creditReportData.inquiries?.slice(0, 3), // First 3 inquiries
                    parsedScores: creditReportData.scores,
                    // Include a sample trade from raw data if available
                    sampleRawTrade: creditReportData.rawData?.TU_CONSUMER_DISCLOSURE?.reportData?.product?.[0]?.subject?.[0]?.subjectRecord?.[0]?.custom?.credit?.trade?.[0] || null
                };
                
                // Copy to clipboard
                const debugJson = JSON.stringify(debugData, null, 2);
                navigator.clipboard.writeText(debugJson).then(() => {
                    updateCreditStatus('Debug data copied to clipboard!');
                    console.log('CardTool Credit Debug Data:', debugJson);
                }).catch(() => {
                    // Fallback: log to console
                    console.log('CardTool Credit Debug Data:', debugJson);
                    updateCreditStatus('Debug data logged to console (F12)');
                });
            });
        }

        const syncBtn = creditBadgeElement.querySelector('#cardtool-credit-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', handleCreditSync);
        }

        // Load players for selection (only if we have data to sync)
        if (showSyncButton) {
            loadCreditPlayers();
        }
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

        // Check if this is a score-only source with multi-bureau scores
        const scoresWithBureau = creditReportData.scores?.filter(s => s.bureau) || [];
        const scoresWithoutBureau = creditReportData.scores?.filter(s => !s.bureau) || [];
        
        // For multi-bureau full reports (like myFICO), sync each bureau with its full data
        if (creditReportData.multiBureau && creditReportData.bureauData) {
            const bureaus = Object.keys(creditReportData.bureauData);
            let completedCount = 0;
            let totalAccounts = 0;
            let totalInquiries = 0;
            let totalScores = 0;
            let hasError = false;
            
            // Skip inquiries for myFICO - it doesn't have complete inquiry history
            // and we don't want it to mark bureau inquiries as "dropped"
            const skipInquiries = currentBureau === 'myfico';
            if (skipInquiries) {
                console.log('CardTool Credit: Skipping inquiries for myFICO (use direct bureau imports for inquiries)');
            }
            
            console.log('CardTool Credit: Syncing multi-bureau full report to', bureaus.length, 'bureaus:', bureaus);
            console.log('CardTool Credit: bureauData contents:', JSON.stringify(Object.fromEntries(
                Object.entries(creditReportData.bureauData).map(([k, v]) => [k, {
                    accounts: v?.accounts?.length || 0,
                    inquiries: v?.inquiries?.length || 0
                }])
            )));
            
            for (const bureau of bureaus) {
                const bureauData = creditReportData.bureauData[bureau];
                console.log(`CardTool Credit: Bureau ${bureau} has ${bureauData?.accounts?.length || 0} accounts`);
                // Get scores for this bureau, removing the bureau field
                const bureauScores = scoresWithBureau
                    .filter(s => s.bureau === bureau)
                    .map(({ bureau: _, ...rest }) => rest);
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${CARDTOOL_URL}/api/credit-report/import`,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-sync-token': syncToken
                    },
                    data: JSON.stringify({
                        bureau: bureau,
                        source: currentBureau,
                        playerNumber: playerNumber,
                        reportDate: creditReportData.reportDate || new Date().toISOString().split('T')[0],
                        scores: bureauScores,
                        accounts: bureauData.accounts || [],
                        inquiries: skipInquiries ? [] : (bureauData.inquiries || [])
                    }),
                    onload: function(response) {
                        completedCount++;
                        try {
                            const data = JSON.parse(response.responseText);
                            if (response.status === 200 && data.success) {
                                totalScores += data.summary?.scores || 0;
                                totalAccounts += data.summary?.accounts || 0;
                                totalInquiries += data.summary?.inquiries || 0;
                            } else {
                                hasError = true;
                                console.error('CardTool Credit: Sync failed for', bureau, data.error);
                            }
                        } catch (e) {
                            hasError = true;
                            console.error('CardTool Credit: Parse error for', bureau, e);
                        }
                        
                        // All requests complete
                        if (completedCount === bureaus.length) {
                            if (!hasError) {
                                updateCreditStatus(`Synced to ${bureaus.length} bureaus: ${totalScores}S, ${totalAccounts}A, ${totalInquiries}I ✓`);
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
                                updateCreditStatus('Some syncs failed', true);
                                if (btn) {
                                    btn.disabled = false;
                                    btn.textContent = 'Sync to CardTool';
                                }
                            }
                        }
                    },
                    onerror: function() {
                        completedCount++;
                        hasError = true;
                        console.error('CardTool Credit: Network error for', bureau);
                        if (completedCount === bureaus.length) {
                            updateCreditStatus('Network error', true);
                            if (btn) {
                                btn.disabled = false;
                                btn.textContent = 'Sync to CardTool';
                            }
                        }
                    }
                });
            }
            return;
        }
        
        // For score-only sources like Credit Karma, group scores by bureau and send separate requests
        if (scoresWithBureau.length > 0 && creditReportData.scoreOnly) {
            const bureauGroups = {};
            for (const score of scoresWithBureau) {
                const bureau = score.bureau;
                if (!bureauGroups[bureau]) {
                    bureauGroups[bureau] = [];
                }
                // Remove bureau from score object before sending (API determines bureau from request)
                const { bureau: _, ...scoreWithoutBureau } = score;
                bureauGroups[bureau].push(scoreWithoutBureau);
            }
            
            const bureaus = Object.keys(bureauGroups);
            let completedCount = 0;
            let totalScores = 0;
            let hasError = false;
            
            console.log('CardTool Credit: Syncing scores to', bureaus.length, 'bureaus:', bureaus);
            
            for (const bureau of bureaus) {
                const bureauScores = bureauGroups[bureau];
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${CARDTOOL_URL}/api/credit-report/import`,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-sync-token': syncToken
                    },
                    data: JSON.stringify({
                        bureau: bureau,
                        source: currentBureau,
                        playerNumber: playerNumber,
                        reportDate: creditReportData.reportDate || new Date().toISOString().split('T')[0],
                        scores: bureauScores,
                        accounts: [],
                        inquiries: []
                    }),
                    onload: function(response) {
                        completedCount++;
                        try {
                            const data = JSON.parse(response.responseText);
                            if (response.status === 200 && data.success) {
                                totalScores += data.summary?.scores || 0;
                            } else {
                                hasError = true;
                            }
                        } catch (e) {
                            hasError = true;
                        }
                        
                        // All requests complete
                        if (completedCount === bureaus.length) {
                            if (!hasError) {
                                updateCreditStatus(`Synced ${totalScores} scores to ${bureaus.length} bureaus ✓`);
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
                                updateCreditStatus('Some syncs failed', true);
                                if (btn) {
                                    btn.disabled = false;
                                    btn.textContent = 'Sync to CardTool';
                                }
                            }
                        }
                    },
                    onerror: function() {
                        completedCount++;
                        hasError = true;
                        if (completedCount === bureaus.length) {
                            updateCreditStatus('Network error', true);
                            if (btn) {
                                btn.disabled = false;
                                btn.textContent = 'Sync to CardTool';
                            }
                        }
                    }
                });
            }
            return;
        }

        // Standard single-bureau sync (Equifax, Experian, TransUnion direct)
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${CARDTOOL_URL}/api/credit-report/import`,
            headers: {
                'Content-Type': 'application/json',
                'x-sync-token': syncToken
            },
            data: JSON.stringify({
                bureau: currentBureau,
                source: currentBureau,
                playerNumber: playerNumber,
                reportDate: creditReportData.reportDate || new Date().toISOString().split('T')[0],
                scores: scoresWithoutBureau.length > 0 ? scoresWithoutBureau : creditReportData.scores,
                accounts: creditReportData.accounts,
                inquiries: creditReportData.inquiries
                // Note: rawData intentionally not sent - contains PII (names, addresses)
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
        console.log('CardTool Credit: Initializing credit report tracking...');
        // Check if we're on a credit bureau site
        const isCreditBureauSite = setupCreditReportInterceptor();
        
        if (isCreditBureauSite) {
            console.log('CardTool Credit: Initialized on credit bureau site');
        }
    }

    // ============================================
    // START
    // ============================================

    // Install credit interceptors IMMEDIATELY (before page loads)
    // This must happen at document-start to catch early API calls
    console.log('CardTool: Installing interceptors at document-start');
    initCreditReportTracking();

    // Wait for DOM to be ready for everything else
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('CardTool: DOM ready, initializing UI');
            init();
        });
    } else {
        console.log('CardTool: DOM already ready, initializing UI');
        init();
    }
})();
