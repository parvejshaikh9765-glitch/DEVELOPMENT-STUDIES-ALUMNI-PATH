import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Search, 
  Filter, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  ExternalLink,
  Sparkles,
  BarChart3,
  Calendar,
  Building2,
  Mail,
  Upload,
  X,
  Trash2,
  HelpCircle,
  Check,
  Smartphone,
  Linkedin,
  Database,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Alumni, CareerStep } from './types';
import AlumniCareerDashboard from './components/AlumniCareerDashboard';
import { enrichTrajectory, getExperienceLevel, calculateYearsOfExperience } from './utils/careerUtils';
import { mockAlumniData as initialAlumniData } from './data/mockAlumni';
import { 
  analyzeTrajectory, 
  getBatchTrends, 
  syncAlumnusData, 
  parseAlumniDataWithAI, 
  parseAlumniFileWithAI,
  getBatchComparisonAI 
} from './services/geminiService';
// @ts-ignore
import readXlsxFile from 'read-excel-file/browser';
import * as XLSX from 'xlsx';

// Utility for safe Tailwind CSS joining
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to verify LinkedIn URL
export function isVerifiedLinkedInUrl(url: string | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
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
export function formatLinkedInUrl(url: string | undefined): string {
  if (!url) return '';
  let clean = url.trim();
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

// Utility to format/clean display of batch values from the Excel sheet exactly as they are, without modifying or inferring
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

// Utility to check if two alumni are the same person using unique identifiers
export function areSameAlumni(a: Alumni, b: Alumni): boolean {
  // 1a. Check unique Alumni ID if it's not a temporary generated/imported string
  const isRealIDA = a.id && !a.id.startsWith('imported-') && !a.id.startsWith('alumni-');
  const isRealIDB = b.id && !b.id.startsWith('imported-') && !b.id.startsWith('alumni-');
  if (isRealIDA && isRealIDB && a.id === b.id) {
    return true;
  }

  // 1b. Check explicit alumniId field mapped from the Excel dataset (case-insensitive)
  const cleanIdA = a.alumniId ? String(a.alumniId).trim().toLowerCase() : '';
  const cleanIdB = b.alumniId ? String(b.alumniId).trim().toLowerCase() : '';
  if (cleanIdA && cleanIdB && cleanIdA === cleanIdB) {
    return true;
  }

  // 2. Check verified LinkedIn URL
  const cleanL_A = a.linkedinUrl ? formatLinkedInUrl(a.linkedinUrl).toLowerCase().trim() : '';
  const cleanL_B = b.linkedinUrl ? formatLinkedInUrl(b.linkedinUrl).toLowerCase().trim() : '';
  const isLVerifiedA = isVerifiedLinkedInUrl(cleanL_A);
  const isLVerifiedB = isVerifiedLinkedInUrl(cleanL_B);

  if (cleanL_A && cleanL_B && isLVerifiedA && isLVerifiedB) {
    return cleanL_A === cleanL_B;
  }

  // 3. Check unique email (exclude default/dummy email patterns like @alumni.com or @example.com)
  const cleanE_A = a.email ? a.email.toLowerCase().trim() : '';
  const cleanE_B = b.email ? b.email.toLowerCase().trim() : '';
  const isRealEmailA = cleanE_A && !cleanE_A.includes('alumni.com') && !cleanE_A.includes('example.com');
  const isRealEmailB = cleanE_B && !cleanE_B.includes('alumni.com') && !cleanE_B.includes('example.com');
  if (isRealEmailA && isRealEmailB) {
    return cleanE_A === cleanE_B;
  }

  // 4. Fallback check: only if they have the exact same name (case-insensitive, trimmed)
  const nameA = a.name.toLowerCase().trim();
  const nameB = b.name.toLowerCase().trim();
  if (nameA && nameA === nameB) {
    // Never match or merge if their non-empty batches conflict!
    const batchA = a.batch !== undefined && a.batch !== null ? String(a.batch).trim() : "Batch Not Available";
    const batchB = b.batch !== undefined && b.batch !== null ? String(b.batch).trim() : "Batch Not Available";
    
    const hasBatchA = batchA && batchA !== "Batch Not Available";
    const hasBatchB = batchB && batchB !== "Batch Not Available";
    
    if (hasBatchA && hasBatchB) {
      return batchA === batchB;
    }
    return true; // Match if one or both are "Batch Not Available" to allow cross-sheet batch matching!
  }

  return false;
}

// Calculate information completeness of an alumni record to prioritize the most complete and recent ones
export function getRecordCompleteness(a: Alumni): number {
  let score = 0;
  if (a.batch && a.batch !== "Batch Not Available") score += 10;
  if (a.email && !a.email.includes('alumni.com')) score += 5;
  if (a.linkedinUrl && isVerifiedLinkedInUrl(a.linkedinUrl)) score += 5;
  if (a.phone) score += 3;
  if (a.education) score += 3;
  if (a.department && a.department !== 'General') score += 2;
  if (a.currentRole && a.currentRole !== 'Alumnus' && a.currentRole !== 'Professional') score += 2;
  if (a.currentCompany && a.currentCompany !== 'Independent') score += 2;
  if (a.trajectory && a.trajectory.length > 0) score += a.trajectory.length;
  if (a.skills && a.skills.length > 0) score += Math.min(a.skills.length, 5);
  return score;
}

// Validate profile data and clean batch fields exactly as stored in Excel sheet
export function validateAndCleanProfile(alumnus: Alumni): Alumni | null {
  if (!alumnus.name || !alumnus.name.trim()) {
    return null; // Ignore records without a name
  }

  let cleanedBatch: string | number = "Batch Not Available";
  if (alumnus.batch !== undefined && alumnus.batch !== null) {
    const batchStr = String(alumnus.batch).trim();
    if (batchStr !== "" && batchStr !== "Batch Not Available" && batchStr.toLowerCase() !== "n/a" && batchStr.toLowerCase() !== "null" && batchStr.toLowerCase() !== "undefined") {
      cleanedBatch = batchStr;
    }
  }

  return {
    ...alumnus,
    batch: cleanedBatch
  };
}

// Utility to merge and deduplicate multiple alumni records
export function mergeAlumniData(allAlumni: Alumni[]): Alumni[] {
  const mergedList: Alumni[] = [];

  allAlumni.forEach(rawAlumnus => {
    // Validate and clean every profile before processing it to prevent incorrect batch assignments
    const alumnus = validateAndCleanProfile(rawAlumnus);
    if (!alumnus) return; // Discard invalid profiles

    // Find if we already have a merged record matching this alumnus using our unique identifier check
    let existing = mergedList.find(a => areSameAlumni(a, alumnus));

    if (existing) {
      // Merge records! Prioritize the most complete and recent source
      const existingScore = getRecordCompleteness(existing);
      const incomingScore = getRecordCompleteness(alumnus);
      
      const primary = incomingScore > existingScore ? alumnus : existing;
      const secondary = incomingScore > existingScore ? existing : alumnus;

      // Merge fields, prioritizing the primary (most complete and recent) record
      existing.name = primary.name || secondary.name;
      
      const isBatchValid = (b: any) => b && b !== "Batch Not Available";
      if (isBatchValid(primary.batch)) {
        existing.batch = primary.batch;
      } else if (isBatchValid(secondary.batch)) {
        existing.batch = secondary.batch;
      } else {
        existing.batch = "Batch Not Available";
      }

      existing.department = (primary.department && primary.department !== 'General') ? primary.department : (secondary.department || 'General');
      
      existing.currentRole = (primary.currentRole && primary.currentRole !== 'Alumnus' && primary.currentRole !== 'Professional') ? primary.currentRole : (secondary.currentRole || primary.currentRole);
      
      existing.currentCompany = (primary.currentCompany && primary.currentCompany !== 'Independent') ? primary.currentCompany : (secondary.currentCompany || primary.currentCompany);
      
      existing.location = (primary.location && primary.location !== 'Remote') ? primary.location : (secondary.location || primary.location);
      
      existing.phone = primary.phone || secondary.phone;
      existing.email = (primary.email && !primary.email.includes('alumni.com')) ? primary.email : (secondary.email || primary.email);
      existing.education = primary.education || secondary.education;
      existing.linkedinUrl = primary.linkedinUrl || secondary.linkedinUrl;

      const combinedSkills = Array.from(new Set([...(existing.skills || []), ...(alumnus.skills || [])]));
      existing.skills = combinedSkills;

      const combinedTrajectory = [...(existing.trajectory || [])];
      (alumnus.trajectory || []).forEach(step => {
        const isDuplicateStep = combinedTrajectory.some(s => 
          s.role.toLowerCase().trim() === step.role.toLowerCase().trim() && 
          s.company.toLowerCase().trim() === step.company.toLowerCase().trim()
        );
        if (!isDuplicateStep) {
          combinedTrajectory.push(step);
        }
      });
      existing.trajectory = combinedTrajectory;

      const combinedSheets = Array.from(new Set([...(existing.sourceSheets || []), ...(alumnus.sourceSheets || [])]));
      existing.sourceSheets = combinedSheets;
    } else {
      // Add a fresh copy of the record
      mergedList.push({ 
        ...alumnus,
        id: alumnus.id || `alumni-${Math.random().toString(36).substring(2, 9)}`,
        skills: [...(alumnus.skills || [])],
        trajectory: (alumnus.trajectory || []).map(t => ({ ...t })),
        sourceSheets: alumnus.sourceSheets ? [...alumnus.sourceSheets] : []
      });
    }
  });

  return mergedList;
}

// Simple Levenshtein distance for fuzzy search matches
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (Math.abs(m - n) > 2) return 999;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // Deletion
          dp[i][j - 1] + 1,    // Insertion
          dp[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }

  return dp[m][n];
}

// CSV/TSV table text parser supporting custom tab/comma delimitations
export function parseSpreadsheetText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return { headers: [], rows: [] };
  
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';
  
  const parsedLines = lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
  
  const headers = parsedLines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = parsedLines.slice(1).map(row => row.map(cell => cell.replace(/^["']|["']$/g, '').trim()));
  
  return { headers, rows };
}

// Auto detect mapping from columns using custom matching sequences
export function autoDetectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lowercaseHeaders = headers.map(h => h.toLowerCase().trim());
  
  const fields = [
    { key: 'name', terms: ['name of the alumni', 'alumni name', 'name', 'full name', 'candidate', 'student', 'grad name', 'participant', 'contact name', 'member name'] },
    { key: 'batch', terms: ['batch year', 'graduation year', 'passing year', 'academic year', 'batch', 'cohort', 'class', 'grad year', 'graduation', 'passing out year', 'class of', 'year'] },
    { key: 'department', terms: ['department', 'dept', 'stream', 'course', 'major', 'specialization', 'field of study'] },
    { key: 'currentRole', terms: ['current designation', 'current role', 'current position', 'designation', 'role', 'job title', 'current title', 'occupation'] },
    { key: 'currentCompany', terms: ['current company', 'current employer', 'current organization', 'employer', 'company', 'organization', 'working at'] },
    { key: 'career_trajectory', terms: ['career trajectory', 'trajectory', 'career history', 'work history', 'experience', 'companies', 'organizations', 'previous companies', 'past employment', 'employment history', 'all companies', 'previous organization'] },
    { key: 'job1_role', terms: ['first job title after grad', 'job title 1', 'role 1', 'first job title', 'first designation', 'designation 1', 'job 1', 'first job'] },
    { key: 'job1_company', terms: ['first employer/org', 'employer 1', 'company 1', 'first employer', 'first company', 'organization 1'] },
    { key: 'job2_role', terms: ['second job title after grad', 'job title 2', 'role 2', 'second job title', 'second designation', 'designation 2', 'job 2', 'second job'] },
    { key: 'job2_company', terms: ['second employer/org', 'employer 2', 'company 2', 'second employer', 'second company', 'organization 2'] },
    { key: 'job3_role', terms: ['third job title after grad', 'job title 3', 'role 3', 'third job title', 'third designation', 'designation 3', 'job 3', 'third job'] },
    { key: 'job3_company', terms: ['third employer/org', 'employer 3', 'company 3', 'third employer', 'third company', 'organization 3'] },
    { key: 'job4_role', terms: ['fourth job title after grad', 'job title 4', 'role 4', 'fourth job title', 'fourth designation', 'designation 4', 'job 4', 'fourth job'] },
    { key: 'job4_company', terms: ['fourth employer/org', 'employer 4', 'company 4', 'fourth employer', 'fourth company', 'organization 4'] },
    { key: 'job5_role', terms: ['fifth job title after grad', 'job title 5', 'role 5', 'fifth job title', 'fifth designation', 'designation 5', 'job 5', 'fifth job'] },
    { key: 'job5_company', terms: ['fifth employer/org', 'employer 5', 'company 5', 'fifth employer', 'fifth company', 'organization 5'] },
    { key: 'education', terms: ['higher studies', 'higher studies (if any)', 'education', 'degree', 'qualification', 'college', 'university', 'academic'] },
    { key: 'phone', terms: ['phone number', 'phone', 'mobile', 'contact no', 'contact number', 'telephone', 'mobile number'] },
    { key: 'email', terms: ['email id', 'email', 'email address', 'mail'] },
    { key: 'linkedinUrl', terms: ['linkedin', 'linkedin link', 'linkedin url', 'profile url', 'linkedin profile', 'linkedin handle'] },
    { key: 'skills', terms: ['skills', 'expertise', 'technologies', 'tools', 'key skills', 'areas of interest'] },
    { key: 'location', terms: ['location', 'city', 'country', 'current city', 'state'] },
    { key: 'alumniId', terms: ['alumni id', 'id', 'student id', 'roll no', 'roll number', 'enrollment no', 'enrollment number', 'id number'] }
  ];

  // Pass 1: Try to find an exact match for each field's terms
  fields.forEach(f => {
    const index = lowercaseHeaders.findIndex(h => f.terms.some(term => h === term));
    if (index !== -1) {
      mapping[f.key] = index;
    }
  });

  // Pass 2: For any field not yet mapped, look for exact match on the field key itself
  fields.forEach(f => {
    if (mapping[f.key] === undefined) {
      const index = lowercaseHeaders.findIndex(h => h === f.key.toLowerCase());
      if (index !== -1 && !Object.values(mapping).includes(index)) {
        mapping[f.key] = index;
      }
    }
  });

  // Pass 3: For any field not yet mapped, look for partial match (includes)
  fields.forEach(f => {
    if (mapping[f.key] === undefined) {
      const index = lowercaseHeaders.findIndex(h => f.terms.some(term => h.includes(term)));
      if (index !== -1 && !Object.values(mapping).includes(index)) {
        mapping[f.key] = index;
      }
    }
  });

  return mapping;
}

// Professional headshot placeholders used as part of the fallback chain
const PROFESSIONAL_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200", // professional woman
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200", // professional man
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200", // professional woman
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200", // professional man
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200&h=200", // professional woman
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200", // professional man
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200", // professional woman
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200", // professional man
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200", // professional woman
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200", // professional man
];

// Utility to deterministically select a professional profile fallback image using a hash of LinkedIn URL / Name
export function getDeterministicPlaceholder(name: string, linkedinUrl?: string): string {
  const seed = linkedinUrl || name;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROFESSIONAL_PLACEHOLDERS.length;
  return PROFESSIONAL_PLACEHOLDERS[index];
}

// Name validation utility to ensure parsed profile name is aligned with the alumnus record
export function validateAlumniName(alumniName: string, profileTitle: string): boolean {
  if (!alumniName || !profileTitle) return false;
  
  const cleanAlumni = alumniName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanTitle = profileTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  if (!cleanAlumni || !cleanTitle) return false;
  
  const alumniWords = cleanAlumni.split(/\s+/).filter(w => w.length > 2);
  if (alumniWords.length === 0) return true;
  
  const matches = alumniWords.filter(word => cleanTitle.includes(word));
  return matches.length >= Math.ceil(alumniWords.length / 2);
}

// Scrape LinkedIn page using active CORS proxies for og:image meta tag
export async function fetchLinkedInPage(linkedinUrl: string): Promise<{ imgUrl: string; profileTitle: string } | null> {
  const cleanUrl = formatLinkedInUrl(linkedinUrl);
  if (!cleanUrl) return null;
  
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`
  ];
  
  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;
      
      let html = '';
      if (proxyUrl.includes('allorigins')) {
        const json = await response.json();
        html = json.contents || '';
      } else {
        html = await response.text();
      }
      
      if (!html) continue;
      
      const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || 
                       html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      
      const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
                         
      const imgUrl = imgMatch ? imgMatch[1] : '';
      const profileTitle = titleMatch ? titleMatch[1] : '';
      
      if (imgUrl || profileTitle) {
        return { imgUrl, profileTitle };
      }
    } catch (e) {
      console.warn(`Proxy fetch failed for URL: ${proxyUrl}`, e);
    }
  }
  return null;
}

// Reusable Advanced Profile Photo component supporting LinkedIn scraping, caching, and fallback chains
const AlumniAvatar = ({ 
  name, 
  avatarUrl, 
  linkedinUrl, 
  size = 'md' 
}: { 
  name: string; 
  avatarUrl?: string; 
  linkedinUrl?: string; 
  size?: 'sm' | 'md' | 'lg' 
}) => {
  const [resolvedPhoto, setResolvedPhoto] = useState<string>('');
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setResolvedPhoto('');
    setImgFailed(false);
    setIsValidated(false);

    if (!linkedinUrl) return;

    const cacheKey = `li_photo_${encodeURIComponent(linkedinUrl)}`;
    const cached = localStorage.getItem(cacheKey);
    const now = Date.now();
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (now - parsed.timestamp < CACHE_TTL) {
          if (parsed.nameMatched && parsed.url) {
            setResolvedPhoto(parsed.url);
            setIsValidated(true);
            return;
          } else if (parsed.url === 'PLACEHOLDER_FALLBACK') {
            // Checked before and failed to fetch, so we use professional placeholder fallback
            setResolvedPhoto(getDeterministicPlaceholder(name, linkedinUrl));
            setIsValidated(true);
            return;
          } else {
            return;
          }
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    let active = true;
    const fetchAndCache = async () => {
      setLoading(true);
      try {
        const result = await fetchLinkedInPage(linkedinUrl);
        if (!active) return;

        if (result && result.imgUrl) {
          const matched = validateAlumniName(name, result.profileTitle);
          if (matched) {
            localStorage.setItem(cacheKey, JSON.stringify({
              url: result.imgUrl,
              nameMatched: true,
              timestamp: now
            }));
            setResolvedPhoto(result.imgUrl);
            setIsValidated(true);
          } else {
            // Name mismatch! Cache failure to avoid mismatch risk
            localStorage.setItem(cacheKey, JSON.stringify({
              url: '',
              nameMatched: false,
              timestamp: now
            }));
          }
        } else {
          // Privacy restrictions / permissions / no photo found on LinkedIn public profile
          // Save a high-quality professional fallback so we don't request continuously, but retry after TTL
          localStorage.setItem(cacheKey, JSON.stringify({
            url: 'PLACEHOLDER_FALLBACK',
            nameMatched: true,
            timestamp: now
          }));
          setResolvedPhoto(getDeterministicPlaceholder(name, linkedinUrl));
          setIsValidated(true);
        }
      } catch (err) {
        console.error("Error fetching LinkedIn photo:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAndCache();

    return () => { active = false; };
  }, [linkedinUrl, name]);

  // Determine display URL:
  // 1. Custom uploaded profile photo (avatarUrl)
  // 2. Extracted and validated LinkedIn profile photo or high-quality professional placeholder
  const displayUrl = avatarUrl || (isValidated && resolvedPhoto ? resolvedPhoto : '');

  // Calculate initials-based avatar details
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-slate-100 text-slate-800 border-slate-200',
    'bg-zinc-100 text-zinc-800 border-zinc-200',
    'bg-stone-100 text-stone-800 border-stone-200',
    'bg-red-50 text-red-800 border-red-200',
    'bg-orange-50 text-orange-800 border-orange-200',
    'bg-amber-50 text-amber-800 border-amber-200',
    'bg-emerald-50 text-emerald-800 border-emerald-200',
    'bg-teal-50 text-teal-800 border-teal-200',
    'bg-blue-50 text-blue-800 border-blue-200',
    'bg-indigo-50 text-indigo-800 border-indigo-200',
    'bg-violet-50 text-violet-800 border-violet-200',
  ];
  const colorIndex = Math.abs(hash) % colors.length;
  const colorClass = colors[colorIndex];

  const parts = name.trim().split(/\s+/);
  let initials = '';
  if (parts.length > 0 && parts[0]) {
    initials += parts[0][0].toUpperCase();
    if (parts.length > 1 && parts[parts.length - 1]) {
      initials += parts[parts.length - 1][0].toUpperCase();
    }
  }
  if (!initials) initials = 'A';

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px] font-bold rounded-full',
    md: 'w-12 h-12 text-sm font-semibold rounded-full',
    lg: 'w-24 h-24 text-2xl font-bold rounded-3xl',
  };

  const borderRoundClass = size === 'lg' ? 'rounded-3xl' : 'rounded-full';

  if (displayUrl && !imgFailed) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden border border-zinc-200 flex items-center justify-center bg-zinc-50 shadow-sm", sizeClasses[size], borderRoundClass)}>
        <img 
          src={displayUrl} 
          alt={name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
        {loading && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
            <div className="w-3.5 h-3.5 border border-zinc-500/20 border-t-zinc-700 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Fallback to initials-based avatar with custom gradient background
  return (
    <div className={cn("flex items-center justify-center border shrink-0 font-sans select-none shadow-sm", sizeClasses[size], colorClass)}>
      {initials}
    </div>
  );
};

// StatCard component
const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-zinc-50 rounded-lg">
        <Icon className="w-5 h-5 text-zinc-600" />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full animate-pulse">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-sm font-medium text-zinc-500">{title}</h3>
    <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
  </div>
);

// Individual Card component with LinkedIn photo matching and inline button support
const AlumniCard = ({ alumnus, onClick }: { alumnus: Alumni, onClick: () => void }) => {
  const hasLinkedin = isVerifiedLinkedInUrl(alumnus.linkedinUrl);
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm cursor-pointer hover:border-zinc-300 transition-all group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start gap-4">
          <AlumniAvatar name={alumnus.name} avatarUrl={alumnus.avatarUrl} linkedinUrl={alumnus.linkedinUrl} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-900 truncate group-hover:text-zinc-700">{alumnus.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
                <GraduationCap className="w-3 h-3 text-indigo-500" /> {displayBatch(alumnus.batch)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
                {calculateYearsOfExperience(alumnus)}y exp • {getExperienceLevel(alumnus)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
              {alumnus.department ? alumnus.department.split(' ')[0] : 'General'}
            </span>
            {hasLinkedin ? (
              <a 
                href={formatLinkedInUrl(alumnus.linkedinUrl)} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-zinc-400 hover:text-[#0077b5] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title={`Open ${alumnus.name}'s LinkedIn Profile`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">{alumnus.currentRole}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">{alumnus.currentCompany}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">{alumnus.location}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {alumnus.skills && alumnus.skills.slice(0, 3).map((skill, index) => (
          <span key={`${alumnus.id}-skill-${index}`} className="text-[10px] bg-zinc-50 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-100">
            {skill}
          </span>
        ))}
        {alumnus.skills && alumnus.skills.length > 3 && (
          <span className="text-[10px] text-zinc-400 px-1">+{alumnus.skills.length - 3}</span>
        )}
      </div>
    </motion.div>
  );
};

