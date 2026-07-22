/**
 * Location Utilities for Alumni Career Trajectory Platform
 * Implements intelligent location mapping, normalization, and validation.
 */

// Mapping of common organization names to their confirmed offices/headquarters (Priority 6)
export const ORGANIZATION_OFFICES: Record<string, string> = {
  "World Bank": "Washington DC, USA",
  "The World Bank": "Washington DC, USA",
  "UNICEF": "New York, USA",
  "J-PAL": "Cambridge, USA",
  "Abdul Latif Jameel Poverty Action Lab": "Cambridge, USA",
  "Govt of Maharashtra": "Mumbai, Maharashtra, India",
  "Government of Maharashtra": "Mumbai, Maharashtra, India",
  "The Behavioural Insights Team": "London, UK",
  "McKinsey & Company": "New York, USA",
  "McKinsey": "New York, USA",
  "TISS": "Mumbai, Maharashtra, India",
  "Tata Institute of Social Sciences": "Mumbai, Maharashtra, India",
  "TISS, Mumbai": "Mumbai, Maharashtra, India",
  "Dharma Life": "Delhi, India",
  "Sattva Consulting": "Bangalore, Karnataka, India",
  "Sattva": "Bangalore, Karnataka, India",
  "Sagana": "Geneva, Switzerland",
  "Technoserve": "Mumbai, Maharashtra, India",
  "United for Global Mental Health": "London, UK",
  "The University of Edinburgh": "Edinburgh, UK",
  "Dalberg": "Mumbai, Maharashtra, India",
  "Oxford Policy Management": "Delhi, India",
  "Clinton Health Access Initiative": "Delhi, India",
  "Samagra": "Delhi, India",
  "Central Square Foundation": "Delhi, India",
  "Piramal Foundation": "Mumbai, Maharashtra, India",
  "National Livelihoods Mission": "Delhi, India",
  "Pratham": "Mumbai, Maharashtra, India",
  "Azim Premji Foundation": "Bangalore, Karnataka, India",
  "Azim Premji University": "Bangalore, Karnataka, India",
  "NITI Aayog": "Delhi, India",
  "Independent": "Location Not Available",
  // New additions from database seed / standard organizations
  "5 Elements Sustainable Development Group": "New Delhi, Delhi, India",
  "ASER Centre": "New Delhi, Delhi, India",
  "Columbia University": "New York, USA",
  "FLAME University": "Pune, Maharashtra, India",
  "GroupM": "Mumbai, Maharashtra, India",
  "ICRW": "New Delhi, Delhi, India",
  "Imago Global Grassroots": "Washington DC, USA",
  "Indus Action": "New Delhi, Delhi, India",
  "Intelehealth": "Mumbai, Maharashtra, India",
  "ISS": "The Hague, Netherlands",
  "MicroSave Consulting": "New Delhi, Delhi, India",
  "Punjab National Bank": "New Delhi, Delhi, India",
  "Smart Cities Mission, GoI": "New Delhi, Delhi, India",
  "Swades Foundation": "Mumbai, Maharashtra, India",
  "The Nudge Institute": "Bangalore, Karnataka, India",
  "UCL Institute for Global Health": "London, UK",
  "UNHCR": "Geneva, Switzerland",
  "Freelance": "Remote"
};

// Synonyms of location columns for auto-discovery (Step 2)
export const LOCATION_COLUMN_SYNONYMS = {
  workLocation: ["work location", "work_location", "workplace location", "workplace", "work location"],
  officeLocation: ["office location", "office_location", "office city", "office location"],
  currentLocation: ["current location", "current_location", "present location", "current city"],
  location: ["location", "place", "location"],
  city: ["city", "town", "office city"],
  state: ["state", "province", "district", "region"],
  country: ["country", "nation"],
  address: ["address"]
};

/**
 * Standardizes and normalizes location strings to "City, State, Country" format (Step 4)
 */
