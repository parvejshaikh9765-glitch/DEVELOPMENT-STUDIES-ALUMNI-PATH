import { Alumni, AuditLog, Suggestion } from '../types';
import * as XLSX from 'xlsx';
import { extractIntelligentLocation, normalizeLocation, normalizeLocationData } from '../utils/locationUtils';

/**
 * Extract a valid LinkedIn URL from a text value (handles formulas, markdown, HTML, relative links, and URLs)
 */
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

/**
 * Extract batch/graduation year or range from arbitrary text headers, filenames, or sheet names
 */
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

/**
 * Parses an Excel worksheet cell value to extract embedded hyperlinks or hyperlink formulas robustly.
 */
export function extractCellHyperlink(cellObj: any, cellVal: any): string | null {
  if (!cellObj) {
    return extractLinkedInUrlFromString(String(cellVal ?? ''));
  }

  // 1. Check if there's an explicit hyperlink target attached by SheetJS
  if (cellObj.l && cellObj.l.Target) {
    const targetUrl = String(cellObj.l.Target).trim();
    if (targetUrl) return targetUrl;
  }

  // 2. Check if the cell contains an Excel HYPERLINK formula
  if (cellObj.f && typeof cellObj.f === 'string') {
    const formula = cellObj.f;
    const hyperlinkFormulaRegex = /HYPERLINK\s*\(\s*["']([^"']+)["']/i;
    const match = formula.match(hyperlinkFormulaRegex);
    if (match && match[1]) {
      const targetUrl = match[1].trim();
      if (targetUrl) return targetUrl;
    }
  }

  // 3. Fall back to parsing the raw value as a string
  return extractLinkedInUrlFromString(String(cellVal ?? ''));
}

export interface ValidationError {
  row: number; // 1-based data row index in the spreadsheet
  column?: string; // name of the column header
  value?: any; // value that triggered the warning/error
  message: string; // clear descriptive message for admins
  type: 'error' | 'warning';
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Perform strict validation of uploaded rows based on the user's selected column mapping.
 * Prevents unexpected ingestion errors by logging detailed row-and-column-specific feedback.
 */
export function validateUploadedData(
  rows: string[][],
  mapping: Record<string, number>,
  headers: string[],
  detectedBatch: string | null
): SchemaValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Column Mapping Validation
  const requiredFields = [
    { key: 'name', label: 'Alumni Name' }
  ];

  requiredFields.forEach(f => {
    const idx = mapping[f.key];
    if (idx === undefined || idx === -1) {
      errors.push({
        row: 0,
        column: f.label,
        message: `Required mapping '${f.label}' is missing. Please select the correct spreadsheet column for the student/alumnus name.`,
        type: 'error'
      });
    } else if (idx >= headers.length) {
      errors.push({
        row: 0,
        column: f.label,
        message: `Column index (${idx}) mapped to '${f.label}' exceeds header list limit.`,
        type: 'error'
      });
    }
  });

  const recommendedFields = [
    { key: 'batch', label: 'Batch Year' },
    { key: 'email', label: 'Email ID' },
    { key: 'linkedinUrl', label: 'LinkedIn Link' },
    { key: 'currentRole', label: 'Current Role' },
    { key: 'currentCompany', label: 'Current Company/Organization' }
  ];

  recommendedFields.forEach(f => {
    const idx = mapping[f.key];
    if (idx === undefined || idx === -1) {
      warnings.push({
        row: 0,
        column: f.label,
        message: `Recommended mapping '${f.label}' is not selected. Some profile attributes will default.`,
        type: 'warning'
      });
    }
  });

  // If there are fatal column-level errors, stop parsing rows
  if (errors.some(e => e.row === 0)) {
    return { isValid: false, errors, warnings };
  }

  const nameIdx = mapping['name'];
  const emailIdx = mapping['email'];
  const linkedinIdx = mapping['linkedinUrl'];
  const batchIdx = mapping['batch'];
  const phoneIdx = mapping['phone'];

  // 2. Row by Row Inspection
  rows.forEach((row, rIdx) => {
    const physicalRow = rIdx + 1; // Row position in data
    const rowLabel = `Row ${physicalRow + 1}`; // Header is usually row 1, data starts at row 2

    // Validate Required field: Name
    const nameVal = nameIdx !== undefined && nameIdx !== -1 && nameIdx < row.length ? String(row[nameIdx]).trim() : '';
    if (!nameVal) {
      const hasAnyContent = row.some(cell => cell && String(cell).trim() !== '');
      if (hasAnyContent) {
        warnings.push({
          row: physicalRow,
          column: headers[nameIdx] || 'Alumni Name',
          value: '',
          message: `${rowLabel}: Alumni Name is empty. This row will be skipped during ingestion.`,
          type: 'warning'
        });
      }
    }

    // Validate email if present
    if (emailIdx !== undefined && emailIdx !== -1 && emailIdx < row.length) {
      const emailVal = String(row[emailIdx]).trim();
      if (emailVal) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
          warnings.push({
            row: physicalRow,
            column: headers[emailIdx] || 'Email ID',
            value: emailVal,
            message: `${rowLabel}: Email '${emailVal}' does not match standard address format.`,
            type: 'warning'
          });
        }
      }
    }

    // Validate LinkedIn URL
    if (linkedinIdx !== undefined && linkedinIdx !== -1 && linkedinIdx < row.length) {
      const linkedinVal = String(row[linkedinIdx]).trim();
      if (linkedinVal) {
        if (!linkedinVal.toLowerCase().includes('linkedin.com')) {
          warnings.push({
            row: physicalRow,
            column: headers[linkedinIdx] || 'LinkedIn Link',
            value: linkedinVal,
            message: `${rowLabel}: Link '${linkedinVal}' is not a valid linkedin.com profile URL.`,
            type: 'warning'
          });
        }
      }
    }

    // Validate Phone format if present
    if (phoneIdx !== undefined && phoneIdx !== -1 && phoneIdx < row.length) {
      const phoneVal = String(row[phoneIdx]).trim();
      if (phoneVal) {
        const phoneRegex = /^[+\d\s\(\)-]{5,25}$/;
        if (!phoneRegex.test(phoneVal)) {
          warnings.push({
            row: physicalRow,
            column: headers[phoneIdx] || 'Contact Phone',
            value: phoneVal,
            message: `${rowLabel}: Phone number '${phoneVal}' contains invalid digits or formatting.`,
            type: 'warning'
          });
        }
      }
    }

    // Validate Batch year
    let finalBatch = '';
    if (batchIdx !== undefined && batchIdx !== -1 && batchIdx < row.length) {
      finalBatch = String(row[batchIdx]).trim();
    }
    if (!finalBatch && detectedBatch) {
      finalBatch = detectedBatch;
    }

    if (finalBatch) {
      const has4DigitYear = /(19\d{2}|20\d{2})/.test(finalBatch);
      if (!has4DigitYear) {
        warnings.push({
          row: physicalRow,
          column: batchIdx !== -1 && headers[batchIdx] ? headers[batchIdx] : 'Batch Year',
          value: finalBatch,
          message: `${rowLabel}: Graduating batch year '${finalBatch}' is missing a 4-digit year pattern.`,
          type: 'warning'
        });
      }
    }

    // Validate Location & Work Location mapping (Step 5)
    const companyIdx = mapping['currentCompany'];
    const currentCompany = companyIdx !== undefined && companyIdx !== -1 && companyIdx < row.length ? String(row[companyIdx]).trim() : '';
    const resolvedLoc = extractIntelligentLocation(row, mapping, headers, currentCompany, []);

    if (resolvedLoc === 'Location Not Available') {
      warnings.push({
        row: physicalRow,
        column: mapping['location'] !== -1 && headers[mapping['location']] ? headers[mapping['location']] : 'Location',
        value: '',
        message: `${rowLabel}: No explicit work location found. Displaying as 'Location Not Available'.`,
        type: 'warning'
      });
    } else {
      // Check if organization headquarters fallback was used incorrectly
      const hasExplicitLoc = ['location', 'workLocation', 'officeLocation', 'currentLocation', 'city'].some(key => {
        const idx = mapping[key];
        return idx !== undefined && idx !== -1 && idx < row.length && String(row[idx]).trim();
      });

      if (!hasExplicitLoc && resolvedLoc !== 'Remote') {
        warnings.push({
          row: physicalRow,
          column: 'Location',
          value: resolvedLoc,
          message: `${rowLabel}: Using organization '${currentCompany}' headquarters location as confirmed work location ('${resolvedLoc}').`,
          type: 'warning'
        });
      }

      // Check if remote is incorrectly assigned
      if (resolvedLoc === 'Remote') {
        const hasExplicitRemote = ['location', 'workLocation', 'officeLocation', 'currentLocation'].some(key => {
          const idx = mapping[key];
          if (idx === undefined || idx === -1 || idx >= row.length) return false;
          const val = String(row[idx]).toLowerCase();
          return val.includes('remote') || val.includes('home') || val.includes('wfh');
        });

        if (!hasExplicitRemote) {
          warnings.push({
            row: physicalRow,
            column: 'Location',
            value: 'Remote',
            message: `${rowLabel}: Alumnus is marked as 'Remote', but no explicit remote indicator column was matched in the spreadsheet.`,
            type: 'warning'
          });
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export interface QualityFlag {
  field: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export function getAlumniDataQualityFlags(alumnus: Alumni): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Check Name
  if (!alumnus.name || alumnus.name.trim().length < 2 || alumnus.name.toLowerCase().includes('graduate') || alumnus.name.toLowerCase().includes('student')) {
    flags.push({
      field: 'name',
      issue: 'Incomplete or placeholder alumni name',
      severity: 'high',
      recommendation: 'Verify full candidate name from official records or LinkedIn.'
    });
  }

  // Check Batch
  if (!alumnus.batch || alumnus.batch === 'Batch Not Available' || !/(19\d{2}|20\d{2})/.test(String(alumnus.batch))) {
    flags.push({
      field: 'batch',
      issue: 'Missing graduation batch year',
      severity: 'medium',
      recommendation: 'Specify 4-digit graduation year.'
    });
  }

  // Check Role/Company
  if (!alumnus.currentRole || alumnus.currentRole === 'Alumnus' || !alumnus.currentCompany || alumnus.currentCompany === 'Independent') {
    flags.push({
      field: 'career',
      issue: 'Generic or missing current designation and employer',
      severity: 'high',
      recommendation: 'Sync with LinkedIn or update current organization and designation.'
    });
  }

  // Check Location
  if (!alumnus.location || alumnus.location === 'Location Not Available') {
    flags.push({
      field: 'location',
      issue: 'Location details not available',
      severity: 'medium',
      recommendation: 'Add city/country or run LinkedIn AI sync to auto-detect current location.'
    });
  }

  // Check LinkedIn URL
  if (!alumnus.linkedinUrl || !alumnus.linkedinUrl.includes('linkedin.com/in/')) {
    flags.push({
      field: 'linkedin',
      issue: 'Missing or unverified LinkedIn URL',
      severity: 'medium',
      recommendation: 'Provide valid LinkedIn profile link for automatic synchronization.'
    });
  }

  // Check Email
  if (!alumnus.email || alumnus.email.includes('@alumni.com') || alumnus.email.includes('@example.com')) {
    flags.push({
      field: 'email',
      issue: 'Generated placeholder email address',
      severity: 'low',
      recommendation: 'Update with official personal or professional email address.'
    });
  }

  // Check Trajectory
  if (!Array.isArray(alumnus.trajectory) || alumnus.trajectory.length === 0) {
    flags.push({
      field: 'trajectory',
      issue: 'Empty career timeline',
      severity: 'medium',
      recommendation: 'Generate or enrich career trajectory history.'
    });
  }

  return flags;
}

export interface UploadedFile {
  id: string;
  file_name: string;
  uploaded_at: string;
  record_count: number;
  status: 'processed' | 'failed' | 'processing';
  rawRows?: any[][];
  columnMapping?: Record<string, number>;
  detected_batch?: string;
  rowHyperlinks?: (string | null)[][];
}

class DataService {
  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    let role = 'Viewer';
    const savedUserStr = sessionStorage.getItem('platform_current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && u.role) {
          role = u.role;
        }
      } catch (e) {
        // ignore
      }
    } else {
      role = sessionStorage.getItem('alumni_directory_user_role') || 'Viewer';
    }
    return {
      'X-User-Role': role,
      ...extra
    };
  }

  /**
   * Fetch all alumni from the SQLite backend
   */
  async getAlumni(): Promise<Alumni[]> {
    try {
      const response = await fetch('/api/alumni', {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch alumni');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getAlumni failed', err);
      return [];
    }
  }

  /**
   * Save / Replace entire database
   */
  async saveAlumni(alumni: Alumni[], fileName: string = 'imported_file.xlsx', fileId?: string): Promise<void> {
    try {
      const response = await fetch('/api/alumni/save', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ alumni, fileName, fileId })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save alumni');
      }
    } catch (err) {
      console.error('DataService: saveAlumni failed', err);
      throw err;
    }
  }

  /**
   * Append new records with automatic deduplication merging
   */
  async appendAlumni(newAlumni: Alumni[], fileName: string = 'imported_file.xlsx', fileId?: string): Promise<{ success: boolean; added: number; updated: number; skipped: number }> {
    try {
      const response = await fetch('/api/alumni/append', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ alumni: newAlumni, fileName, fileId })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to append alumni');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: appendAlumni failed', err);
      throw err;
    }
  }

  /**
   * Update one alumnus profile
   */
  async updateAlumnus(alumnus: Alumni): Promise<Alumni[]> {
    try {
      const response = await fetch(`/api/alumni/${alumnus.id}`, {
        method: 'PUT',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(alumnus)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update alumnus');
      }
      return await this.getAlumni();
    } catch (err) {
      console.error('DataService: updateAlumnus failed', err);
      throw err;
    }
  }

  /**
   * Delete one alumnus
   */
  async deleteAlumnus(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/alumni/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete alumnus');
      }
    } catch (err) {
      console.error('DataService: deleteAlumnus failed', err);
      throw err;
    }
  }

  /**
   * Delete multiple selected alumni
   */
  async deleteMultipleAlumni(ids: string[]): Promise<void> {
    try {
      const response = await fetch('/api/alumni/bulk-delete', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete multiple alumni');
      }
    } catch (err) {
      console.error('DataService: deleteMultipleAlumni failed', err);
      throw err;
    }
  }

  /**
   * Delete complete dataset
   */
  async deleteCompleteDataset(): Promise<void> {
    try {
      const response = await fetch('/api/alumni/clear', {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to clear dataset');
      }
    } catch (err) {
      console.error('DataService: deleteCompleteDataset failed', err);
      throw err;
    }
  }

  /**
   * Retrieve uploaded files history from the database
   */
  async getUploadHistory(): Promise<UploadedFile[]> {
    try {
      const response = await fetch('/api/uploaded-files', {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch files history');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getUploadHistory failed', err);
      return [];
    }
  }

  /**
   * Record a new uploaded file
   */
  async addUploadedFile(file: Omit<UploadedFile, 'uploaded_at'> & { uploadedAt?: string }): Promise<void> {
    try {
      const response = await fetch('/api/uploaded-files', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(file)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add uploaded file record');
      }
    } catch (err) {
      console.error('DataService: addUploadedFile failed', err);
      throw err;
    }
  }

  /**
   * Delete an uploaded file and all its associated imported records
   */
  async deleteUploadedFile(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/uploaded-files/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete uploaded file');
      }
    } catch (err) {
      console.error('DataService: deleteUploadedFile failed', err);
      throw err;
    }
  }

  /**
   * Trigger backend reprocessing of an uploaded spreadsheet
   */
  async reprocessUploadedFile(id: string): Promise<{ success: boolean; count: number }> {
    try {
      const response = await fetch(`/api/uploaded-files/${id}/reprocess`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reprocess file');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: reprocessUploadedFile failed', err);
      throw err;
    }
  }

  /**
   * Fetch system audit logs (Super Admin / Admin only)
   */
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const response = await fetch('/api/audit-logs', {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch audit logs');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getAuditLogs failed', err);
      throw err;
    }
  }

  /**
   * Fetch all profile change suggestions
   */
  async getSuggestions(): Promise<Suggestion[]> {
    try {
      const response = await fetch('/api/suggestions', {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch suggestions');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getSuggestions failed', err);
      throw err;
    }
  }

  /**
   * Submit a new profile change suggestion (e.g. from a Student)
   */
  async submitSuggestion(alumniId: string, alumniName: string, suggestedBy: string, fields: Record<string, string>): Promise<void> {
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ alumniId, alumniName, suggestedBy, fields })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit suggestion');
      }
    } catch (err) {
      console.error('DataService: submitSuggestion failed', err);
      throw err;
    }
  }

  /**
   * Approve a suggestion, applying its fields to the live profile
   */
  async approveSuggestion(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/suggestions/${id}/approve`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to approve suggestion');
      }
    } catch (err) {
      console.error('DataService: approveSuggestion failed', err);
      throw err;
    }
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/suggestions/${id}/reject`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reject suggestion');
      }
    } catch (err) {
      console.error('DataService: rejectSuggestion failed', err);
      throw err;
    }
  }

  /**
   * Get which roles have password requirements
   */
  async getRolesPasswordStatus(): Promise<Record<string, boolean>> {
    try {
      const response = await fetch('/api/auth/roles-status', {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to get roles security status');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getRolesPasswordStatus failed', err);
      throw err;
    }
  }

  /**
   * Verify a role password
   */
  async verifyRolePassword(role: string, password?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/verify-role-password', {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Incorrect password or authentication failed' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('DataService: verifyRolePassword failed', err);
      return { success: false, error: 'Network error or authentication service unavailable' };
    }
  }

  /**
   * Change a role password
   */
  async changeRolePassword(role: string, oldPassword?: string, newPassword?: string, isAdminSess?: boolean): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/change-role-password', {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role, oldPassword, newPassword, isAdminSess })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to change password' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('DataService: changeRolePassword failed', err);
      return { success: false, error: 'Network or server error changing password' };
    }
  }

  /**
   * Log in to the platform with a specific user account (Student roll number, Admin, or Super Admin)
   */
  async platformLogin(username: string, password: string): Promise<{ success: boolean; username?: string; role?: string; isFirstLogin?: boolean; sessionId?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/platform-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      return {
        success: true,
        username: data.username,
        role: data.role,
        isFirstLogin: data.isFirstLogin,
        sessionId: data.sessionId
      };
    } catch (err) {
      console.error('DataService: platformLogin failed', err);
      return { success: false, error: 'Network error connecting to login service' };
    }
  }

  /**
   * Update user password (especially after first login)
   */
  async platformChangePassword(username: string, oldPassword?: string, newPassword?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/auth/platform-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, oldPassword, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Password change failed' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('DataService: platformChangePassword failed', err);
      return { success: false, error: 'Network error or password does not meet security requirements' };
    }
  }

  /**
   * Send a session keep-alive to update duration and last_active timestamp
   */
  async platformKeepAlive(sessionId: string): Promise<{ success: boolean; lastActive?: string; duration?: number }> {
    try {
      const response = await fetch('/api/auth/platform-keep-alive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      return await response.json().catch(() => ({ success: false }));
    } catch (err) {
      console.error('DataService: platformKeepAlive failed', err);
      return { success: false };
    }
  }

  /**
   * Track user activities and navigation sequences
   */
  async platformLogActivity(sessionId: string, username: string, role: string, action: string, pageUrl: string, details?: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch('/api/activity/platform-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, username, role, action, pageUrl, details })
      });
      return await response.json().catch(() => ({ success: false }));
    } catch (err) {
      console.error('DataService: platformLogActivity failed', err);
      return { success: false };
    }
  }

  /**
   * Fetch Super Admin Dashboard aggregate statistics
   */
  async getSuperAdminDashboard(): Promise<any> {
    try {
      const response = await fetch('/api/analytics/superadmin-dashboard', {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Unauthorized or failed to load superadmin metrics');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getSuperAdminDashboard failed', err);
      throw err;
    }
  }

  /**
   * Fetch detailed user activity audit logs
   */
  async getActivityLogs(user?: string, actionType?: string, date?: string, search?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (user) params.append('user', user);
      if (actionType) params.append('actionType', actionType);
      if (date) params.append('date', date);
      if (search) params.append('search', search);

      const response = await fetch(`/api/analytics/activity-logs?${params.toString()}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Unauthorized or failed to retrieve activity logs');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getActivityLogs failed', err);
      return [];
    }
  }

  /**
   * Fetch all registered platform users for Super Admin management
   */
  async getPlatformUsers(): Promise<any[]> {
    try {
      const response = await fetch('/api/analytics/platform-users', {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve platform users list');
      }
      return await response.json();
    } catch (err) {
      console.error('DataService: getPlatformUsers failed', err);
      return [];
    }
  }

  /**
   * Reset target user password (by Super Admin)
   */
  async resetUserPassword(targetUsername: string, newPassword: string, forceFirstLogin = false): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/analytics/reset-user-password', {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUsername, newPassword, forceFirstLogin })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reset password' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('DataService: resetUserPassword failed', err);
      return { success: false, error: 'Network error resetting password' };
    }
  }

  /**
   * Unlock user account (by Super Admin)
   */
  async unlockUserAccount(targetUsername: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/analytics/unlock-user', {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUsername })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to unlock user account' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      console.error('DataService: unlockUserAccount failed', err);
      return { success: false, error: 'Network error unlocking user account' };
    }
  }

  /**
   * Trigger database optimizations & query performance regulation (by Super Admin)
   */
  async regulatePerformance(): Promise<{ success: boolean; message?: string; details?: any; error?: string }> {
    try {
      const response = await fetch('/api/analytics/regulate-performance', {
        method: 'POST',
        headers: this.getHeaders()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to regulate performance' };
      }
      return { success: true, message: data.message, details: data.details };
    } catch (err) {
      console.error('DataService: regulatePerformance failed', err);
      return { success: false, error: 'Network error executing database performance regulation' };
    }
  }
}

export const dataService = new DataService();

