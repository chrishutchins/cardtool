# Kudos Import System

This document describes the system for importing and matching credit card data from Kudos to CardTool.

## Database Schema

### Main Tables

#### `kudos_cards`
The primary table containing all scraped card data (~2,813 cards).

| Column | Type | Description |
|--------|------|-------------|
| `id` | text | Kudos card ID (primary key) |
| `name` | text | Card name |
| `bank` | text | Issuing bank name |
| `network` | text | Card network (Visa, Mastercard, Amex) |
| `annual_fee` | numeric | Annual fee amount |
| `type` | text | Card type |
| `image_uri` | text | Card image URL |
| `cardtool_card_id` | uuid | **FK to `cards.id`** - set when matched |
| `match_rejected` | boolean | True if user rejected a fuzzy match |
| `import_flagged` | boolean | True if user flagged for import |
| `kudos_rating_score` | numeric | Kudos rating |
| `is_diamond_set` | boolean | Part of Kudos "diamond" set |
| `is_recommendable` | boolean | Kudos recommends this card |
| `monetized_status` | text | Monetization status |

#### Related Data Tables

| Table | Description | Link |
|-------|-------------|------|
| `kudos_issuers` | Bank/issuer details | `kudos_cards.issuer_id` |
| `kudos_rewards` | Earning rates by category | `card_id` |
| `kudos_benefits` | Card benefits/perks | `card_id` |
| `kudos_cash_credits` | Statement credits | `card_id` |
| `kudos_welcome_offers` | Sign-up bonuses | `card_id` |
| `kudos_rotating_rewards` | Rotating category bonuses | `card_id` |
| `kudos_redemption_options` | Point redemption options | `card_id` |
| `kudos_editorials` | Editorial content | `card_id` |
| `kudos_card_tiers` | Card tier information | `card_id` |
| `kudos_categories` | Spending categories | Referenced by rewards |
| `kudos_merchants` | Merchant information | Referenced by rewards |

## Matching System

### Match Types

| Type | Symbol | Database State | Description |
|------|--------|----------------|-------------|
| Linked | 🔗 | `cardtool_card_id` is set | Confirmed match |
| Fuzzy | ~ | No DB link, algorithm matched | Auto-detected, awaiting review |
| Rejected | ✕ | `match_rejected = true` | User rejected, won't fuzzy match |
| None | - | No link, no match | Card not in CardTool |

### Fuzzy Matching Algorithm

Located in `/src/app/kudos-explorer/page.tsx`

#### Step 1: Name Normalization
```javascript
function normalizeCardName(name) {
  return name
    .toLowerCase()
    .replace(/®|™|℠/g, '')           // Remove trademark symbols
    .replace(/delta skymiles/gi, 'delta')
    .replace(/southwest rapid rewards/gi, 'southwest')
    .replace(/ihg one rewards/gi, 'ihg')
    .replace(/u\.s\. bank/gi, 'usbank')
    .replace(/american express/gi, 'amex')
    // ... more normalizations
}
```

#### Step 2: Issuer Matching
```javascript
function issuersMatch(kudosBank, ctIssuer) {
  // Checks aliases like:
  // - "Barclaycard" = "Barclays"
  // - "First National Bank of Omaha" = "FNBO"
  // - "Chase Bank" = "Chase"
}
```

#### Step 3: Pattern Matching
Special cases for common naming differences:
- `Delta SkyMiles® Blue` → `Delta Blue`
- `Southwest Rapid Rewards® Plus` → `Southwest Plus`
- `IHG One Rewards Premier` → `IHG Premier`
- `The Business Platinum Card®` → `Amex Business Platinum`

**Both name pattern AND issuer must match.**

## Explorer UI

### Files (Local Only - gitignored)

```
/src/app/kudos-explorer/
  page.tsx              # Server component - fetches data, runs fuzzy matching
  explorer-client.tsx   # Client component - table UI with filters

/src/app/kudos-explorer/[id]/
  page.tsx              # Card detail server component
  card-detail-client.tsx # Card detail UI

/src/app/api/kudos/
  match/route.ts        # API for saving matches
```

### Filters Available

- **Search** - Card name, bank, or CT match name
- **Bank** - Filter by issuing bank
- **Network** - Visa, Mastercard, Amex, Discover
- **Type** - Card type filter
- **Diamond** - Kudos diamond set cards
- **Recommendable** - Cards Kudos recommends
- **Monetized** - Monetized cards
- **Has Rating** - Cards with Kudos ratings
- **Import Flagged** - Cards flagged for import
- **In CT** - All / Confirmed / Unconfirmed / Rejected / No match

## API Endpoints

### POST `/api/kudos/match`

Save a match, reject a match, or flag for import.

**Request:**
```json
{
  "kudosCardId": "123",           // Required - Kudos card ID
  "cardtoolCardId": "uuid-here",  // CT card ID to link (null to unlink)
  "reject": true,                 // Optional - set match_rejected flag
  "importFlagged": true           // Optional - set import_flagged flag
}
```

**Response:**
```json
{ "success": true }
```

### GET `/api/kudos/match`

Get all CardTool cards for the matching dropdown.

**Response:**
```json
{
  "cards": [
    { "id": "uuid", "name": "Card Name", "issuers": { "name": "Chase" } }
  ]
}
```

## Useful Queries

### Find unmatched CardTool cards
```sql
SELECT c.name, i.name as issuer 
FROM cards c 
LEFT JOIN issuers i ON c.issuer_id = i.id 
WHERE c.is_active = true 
AND c.id NOT IN (
  SELECT cardtool_card_id 
  FROM kudos_cards 
  WHERE cardtool_card_id IS NOT NULL
)
ORDER BY i.name, c.name;
```

### Find all confirmed matches
```sql
SELECT kc.name as kudos_name, c.name as ct_name
FROM kudos_cards kc
JOIN cards c ON kc.cardtool_card_id = c.id
ORDER BY c.name;
```

### Find cards flagged for import
```sql
SELECT id, name, bank, annual_fee
FROM kudos_cards
WHERE import_flagged = true
ORDER BY name;
```

### Get card details with benefits/credits
```sql
SELECT 
  kc.name,
  (SELECT COUNT(*) FROM kudos_benefits WHERE card_id = kc.id) as benefit_count,
  (SELECT COUNT(*) FROM kudos_cash_credits WHERE card_id = kc.id) as credit_count,
  (SELECT COUNT(*) FROM kudos_rewards WHERE card_id = kc.id) as reward_count
FROM kudos_cards kc
WHERE kc.id = '2290'; -- Amex Business Platinum
```

## Files in .gitignore

These files are local-only and not deployed to production:

```
/src/app/kudos-explorer/
/src/app/api/kudos/
/scripts/kudos-*.ts
/scripts/scrape-kudos.ts
/scripts/find-missing-cards.ts
/scripts/find-unmatched-ct.ts
```

## Current Status

- **Total Kudos cards:** ~2,813
- **CardTool cards:** 153 active
- **Matched:** ~132 (linked + fuzzy)
- **Unmatched CT cards:** ~21 (some don't exist in Kudos)
