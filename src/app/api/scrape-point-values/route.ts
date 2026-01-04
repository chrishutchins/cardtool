import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

// Extra aliases for currency names - keys should match DB currency names (lowercase)
// These map to alternative names that scraped sites might use
const extraAliases: Record<string, string[]> = {
  // Transferable Points (DB names as keys)
  "ultimate rewards": ["chase ultimate rewards", "chase ur", "chase (ultimate rewards)"],
  "membership rewards": ["amex membership rewards", "amex mr", "mr points", "american express membership rewards", "amex (membership rewards)"],
  "bilt rewards": ["bilt"],
  "thankyou points": ["citi thankyou", "thankyou rewards", "citi ty", "thank you", "citibank (thankyou rewards)", "citibank thankyou rewards", "citi thankyou rewards"],
  "capital one miles": ["capital one", "c1 miles", "capital one venture"],
  "wells fargo rewards": ["wells fargo", "wells fargo (go far rewards)", "go far rewards"],
  "boa points": ["bank of america", "bank of america rewards", "preferred rewards", "bank of america travel rewards"],
  "us bank rewards": ["us bank", "u.s. bank"],
  
  // Airline Miles (DB names as keys)
  "aeroplan": ["air canada aeroplan", "air canada (aeroplan)", "air canada"],
  "alaska": ["alaska mileageplan", "alaska miles", "alaska airlines mileage plan", "alaska airlines atmos rewards", "alaska airlines (atmos rewards)", "alaska airlines"],
  "american": ["american aadvantage", "aadvantage", "american airlines", "american airlines aadvantage", "american airlines (aadvantage)"],
  "delta": ["delta skymiles", "skymiles", "delta air lines skymiles", "delta air lines (skymiles)", "delta air lines"],
  "jetblue": ["jetblue trueblue", "trueblue", "jetblue airways (trueblue)", "jetblue airways"],
  "southwest": ["southwest rapid rewards", "rapid rewards", "southwest airlines rapid rewards", "southwest airlines (rapid rewards)", "southwest airlines"],
  "united": ["united mileageplus", "mileageplus", "united airlines mileageplus", "united airlines (mileage plus)", "united airlines"],
  
  // Hotel Points (DB names as keys)
  "bonvoy": ["marriott bonvoy", "marriott"],
  "hyatt": ["world of hyatt", "hyatt (world of hyatt)"],
  "hilton": ["hilton honors", "hilton (honors)"],
  "ihg": ["ihg rewards", "ihg one rewards", "ihg hotels & resorts (one rewards)"],
  "wyndham rewards": ["wyndham", "wyndham (wyndham rewards)"],
};

interface ScrapedValue {
  sourceName: string;
  value: number;
  matchedCode: string | null;
}

interface Currency {
  code: string;
  name: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Currencies that should never be updated by the scraper
const EXCLUDED_CURRENCY_CODES = new Set(["CASH"]);

// Build a mapping of aliases to currency codes based on DB currencies
function buildCurrencyMappings(currencies: Currency[]): Map<string, string> {
  const aliasToCode = new Map<string, string>();
  
  for (const currency of currencies) {
    // Skip excluded currencies
    if (EXCLUDED_CURRENCY_CODES.has(currency.code)) {
      continue;
    }
    
    const normalizedName = currency.name.toLowerCase().trim();
    
    // Add the currency name itself as an alias
    aliasToCode.set(normalizedName, currency.code);
    
    // Check if this currency name matches any extra alias keys (exact match only)
    for (const [aliasKey, aliases] of Object.entries(extraAliases)) {
      // Use exact match to avoid cross-contamination
      if (normalizedName === aliasKey) {
        // Add all the extra aliases for this currency
        for (const alias of aliases) {
          aliasToCode.set(alias.toLowerCase(), currency.code);
        }
      }
    }
  }
  
  logger.debug({ aliasCount: aliasToCode.size }, 'Currency alias mapping built');
  return aliasToCode;
}

function findCurrencyCode(name: string, aliasToCode: Map<string, string>): string | null {
  const normalizedName = decodeHtmlEntities(name.toLowerCase().trim());
  
  // Try exact match first
  if (aliasToCode.has(normalizedName)) {
    return aliasToCode.get(normalizedName)!;
  }
  
  // Try to find a match by checking if the scraped name contains any known alias
  // Sort aliases by length (longest first) to prefer more specific matches
  const sortedAliases = [...aliasToCode.entries()].sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, code] of sortedAliases) {
    // Only match if the scraped name contains the alias (not the reverse)
    if (normalizedName.includes(alias)) {
      return code;
    }
  }
  
  return null;
}

