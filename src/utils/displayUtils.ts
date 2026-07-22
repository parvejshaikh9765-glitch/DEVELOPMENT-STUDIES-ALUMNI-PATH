import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Alumni } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extract a valid LinkedIn URL from a text value (handles formulas, markdown, HTML, relative links, and URLs)
export function extractLinkedInUrlFromString(text: string): string | null {
  if (!text) return null;
  const textStr = String(text).trim();
  
  // 1. Try to find any URL matching linkedin.com/in/...
  const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_\/]+/gi;
  const matches = textStr.match(linkedinRegex);
  if (matches && matches.length > 0) {
    let match = matches[0].trim();
    // Clean trailing slashes, brackets or parens
    match = match.replace(/[)>\]\/\s]+$/, '');
    if (!/^https?:\/\//i.test(match)) {
      match = 'https://' + match;
    }
    return match;
  }

  // 2. Check for markdown link [Name](URL)
  const markdownMatch = textStr.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
  if (markdownMatch && markdownMatch[2]) {
    const url = markdownMatch[2];
    if (url.includes('linkedin.com')) {
      return url;
    }
  }

  // 3. Check for HTML anchor <a href="URL">...</a>
  const htmlMatch = textStr.match(/href=["'](https?:\/\/[^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    const url = htmlMatch[1];
    if (url.includes('linkedin.com')) {
      return url;
    }
  }

  return null;
}