// Trajectory Timeline Component
const TrajectoryTimeline = ({ steps }: { steps: CareerStep[] }) => (
  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-zinc-200 before:via-zinc-200 before:to-transparent">
    {steps.map((step, index) => (
      <div key={step.id || `step-${index}`} className="relative flex items-start gap-6 group">
        <div className="absolute left-0 mt-1.5 w-10 h-10 rounded-full border-4 border-white bg-zinc-100 flex items-center justify-center z-10 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="ml-12 flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-zinc-900">{step.role}</h4>
            <span className="text-xs font-medium text-zinc-400 bg-zinc-50 px-2 py-1 rounded">
              {step.startDate || 'Grad'} — {step.endDate || 'Present'}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {step.company}
          </p>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {step.location || 'Remote'}
          </p>
          {step.description && (
            <p className="text-sm text-zinc-500 mt-3 leading-relaxed bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 italic">
              "{step.description}"
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export interface UploadedSheet {
  id: string;
  name: string;
  uploadDate: string;
  rowCount: number;
  columns: string[];
  alumni: Alumni[];
}

// Main App Component
export default function App() {
  // Multiple sheets support with backward-compatibility migration
  const [uploadedSheets, setUploadedSheets] = useState<UploadedSheet[]>(() => {
    try {
      const savedSheets = localStorage.getItem('alumnipath_sheets');
      if (savedSheets) {
        return JSON.parse(savedSheets);
      }
      
      // Migration from single-sheet legacy system
      const savedAlumni = localStorage.getItem('alumnipath_data');
      if (savedAlumni) {
        const alumni = JSON.parse(savedAlumni);
        if (alumni.length > 0) {
          const initialSheet: UploadedSheet = {
            id: 'sheet-legacy',
            name: 'Imported Database',
            uploadDate: new Date().toISOString(),
            rowCount: alumni.length,
            columns: ['Name', 'Batch', 'Department', 'Current Role', 'Current Company', 'Location', 'Email', 'LinkedIn URL'],
            alumni: alumni
          };
          return [initialSheet];
        }
      }
      return [];
    } catch (e) {
      console.error("Failed to load uploaded sheets from localStorage", e);
      return [];
    }
  });

  // Save changes to localStorage when uploadedSheets changes
  useEffect(() => {
    try {
      localStorage.setItem('alumnipath_sheets', JSON.stringify(uploadedSheets));
    } catch (e) {
      console.error("Failed to save sheets to localStorage", e);
    }
  }, [uploadedSheets]);

  // Unified, merged, de-duplicated alumni database computed reactively
  const alumniList = useMemo(() => {
    const allRecords: Alumni[] = [];
    uploadedSheets.forEach(sheet => {
      (sheet.alumni || []).forEach(alumnus => {
        allRecords.push({
          ...alumnus,
          sourceSheets: alumnus.sourceSheets && alumnus.sourceSheets.length > 0 
            ? alumnus.sourceSheets 
            : [sheet.name]
        });
      });
    });
    return mergeAlumniData(allRecords);
  }, [uploadedSheets]);

  // Legacy sync backup
  useEffect(() => {
    try {
      localStorage.setItem('alumnipath_data', JSON.stringify(alumniList));
    } catch (e) {
      console.error("Failed to save legacy cache", e);
    }
  }, [alumniList]);

  // Current pagination page
  const [currentPage, setCurrentPage] = useState(1);

  // Update a single alumnus across all sheets they belong to
  const handleUpdateAlumnus = (alumnusId: string, updates: Partial<Alumni>) => {
    const targetAlumnus = alumniList.find(a => a.id === alumnusId);
    if (!targetAlumnus) return;

    const targetLinkedin = targetAlumnus.linkedinUrl ? formatLinkedInUrl(targetAlumnus.linkedinUrl).toLowerCase().trim() : '';
    const targetEmail = targetAlumnus.email ? targetAlumnus.email.toLowerCase().trim() : '';
    const targetNameBatch = `${targetAlumnus.name.toLowerCase().trim()}-${targetAlumnus.batch}`;

    setUploadedSheets(prev => prev.map(sheet => {
      const updatedAlumni = (sheet.alumni || []).map(a => {
        const cleanL = a.linkedinUrl ? formatLinkedInUrl(a.linkedinUrl).toLowerCase().trim() : '';
        const cleanE = a.email ? a.email.toLowerCase().trim() : '';
        const nameBatch = `${a.name.toLowerCase().trim()}-${a.batch}`;

        const isMatch = (targetLinkedin && cleanL && targetLinkedin === cleanL) ||
                        (targetEmail && cleanE && targetEmail === cleanE) ||
                        (targetNameBatch === nameBatch);

        if (isMatch) {
          return { ...a, ...updates };
        }
        return a;
      });
      return { ...sheet, alumni: updatedAlumni };
    }));
  };

  // Delete an individual sheet
  const handleDeleteSheet = (sheetId: string) => {
    const sheetToDelete = uploadedSheets.find(s => s.id === sheetId);
    if (!sheetToDelete) return;

    setUploadedSheets(prev => prev.filter(s => s.id !== sheetId));
    setSelectedAlumnus(null);
    setAnalysis(null);
    triggerToast(`Removed data sheet "${sheetToDelete.name}".`);
  };

  // Batch process Excel/CSV rows in non-blocking chunks of 500 to prevent upload failures
  const processRowsInBatches = async (
    headers: string[],
    rows: string[][],
    mapping: Record<string, number>,
    cellLinks?: string[][]
  ): Promise<Alumni[]> => {
    return new Promise((resolve) => {
      const BATCH_SIZE = 500;
      let currentIndex = 0;
      const allResults: Alumni[] = [];

      const processNextBatch = () => {
        const nextBatchRows = rows.slice(currentIndex, currentIndex + BATCH_SIZE);
        const nextBatchLinks = cellLinks ? cellLinks.slice(currentIndex, currentIndex + BATCH_SIZE) : undefined;

        const mapped = mapRowsToAlumni(headers, nextBatchRows, mapping, nextBatchLinks);
        allResults.push(...mapped);

        currentIndex += BATCH_SIZE;

        if (currentIndex < rows.length) {
          setTimeout(processNextBatch, 0);
        } else {
          resolve(allResults);
        }
      };

      processNextBatch();
    });
  };

  // Toast State for Sandboxed iframe compliance
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'trends' | 'compare'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlumnus, setSelectedAlumnus] = useState<Alumni | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [batchFilter, setBatchFilter] = useState<string | 'all'>('all');

  // Comparison State
  const [compareBatchA, setCompareBatchA] = useState<string>('');
  const [compareBatchB, setCompareBatchB] = useState<string>('');
  const [compareAIReport, setCompareAIReport] = useState<string | null>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState<boolean>(false);

  // Advanced Career Filters state variables
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [filterExpLevel, setFilterExpLevel] = useState<string>('all');
  const [filterYears, setFilterYears] = useState<string>('all');
  const [filterCurrentCompany, setFilterCurrentCompany] = useState<string>('all');
  const [filterCurrentRole, setFilterCurrentRole] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const [showDeleteDatasetConfirm, setShowDeleteDatasetConfirm] = useState(false);
  const [showDeleteAlumnusConfirm, setShowDeleteAlumnusConfirm] = useState<string | null>(null);
  const [batchInsight, setBatchInsight] = useState<{ year: string | number; text: string } | null>(null);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState<string | number | null>(null);

  const handleDeleteAlumnus = (id: string) => {
    setUploadedSheets(prev => prev.map(sheet => ({
      ...sheet,
      alumni: (sheet.alumni || []).filter(a => a.id !== id),
      rowCount: (sheet.alumni || []).filter(a => a.id !== id).length
    })).filter(sheet => sheet.rowCount > 0));
    setSelectedAlumnus(null);
    setAnalysis(null);
    setShowDeleteAlumnusConfirm(null);
    triggerToast("Alumnus profile successfully deleted.");
  };

  const executeDeleteDataset = () => {
    localStorage.removeItem('alumnipath_sheets');
    localStorage.removeItem('alumnipath_data');
    setUploadedSheets([]);
    setSelectedAlumnus(null);
    setAnalysis(null);
    setSearchQuery('');
    setShowDeleteDatasetConfirm(false);
    triggerToast("All dataset records completely deleted.", "info");
  };

  // --- Batch Importer States ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste' | 'ai'>('upload');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [excelCellLinks, setExcelCellLinks] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  
  // Pasted data states
  const [pastedText, setPastedText] = useState('');
  
  // AI unstructured states
  const [aiText, setAiText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  
  // Common parsed result state before committing
  const [parsedAlumni, setParsedAlumni] = useState<Alumni[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Programmatic robust row mapper (100% accurate, sequential trajectory/LinkedIn verification)
  const mapRowsToAlumni = (headers: string[], rows: string[][], mapping: Record<string, number>, cellLinks?: string[][]): Alumni[] => {
    const getColumnIndex = (fieldKey: string): number | undefined => {
      return mapping[fieldKey];
    };

    return rows.map((row, rowIndex) => {
      const getFieldVal = (fieldKey: string, defaultVal: string = ''): string => {
        const colIdx = getColumnIndex(fieldKey);
        return colIdx !== undefined && colIdx !== -1 && colIdx < row.length ? row[colIdx].trim() : defaultVal;
      };

      const getFieldLink = (fieldKey: string): string => {
        const colIdx = getColumnIndex(fieldKey);
        if (cellLinks && rowIndex < cellLinks.length && colIdx !== undefined && colIdx !== -1 && colIdx < cellLinks[rowIndex].length) {
          return cellLinks[rowIndex][colIdx] || '';
        }
        return '';
      };

      const name = getFieldVal('name');
      const batchRaw = getFieldVal('batch');
      
      let batch: string | number = "Batch Not Available";
      if (batchRaw && batchRaw.trim() && batchRaw.trim().toLowerCase() !== "n/a" && batchRaw.trim().toLowerCase() !== "null" && batchRaw.trim().toLowerCase() !== "undefined") {
        batch = batchRaw.trim();
      }

      // Establish a realistic base year for trajectory timeline steps
      let baseYear = new Date().getFullYear();
      if (typeof batch === 'number') {
        baseYear = batch;
      } else if (typeof batch === 'string') {
        const digits = batch.match(/\d+/g);
        if (digits && digits.length > 0) {
          const val = parseInt(digits[digits.length - 1]);
          if (val > 1900 && val < 2100) {
            baseYear = val;
          } else if (val >= 0 && val <= 99) {
            baseYear = val < 50 ? 2000 + val : 1900 + val;
          }
        }
      }

      const department = getFieldVal('department', 'General');
      const trajectory: CareerStep[] = [];
      
      // Parse direct 'career_trajectory' column if present
      const trajectoryText = getFieldVal('career_trajectory');
      if (trajectoryText) {
        let parts: string[] = [];
        if (trajectoryText.includes('\n')) {
          parts = trajectoryText.split('\n');
        } else if (trajectoryText.includes('->')) {
          parts = trajectoryText.split('->');
        } else if (trajectoryText.includes('=>')) {
          parts = trajectoryText.split('=>');
        } else if (trajectoryText.includes('|')) {
          parts = trajectoryText.split('|');
        } else if (trajectoryText.includes('/')) {
          parts = trajectoryText.split('/');
        } else {
          parts = trajectoryText.split(',');
        }
        
        parts = parts.map(p => p.trim()).filter(Boolean);
        
        parts.forEach((part, idx) => {
          let role = 'Professional';
          let company = part;
          let stepStart = (baseYear + idx).toString();
          let stepEnd = idx === parts.length - 1 ? 'Present' : (baseYear + idx + 1).toString();
          
          const atMatches = part.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
          if (atMatches) {
            role = atMatches[1].trim();
            company = atMatches[2].trim();
          }
          
          const yearMatches = company.match(/\(([^)]+)\)/);
          if (yearMatches) {
            const yearsStr = yearMatches[1];
            company = company.replace(/\([^)]+\)/, '').trim();
            
            const yearParts = yearsStr.split(/[-–—/]/);
            if (yearParts.length > 0 && yearParts[0]) {
              const sY = yearParts[0].trim().match(/\d+/);
              if (sY) stepStart = sY[0];
            }
            if (yearParts.length > 1 && yearParts[1]) {
              if (yearParts[1].toLowerCase().includes('pres')) {
                stepEnd = 'Present';
              } else {
                const eY = yearParts[1].trim().match(/\d+/);
                if (eY) stepEnd = eY[0];
              }
            }
          }
          
          trajectory.push({
            id: `step-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            role: role,
            company: company,
            startDate: stepStart,
            endDate: stepEnd,
            location: getFieldVal('location', 'Remote'),
            description: `Part of professional trajectory at ${company}.`
          });
        });
      }

      // Fallback/addition of chronological job sequences
      if (trajectory.length === 0) {
        const slots = [
          { r: 'job1_role', c: 'job1_company' },
          { r: 'job2_role', c: 'job2_company' },
          { r: 'job3_role', c: 'job3_company' },
          { r: 'job4_role', c: 'job4_company' },
          { r: 'job5_role', c: 'job5_company' },
        ];

        slots.forEach((slot, idx) => {
          const rVal = getFieldVal(slot.r);
          const cVal = getFieldVal(slot.c);
          if (rVal && rVal !== '-' && rVal.toLowerCase() !== 'na' && rVal.toLowerCase() !== 'not found') {
            trajectory.push({
              id: `step-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              role: rVal,
              company: cVal || 'Unknown Employer',
              startDate: (baseYear + idx).toString(),
              endDate: 'Present',
              location: getFieldVal('location', 'Remote'),
              description: `Held role as ${rVal} at ${cVal || 'Unknown Employer'}.`
            });
          }
        });

        if (trajectory.length > 1) {
          for (let s = 0; s < trajectory.length - 1; s++) {
            trajectory[s].endDate = trajectory[s + 1].startDate;
          }
        }
      }

      let currentRole = getFieldVal('currentRole');
      let currentCompany = getFieldVal('currentCompany');

      if (trajectory.length > 0) {
        const lastStep = trajectory[trajectory.length - 1];
        if (!currentRole) currentRole = lastStep.role;
        if (!currentCompany) currentCompany = lastStep.company;
      } else {
        if (!currentRole) currentRole = 'Alumnus';
        if (!currentCompany) currentCompany = 'Independent';
        trajectory.push({
          id: `step-single-${Math.random().toString(36).substring(2, 6)}`,
          role: currentRole,
          company: currentCompany,
          startDate: baseYear.toString(),
          endDate: 'Present',
          location: getFieldVal('location', 'Remote'),
          description: `Active professional role as ${currentRole} at ${currentCompany}.`
        });
      }

      const location = getFieldVal('location', 'Remote');
      const email = getFieldVal('email') || `${name.toLowerCase().replace(/\s+/g, '') || 'alumnus'}@alumni.com`;
      
      const rawLinkedin = getFieldVal('linkedinUrl');
      let linkedinUrl = formatLinkedInUrl(rawLinkedin);

      // If direct linkedinUrl column is empty/invalid, or if there's a link embedded in Name
      const nameLink = getFieldLink('name');
      if (nameLink && isVerifiedLinkedInUrl(nameLink)) {
        linkedinUrl = formatLinkedInUrl(nameLink);
      }

      // If still empty, scan all cells for a LinkedIn hyperlink
      if (!linkedinUrl) {
        for (const key of Object.keys(mapping)) {
          const embeddedLink = getFieldLink(key);
          if (embeddedLink && isVerifiedLinkedInUrl(embeddedLink)) {
            linkedinUrl = formatLinkedInUrl(embeddedLink);
            break;
          }
        }
      }

      const skillsStr = getFieldVal('skills');
      const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Network'];

      const phone = getFieldVal('phone');
      const education = getFieldVal('education');
      const alumniId = getFieldVal('alumniId');

      return {
        id: `imported-${Date.now()}-${rowIndex}-${Math.random().toString(36).substring(2, 5)}`,
        name,
        batch,
        department,
        currentRole,
        currentCompany,
        location,
        email,
        linkedinUrl,
        skills,
        avatarUrl: '',
        trajectory,
        phone,
        education,
        alumniId: alumniId || undefined
      };
    });
  };

  // Search filter containing Name, Company, Role, Skills, Education, Location, Industry with multi-term AND and fuzzy Levenshtein matches
  const filteredAlumni = useMemo(() => {
    let list = alumniList;

    // Apply batch filter
    if (batchFilter !== 'all') {
      list = list.filter(a => String(a.batch) === String(batchFilter));
    }

    // Apply search query (fuzzy & multi-term matches)
    if (searchQuery.trim()) {
      const queryTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      list = list.filter(a => {
        const name = (a.name || '').toLowerCase();
        const currentRole = (a.currentRole || '').toLowerCase();
        const currentCompany = (a.currentCompany || '').toLowerCase();
        const location = (a.location || '').toLowerCase();
        const department = (a.department || '').toLowerCase();
        const education = (a.education || '').toLowerCase();
        const industry = (a.industry || '').toLowerCase();
        const skills = (a.skills || []).map(s => s.toLowerCase());
        
        const enriched = enrichTrajectory(a.trajectory || []);
        const trajectoryRoles = enriched.map(t => (t.role || '').toLowerCase());
        const trajectoryCompanies = enriched.map(t => (t.company || '').toLowerCase());

        const matchesTerm = (term: string) => {
          if (
            name.includes(term) ||
            currentRole.includes(term) ||
            currentCompany.includes(term) ||
            location.includes(term) ||
            department.includes(term) ||
            education.includes(term) ||
            industry.includes(term) ||
            skills.some(s => s.includes(term)) ||
            trajectoryRoles.some(r => r.includes(term)) ||
            trajectoryCompanies.some(c => c.includes(term))
          ) {
            return true;
          }

          const isFuzzyMatch = (target: string, query: string) => {
            if (query.length < 4) return false;
            return levenshteinDistance(target, query) <= 2;
          };

          const targetWords = [
            ...name.split(/\s+/),
            ...currentRole.split(/\s+/),
            ...currentCompany.split(/\s+/),
            ...location.split(/\s+/),
            ...department.split(/\s+/),
            ...education.split(/\s+/),
            ...industry.split(/\s+/),
            ...skills,
            ...trajectoryRoles.flatMap(r => r.split(/\s+/)),
            ...trajectoryCompanies.flatMap(c => c.split(/\s+/))
          ].filter(Boolean);

          return targetWords.some(word => isFuzzyMatch(word, term));
        };

        return queryTerms.every(term => matchesTerm(term));
      });
    }

    // Advanced Career Filters
    if (filterOrg !== 'all') {
      list = list.filter(a => (a.trajectory || []).some(t => t.company?.toLowerCase() === filterOrg.toLowerCase()));
    }
    if (filterSector !== 'all') {
      list = list.filter(a => enrichTrajectory(a.trajectory || []).some(t => t.sector?.toLowerCase() === filterSector.toLowerCase()));
    }
    if (filterCountry !== 'all') {
      list = list.filter(a => enrichTrajectory(a.trajectory || []).some(t => t.country?.toLowerCase() === filterCountry.toLowerCase()));
    }
    if (filterIndustry !== 'all') {
      list = list.filter(a => {
        const enriched = enrichTrajectory(a.trajectory || []);
        return (a.industry && a.industry.toLowerCase() === filterIndustry.toLowerCase()) || 
               enriched.some(t => t.industry?.toLowerCase() === filterIndustry.toLowerCase());
      });
    }
    if (filterFunction !== 'all') {
      list = list.filter(a => {
        const enriched = enrichTrajectory(a.trajectory || []);
        return enriched.some(t => t.role?.toLowerCase().includes(filterFunction.toLowerCase()));
      });
    }
    if (filterExpLevel !== 'all') {
      list = list.filter(a => {
        const level = getExperienceLevel(a);
        return level.toLowerCase() === filterExpLevel.toLowerCase();
      });
    }
    if (filterYears !== 'all') {
      list = list.filter(a => {
        const exp = calculateYearsOfExperience(a);
        if (filterYears === '0-2') return exp <= 2;
        if (filterYears === '3-5') return exp > 2 && exp <= 5;
        if (filterYears === '6-10') return exp > 5 && exp <= 10;
        if (filterYears === '10+') return exp > 10;
        return true;
      });
    }
    if (filterCurrentCompany !== 'all') {
      list = list.filter(a => a.currentCompany?.toLowerCase() === filterCurrentCompany.toLowerCase());
    }
    if (filterCurrentRole !== 'all') {
      list = list.filter(a => a.currentRole?.toLowerCase() === filterCurrentRole.toLowerCase());
    }

    return list;
  }, [
    searchQuery, 
    batchFilter, 
    filterOrg, 
    filterSector, 
    filterCountry, 
    filterIndustry, 
    filterFunction, 
    filterExpLevel, 
    filterYears, 
    filterCurrentCompany, 
    filterCurrentRole, 
    alumniList
  ]);

  // Reset pagination to first page whenever search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery, 
    batchFilter, 
    filterOrg, 
    filterSector, 
    filterCountry, 
    filterIndustry, 
    filterFunction, 
    filterExpLevel, 
    filterYears, 
    filterCurrentCompany, 
    filterCurrentRole
  ]);

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filteredAlumni.length / ITEMS_PER_PAGE);

  const paginatedAlumni = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlumni.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlumni, currentPage]);

  // Statistics summaries
  const stats = useMemo(() => {
    const companies = alumniList.map(a => a.currentCompany || 'Independent');
    const topCompanies = Object.entries(
      companies.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {} as Record<string, number>)
    ).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

    const batchDistribution = Object.entries(
      alumniList.reduce((acc, a) => {
        let yearNum = NaN;
        if (typeof a.batch === 'number') {
          yearNum = a.batch;
        } else if (typeof a.batch === 'string') {
          const match = a.batch.match(/\d+/);
          if (match) yearNum = parseInt(match[0]);
        }
        if (!isNaN(yearNum)) {
          acc[yearNum] = (acc[yearNum] || 0) + 1;
        }
        return acc;
      }, {} as Record<number, number>)
    ).map(([batch, count]) => ({ batch: parseInt(batch), count })).sort((a, b) => a.batch - b.batch);

    return { topCompanies, batchDistribution };
  }, [alumniList]);

  // Dynamically extract all unique values across records to populate advanced filter options
  const filterOptions = useMemo(() => {
    const orgs = new Set<string>();
    const sectors = new Set<string>();
    const countries = new Set<string>();
    const industries = new Set<string>();
    const currentCompanies = new Set<string>();
    const currentRoles = new Set<string>();
    const functionsSet = new Set<string>();

    alumniList.forEach(a => {
      if (a.currentCompany) currentCompanies.add(a.currentCompany.trim());
      if (a.currentRole) currentRoles.add(a.currentRole.trim());
      if (a.industry) industries.add(a.industry.trim());
      
      const enriched = enrichTrajectory(a.trajectory || []);
      enriched.forEach(t => {
        if (t.company) orgs.add(t.company.trim());
        if (t.sector) sectors.add(t.sector.trim());
        if (t.country) countries.add(t.country.trim());
        if (t.industry) industries.add(t.industry.trim());
        
        // Match functional role patterns
        if (t.role) {
          const roleLower = t.role.toLowerCase();
          const functionPool = [
            'Program Management', 'Project Management', 'Research', 'Policy',
            'Consulting', 'Operations', 'Strategy', 'Monitoring & Evaluation',
            'Communications', 'Fundraising', 'HR', 'Finance', 'Data Analysis',
            'GIS', 'Technology', 'Advocacy', 'Partnerships'
          ];
          functionPool.forEach(func => {
            const words = func.toLowerCase().split(' ');
            if (words.every(word => roleLower.includes(word))) {
              functionsSet.add(func);
            }
          });
        }
      });
    });

    // Fallbacks if list is small or empty
    if (functionsSet.size === 0) {
      ['Program Management', 'Project Management', 'Research', 'Policy', 'Consulting', 'Operations', 'Strategy', 'Monitoring & Evaluation', 'Advocacy', 'Technology'].forEach(f => functionsSet.add(f));
    }

    return {
      orgs: Array.from(orgs).filter(Boolean).sort(),
      sectors: Array.from(sectors).filter(Boolean).sort(),
      countries: Array.from(countries).filter(Boolean).sort(),
      industries: Array.from(industries).filter(Boolean).sort(),
      currentCompanies: Array.from(currentCompanies).filter(Boolean).sort(),
      currentRoles: Array.from(currentRoles).filter(Boolean).sort(),
      functions: Array.from(functionsSet).filter(Boolean).sort()
    };
  }, [alumniList]);

  // Extract valid batches from unified list for comparison
  const availableBatches = useMemo(() => {
    return Array.from(new Set(alumniList.map(a => String(a.batch))))
      .filter(b => b && b !== "Batch Not Available" && b.trim() !== "")
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.at(0) || "0");
        const numB = parseInt(b.match(/\d+/)?.at(0) || "0");
        return numB - numA; // Newest first
      });
  }, [alumniList]);

  // Set default comparison batches
  useEffect(() => {
    if (availableBatches.length >= 2) {
      if (!compareBatchA) setCompareBatchA(availableBatches[0]);
      if (!compareBatchB) setCompareBatchB(availableBatches[1]);
    } else if (availableBatches.length === 1) {
      if (!compareBatchA) setCompareBatchA(availableBatches[0]);
    }
  }, [availableBatches, compareBatchA, compareBatchB]);

  // Calculate advanced side-by-side cohort statistics
  const getBatchComparisonMetrics = (batchStr: string, list: Alumni[]) => {
    const batchAlumni = list.filter(a => String(a.batch) === batchStr);
    const totalCount = batchAlumni.length;
    if (totalCount === 0) {
      return {
        count: 0,
        leadershipPercent: 0,
        corpConsultingPercent: 0,
        socialNGOPercent: 0,
        globalReachPercent: 0,
        academiaResearchPercent: 0,
        avgRoles: 0,
        experiencePercent: 0,
        topEmployer: 'None',
        topSector: 'None',
        topRole: 'None',
        avgExperience: 0,
        expLevelSplit: { Entry: 0, Mid: 0, Senior: 0, Leadership: 0 }
      };
    }

    // 1. Leadership % (Senior or Leadership levels)
    let seniorOrLeadershipCount = 0;
    const expLevelSplit = { Entry: 0, Mid: 0, Senior: 0, Leadership: 0 };
    
    batchAlumni.forEach(a => {
      const level = getExperienceLevel(a);
      expLevelSplit[level] = (expLevelSplit[level] || 0) + 1;
      if (level === 'Senior' || level === 'Leadership') {
        seniorOrLeadershipCount++;
      }
    });
    const leadershipPercent = parseFloat(((seniorOrLeadershipCount / totalCount) * 100).toFixed(1));

    // 2. Corp & Consulting % (Corporate, Consulting, or Startup)
    let corpConsultingCount = 0;
    batchAlumni.forEach(a => {
      const enriched = enrichTrajectory(a.trajectory || []);
      const latestStep = enriched[enriched.length - 1];
      if (latestStep) {
        const orgType = latestStep.orgType || 'Corporate';
        if (orgType === 'Corporate' || orgType === 'Consulting' || orgType === 'Startup') {
          corpConsultingCount++;
        }
      }
    });
    const corpConsultingPercent = parseFloat(((corpConsultingCount / totalCount) * 100).toFixed(1));

    // 3. Social & NGO Focus % (NGO, Social Enterprise, Government, International Organization)
    let socialNGOCount = 0;
    batchAlumni.forEach(a => {
      const enriched = enrichTrajectory(a.trajectory || []);
      const latestStep = enriched[enriched.length - 1];
      if (latestStep) {
        const orgType = latestStep.orgType || 'Corporate';
        if (orgType === 'NGO' || orgType === 'Social Enterprise' || orgType === 'Government' || orgType === 'International Organization') {
          socialNGOCount++;
        }
      }
    });
    const socialNGOPercent = parseFloat(((socialNGOCount / totalCount) * 100).toFixed(1));

    // 4. Global Reach % (relocation international or international career steps)
    let globalReachCount = 0;
    batchAlumni.forEach(a => {
      const enriched = enrichTrajectory(a.trajectory || []);
      const hasInternational = enriched.some(step => step.country && step.country.toLowerCase() !== 'india');
      if (hasInternational) {
        globalReachCount++;
      }
    });
    const globalReachPercent = parseFloat(((globalReachCount / totalCount) * 100).toFixed(1));

    // 5. Academia & Research Intensity % (Research/Education sector or Academic/Think Tank OrgType)
    let academiaResearchCount = 0;
    batchAlumni.forEach(a => {
      const enriched = enrichTrajectory(a.trajectory || []);
      const latestStep = enriched[enriched.length - 1];
      if (latestStep) {
        const sector = latestStep.sector || '';
        const orgType = latestStep.orgType || '';
        if (sector === 'Research' || sector === 'Education' || orgType === 'Academic Institution' || orgType === 'Think Tank') {
          academiaResearchCount++;
        }
      }
    });
    const academiaResearchPercent = parseFloat(((academiaResearchCount / totalCount) * 100).toFixed(1));

    // 6. Experience / Growth Momentum (Avg roles normalized 0-100)
    const totalRoles = batchAlumni.reduce((sum, a) => sum + (a.trajectory?.length || 1), 0);
    const avgRoles = parseFloat((totalRoles / totalCount).toFixed(1));
    const experiencePercent = parseFloat((Math.min(100, (avgRoles / 5) * 100)).toFixed(1));

    // Average experience in years
    const totalExpYears = batchAlumni.reduce((sum, a) => sum + calculateYearsOfExperience(a), 0);
    const avgExperience = parseFloat((totalExpYears / totalCount).toFixed(1));

    // Top Employer
    const employerCounts = batchAlumni.reduce((acc, a) => {
      const co = a.currentCompany || 'Independent';
      if (co !== 'Independent' && co !== 'N/A' && co !== 'None' && co !== 'Alumnus') {
        acc[co] = (acc[co] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const sortedEmployers = Object.entries(employerCounts).sort(([, a], [, b]) => b - a);
    const topEmployer = sortedEmployers[0] ? sortedEmployers[0][0] : 'Various';

    // Top Sector
    const sectorCounts = batchAlumni.reduce((acc, a) => {
      const enriched = enrichTrajectory(a.trajectory || []);
      const latestStep = enriched[enriched.length - 1];
      if (latestStep && latestStep.sector) {
        acc[latestStep.sector] = (acc[latestStep.sector] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const sortedSectors = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a);
    const topSector = sortedSectors[0] ? sortedSectors[0][0] : 'Various';

    // Top Role
    const roleCounts = batchAlumni.reduce((acc, a) => {
      const r = a.currentRole || 'Alumnus';
      if (r !== 'Alumnus' && r !== 'Professional') {
        acc[r] = (acc[r] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const sortedRoles = Object.entries(roleCounts).sort(([, a], [, b]) => b - a);
    const topRole = sortedRoles[0] ? sortedRoles[0][0] : 'Various';

    return {
      count: totalCount,
      leadershipPercent,
      corpConsultingPercent,
      socialNGOPercent,
      globalReachPercent,
      academiaResearchPercent,
      avgRoles,
      experiencePercent,
      topEmployer,
      topSector,
      topRole,
      avgExperience,
      expLevelSplit
    };
  };

  // Compile radar chart dimensions for selected cohorts
  const radarData = useMemo(() => {
    if (!compareBatchA || !compareBatchB) return [];

    const metricsA = getBatchComparisonMetrics(compareBatchA, alumniList);
    const metricsB = getBatchComparisonMetrics(compareBatchB, alumniList);

    return [
      {
        subject: 'Leadership %',
        A: metricsA.leadershipPercent,
        B: metricsB.leadershipPercent,
        fullMark: 100,
      },
      {
        subject: 'Corp & Consulting %',
        A: metricsA.corpConsultingPercent,
        B: metricsB.corpConsultingPercent,
        fullMark: 100,
      },
      {
        subject: 'Social & NGO %',
        A: metricsA.socialNGOPercent,
        B: metricsB.socialNGOPercent,
        fullMark: 100,
      },
      {
        subject: 'Global Reach %',
        A: metricsA.globalReachPercent,
        B: metricsB.globalReachPercent,
        fullMark: 100,
      },
      {
        subject: 'Academia & Research %',
        A: metricsA.academiaResearchPercent,
        B: metricsB.academiaResearchPercent,
        fullMark: 100,
      },
      {
        subject: 'Experience Growth %',
        A: metricsA.experiencePercent,
        B: metricsB.experiencePercent,
        fullMark: 100,
      },
    ];
  }, [compareBatchA, compareBatchB, alumniList]);

  // Handle AI Report generation for compared cohorts
  const handleGenerateComparisonReport = async () => {
    if (!compareBatchA || !compareBatchB) return;
    setIsGeneratingComparison(true);
    setCompareAIReport(null);
    try {
      const report = await getBatchComparisonAI(compareBatchA, compareBatchB, alumniList);
      setCompareAIReport(report || "Could not generate comparison analysis.");
    } catch (e) {
      console.error(e);
      triggerToast("Failed to generate AI report. Please try again.", "error");
    } finally {
      setIsGeneratingComparison(false);
    }
  };

  // Reset comparison AI report if the batches change
  useEffect(() => {
    setCompareAIReport(null);
  }, [compareBatchA, compareBatchB]);

  const handleAlumnusClick = async (alumnus: Alumni) => {
    setSelectedAlumnus(alumnus);
    setAnalysis(null);
    setIsAnalyzing(true);
    const result = await analyzeTrajectory(alumnus);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSync = async (alumnus: Alumni) => {
    setIsSyncing(true);
    try {
      const updates = await syncAlumnusData(alumnus);
      if (updates.hasUpdates) {
        const newStep: CareerStep = {
          id: `sync-${Math.random().toString(36).substring(2, 6)}`,
          company: updates.currentCompany,
          role: updates.currentRole,
          startDate: new Date().getFullYear().toString(),
          endDate: 'Present',
          location: updates.location || alumnus.location,
          description: updates.summaryOfChanges || "Automatically synced from LinkedIn."
        };
        
        const newTrajectory = [...alumnus.trajectory.map(t => ({ ...t, endDate: t.endDate === 'Present' ? new Date().getFullYear().toString() : t.endDate })), newStep];
        
        const updatedFields = {
          currentRole: updates.currentRole,
          currentCompany: updates.currentCompany,
          location: updates.location || alumnus.location,
          trajectory: newTrajectory
        };

        handleUpdateAlumnus(alumnus.id, updatedFields);
        setSelectedAlumnus(prev => prev ? { ...prev, ...updatedFields } : null);
        triggerToast(`Successfully synced! Found new role: ${updates.currentRole} at ${updates.currentCompany}`);
      } else {
        triggerToast("No new updates found on LinkedIn. Profile is up to date.", "info");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      triggerToast("Failed to sync with LinkedIn. Please try again later.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle spreadsheet loading and parsing
  const handleSpreadsheetLoad = (text: string) => {
    try {
      const { headers, rows } = parseSpreadsheetText(text);
      if (headers.length === 0) {
        triggerToast("No headers found in pasted spreadsheet data.", "error");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMapping(autoDetectMapping(headers));
      setParsedAlumni([]);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to parse sheet text. Ensure rows are separated by lines and cells are separated by tabs.", "error");
    }
  };

  const handleJsonDataLoad = (text: string) => {
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      
      const validated: Alumni[] = items.map((item: any, i: number) => {
        const name = item.name || 'Anonymous Alumnus';
        
        let batch: string | number = "Batch Not Available";
        if (item.batch) {
          const str = String(item.batch).trim();
          if (str !== "" && str !== "Batch Not Available" && str.toLowerCase() !== "n/a" && str.toLowerCase() !== "null" && str.toLowerCase() !== "undefined") {
            batch = str;
          }
        }

        let baseYear = new Date().getFullYear();
        if (typeof batch === 'number') {
          baseYear = batch;
        } else if (typeof batch === 'string') {
          const digits = batch.match(/\d+/g);
          if (digits && digits.length > 0) {
            const val = parseInt(digits[digits.length - 1]);
            if (val > 1900 && val < 2100) {
              baseYear = val;
            } else if (val >= 0 && val <= 99) {
              baseYear = val < 50 ? 2000 + val : 1900 + val;
            }
          }
        }

        const currentCompany = item.currentCompany || 'Independent';
        const currentRole = item.currentRole || 'Alumnus';
        const location = item.location || 'Remote';
        
        return {
          id: item.id || `imported-json-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          name,
          batch,
          department: item.department || 'General',
          currentRole,
          currentCompany,
          location,
          email: item.email || `${name.toLowerCase().replace(/\s+/g, '')}@alumni.com`,
          linkedinUrl: isVerifiedLinkedInUrl(item.linkedinUrl) ? formatLinkedInUrl(item.linkedinUrl) : '',
          skills: Array.isArray(item.skills) ? item.skills : (item.skills ? String(item.skills).split(',').map((s: string) => s.trim()) : ['Network']),
          avatarUrl: '',
          trajectory: Array.isArray(item.trajectory) ? item.trajectory : [
            {
              id: `step-${Math.random().toString(36).substring(2, 9)}`,
              company: currentCompany,
              role: currentRole,
              startDate: baseYear.toString(),
              endDate: 'Present',
              location: location,
              description: `Active professional role as ${currentRole} at ${currentCompany}.`
            }
          ]
        };
      });

      setParsedAlumni(validated);
      setCsvHeaders([]);
    } catch (err) {
      triggerToast("Failed to parse JSON file. Ensure it is a valid JSON array of alumni.", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParsedAlumni([]);
    setCsvHeaders([]);
    setCsvRows([]);
    setSelectedFileBase64('');

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleJsonDataLoad(text);
        setIsParsing(false);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const { headers, rows } = parseSpreadsheetText(text);
        setCsvHeaders(headers);
        setCsvRows(rows);
        const autoMapping = autoDetectMapping(headers);
        setColumnMapping(autoMapping);
        
        // Auto extract if name column is detected
        if (autoMapping['name'] !== undefined && autoMapping['name'] !== -1) {
          try {
            const parsed = await processRowsInBatches(headers, rows, autoMapping);
            const validImported = parsed.filter(a => a.name && a.name.trim().length > 0);
            if (validImported.length > 0) {
              setParsedAlumni(validImported);
              triggerToast(`Successfully auto-analyzed and extracted ${validImported.length} profiles! Review them below.`, "success");
            }
          } catch (err) {
            console.error("Auto-mapping error:", err);
          }
        }
        
        const base64Reader = new FileReader();
        base64Reader.onload = (b64Event) => {
          const result = b64Event.target?.result as string;
          const base64 = result.split(',')[1];
          setSelectedFileBase64(base64);
          setIsParsing(false);
        };
        base64Reader.readAsDataURL(file);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const xlsxReader = new FileReader();
      xlsxReader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) {
            triggerToast("Failed to read the Excel file.", "error");
            setIsParsing(false);
            return;
          }
          
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            triggerToast("The Excel file has no worksheets.", "error");
            setIsParsing(false);
            return;
          }
          
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const headers: string[] = [];
          const dataRows: string[][] = [];
          const cellLinks: string[][] = [];
          
          // 1. Extract headers from the start row (usually range.s.r)
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: range.s.r };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = worksheet[cell_ref];
            headers.push(cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : `Column ${C + 1}`);
          }
          
          // 2. Extract subsequent data rows and their cell links
          for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const rowData: string[] = [];
            const rowLinks: string[] = [];
            let rowHasData = false;
            
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell_address = { c: C, r: R };
              const cell_ref = XLSX.utils.encode_cell(cell_address);
              const cell = worksheet[cell_ref];
              
              const val = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : '';
              rowData.push(val);
              if (val) rowHasData = true;
              
              let link = '';
              if (cell && cell.l && cell.l.Target) {
                link = String(cell.l.Target).trim();
              }
              rowLinks.push(link);
            }
            
            if (rowHasData) {
              dataRows.push(rowData);
              cellLinks.push(rowLinks);
            }
          }
          
          if (dataRows.length === 0) {
            triggerToast("The uploaded Excel sheet contains no data rows.", "error");
            setIsParsing(false);
            return;
          }
          
          setCsvHeaders(headers);
          setCsvRows(dataRows);
          setExcelCellLinks(cellLinks);
          const autoMapping = autoDetectMapping(headers);
          setColumnMapping(autoMapping);
          
          // Auto extract if name column is detected
          if (autoMapping['name'] !== undefined && autoMapping['name'] !== -1) {
            try {
              const parsed = await processRowsInBatches(headers, dataRows, autoMapping, cellLinks);
              const validImported = parsed.filter(a => a.name && a.name.trim().length > 0);
              if (validImported.length > 0) {
                setParsedAlumni(validImported);
                triggerToast(`Successfully auto-analyzed and extracted ${validImported.length} profiles, including embedded hyperlinks! Review them below.`, "success");
              }
            } catch (err) {
              console.error("Auto-mapping error:", err);
            }
          }
          
          // Store base64 reader to support secondary AI unstructured parsers
          const base64Reader = new FileReader();
          base64Reader.onload = (b64Event) => {
            const b64Result = b64Event.target?.result as string;
            const base64 = b64Result.split(',')[1];
            setSelectedFileBase64(base64);
            setIsParsing(false);
          };
          base64Reader.readAsDataURL(file);
          
        } catch (error) {
          console.error("Error reading Excel with SheetJS:", error);
          triggerToast("Error processing Excel file. Ensure it is a valid format.", "error");
          setIsParsing(false);
        }
      };
      xlsxReader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64 = result.split(',')[1];
        setSelectedFileBase64(base64);
        setIsParsing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIFileExtract = async () => {
    if (!selectedFile || !selectedFileBase64) {
      triggerToast("Please select a file first.", "info");
      return;
    }
    
    setIsAiParsing(true);
    try {
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      let result;
      if (isExcel) {
        if (csvHeaders.length === 0) {
          throw new Error("Excel data is still loading or could not be parsed locally. Please try again or paste instead.");
        }
        // Convert pre-parsed Excel spreadsheet headers and rows to a structured tab-separated text representation
        const headerText = csvHeaders.join('\t');
        const rowsText = csvRows.map(row => row.join('\t')).join('\n');
        const rawTableText = `${headerText}\n${rowsText}`;
        
        result = await parseAlumniDataWithAI(rawTableText);
      } else {
        const mimeType = selectedFile.type || (selectedFile.name.endsWith('.pdf') ? 'application/pdf' : 'text/csv');
        result = await parseAlumniFileWithAI(selectedFileBase64, mimeType, selectedFile.name);
      }
      
      if (result && result.length > 0) {
        const sanitized = result.map(a => ({
          ...a,
          linkedinUrl: formatLinkedInUrl(a.linkedinUrl)
        }));
        setParsedAlumni(sanitized);
        triggerToast(`Successfully extracted ${result.length} alumni profiles using Gemini AI! Please review them below.`);
      } else {
        triggerToast("No alumni records could be extracted. Try copying the sheet or checking file layout.", "error");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Gemini extraction failed. Check key config or file quality.", "error");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handlePasteParse = () => {
    if (!pastedText.trim()) {
      triggerToast("Please paste some tab-separated sheet rows first.", "info");
      return;
    }
    handleSpreadsheetLoad(pastedText);
  };

  const handleAIPagingParse = async () => {
    if (!aiText.trim()) {
      triggerToast("Please paste raw unstructured alumni text first.", "info");
      return;
    }
    setIsAiParsing(true);
    try {
      const result = await parseAlumniDataWithAI(aiText);
      if (result.length === 0) {
        triggerToast("Gemini could not find structured alumni profiles in the text.", "info");
      } else {
        const sanitized = result.map(a => ({
          ...a,
          linkedinUrl: formatLinkedInUrl(a.linkedinUrl)
        }));
        setParsedAlumni(sanitized);
        triggerToast(`Gemini AI successfully extracted ${result.length} profiles! Review them below.`);
      }
    } catch (err: any) {
      triggerToast(err.message || "AI Parsing failed.", "error");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleApplyMapping = async () => {
    if (csvRows.length === 0) return;

    setIsParsing(true);
    try {
      const imported = await processRowsInBatches(csvHeaders, csvRows, columnMapping, excelCellLinks);
      const validImported = imported.filter(a => a.name && a.name.trim().length > 0);
      if (validImported.length === 0) {
        triggerToast("No valid rows containing names could be parsed.", "error");
        setIsParsing(false);
        return;
      }

      setParsedAlumni(validImported);
      triggerToast(`Successfully mapped and parsed ${validImported.length} profiles! Review them below.`, "success");
    } catch (error) {
      console.error(error);
      triggerToast("Error matching spreadsheet headers.", "error");
    } finally {
      setIsParsing(false);
    }
  };

  const commitImportedAlumni = () => {
    if (parsedAlumni.length === 0) return;

    // Reset selected states and clear previous analytical caches immediately (Issue 7 Compliance!)
    setSelectedAlumnus(null);
    setAnalysis(null);

    const sourceName = selectedFile 
      ? selectedFile.name 
      : importTab === 'paste' 
        ? `Tabular Paste - ${new Date().toLocaleDateString()}` 
        : `AI Extraction - ${new Date().toLocaleDateString()}`;

    const newSheet: UploadedSheet = {
      id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: sourceName,
      uploadDate: new Date().toISOString(),
      rowCount: parsedAlumni.length,
      columns: csvHeaders.length > 0 ? csvHeaders : ['Name', 'Batch', 'Department', 'Current Role', 'Current Company', 'Location', 'Email', 'LinkedIn URL'],
      alumni: parsedAlumni
    };

    if (importMode === 'replace') {
      setUploadedSheets([newSheet]);
      triggerToast(`Successfully replaced database with sheet "${sourceName}" (${parsedAlumni.length} profiles)!`);
    } else {
      setUploadedSheets(prev => [...prev, newSheet]);
      triggerToast(`Successfully added sheet "${sourceName}" to database! Added ${parsedAlumni.length} records.`);
    }

    // Reset importer states
    setIsImportModalOpen(false);
    setParsedAlumni([]);
    setCsvHeaders([]);
    setCsvRows([]);
    setSelectedFile(null);
    setSelectedFileBase64('');
    setPastedText('');
    setAiText('');
  };

  // Complete removal of currently uploaded dataset (Issue 6 Compliance!)
  const handleDeleteDataset = () => {
    setShowDeleteDatasetConfirm(true);
  };

  const handleLoadDemo = () => {
    const demoSheet: UploadedSheet = {
      id: 'sheet-demo',
      name: 'Demonstration Batch',
      uploadDate: new Date().toISOString(),
      rowCount: initialAlumniData.length,
      columns: ['Name', 'Batch', 'Department', 'Current Role', 'Current Company', 'Location', 'Email', 'LinkedIn URL'],
      alumni: initialAlumniData
    };
    setUploadedSheets([demoSheet]);
    setSelectedAlumnus(null);
    setAnalysis(null);
    setSearchQuery('');
    triggerToast("High-fidelity demonstration batch loaded successfully!");
  };

  const handleExportData = (format: 'json' | 'csv') => {
    let dataStr = '';
    let mimeType = 'text/plain';
    let fileName = `alumni_database_${new Date().getFullYear()}`;

    if (format === 'json') {
      dataStr = JSON.stringify(alumniList, null, 2);
      mimeType = 'application/json';
      fileName += '.json';
    } else {
      const headers = ['Name', 'Batch', 'Department', 'Current Role', 'Current Company', 'Location', 'Email', 'LinkedIn URL', 'Skills', 'Higher Studies', 'Phone'];
      const rows = alumniList.map(a => [
        `"${(a.name || '').replace(/"/g, '""')}"`,
        a.batch,
        `"${(a.department || '').replace(/"/g, '""')}"`,
        `"${(a.currentRole || '').replace(/"/g, '""')}"`,
        `"${(a.currentCompany || '').replace(/"/g, '""')}"`,
        `"${(a.location || '').replace(/"/g, '""')}"`,
        `"${(a.email || '').replace(/"/g, '""')}"`,
        `"${(a.linkedinUrl || '').replace(/"/g, '""')}"`,
        `"${(a.skills || []).join(', ').replace(/"/g, '""')}"`,
        `"${(a.education || '').replace(/"/g, '""')}"`,
        `"${(a.phone || '').replace(/"/g, '""')}"`
      ]);
      
      dataStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv';
      fileName += '.csv';
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Name of the Alumni', 
      'First job title after grad', 
      'First Employer/Org', 
      'Second job title after grad', 
      'Second Employer/Org', 
      'Third job title after grad', 
      'Third Employer/Org', 
      'Fourth job title after grad', 
      'Fourth Employer/Org', 
      'Fifth job title after grad', 
      'Fifth Employer/Org', 
      'Higher Studies (if any)', 
      'Linkedin', 
      'Phone Number', 
      'Email ID',
      'Batch',
      'Department',
      'Location',
      'Skills'
    ];
    
    const sampleRow = [
      'Aastha Sethi', 
      "Consultant, CM's Office", 
      'Govt of Maharashtra', 
      'Project and Policy Officer', 
      'The University of Edinburgh', 
      'Advisor', 
      'The Behavioural Insights Team', 
      'Senior Officer, Policy and Advocacy', 
      'United for Global Mental Health', 
      '-', 
      '-', 
      'MSc Public Policy', 
      'https://linkedin.com/in/aasthasethi', 
      '+91 9876543210', 
      'aastha.sethi7@gmail.com',
      '2018',
      'Public Policy',
      'London / Remote',
      'Policy Analysis, Advocacy'
    ];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'alumni_sequential_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Empty / Onboarding Landing State (Issue 5 & 6 Compliance)
  if (alumniList.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
        <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">AlumniPath</span>
          </div>
        </nav>

        <main className="pt-32 pb-12 px-6 max-w-xl mx-auto text-center space-y-8">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
            <Users className="w-10 h-10 text-white animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">Alumni Graduate Hub</h1>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-md mx-auto">
              Welcome to the career trajectory intelligence dashboard. The database is currently empty. Get started by uploading or copy-pasting your class spreadsheets, or populate default demo records.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="w-full py-3 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-zinc-300" />
              Upload & Import Dataset
            </button>
            <button 
              onClick={handleLoadDemo}
              className="w-full py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-semibold hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer text-sm"
            >
              Load Demo Dataset
            </button>
          </div>
        </main>

        {renderImportModal()}
        {renderToast()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">AlumniPath</span>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'directory', label: 'Directory', icon: Users },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'compare', label: 'Compare Batches', icon: SlidersHorizontal },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                activeTab === tab.id 
                  ? "bg-white text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 text-white rounded-xl px-3.5 py-2 text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            Import Sheets
          </button>
          <div className="relative group/db shrink-0">
            <button 
              className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Database
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 hidden group-hover/db:block z-20">
              <button 
                onClick={() => handleExportData('csv')}
                className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 text-zinc-700 font-medium cursor-pointer"
              >
                Export as CSV
              </button>
              <button 
                onClick={() => handleExportData('json')}
                className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 text-zinc-700 font-medium cursor-pointer"
              >
                Export as JSON
              </button>
              <div className="border-t border-zinc-100 my-1"></div>
              <button 
                onClick={handleDeleteDataset}
                className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 font-bold cursor-pointer"
              >
                Delete Dataset
              </button>
              <button 
                onClick={handleLoadDemo}
                className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 text-zinc-800 font-semibold cursor-pointer"
              >
                Load Demo Data
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold tracking-tight">Network Overview</h1>
                  <p className="text-zinc-500">Tracking career growth across verified alumni profiles.</p>
                </div>
                <button 
                  onClick={handleDeleteDataset}
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Dataset
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Alumni" value={alumniList.length} icon={Users} trend={uploadedSheets.length > 0 ? `${uploadedSheets.length} Sheet${uploadedSheets.length > 1 ? 's' : ''}` : undefined} />
                <StatCard title="Active Companies" value={alumniList.length > 0 ? new Set(alumniList.map(a => a.currentCompany || 'Independent')).size : 0} icon={Building2} />
                <StatCard title="Global Reach" value={alumniList.length > 0 ? `${new Set(alumniList.map(a => a.location || 'Remote')).size} Cities` : '0 Cities'} icon={MapPin} />
                <StatCard title="Avg. Growth" value={alumniList.length > 0 ? `${(alumniList.reduce((sum, a) => sum + (a.trajectory?.length || 1), 0) / alumniList.length).toFixed(1)} Roles` : '0 Roles'} icon={TrendingUp} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Batch Distribution Graph */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold">Batch Distribution</h2>
                      <p className="text-sm text-zinc-500">Alumni count per graduation year</p>
                    </div>
                    <Calendar className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="h-[300px] w-full">
                    {stats.batchDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.batchDistribution}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="count" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">No batch distribution details available.</div>
                    )}
                  </div>
                </div>

                {/* Top Companies Listing */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold">Top Employers</h2>
                      <p className="text-sm text-zinc-500">Where our alumni work</p>
                    </div>
                    <Building2 className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="space-y-6">
                    {stats.topCompanies.length > 0 ? stats.topCompanies.map((company, i) => (
                      <div key={company.name} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-100">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-zinc-700">{company.name}</span>
                            <span className="text-xs font-medium text-zinc-400">{company.count} alumni</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(company.count / stats.topCompanies[0].count) * 100}%` }}
                              className="h-full bg-zinc-900 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 text-zinc-400 text-sm font-medium">No company distribution details available.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Sheets (Sources) Manager */}
              <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-zinc-700" />
                      Unified Data Sources ({uploadedSheets.length})
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Cross-search and merge duplicate records seamlessly across files</p>
                  </div>
                  <button 
                    onClick={() => {
                      setImportMode('append');
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    Add New Sheet
                  </button>
                </div>

                {uploadedSheets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedSheets.map(sheet => (
                      <div key={sheet.id} className="border border-zinc-100 rounded-2xl p-4 flex items-center justify-between hover:border-zinc-200 transition-colors bg-zinc-50/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-600 shrink-0">
                            <Database className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 truncate" title={sheet.name}>{sheet.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <span>{sheet.rowCount} records</span>
                              <span className="text-zinc-300">•</span>
                              <span>{new Date(sheet.uploadDate).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteSheet(sheet.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-2 shrink-0"
                          title="Remove this sheet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-8 text-center bg-zinc-50/20">
                    <Database className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-600">No active data sources</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">Upload spreadsheet sheets to search and build your unified alumni network</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'directory' && (
            <motion.div 
              key="directory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Directory Filter & Search Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Search Name, Company, Role, Skills, Education, Location, Industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-sm font-medium shadow-sm"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 border rounded-2xl px-4 py-2.5 shadow-sm text-xs font-bold transition-all cursor-pointer ${
                      showAdvancedFilters 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" /> 
                    {showAdvancedFilters ? 'Hide Advanced Filters' : 'Advanced Filters'}
                  </button>

                  <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 shadow-sm">
                    <Filter className="w-4 h-4 text-zinc-400" />
                    <select 
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="bg-transparent text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">All Batches</option>
                      {Array.from(new Set(alumniList.map(a => a.batch)))
                        .sort((a, b) => {
                          const strA = String(a);
                          const strB = String(b);
                          if (strA === "Batch Not Available") return 1;
                          if (strB === "Batch Not Available") return -1;
                          const numA = parseInt(strA.match(/\d+/)?.at(0) || "0");
                          const numB = parseInt(strB.match(/\d+/)?.at(0) || "0");
                          return numB - numA;
                        })
                        .map(year => (
                          <option key={String(year)} value={String(year)}>
                            {displayBatch(year)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{filteredAlumni.length} results</p>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn" id="advanced-filters-panel">
                  {/* Select 1: Current Employer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Current Employer</label>
                    <select
                      value={filterCurrentCompany}
                      onChange={(e) => setFilterCurrentCompany(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Employer</option>
                      {filterOptions.currentCompanies.map(c => (
                        <option key={`current-co-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 2: Current Role */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Current Role</label>
                    <select
                      value={filterCurrentRole}
                      onChange={(e) => setFilterCurrentRole(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Role</option>
                      {filterOptions.currentRoles.map(r => (
                        <option key={`current-role-${r}`} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 3: Years of Experience */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Years of Experience</label>
                    <select
                      value={filterYears}
                      onChange={(e) => setFilterYears(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Duration</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>

                  {/* Select 4: Experience Level */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Experience Level</label>
                    <select
                      value={filterExpLevel}
                      onChange={(e) => setFilterExpLevel(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Level</option>
                      <option value="Entry">Entry Level</option>
                      <option value="Mid">Mid Level</option>
                      <option value="Senior">Senior Level</option>
                      <option value="Leadership">Leadership Level</option>
                    </select>
                  </div>

                  {/* Select 5: Past Employer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Past Employer</label>
                    <select
                      value={filterOrg}
                      onChange={(e) => setFilterOrg(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Employer</option>
                      {filterOptions.orgs.map(o => (
                        <option key={`past-co-${o}`} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 6: Sector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Sector</label>
                    <select
                      value={filterSector}
                      onChange={(e) => setFilterSector(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Sector</option>
                      {filterOptions.sectors.map(s => (
                        <option key={`sec-${s}`} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 7: Country worked */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Country worked</label>
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Country</option>
                      {filterOptions.countries.map(c => (
                        <option key={`cnt-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 8: Industry */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Industry</label>
                    <select
                      value={filterIndustry}
                      onChange={(e) => setFilterIndustry(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Industry</option>
                      {filterOptions.industries.map(i => (
                        <option key={`ind-${i}`} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select 9: Job Function */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Job Function</label>
                    <select
                      value={filterFunction}
                      onChange={(e) => setFilterFunction(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                    >
                      <option value="all">Any Function</option>
                      {filterOptions.functions.map(f => (
                        <option key={`func-${f}`} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action row to reset filters */}
                  <div className="md:col-span-3 flex items-center justify-end border-t border-zinc-200 pt-4 mt-2">
                    <button
                      onClick={() => {
                        setFilterOrg('all');
                        setFilterSector('all');
                        setFilterCountry('all');
                        setFilterIndustry('all');
                        setFilterFunction('all');
                        setFilterExpLevel('all');
                        setFilterYears('all');
                        setFilterCurrentCompany('all');
                        setFilterCurrentRole('all');
                        setBatchFilter('all');
                      }}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Grid of Alumni Profiles */}
              {filteredAlumni.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedAlumni.map(alumnus => (
                      <AlumniCard key={alumnus.id} alumnus={alumnus} onClick={() => handleAlumnusClick(alumnus)} />
                    ))}
                  </div>

                  {/* Elegant Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-100 pt-6 gap-4">
                      <p className="text-xs font-semibold text-zinc-500">
                        Showing <span className="font-bold text-zinc-800">{Math.min(filteredAlumni.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
                        <span className="font-bold text-zinc-800">{Math.min(filteredAlumni.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
                        <span className="font-bold text-zinc-800">{filteredAlumni.length}</span> alumni
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 bg-white hover:bg-zinc-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                            // Show first, last, current, and pages near current
                            if (
                              page === 1 ||
                              page === totalPages ||
                              Math.abs(page - currentPage) <= 1
                            ) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentPage === page
                                      ? "bg-zinc-950 text-white shadow-sm font-bold"
                                      : "border border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50"
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            }
                            if (
                              page === 2 ||
                              page === totalPages - 1
                            ) {
                              return <span key={page} className="text-zinc-400 text-xs px-0.5">...</span>;
                            }
                            return null;
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 bg-white hover:bg-zinc-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-zinc-100 rounded-3xl p-16 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto border border-zinc-100">
                    <Search className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800">No matching alumni found</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">Try checking spelling or adjusting filters. Fuzzy match checks Name, current Organization, Designation, Location, Skills, and chronological career steps.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'trends' && (
            <motion.div 
              key="trends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Career Trends</h1>
                <p className="text-zinc-500">Industry distribution and professional trajectory patterns.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Aggregate Industry Alignment</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { year: '2018', public_sector: 32, corporate: 10, advocacy: 5 },
                        { year: '2020', public_sector: 35, corporate: 18, advocacy: 12 },
                        { year: '2022', public_sector: 40, corporate: 25, advocacy: 18 },
                        { year: '2024', public_sector: 45, corporate: 32, advocacy: 25 },
                        { year: '2026', public_sector: 50, corporate: 42, advocacy: 35 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="public_sector" name="Public Sector & Policy" stroke="#18181b" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="corporate" name="Corporate Advisory" stroke="#71717a" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="advocacy" name="Advocacy & NGOs" stroke="#a1a1aa" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-900" />
                      <span className="text-xs font-semibold text-zinc-500">Public Sector</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-500">Corporate Advisory</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-300" />
                      <span className="text-xs font-semibold text-zinc-500">Advocacy / NGOs</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-zinc-900 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">AI Batch Insights</h3>
                  <p className="text-zinc-500 max-w-sm mb-8 text-sm">
                    Select a class batch year from your dataset to analyze trajectory impact and patterns using Gemini.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {Array.from(new Set(alumniList.map(a => a.batch)))
                      .filter(y => y !== "Batch Not Available")
                      .sort((a, b) => {
                        const strA = String(a);
                        const strB = String(b);
                        const numA = parseInt(strA.match(/\d+/)?.at(0) || "0");
                        const numB = parseInt(strB.match(/\d+/)?.at(0) || "0");
                        return numB - numA;
                      })
                      .slice(0, 4)
                      .map(year => (
                        <button 
                          key={String(year)}
                          disabled={isAnalyzingBatch !== null}
                          onClick={async () => {
                            setIsAnalyzingBatch(year);
                            try {
                              const trendText = await getBatchTrends(year, alumniList);
                              setBatchInsight({ year, text: trendText });
                            } catch (e) {
                              triggerToast("Failed to fetch batch trends.", "error");
                            } finally {
                              setIsAnalyzingBatch(null);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                        >
                          {isAnalyzingBatch === year ? (
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-3 h-3 border border-white/20 border-t-white rounded-full shrink-0"
                            />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                          )}
                          Analyze Batch {year}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'compare' && (() => {
            const displayBatch = (batch: string | number) => {
              const bStr = String(batch);
              if (!bStr) return 'N/A';
              if (bStr.toLowerCase().includes('batch') || bStr.toLowerCase().includes('class')) {
                return bStr;
              }
              return `Class of ${bStr}`;
            };

            return (
              <motion.div 
                key="compare"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <SlidersHorizontal className="w-8 h-8 text-zinc-900" />
                    Cohort Trajectory Comparison
                  </h1>
                  <p className="text-zinc-500">
                    Analyze and contrast the professional trajectories of two class batches side-by-side using radar indicators and AI-driven growth analytics.
                  </p>
                </div>

                {availableBatches.length < 2 ? (
                  <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                      <Sparkles className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-800">Multiple Batches Required</h3>
                    <p className="text-sm text-zinc-500 max-w-md mx-auto">
                      To visualize comparison trends, your active database must contain at least two different graduation batches. 
                      Please import additional class spreadsheets or load our mock demo dataset to try out side-by-side comparisons.
                    </p>
                    <button 
                      onClick={handleLoadDemo}
                      className="mt-4 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                    >
                      Load Demo Dataset
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Selector Panel */}
                    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-900"></span>
                          Select Primary Cohort (Cohort A)
                        </label>
                        <select
                          value={compareBatchA}
                          onChange={(e) => setCompareBatchA(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
                        >
                          {availableBatches.map(b => (
                            <option key={`comp-a-${b}`} value={b} disabled={b === compareBatchB}>
                              {displayBatch(b)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                          Select Secondary Cohort (Cohort B)
                        </label>
                        <select
                          value={compareBatchB}
                          onChange={(e) => setCompareBatchB(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                        >
                          {availableBatches.map(b => (
                            <option key={`comp-b-${b}`} value={b} disabled={b === compareBatchA}>
                              {displayBatch(b)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dashboard Visualization & Metrics Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Radar Chart Column */}
                      <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <h2 className="text-xl font-bold">Aesthetic Alignment Radar</h2>
                          <p className="text-xs text-zinc-400 mt-1">Comparing % concentration across core structural variables</p>
                        </div>
                        
                        <div className="h-[320px] w-full flex items-center justify-center mt-6">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                              <PolarGrid stroke="#e4e4e7" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 8 }} axisLine={false} />
                              <Radar name={`${displayBatch(compareBatchA)}`} dataKey="A" stroke="#18181b" fill="#18181b" fillOpacity={0.25} strokeWidth={2} />
                              <Radar name={`${displayBatch(compareBatchB)}`} dataKey="B" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="border-t border-zinc-100 pt-4 mt-4 text-[11px] text-zinc-400 leading-relaxed italic">
                          * Note: Experience Growth % is calculated by mapping the average sequential role movements of graduates onto a standard 0-100 scale.
                        </div>
                      </div>

                      {/* Metrics side-by-side Table / List Column */}
                      <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                          <h3 className="text-xl font-bold mb-6">Key Cohort Comparisons</h3>
                          
                          <div className="space-y-4">
                            {/* Metric Rows */}
                            {[
                              {
                                title: 'Total Sample Size',
                                calc: (m: any) => `${m.count} graduates`,
                                desc: 'Verified alumni profiles uploaded inside the sheet'
                              },
                              {
                                title: 'Average Experience',
                                calc: (m: any) => `${m.avgExperience} years`,
                                desc: 'Total active professional experience years accumulated'
                              },
                              {
                                title: 'Average Career Steps',
                                calc: (m: any) => `${m.avgRoles} roles`,
                                desc: 'Average count of career changes or promotions'
                              },
                              {
                                title: 'Top Sector',
                                calc: (m: any) => m.topSector,
                                desc: 'Highest career concentration sector'
                              },
                              {
                                title: 'Top Employer',
                                calc: (m: any) => m.topEmployer,
                                desc: 'Highest frequency company or organization'
                              },
                            ].map((item, index) => {
                              const mA = getBatchComparisonMetrics(compareBatchA, alumniList);
                              const mB = getBatchComparisonMetrics(compareBatchB, alumniList);
                              return (
                                <div key={`metric-row-${index}`} className="border-b border-zinc-50 last:border-0 pb-4 last:pb-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="min-w-0 pr-4">
                                      <h4 className="text-sm font-semibold text-zinc-800">{item.title}</h4>
                                      <p className="text-[10px] text-zinc-400 truncate">{item.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-6 shrink-0 text-xs font-bold font-mono">
                                      <span className="text-zinc-900 bg-zinc-50 border border-zinc-100 rounded px-2.5 py-1 text-right min-w-[110px] block truncate">
                                        {item.calc(mA)}
                                      </span>
                                      <span className="text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded px-2.5 py-1 text-right min-w-[110px] block truncate">
                                        {item.calc(mB)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Experience Level Splits */}
                        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                          <h3 className="text-lg font-bold">Experience Seniority Profiles</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cohort A splits */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">{displayBatch(compareBatchA)}</span>
                              </div>
                              <div className="space-y-2.5">
                                {Object.entries(getBatchComparisonMetrics(compareBatchA, alumniList).expLevelSplit).map(([level, count]) => {
                                  const total = getBatchComparisonMetrics(compareBatchA, alumniList).count;
                                  const percent = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                                  return (
                                    <div key={`split-a-${level}`} className="text-xs">
                                      <div className="flex justify-between mb-1">
                                        <span className="font-semibold text-zinc-500">{level}</span>
                                        <span className="font-bold text-zinc-700">{count} ({percent}%)</span>
                                      </div>
                                      <div className="w-full h-1 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100/50">
                                        <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${percent}%` }}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Cohort B splits */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">{displayBatch(compareBatchB)}</span>
                              </div>
                              <div className="space-y-2.5">
                                {Object.entries(getBatchComparisonMetrics(compareBatchB, alumniList).expLevelSplit).map(([level, count]) => {
                                  const total = getBatchComparisonMetrics(compareBatchB, alumniList).count;
                                  const percent = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                                  return (
                                    <div key={`split-b-${level}`} className="text-xs">
                                      <div className="flex justify-between mb-1">
                                        <span className="font-semibold text-zinc-500">{level}</span>
                                        <span className="font-bold text-indigo-700">{count} ({percent}%)</span>
                                      </div>
                                      <div className="w-full h-1 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100/50">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Comparative Report Card */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-zinc-800" />
                            AI Cohort Shift Report
                          </h2>
                          <p className="text-xs text-zinc-400 mt-1">Uses Gemini to analyze shifts in career destinations, domain expertise, and velocity</p>
                        </div>
                        
                        <button
                          onClick={handleGenerateComparisonReport}
                          disabled={isGeneratingComparison}
                          className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-semibold rounded-2xl px-5 py-3 text-xs transition-all shadow-sm cursor-pointer"
                        >
                          {isGeneratingComparison ? (
                            <>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full shrink-0"
                              />
                              Synthesizing Report...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-zinc-300" />
                              Generate Comparative AI Report
                            </>
                          )}
                        </button>
                      </div>

                      {isGeneratingComparison && (
                        <div className="py-12 text-center space-y-4">
                          <div className="w-12 h-12 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center mx-auto animate-pulse">
                            <Sparkles className="w-6 h-6 text-zinc-400" />
                          </div>
                          <p className="text-sm font-semibold text-zinc-500">
                            Gemini is cross-referencing {displayBatch(compareBatchA)} and {displayBatch(compareBatchB)}...
                          </p>
                        </div>
                      )}

                      {!isGeneratingComparison && compareAIReport && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm text-zinc-700 leading-relaxed"
                        >
                          <div className="markdown-body prose max-w-none">
                            <ReactMarkdown>{compareAIReport}</ReactMarkdown>
                          </div>
                        </motion.div>
                      )}

                      {!isGeneratingComparison && !compareAIReport && (
                        <div className="border border-dashed border-zinc-200 rounded-2xl p-8 text-center bg-zinc-50/20">
                          <Sparkles className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-zinc-500">AI Shift Analysis Pending</p>
                          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1">
                            Click the button above to have Gemini draft a comparative analysis on seniority shifts, sector distribution shifts, and skills differences.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </main>

      {/* Alumnus Detail Slide-over Modal */}
      <AnimatePresence>
        {selectedAlumnus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlumnus(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-zinc-100"
            >
              <div className="p-8 border-b border-zinc-100 flex items-start justify-between bg-zinc-50/50">
                <div className="flex items-center gap-6">
                  <div className="relative group shrink-0">
                    <AlumniAvatar name={selectedAlumnus.name} avatarUrl={selectedAlumnus.avatarUrl} linkedinUrl={selectedAlumnus.linkedinUrl} size="lg" />
                    <button 
                      onClick={() => handleSync(selectedAlumnus)}
                      disabled={isSyncing}
                      className="absolute -bottom-2 -right-2 bg-zinc-900 text-white p-2.5 rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100 cursor-pointer"
                      title="Sync with LinkedIn"
                    >
                      {isSyncing ? (
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold text-zinc-900">{selectedAlumnus.name}</h2>
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shadow-sm flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> {displayBatch(selectedAlumnus.batch)}
                      </span>
                    </div>
                    <p className="text-lg text-zinc-600 mt-1">{selectedAlumnus.currentRole} at <span className="font-semibold text-zinc-900">{selectedAlumnus.currentCompany}</span></p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      {isVerifiedLinkedInUrl(selectedAlumnus.linkedinUrl) ? (
                        <a 
                          href={formatLinkedInUrl(selectedAlumnus.linkedinUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0077b5] hover:bg-[#006297] px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                        >
                          <Linkedin className="w-3.5 h-3.5" /> LinkedIn Profile
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 bg-zinc-100 border border-zinc-200/60 px-3 py-1.5 rounded-xl cursor-not-allowed select-none">
                          <Linkedin className="w-3.5 h-3.5" /> LinkedIn profile not available
                        </span>
                      )}
                      
                      <a href={`mailto:${selectedAlumnus.email}`} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors">
                        <Mail className="w-3.5 h-3.5" /> Contact
                      </a>

                      <button 
                        onClick={() => setShowDeleteAlumnusConfirm(selectedAlumnus.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Profile
                      </button>
                      
                      {isSyncing && (
                        <span className="text-xs font-bold text-zinc-900 animate-pulse flex items-center gap-2 bg-zinc-100 px-2.5 py-1 rounded-full">
                          <Sparkles className="w-3.5 h-3.5" /> Verifying LinkedIn parameters...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAlumnus(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3 space-y-10">
                  <AlumniCareerDashboard 
                    alumnus={selectedAlumnus} 
                    analysis={analysis} 
                    isAnalyzing={isAnalyzing} 
                  />
                </div>

                <div className="lg:col-span-2 space-y-8 animate-fadeIn">
                  {/* AI Career Summary with Strict Grounding (Issue 4 Compliance) */}
                  <section className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-zinc-900 animate-pulse" />
                      <h3 className="text-lg font-bold">AI Career Summary</h3>
                    </div>
                    
                    {isAnalyzing ? (
                      <div className="space-y-4 py-8">
                        <div className="flex items-center justify-center">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full"
                          />
                        </div>
                        <p className="text-center text-xs text-zinc-500 animate-pulse font-medium">Gemini is matching dataset variables...</p>
                      </div>
                    ) : (
                      <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed text-xs font-medium">
                        <ReactMarkdown>{analysis || "Career summary cannot be generated from available data."}</ReactMarkdown>
                      </div>
                    )}
                  </section>

                  {/* Core Skills */}
                  <section>
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-4">Core Expertise</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAlumnus.skills && selectedAlumnus.skills.map((skill, index) => (
                        <span key={`${selectedAlumnus.id}-expertise-${index}`} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Custom fields - Higher Studies & Phone (Issue 3 Compliance) */}
                  {(selectedAlumnus.education || selectedAlumnus.phone) && (
                    <section className="bg-zinc-50/50 rounded-2xl p-5 border border-zinc-100 space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Database Grounding</h4>
                      {selectedAlumnus.education && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <GraduationCap className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-zinc-800">Higher Studies / Qualifications</p>
                            <p className="text-zinc-600 text-xs mt-0.5 font-medium">{selectedAlumnus.education}</p>
                          </div>
                        </div>
                      )}
                      {selectedAlumnus.phone && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <Smartphone className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-zinc-800">Phone Number</p>
                            <p className="text-zinc-600 text-xs mt-0.5 font-mono font-medium">{selectedAlumnus.phone}</p>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safe confirmation modals for delete actions (iframe safe) */}
      <AnimatePresence>
        {showDeleteDatasetConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteDatasetConfirm(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 space-y-4 z-10 animate-fadeIn"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 font-sans">Delete Entire Dataset?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                  Are you sure you want to completely delete the currently uploaded dataset? This will wipe all records and search indexes immediately. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteDatasetConfirm(false)}
                  className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteDataset}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAlumnusConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteAlumnusConfirm(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 space-y-4 z-10 animate-fadeIn"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 font-sans">Delete Alumnus Profile?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                  Are you sure you want to delete this specific alumni record? This will remove them from the database and trajectory list. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteAlumnusConfirm(null)}
                  className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (showDeleteAlumnusConfirm) {
                      handleDeleteAlumnus(showDeleteAlumnusConfirm);
                    }
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern interactive Modal for AI Batch Insights */}
      <AnimatePresence>
        {batchInsight && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBatchInsight(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-zinc-100 z-10 animate-fadeIn"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 font-sans">AI Trend Summary: Batch {batchInsight.year}</h3>
                    <p className="text-xs text-zinc-500 font-sans">Gemini analysis of trajectory paths and employment clusters.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setBatchInsight(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed text-xs font-medium">
                  <ReactMarkdown>{batchInsight.text}</ReactMarkdown>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
                <button 
                  onClick={() => setBatchInsight(null)}
                  className="px-5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderImportModal()}
      {renderToast()}
    </div>
  );

  // Modular Import Modal Component
  function renderImportModal() {
    return (
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsImportModalOpen(false);
                setParsedAlumni([]);
                setCsvHeaders([]);
                setCsvRows([]);
              }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 border border-zinc-100 animate-fadeIn"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 font-sans">Alumni Batch Importer</h2>
                    <p className="text-xs text-zinc-500 font-sans">Import multiple graduates at once using tabular spreadsheets or smart AI parsing.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedAlumni([]);
                    setCsvHeaders([]);
                    setCsvRows([]);
                  }}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              {/* Modal Content Tabs */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {parsedAlumni.length === 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-1.5 bg-zinc-200 p-1 rounded-xl w-fit shrink-0">
                      {[
                        { id: 'upload', label: 'Upload File', icon: Upload },
                        { id: 'paste', label: 'Tabular Copy-Paste', icon: Calendar },
                        { id: 'ai', label: 'AI Smart Paste', icon: Sparkles },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setImportTab(tab.id as any)}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                            importTab === tab.id 
                              ? "bg-white text-zinc-900 shadow-sm" 
                              : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50"
                          )}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Dataset Replacement Options (Issue 6 & 7 Compliance!) */}
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="text-zinc-400 uppercase tracking-wider text-[10px]">Import Mode:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                        <input 
                          type="radio" 
                          name="import_mode" 
                          checked={importMode === 'replace'} 
                          onChange={() => setImportMode('replace')}
                          className="accent-zinc-900"
                        />
                        Replace Current
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                        <input 
                          type="radio" 
                          name="import_mode" 
                          checked={importMode === 'append'} 
                          onChange={() => setImportMode('append')}
                          className="accent-zinc-900"
                        />
                        Append Data
                      </label>
                    </div>
                  </div>
                )}

                {/* Main Views based on selection */}
                {parsedAlumni.length === 0 ? (
                  <>
                    {importTab === 'upload' && (
                      <div className="space-y-4">
                        {!selectedFile ? (
                          <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-colors relative">
                            <input 
                              type="file" 
                              accept=".csv,.tsv,.json,.pdf,.png,.jpg,.jpeg,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-zinc-800">Drag and drop your document/sheet here</p>
                            <p className="text-xs text-zinc-500 mt-1">Supports Excel Spreadsheets (.xlsx, .xls), PDF directories, Images, CSVs, or JSON files</p>
                            <button className="mt-4 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm pointer-events-none">
                              Browse Files
                            </button>
                          </div>
                        ) : (
                          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                                  <Upload className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-zinc-800 truncate max-w-[280px] md:max-w-md">{selectedFile.name}</p>
                                  <p className="text-[11px] text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document File'}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedFile(null);
                                  setSelectedFileBase64('');
                                  setCsvHeaders([]);
                                  setCsvRows([]);
                                  setParsedAlumni([]);
                                }}
                                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                              >
                                Remove File
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              {/* Option A: Gemini Smart AI Parse */}
                              <div className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 flex flex-col justify-between transition-all">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-zinc-900 animate-pulse" />
                                    <span className="text-sm font-bold text-zinc-900">Gemini AI Smart Extract</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 leading-relaxed">
                                    Highly Recommended. Automatically maps all columns (including multi-job sequence tables) and extracts complete career histories with high accuracy.
                                  </p>
                                </div>
                                <button 
                                  onClick={handleAIFileExtract}
                                  disabled={isAiParsing}
                                  className="w-full mt-4 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isAiParsing ? (
                                    <>
                                      <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full"
                                      />
                                      Extracting details...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                                      Run AI Smart Extract
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Option B: Classic Column Mapper */}
                              <div className={cn(
                                "bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all",
                                (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.tsv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))
                                  ? "border-zinc-200 hover:border-zinc-300"
                                  : "border-zinc-100 opacity-60"
                              )}>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm font-bold text-zinc-900">Classic Column Mapper</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 leading-relaxed">
                                    Manually map column headings from your spreadsheet or tabular file to database fields. Best for simple files.
                                  </p>
                                </div>
                                <button 
                                  disabled={!(selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.tsv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))}
                                  onClick={() => {
                                    triggerToast("Column mapper loaded. Scroll down to match headers.", "info");
                                  }}
                                  className="w-full mt-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-sm disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Use Column Mapper
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                          <div className="flex items-start gap-2.5">
                            <HelpCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-zinc-800">Support for PDF, Images & Sheets</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">Supports sequential jobs: First to Fifth job titles/employers, higher studies and contacts. Gemini matches layout cleanly.</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleDownloadTemplate}
                            className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer shrink-0"
                          >
                            Download Template
                          </button>
                        </div>
                      </div>
                    )}

                    {importTab === 'paste' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pasted Tabular Data (Issue 6 Compliance)</label>
                          <p className="text-[11px] text-zinc-500">Copy multiple rows from Excel/Google Sheets (including headers) and paste them here directly.</p>
                        </div>
                        <textarea
                          placeholder="Name of the Alumni	First job title after grad	First Employer/Org	Linkedin	Email ID&#10;Aastha Sethi	Senior Officer	United for Global Mental Health	https://linkedin.com/in/aasthasethi	aastha@gmail.com"
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          className="w-full h-40 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all resize-none"
                        />
                        <button 
                          onClick={handlePasteParse}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                        >
                          Parse Pasted Rows
                        </button>
                      </div>
                    )}

                    {importTab === 'ai' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">AI Unstructured Text Import</label>
                          <p className="text-[11px] text-zinc-500">Paste any raw textual lists, emails, or messages. Gemini AI will scan the text and format it into structured profiles!</p>
                        </div>
                        <textarea
                          placeholder="Example:&#10;- Aastha Sethi, 2018 batch, studied Public Policy, now working as Senior Officer at United for Global Mental Health in London. Contact: aastha.sethi7@gmail.com&#10;- Abhishek Deshwal (class of 2017 Economics) teaches at Columbia University in New York..."
                          value={aiText}
                          onChange={(e) => setAiText(e.target.value)}
                          className="w-full h-40 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all resize-none leading-relaxed"
                        />
                        <button 
                          onClick={handleAIPagingParse}
                          disabled={isAiParsing}
                          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
                        >
                          {isAiParsing ? (
                            <>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full"
                              />
                              Gemini is organizing profiles...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                              Gemini AI Smart Extract
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Column Mapper View */}
                    {csvHeaders.length > 0 && (
                      <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 space-y-4 animate-fadeIn">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-bold text-zinc-800">Map Table Columns</h3>
                          <p className="text-xs text-zinc-500">Match the columns from your sheet to the appropriate alumni attributes.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { key: 'name', label: 'Alumni Name (Required)' },
                            { key: 'batch', label: 'Batch Year (Required)' },
                            { key: 'department', label: 'Department / Major' },
                            { key: 'currentRole', label: 'Current Role (if standalone)' },
                            { key: 'currentCompany', label: 'Current Company (if standalone)' },
                            { key: 'job1_role', label: '1st Job Title (Chronological)' },
                            { key: 'job1_company', label: '1st Job Employer (Chronological)' },
                            { key: 'job2_role', label: '2nd Job Title (Chronological)' },
                            { key: 'job2_company', label: '2nd Job Employer (Chronological)' },
                            { key: 'job3_role', label: '3rd Job Title (Chronological)' },
                            { key: 'job3_company', label: '3rd Job Employer (Chronological)' },
                            { key: 'job4_role', label: '4th Job Title (Chronological)' },
                            { key: 'job4_company', label: '4th Job Employer (Chronological)' },
                            { key: 'job5_role', label: '5th Job Title (Chronological)' },
                            { key: 'job5_company', label: '5th Job Employer (Chronological)' },
                            { key: 'education', label: 'Higher Studies / Education' },
                            { key: 'phone', label: 'Phone Number' },
                            { key: 'email', label: 'Email Address' },
                            { key: 'linkedinUrl', label: 'LinkedIn Profile Link' },
                            { key: 'skills', label: 'Key Skills (Comma separated)' },
                            { key: 'location', label: 'Location' },
                          ].map(field => (
                            <div key={field.key} className="flex flex-col gap-1 bg-white p-3.5 border border-zinc-100 rounded-xl">
                              <span className="text-xs font-semibold text-zinc-700">{field.label}</span>
                              <select 
                                value={columnMapping[field.key] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? -1 : parseInt(e.target.value);
                                  setColumnMapping(prev => ({ ...prev, [field.key]: val }));
                                }}
                                className="bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 text-xs font-medium focus:outline-none focus:border-zinc-400 mt-1"
                              >
                                <option value="">-- Choose Column --</option>
                                {csvHeaders.map((header, idx) => (
                                  <option key={`header-${idx}`} value={idx}>{header}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <p className="text-[11px] text-zinc-400">Total rows found: {csvRows.length}</p>
                          <button 
                            onClick={handleApplyMapping}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                          >
                            Apply Map & Preview Profiles
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Parsed Profiles Preview List State
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-800">Review & Commit Graduates</h3>
                        <p className="text-xs text-zinc-500">Preview of parsed batch alumni data to be imported.</p>
                      </div>
                      <span className="text-xs font-bold bg-zinc-900 text-white px-2.5 py-1 rounded-full">{parsedAlumni.length} Ready</span>
                    </div>

                    <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Alumnus Name</th>
                            <th className="px-4 py-3">Grad Year / Dept</th>
                            <th className="px-4 py-3">Latest Role / Employer</th>
                            <th className="px-4 py-3">Location / Contact</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                           {parsedAlumni.map((alumnus, idx) => (
                            <tr key={`parsed-${idx}`} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-3.5 flex items-center gap-2">
                                <AlumniAvatar name={alumnus.name} avatarUrl={alumnus.avatarUrl} linkedinUrl={alumnus.linkedinUrl} size="sm" />
                                <span className="font-bold text-zinc-900">{alumnus.name}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div>{displayBatch(alumnus.batch)}</div>
                                <div className="text-[10px] text-zinc-400 font-semibold">{alumnus.department || 'General'}</div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="truncate max-w-[150px] font-semibold text-zinc-800">{alumnus.currentRole}</div>
                                <div className="text-[10px] text-zinc-400 font-semibold truncate max-w-[150px]">{alumnus.currentCompany}</div>
                                {alumnus.trajectory && alumnus.trajectory.length > 0 && (
                                  <div className="text-[9px] text-zinc-500 font-medium mt-1 bg-zinc-100 border border-zinc-200/50 px-1.5 py-0.5 rounded-md w-fit flex items-center gap-1">
                                    <Briefcase className="w-2.5 h-2.5 text-zinc-400" />
                                    {alumnus.trajectory.length} trajectory steps
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="text-zinc-500">{alumnus.location}</div>
                                <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{alumnus.email}</div>
                                {alumnus.linkedinUrl ? (
                                  <div className="text-[9px] text-blue-600 font-semibold mt-1 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md w-fit flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 text-blue-500" />
                                    LinkedIn link included
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-zinc-400 font-semibold mt-1 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded-md w-fit">
                                    No LinkedIn URL
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button 
                                  onClick={() => {
                                    setParsedAlumni(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                      <button 
                        onClick={() => {
                          setParsedAlumni([]);
                          setCsvHeaders([]);
                          setCsvRows([]);
                        }}
                        className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                      >
                        Back / Start Over
                      </button>
                      <button 
                        onClick={commitImportedAlumni}
                        className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 shadow-lg cursor-pointer flex items-center gap-1.5 animate-pulse"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        Commit {parsedAlumni.length} Profiles ({importMode})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Toast component
  function renderToast() {
    return (
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-4 right-4 z-[200] px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2",
              toast.type === 'success' ? "bg-zinc-900 text-white border-zinc-800" :
              toast.type === 'error' ? "bg-red-50 text-red-800 border-red-200 animate-bounce" :
              "bg-zinc-800 text-white border-zinc-700"
            )}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
}