export function normalizeLocation(locStr: string | null | undefined): string {
  if (!locStr) return "Location Not Available";
  
  const trimmed = locStr.replace(/^"|"$/g, "").trim();
  if (!trimmed) return "Location Not Available";

  const lower = trimmed.toLowerCase();

  // Handle explicit Remote cases
  if (lower === "remote" || lower === "remote, global" || lower === "fully remote" || lower === "work from home") {
    return "Remote";
  }

  // Exact & substring standardizations to clean up variations
  if (lower.includes("mumbai") || lower.includes("bombay") || lower === "tiss" || lower.includes("tiss, mumbai") || lower.includes("tiss mumbai")) {
    return "Mumbai, Maharashtra, India";
  }
  if (lower.includes("pune") || lower === "pune, india") {
    return "Pune, Maharashtra, India";
  }
  if (lower.includes("delhi") || lower.includes("new delhi")) {
    return "Delhi, India";
  }
  if (lower.includes("geneva")) {
    return "Geneva, Switzerland";
  }
  if (lower.includes("new york") || lower === "ny" || lower === "nyc" || lower === "new york, usa" || lower === "new york city") {
    return "New York, USA";
  }
  if (lower.includes("london")) {
    return "London, UK";
  }
  if (lower.includes("edinburgh")) {
    return "Edinburgh, UK";
  }
  if (lower.includes("bangalore") || lower.includes("bengaluru")) {
    return "Bangalore, Karnataka, India";
  }
  if (lower.includes("lucknow")) {
    return "Lucknow, Uttar Pradesh, India";
  }
  if (lower.includes("patna")) {
    return "Patna, Bihar, India";
  }
  if (lower.includes("kerala")) {
    return "Kerala, India";
  }
  if (lower.includes("punjab")) {
    return "Punjab, India";
  }
  if (lower.includes("raigad")) {
    return "Raigad, Maharashtra, India";
  }
  if (lower.includes("washington") || lower.includes("d.c.") || lower === "dc") {
    return "Washington DC, USA";
  }
  if (lower.includes("bochum") || lower.includes("ruhr")) {
    return "Bochum, Germany";
  }
  if (lower.includes("cambridge, ma") || lower.includes("cambridge, usa")) {
    return "Cambridge, USA";
  }

  // If already standard format "City, State, Country", return it
  if (/^[a-zA-Z\s]+,\s*[a-zA-Z\s]+,\s*[a-zA-Z\s]+$/.test(trimmed)) {
    return trimmed;
  }

  // Capitalize words nicely
  return trimmed
    .split(/[\s,]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(", ");
}

/**
 * Scrubs incoming location fields during file ingestion.
 * Strips whitespace, handles case-insensitivity, and validates
 * that values are actual locations or Remote.
 */
export function normalizeLocationData(data: string | null | undefined): string {
  if (!data) return "Location Not Available";
  
  const trimmed = data.replace(/^"|"$/g, "").trim();
  if (!trimmed) return "Location Not Available";

  const lower = trimmed.toLowerCase();

  // Validate that the value is an actual location or Remote
  if (lower === "remote" || lower === "fully remote" || lower === "work from home") {
    return "Remote";
  }

  return normalizeLocation(trimmed);
}

/**
 * Searches column headers to detect matched indexes based on priority synonyms
 */
export function findColumnIndexBySynonyms(headers: string[], synonyms: string[]): number {
  return headers.findIndex(h => {
    const lowerH = h.toLowerCase().trim();
    return synonyms.some(syn => {
      const lowerSyn = syn.toLowerCase().trim();
      return lowerH === lowerSyn || lowerH.includes(lowerSyn);
    });
  });
}

/**
 * Automatically discovers columns in uploaded headers for locations (Step 2)
 */
export function autoDiscoverLocationColumns(headers: string[]): Record<string, number> {
  const discovered: Record<string, number> = {};
  
  Object.entries(LOCATION_COLUMN_SYNONYMS).forEach(([key, synonyms]) => {
    const idx = findColumnIndexBySynonyms(headers, synonyms);
    if (idx !== -1) {
      discovered[key] = idx;
    }
  });

  return discovered;
}

/**
 * Extract an alumnus's location based on mapping, headers, and the priority rules (Step 3)
 */
export function extractIntelligentLocation(
  row: string[],
  mapping: Record<string, number>,
  headers: string[],
  currentCompany: string = "",
  trajectorySteps: any[] = []
): string {
  const getValByIdx = (idx: number | undefined): string => {
    if (idx === undefined || idx === -1 || idx >= row.length) return "";
    const val = row[idx];
    return val === null || val === undefined ? "" : String(val).trim();
  };

  // Pre-discovered or pre-mapped location indexes
  const workLocIdx = mapping["workLocation"] !== undefined ? mapping["workLocation"] : mapping["location"];
  const officeLocIdx = mapping["officeLocation"];
  const currentLocIdx = mapping["currentLocation"];
  const cityIdx = mapping["city"];
  const stateIdx = mapping["state"];
  const countryIdx = mapping["country"];
  const addressIdx = mapping["address"];

  // Priority 1: Work Location column
  const workLocVal = getValByIdx(workLocIdx);
  if (workLocVal && workLocVal.toLowerCase() !== "remote" && workLocVal.toLowerCase() !== "location not available") {
    return normalizeLocationData(workLocVal);
  }

  // Priority 2: Office Location column
  const officeLocVal = getValByIdx(officeLocIdx);
  if (officeLocVal && officeLocVal.toLowerCase() !== "remote") {
    return normalizeLocationData(officeLocVal);
  }

  // Priority 3: Current Location column
  const currentLocVal = getValByIdx(currentLocIdx);
  if (currentLocVal && currentLocVal.toLowerCase() !== "remote") {
    return normalizeLocationData(currentLocVal);
  }

  // Priority 4: City + State + Country combined
  const cityVal = getValByIdx(cityIdx);
  const stateVal = getValByIdx(stateIdx);
  const countryVal = getValByIdx(countryIdx);
  if (cityVal) {
    const combined = [cityVal, stateVal, countryVal].filter(Boolean).join(", ");
    return normalizeLocationData(combined);
  }

  // Priority 5: Career History / Trajectory (extract from latest non-remote step location if any)
  if (trajectorySteps && trajectorySteps.length > 0) {
    // Find the first step that has a real location
    const validStep = trajectorySteps.find(step => {
      const sLoc = String(step.location || "").trim().toLowerCase();
      return sLoc && sLoc !== "remote" && sLoc !== "location not available";
    });
    if (validStep) {
      return normalizeLocationData(validStep.location);
    }
  }

  // Priority 6: Current Organization office (only if explicitly confirmed in our metadata)
  if (currentCompany) {
    const cleanCompany = currentCompany.trim();
    // Direct matches
    if (ORGANIZATION_OFFICES[cleanCompany]) {
      return normalizeLocationData(ORGANIZATION_OFFICES[cleanCompany]);
    }
    // Substring matches
    const matchedKey = Object.keys(ORGANIZATION_OFFICES).find(key => 
      cleanCompany.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanCompany.toLowerCase())
    );
    if (matchedKey && ORGANIZATION_OFFICES[matchedKey] !== "Location Not Available") {
      return normalizeLocationData(ORGANIZATION_OFFICES[matchedKey]);
    }
  }

  // Check if we have an address column
  const addressVal = getValByIdx(addressIdx);
  if (addressVal) {
    return normalizeLocationData(addressVal);
  }

  // If the work location was explicitly "Remote", return Remote
  if (workLocVal && workLocVal.toLowerCase() === "remote") {
    return "Remote";
  }

  // No reliable location exists: return "Location Not Available" instead of defaulting to "Remote"
  return "Location Not Available";
}

/**
 * Safely formats location for public/UI display.
 * Checks if the location string is 'Remote' or empty/falsy, and returns it nicely.
 */
export function formatDisplayLocation(location: string | null | undefined): string {
  if (!location) return "Location Not Available";
  const trimmed = location.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "location not available" || lower === "n/a" || lower === "na" || lower === "-") {
    return "Location Not Available";
  }
  // Allow Remote values
  if (lower === "remote" || lower === "fully remote" || lower === "work from home") {
    return "Remote";
  }
  return trimmed;
}