// Extract batch/graduation year or range from arbitrary text headers, filenames, or sheet names
export function extractBatchFromText(text: string): string | null {
  if (!text) return null;
  
  const cleanText = text.replace(/_/g, ' ').replace(/\s+/g, ' ');
  
  // 1. Try to match a range first, e.g. "1998-2000", "2018-20", "2015/17"
  const rangeMatch = cleanText.match(/(19\d{2}|20\d{2})[-/](\d{2,4})/);
  if (rangeMatch) {
    const start = rangeMatch[1];
    let end = rangeMatch[2];
    if (end.length === 2) {
      end = start.substring(0, 2) + end;
    }
    const endShort = end.length === 4 ? end.substring(2) : end;
    return `${start}-${endShort}`;
  }

  // 2. Try to match a single 4-digit year, e.g. "2016", "1998"
  const yearMatch = cleanText.match(/(19\d{2}|20\d{2})/);
  if (yearMatch) {
    return yearMatch[1];
  }

  // 3. Match 2-digit years with common prefixes like "Class of '16", "Batch of 16", "Batch 16"
  const pref2DigitMatch = cleanText.match(/(?:class of|batch of|cohort|year|batch|class)[\s']*(\d{2})\b/i);
  if (pref2DigitMatch) {
    const yr = parseInt(pref2DigitMatch[1], 10);
    const fullYear = yr > 50 ? 1900 + yr : 2000 + yr;
    return String(fullYear);
  }

  // 4. Match single quote followed by 2-digit year, e.g. "'16"
  const quote2DigitMatch = cleanText.match(/'(\d{2})\b/);
  if (quote2DigitMatch) {
    const yr = parseInt(quote2DigitMatch[1], 10);
    const fullYear = yr > 50 ? 1900 + yr : 2000 + yr;
    return String(fullYear);
  }
  
  return null;
}

// Utility to verify LinkedIn URL
export function isVerifiedLinkedInUrl(url: any): boolean {
  if (url === undefined || url === null) return false;
  const clean = String(url).trim().toLowerCase();
  if (
    clean === '' || 
    clean === 'na' || 
    clean === '-' || 
    clean === 'not found' || 
    clean === 'n/a' || 
    clean === 'none' ||
    clean === 'https://linkedin.com' ||
    clean === 'http://linkedin.com' ||
    clean === 'https://www.linkedin.com' ||
    clean === 'http://www.linkedin.com'
  ) {
    return false;
  }
  return clean.includes('linkedin.com') || /^[a-z0-9-_/%]+$/i.test(clean);
}

// Utility to format any LinkedIn URL input (fully absolute)
export function formatLinkedInUrl(url: any): string {
  if (url === undefined || url === null) return '';
  let clean = String(url).trim();
  if (!clean) return '';
  
  const lower = clean.toLowerCase();
  if (
    lower === '' ||
    lower === 'na' || 
    lower === '-' || 
    lower === 'not found' || 
    lower === 'n/a' || 
    lower === 'none' ||
    lower === 'https://linkedin.com' ||
    lower === 'http://linkedin.com' ||
    lower === 'https://www.linkedin.com' ||
    lower === 'http://www.linkedin.com'
  ) {
    return '';
  }

  // If already absolute URL containing http or https
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // If it starts with linkedin.com or www.linkedin.com but lacks protocol
  if (lower.startsWith('linkedin.com') || lower.startsWith('www.linkedin.com')) {
    return 'https://' + clean;
  }

  // If it's a relative path starting with in/ or /in/ or just username
  const username = clean.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/^in\//i, '').replace(/^\//, '');
  return `https://www.linkedin.com/in/${username}`;
}

// Utility to format/clean display of batch values
export function displayBatch(batch: string | number): string {
  if (batch === "Batch Not Available" || !batch) return "Batch Not Available";
  const bStr = String(batch).trim();
  if (bStr === "" || bStr.toLowerCase() === "n/a" || bStr.toLowerCase() === "null" || bStr.toLowerCase() === "undefined") {
    return "Batch Not Available";
  }
  const lower = bStr.toLowerCase();
  if (lower.includes("batch") || lower.includes("class") || lower.includes("cohort") || lower.includes("year")) {
    return bStr;
  }
  return `Batch ${bStr}`;
}

// Utility to check if two alumni are the same person
export function areSameAlumni(a: Alumni, b: Alumni): boolean {
  const isRealIDA = a.id && !a.id.startsWith('imported-') && !a.id.startsWith('alumni-');
  const isRealIDB = b.id && !b.id.startsWith('imported-') && !b.id.startsWith('alumni-');
  if (isRealIDA && isRealIDB && a.id === b.id) {
    return true;
  }

  const cleanIdA = a.alumniId ? String(a.alumniId).trim().toLowerCase() : '';
  const cleanIdB = b.alumniId ? String(b.alumniId).trim().toLowerCase() : '';
  if (cleanIdA && cleanIdB && cleanIdA === cleanIdB) {
    return true;
  }

  const cleanL_A = a.linkedinUrl ? formatLinkedInUrl(a.linkedinUrl).toLowerCase().trim() : '';
  const cleanL_B = b.linkedinUrl ? formatLinkedInUrl(b.linkedinUrl).toLowerCase().trim() : '';
  const isLVerifiedA = isVerifiedLinkedInUrl(cleanL_A);
  const isLVerifiedB = isVerifiedLinkedInUrl(cleanL_B);

  if (cleanL_A && cleanL_B && isLVerifiedA && isLVerifiedB) {
    return cleanL_A === cleanL_B;
  }

  const cleanE_A = a.email ? a.email.toLowerCase().trim() : '';
  const cleanE_B = b.email ? b.email.toLowerCase().trim() : '';
  const isRealEmailA = cleanE_A && !cleanE_A.includes('alumni.com') && !cleanE_A.includes('example.com');
  const isRealEmailB = cleanE_B && !cleanE_B.includes('alumni.com') && !cleanE_B.includes('example.com');
  if (isRealEmailA && isRealEmailB) {
    return cleanE_A === cleanE_B;
  }

  const nameA = a.name.toLowerCase().trim();
  const nameB = b.name.toLowerCase().trim();
  if (nameA && nameA === nameB) {
    const batchA = a.batch !== undefined && a.batch !== null ? String(a.batch).trim() : "Batch Not Available";
    const batchB = b.batch !== undefined && b.batch !== null ? String(b.batch).trim() : "Batch Not Available";
    const hasBatchA = batchA && batchA !== "Batch Not Available";
    const hasBatchB = batchB && batchB !== "Batch Not Available";
    if (hasBatchA && hasBatchB) {
      return batchA === batchB;
    }
    return true;
  }

  return false;
}

export function getRecordCompleteness(a: Alumni): number {
  let score = 0;
  if (a.batch && a.batch !== "Batch Not Available") score += 10;
  if (a.email && !a.email.includes('alumni.com')) score += 5;
  if (a.linkedinUrl && isVerifiedLinkedInUrl(a.linkedinUrl)) score += 5;
  if (a.phone) score += 3;
  const dispLoc = a.location ? a.location.trim().toLowerCase() : '';
  if (dispLoc && dispLoc !== 'remote' && dispLoc !== 'fully remote' && dispLoc !== 'work from home' && dispLoc !== 'location not available') score += 2;
  if (a.currentRole) score += 3;
  if (a.currentCompany) score += 3;
  if (a.skills && a.skills.length > 0 && a.skills[0] !== 'Network') score += a.skills.length;
  if (a.trajectory && a.trajectory.length > 0) score += a.trajectory.length * 2;
  return score;
}
