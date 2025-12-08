import { NextRequest, NextResponse } from "next/server";

// Mapping of common source names to our currency codes
// The keys are our actual database currency codes (from reward_currencies table)
const currencyMappings: Record<string, string[]> = {
  // Transferable Points (using actual DB codes)
  "UR": ["chase ultimate rewards", "chase ur", "ultimate rewards", "chase (ultimate rewards)"],
  "MR": ["amex membership rewards", "membership rewards", "amex mr", "mr points", "american express membership rewards", "amex (membership rewards)"],
  "BILT": ["bilt", "bilt rewards"],
  "TYP": ["citi thankyou", "thankyou rewards", "thankyou points", "citi ty", "thank you", "citi thankyou rewards", "citibank (thankyou rewards)"],
  "C1": ["capital one", "capital one miles", "c1 miles"],
  "WF": ["wells fargo", "wells fargo rewards", "wells fargo (go far rewards)"],
  "BOA": ["bank of america", "boa points", "preferred rewards"],
  "USB": ["us bank", "us bank rewards"],
  "MESA": ["mesa"],
  
  // Airline Miles
  "AC": ["air canada aeroplan", "aeroplan", "air canada (aeroplan)"],
  "AS": ["alaska mileageplan", "alaska miles", "alaska", "alaska airlines mileage plan", "alaska airlines atmos rewards", "alaska airlines (atmos rewards)"],
  "AA": ["american aadvantage", "aadvantage", "american airlines", "american airlines aadvantage", "american", "american airlines (aadvantage)"],
  "DL": ["delta skymiles", "skymiles", "delta", "delta air lines skymiles", "delta air lines (skymiles)"],
  "B6": ["jetblue trueblue", "trueblue", "jetblue", "jetblue airways (trueblue)"],
  "SW": ["southwest rapid rewards", "rapid rewards", "southwest", "southwest airlines rapid rewards", "southwest airlines (rapid rewards)"],
  "UA": ["united mileageplus", "mileageplus", "united", "united airlines mileageplus", "united airlines (mileage plus)"],
  
  // Hotel Points
  "MB": ["marriott bonvoy", "bonvoy", "marriott"],
  "WOH": ["world of hyatt", "hyatt", "hyatt (world of hyatt)"],
  "HH": ["hilton honors", "hilton", "hilton (honors)"],
  "IHG": ["ihg rewards", "ihg one rewards", "ihg", "ihg hotels & resorts (one rewards)"],
  
  // These currencies don't exist in our DB yet, but keeping mappings for future:
  // "FLYING_BLUE": ["air france klm", "flying blue"],
  // "LIFEMILES": ["avianca lifemiles", "lifemiles"],
  // "AVIOS": ["british airways avios", "avios"],
  // "EMIRATES": ["emirates skywards", "emirates"],
  // "ETIHAD": ["etihad guest", "etihad"],
  // "FRONTIER": ["frontier miles", "frontier"],
  // "SPIRIT": ["spirit free spirit", "spirit"],
  // "TURKISH": ["turkish miles&smiles", "turkish"],
  // "VIRGIN_ATLANTIC": ["virgin atlantic", "flying club"],
  // "WYNDHAM": ["wyndham rewards", "wyndham"],
  // "CHOICE": ["choice privileges", "choice"],
  // "BEST_WESTERN": ["best western rewards", "best western"],
  // "ACCOR": ["accor live limitless", "accor"],
};

interface ScrapedValue {
  sourceName: string;
  value: number;
  matchedCode: string | null;
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

function findCurrencyCode(name: string): string | null {
  const normalizedName = decodeHtmlEntities(name.toLowerCase().trim());
  
  for (const [code, aliases] of Object.entries(currencyMappings)) {
    for (const alias of aliases) {
      if (normalizedName.includes(alias) || alias.includes(normalizedName)) {
        return code;
      }
    }
  }
  
  return null;
}

function parseFrequentMilerPage(html: string): ScrapedValue[] {
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
          const matchedCode = findCurrencyCode(programName);
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

function parseNerdWalletPage(html: string): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // NerdWallet has tables with "Program" and "Value per point" columns
  // Values are formatted as "1.2 cents." or "0.8 cent."
  
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
            const matchedCode = findCurrencyCode(programName);
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

function parseAwardWalletPage(html: string): ScrapedValue[] {
  const results: ScrapedValue[] = [];
  
  // AwardWallet embeds data in a script tag as: window.mileValueDatas = {...}
  const jsonMatch = html.match(/window\.mileValueDatas\s*=\s*\/\*\s*DATA START\s*\*\/([\s\S]*?)\/\*\s*DATA END\s*\*\//);
  
  if (!jsonMatch) {
    console.log("[AWARDWALLET] Could not find embedded JSON data");
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
          const matchedCode = findCurrencyCode(displayName);
          results.push({
            sourceName: displayName,
            value: avgValue,
            matchedCode,
          });
        }
      }
    }
    
    console.log(`[AWARDWALLET] Parsed ${results.length} values from embedded JSON`);
    
  } catch (err) {
    console.error("[AWARDWALLET] Failed to parse JSON:", err);
  }
  
  return results;
}

function parseGenericPage(html: string): ScrapedValue[] {
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
          const matchedCode = findCurrencyCode(potentialName);
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
      values = parseFrequentMilerPage(html);
    } else if (parsedUrl.hostname.includes("awardwallet")) {
      values = parseAwardWalletPage(html);
    } else if (parsedUrl.hostname.includes("nerdwallet")) {
      values = parseNerdWalletPage(html);
    } else {
      values = parseGenericPage(html);
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
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape URL" },
      { status: 500 }
    );
  }
}

