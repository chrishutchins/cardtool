"use client";

import { useState, useTransition } from "react";

interface TravelPreference {
  category_slug: string;
  preference_type: "direct" | "brand" | "portal";
  brand_name: string | null;
  portal_issuer_id: string | null;
}

interface BrandOption {
  name: string;
  currencyName: string;
}

interface PortalOption {
  issuerId: string;
  issuerName: string;
}

interface TravelPreferencesProps {
  categories: Array<{ slug: string; name: string }>;
  userPreferences: TravelPreference[];
  airlineBrands: BrandOption[];
  hotelBrands: BrandOption[];
  portalIssuers: PortalOption[];
  onUpdatePreference: (
    categorySlug: string,
    preferenceType: "direct" | "brand" | "portal",
    brandName: string | null,
    portalIssuerId: string | null
  ) => Promise<void>;
}

export function TravelPreferences({
  categories,
  userPreferences,
  airlineBrands,
  hotelBrands,
  portalIssuers,
  onUpdatePreference,
}: TravelPreferencesProps) {
  const [isPending, startTransition] = useTransition();

  // Build preference map for quick lookup
  const preferenceMap = new Map(
    userPreferences.map((p) => [p.category_slug, p])
  );

  const getPreference = (slug: string): TravelPreference | null => {
    return preferenceMap.get(slug) ?? null;
  };

  const getBrandOptions = (categorySlug: string): BrandOption[] => {
    if (categorySlug === "flights") return airlineBrands;
    if (categorySlug === "hotels") return hotelBrands;
    return [];
  };

  const getDirectOptionText = (categorySlug: string): string => {
    if (categorySlug === "flights") return "Direct with different airlines";
    if (categorySlug === "hotels") return "Direct with different hotel chains";
    if (categorySlug === "rental-car") return "Direct with rental car agency";
    return "Direct (with provider)";
  };

  const getBrandGroupLabel = (categorySlug: string): string => {
    if (categorySlug === "flights") return "Direct with one airline";
    if (categorySlug === "hotels") return "Direct with one hotel chain";
    return "Book Direct with Brand";
  };

  const handleChange = (
    categorySlug: string,
    value: string
  ) => {
    let preferenceType: "direct" | "brand" | "portal" = "direct";
    let brandName: string | null = null;
    let portalIssuerId: string | null = null;

    if (value === "direct") {
      preferenceType = "direct";
    } else if (value.startsWith("brand:")) {
      preferenceType = "brand";
      brandName = value.substring(6);
    } else if (value.startsWith("portal:")) {
      preferenceType = "portal";
      portalIssuerId = value.substring(7);
    }

    startTransition(() => {
      onUpdatePreference(categorySlug, preferenceType, brandName, portalIssuerId);
    });
  };

  const getCurrentValue = (pref: TravelPreference | null): string => {
    if (!pref) return "direct";
    if (pref.preference_type === "brand" && pref.brand_name) {
      return `brand:${pref.brand_name}`;
    }
    if (pref.preference_type === "portal" && pref.portal_issuer_id) {
      return `portal:${pref.portal_issuer_id}`;
    }
    return "direct";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        For the purpose of calculating bonuses, where should we assume you book all your travel?
      </p>
      
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((category) => {
          const pref = getPreference(category.slug);
          const brandOptions = getBrandOptions(category.slug);
          const currentValue = getCurrentValue(pref);

          return (
            <div
              key={category.slug}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
            >
              <label className="block text-sm font-medium text-white mb-2">
                {category.name}
              </label>
              <select
                value={currentValue}
                onChange={(e) => handleChange(category.slug, e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
              >
                <option value="direct">{getDirectOptionText(category.slug)}</option>
                
                {/* Brand options for flights/hotels */}
                {brandOptions.length > 0 && (
                  <optgroup label={getBrandGroupLabel(category.slug)}>
                    {brandOptions.map((brand) => (
                      <option key={brand.name} value={`brand:${brand.name}`}>
                        {brand.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Portal options */}
                {portalIssuers.length > 0 && (
                  <optgroup label="In a Travel Portal">
                    {portalIssuers.map((portal) => (
                      <option key={portal.issuerId} value={`portal:${portal.issuerId}`}>
                        {portal.issuerName} Travel Portal
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              
              {/* Hint text based on selection */}
              <p className="mt-2 text-xs text-zinc-500">
                {currentValue === "direct" && "Cards earn their standard travel rate"}
                {currentValue.startsWith("brand:") && `Cards with ${pref?.brand_name} bonuses will apply`}
                {currentValue.startsWith("portal:") && "Portal booking bonuses will apply"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