function parseFrequentMilerPage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // Parse all tables looking for program name + value pairs
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  for (const table of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        // Strip HTML tags and clean up whitespace
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // Need at least 2 cells (name + value)
      if (cells.length >= 2) {
        const programName = cells[0];
        const valueStr = cells[1];
        const value = parseFloat(valueStr);
        
        if (programName && !isNaN(value) && value > 0 && value < 10) {
          const matchedCode = findCurrencyCode(programName, aliasToCode);
          results.push({
            sourceName: programName,
            value: value,
            matchedCode,
          });
        }
      }
    }
  }
  
  return results;
}

function parseNerdWalletPage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // NerdWallet has tables with "Program" and "Value per point" columns
  // Values are formatted as "1.2 cents." or "0.8 cent."
  
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  for (const table of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let rowCount = 0;
    
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      rowCount++;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // NerdWallet has Program in first column, Value in second
      if (cells.length >= 2) {
        const programName = cells[0];
        // Extract number from "1.2 cents." or "0.8 cent." format
        const valueMatch = cells[1].match(/([\d.]+)\s*cents?/i);
        
        if (valueMatch) {
          const value = parseFloat(valueMatch[1]);
          
          if (programName && !isNaN(value) && value > 0 && value < 10) {
            const matchedCode = findCurrencyCode(programName, aliasToCode);
            results.push({
              sourceName: programName,
              value: value,
              matchedCode,
            });
          }
        }
      }
    }
  }
  
  return results;
}

function parseBankratePage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // Bankrate has tables with 3 columns:
  // 1. Rewards program
  // 2. Baseline value (1 cent, etc.)
  // 3. Bankrate value* (the one we want - e.g., "2.0 cents")
  
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  for (const table of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells: string[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // Bankrate tables have at least 3 columns: Program, Baseline, Bankrate value
      // We want column index 2 (the 3rd column - Bankrate value)
      if (cells.length >= 3) {
        const programName = cells[0];
        const bankrateValueStr = cells[2]; // 3rd column is the Bankrate value
        
        // Parse value like "2.0 cents" or "1.7 cents"
        const valueMatch = bankrateValueStr.match(/([\d.]+)\s*cents?/i);
        
        if (valueMatch) {
          const value = parseFloat(valueMatch[1]);
          
          if (programName && !isNaN(value) && value > 0 && value < 10) {
            const matchedCode = findCurrencyCode(programName, aliasToCode);
            results.push({
              sourceName: programName,
              value: value,
              matchedCode,
            });
          }
        }
      }
    }
  }
  
  return results;
}

function parseAwardWalletPage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // AwardWallet embeds data in a script tag as: window.mileValueDatas = {...}
  const jsonMatch = html.match(/window\.mileValueDatas\s*=\s*\/\*\s*DATA START\s*\*\/([\s\S]*?)\/\*\s*DATA END\s*\*\//);
  
  if (!jsonMatch) {
    logger.debug({}, 'AwardWallet: Could not find embedded JSON data');
    return results;
  }
  
  try {
    const data = JSON.parse(jsonMatch[1]);
    
    // Process each category: transfers, airlines, hotels
    const categories = ['transfers', 'airlines', 'hotels'];
    
    for (const category of categories) {
      const categoryData = data[category]?.data;
      if (!Array.isArray(categoryData)) continue;
      
      for (const item of categoryData) {
        const displayName = item.DisplayName;
        const avgValue = item.show?.AvgPointValue;
        
        if (displayName && typeof avgValue === 'number' && avgValue > 0 && avgValue < 10) {
          const matchedCode = findCurrencyCode(displayName, aliasToCode);
          results.push({
            sourceName: displayName,
            value: avgValue,
            matchedCode,
          });
        }
      }
    }
    
    logger.debug({ count: results.length }, 'AwardWallet: Parsed values from embedded JSON');
    
  } catch (err) {
    logger.error({ err }, 'AwardWallet: Failed to parse JSON');
  }
  
  return results;
}

