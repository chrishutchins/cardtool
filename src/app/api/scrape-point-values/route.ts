import { NextRequest, NextResponse } from "next/server";

// Mapping of common source names to our currency codes
const currencyMappings: Record<string, string[]> = {
  // Transferable Points
  "CHASE_UR": ["chase ultimate rewards", "chase ur", "ultimate rewards"],
  "AMEX_MR": ["amex membership rewards", "membership rewards", "amex mr", "mr points"],
  "BILT": ["bilt", "bilt rewards"],
  "CITI_TY": ["citi thankyou", "thankyou rewards", "citi ty", "thank you"],
  "CAP1": ["capital one", "capital one miles", "c1 miles"],
  "WELLS_FARGO": ["wells fargo", "wells fargo rewards"],
  
  // Airline Miles
  "AEROPLAN": ["air canada aeroplan", "aeroplan"],
  "FLYING_BLUE": ["air france klm", "flying blue", "air france", "klm"],
  "ALASKA": ["alaska mileageplan", "alaska miles", "alaska"],
  "AADVANTAGE": ["american aadvantage", "aadvantage", "american airlines"],
  "LIFEMILES": ["avianca lifemiles", "lifemiles"],
  "AVIOS": ["british airways avios", "avios", "british airways"],
  "DELTA": ["delta skymiles", "skymiles", "delta"],
  "EMIRATES": ["emirates skywards", "skywards", "emirates"],
  "ETIHAD": ["etihad guest", "etihad"],
  "EVA": ["eva infinity", "eva air", "eva"],
  "FRONTIER": ["frontier miles", "frontier"],
  "HAWAIIAN": ["hawaiianmiles", "hawaiian miles", "hawaiian"],
  "JETBLUE": ["jetblue trueblue", "trueblue", "jetblue"],
  "LATAM": ["latam pass", "latam"],
  "SPIRIT": ["spirit free spirit", "free spirit", "spirit"],
  "SOUTHWEST": ["southwest rapid rewards", "rapid rewards", "southwest"],
  "TURKISH": ["turkish miles&smiles", "miles and smiles", "turkish"],
  "UNITED": ["united mileageplus", "mileageplus", "united"],
  "VIRGIN_ATLANTIC": ["virgin atlantic", "flying club"],
  "VIRGIN_AUSTRALIA": ["virgin australia", "velocity"],
  
  // Hotel Points
  "MARRIOTT": ["marriott bonvoy", "bonvoy", "marriott"],
  "HYATT": ["world of hyatt", "hyatt"],
  "HILTON": ["hilton honors", "hilton"],
  "IHG": ["ihg rewards", "ihg one rewards", "ihg"],
  "WYNDHAM": ["wyndham rewards", "wyndham"],
  "CHOICE": ["choice privileges", "choice"],
  "BEST_WESTERN": ["best western rewards", "best western"],
  "RADISSON": ["radisson rewards", "radisson"],
  "ACCOR": ["accor live limitless", "accor", "all accor"],
};

interface ScrapedValue {
  sourceName: string;
  value: number;
  matchedCode: string | null;
}

function findCurrencyCode(name: string): string | null {
  const normalizedName = name.toLowerCase().trim();
  
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
  
  // Match table rows - FM uses markdown tables that render as HTML
  // Looking for patterns like: | Program Name | 1.5 | Source text |
  // Or HTML: <td>Program Name</td><td>1.5</td>
  
  // Try HTML table parsing
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\d.]+)<\/td>/gi;
  let match;
  
  while ((match = tableRowRegex.exec(html)) !== null) {
    const programName = match[1].replace(/<[^>]*>/g, '').trim();
    const valueStr = match[2].trim();
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
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      
      // Look for a cell with a program name and a cell with a value
      for (let i = 0; i < cells.length - 1; i++) {
        const potentialName = cells[i];
        const potentialValue = parseFloat(cells[i + 1]);
        
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
    } else {
      values = parseGenericPage(html);
    }
    
    // Deduplicate by matched code, keeping the first occurrence
    const seen = new Set<string>();
    const deduped = values.filter((v) => {
      if (!v.matchedCode || seen.has(v.matchedCode)) return false;
      seen.add(v.matchedCode);
      return true;
    });
    
    return NextResponse.json({
      success: true,
      values: deduped,
      totalFound: values.length,
      matched: deduped.length,
    });
    
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape URL" },
      { status: 500 }
    );
  }
}