function parseThePointsGuyPage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // TPG has tables with program name and cent values
  // Values can be in format "1.9 cents" or "1.9¢" or just "1.9"
  
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  for (const table of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells: string[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // TPG tables typically have: Program Name | Value (cents)
      // Sometimes there might be additional columns
      if (cells.length >= 2) {
        const programName = cells[0];
        
        // Try to find a value in any of the remaining cells
        for (let i = 1; i < cells.length; i++) {
          const cellContent = cells[i];
          // Parse value like "1.9 cents", "1.9¢", or just "1.9"
          const valueMatch = cellContent.match(/([\d.]+)\s*(?:cents?|¢)?/i);
          
          if (valueMatch) {
            const value = parseFloat(valueMatch[1]);
            
            if (programName && !isNaN(value) && value > 0 && value < 10) {
              const matchedCode = findCurrencyCode(programName, aliasToCode);
              results.push({
                sourceName: programName,
                value: value,
                matchedCode,
              });
              break; // Only take the first valid value for this row
            }
          }
        }
      }
    }
  }
  
  return results;
}

function parseGenericPage(html: string, aliasToCode: Map<string, string>): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // Try to find any tables with point/mile values
  // Look for patterns like "Program: X.XX cents" or table cells with numbers
  
  // Generic table cell parsing
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  
  for (const table of tables) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells: string[] = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }
      
      // Look for a cell with a program name and a cell with a value
      for (let i = 0; i < cells.length - 1; i++) {
        const potentialName = cells[i];
        // Handle values with ¢ suffix
        const valueStr = cells[i + 1].replace(/[¢%]/g, '').trim();
        const potentialValue = parseFloat(valueStr);
        
        if (potentialName && !isNaN(potentialValue) && potentialValue > 0 && potentialValue < 10) {
          const matchedCode = findCurrencyCode(potentialName, aliasToCode);
          if (matchedCode) {
            results.push({
              sourceName: potentialName,
              value: potentialValue,
              matchedCode,
            });
          }
        }
      }
    }
  }
  
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    
    // Fetch currencies from database to build dynamic mappings
    const supabase = await createClient();
    const { data: currencies, error: currencyError } = await supabase
      .from("reward_currencies")
      .select("code, name");
    
    if (currencyError || !currencies) {
      logger.error({ err: currencyError }, 'Failed to fetch currencies for scraping');
      return NextResponse.json(
        { error: "Failed to fetch currency mappings" },
        { status: 500 }
      );
    }
    
    // Build the alias-to-code mapping from database currencies
    const aliasToCode = buildCurrencyMappings(currencies);
    logger.debug({ currencyCount: currencies.length, aliasCount: aliasToCode.size }, 'Built currency mappings for scraper');
    
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CardTool/1.0)",
        "Accept": "text/html",
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }
    
    const html = await response.text();
    
    // Parse based on domain
    let values: ScrapedValue[];
    
    if (parsedUrl.hostname.includes("frequentmiler")) {
      values = parseFrequentMilerPage(html, aliasToCode);
    } else if (parsedUrl.hostname.includes("awardwallet")) {
      values = parseAwardWalletPage(html, aliasToCode);
    } else if (parsedUrl.hostname.includes("nerdwallet")) {
      values = parseNerdWalletPage(html, aliasToCode);
    } else if (parsedUrl.hostname.includes("bankrate")) {
      values = parseBankratePage(html, aliasToCode);
    } else if (parsedUrl.hostname.includes("thepointsguy")) {
      values = parseThePointsGuyPage(html, aliasToCode);
    } else {
      values = parseGenericPage(html, aliasToCode);
    }
    
    // Deduplicate matched values by code, keeping the first occurrence
    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();
    
    const deduped = values.filter((v) => {
      // Skip duplicates by name (case-insensitive)
      const normalizedName = v.sourceName.toLowerCase();
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      
      // For matched codes, skip if we've already seen this code
      if (v.matchedCode) {
        if (seenCodes.has(v.matchedCode)) return false;
        seenCodes.add(v.matchedCode);
      }
      
      return true;
    });
    
    return NextResponse.json({
      success: true,
      values: deduped,
      totalFound: values.length,
      matched: deduped.filter(v => v.matchedCode).length,
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Failed to scrape URL');
    return NextResponse.json(
      { error: "Failed to scrape URL" },
      { status: 500 }
    );
  }
}

