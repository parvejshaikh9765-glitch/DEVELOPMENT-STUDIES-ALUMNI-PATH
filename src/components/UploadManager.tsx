import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  Calendar, 
  Sparkles, 
  Trash2, 
  FileText, 
  CheckCircle, 
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Loader2,
  Check,
  Globe,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alumni, CareerStep } from '../types';
import { cn, formatLinkedInUrl, extractLinkedInUrlFromString, extractBatchFromText } from '../utils/displayUtils';
import { extractIntelligentLocation, LOCATION_COLUMN_SYNONYMS, normalizeLocationData } from '../utils/locationUtils';
import { getBatchTrends, parseAlumniDataWithAI, enrichAlumnusWithLinkedInAI } from '../services/geminiService';
import { dataService, UploadedFile, extractCellHyperlink, validateUploadedData, SchemaValidationResult, ValidationError } from '../services/dataService';
import * as XLSX from 'xlsx';

interface UploadManagerProps {
  onClose: () => void;
  onCommit: (parsed: Alumni[], mode: 'replace' | 'append', fileName: string) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'parsing' | 'mapped' | 'importing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  headers: string[];
  rows: string[][];
  columnMapping: Record<string, number>;
  rowHyperlinks: (string | null)[][];
  detectedBatchHeading: string | null;
  parsedAlumni: Alumni[];
  stats?: { added: number; updated: number; skipped: number };
  validationResult?: SchemaValidationResult;
}

export default function UploadManager({ onClose, onCommit, triggerToast }: UploadManagerProps) {
  const [importTab, setImportTab] = useState<'upload' | 'paste' | 'ai'>('upload');
  
  // Multi-file upload queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [consolidatedReport, setConsolidatedReport] = useState<{
    processedFiles: number;
    totalAdded: number;
    totalUpdated: number;
    totalSkipped: number;
  } | null>(null);

  // Enrichment state (single/batch)
  const [enrichingIndex, setEnrichingIndex] = useState<number | null>(null);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<Record<number, { 
    status: 'pending' | 'success' | 'failed' | 'error';
    score?: number;
    explanation?: string;
  }>>({});

  // Other tabs
  const [pastedText, setPastedText] = useState('');
  const [aiText, setAiText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  
  // Parsed list for copy-paste/AI tabs
  const [nonQueueParsedAlumni, setNonQueueParsedAlumni] = useState<Alumni[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = queue.find(item => item.id === selectedQueueId) || null;

  // CSV Simple parser
  const parseCSVText = (text: string, delimiter: string = ','): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string) => {
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
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(line => parseLine(line));
    return { headers, rows };
  };

  // Process a selected file to extract its raw headers and initial values
  const processSingleFileToQueue = (file: File): Promise<Omit<QueueItem, 'id' | 'status' | 'progress'>> => {
    return new Promise((resolve, reject) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const reader = new FileReader();

      if (isExcel) {
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            if (!worksheet) {
              reject(new Error("No worksheets found in Excel file"));
              return;
            }
            const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            if (aoa.length === 0) {
              reject(new Error("Excel worksheet is empty"));
              return;
            }

            // Find best header row candidate
            let headerRowIndex = 0;
            let maxMatches = 0;
            const searchLimit = Math.min(aoa.length, 6);
            const fields = [
              { key: 'name', synonyms: ['name', 'graduate', 'alumni', 'student'] },
              { key: 'batch', synonyms: ['batch', 'year', 'class', 'cohort', 'graduation'] },
              { key: 'department', synonyms: ['department', 'major', 'stream', 'degree', 'discipline'] },
              { key: 'currentRole', synonyms: ['role', 'designation', 'position', 'current title', 'title'] },
              { key: 'currentCompany', synonyms: ['company', 'employer', 'org', 'organization', 'current company'] },
              { key: 'email', synonyms: ['email', 'email id', 'email address', 'contact email'] },
              { key: 'linkedinUrl', synonyms: ['linkedin', 'linkedin link', 'linkedin profile', 'url'] }
            ];

            for (let i = 0; i < searchLimit; i++) {
              const row = aoa[i];
              if (!Array.isArray(row)) continue;
              let matches = 0;
              row.forEach(cell => {
                const cellStr = String(cell ?? '').toLowerCase();
                const isMatch = fields.some(field => 
                  field.synonyms.some(syn => cellStr.includes(syn))
                );
                if (isMatch) matches++;
              });
              if (matches > maxMatches) {
                maxMatches = matches;
                headerRowIndex = i;
              }
            }

            // Extract headings above headers
            let sheetHeadingText = '';
            for (let i = 0; i < headerRowIndex; i++) {
              const row = aoa[i];
              if (Array.isArray(row)) {
                sheetHeadingText += ' ' + row.map(c => String(c ?? '')).join(' ');
              }
            }

            const textToScan = `${file.name} ${firstSheetName} ${sheetHeadingText}`;
            const detectedBatch = extractBatchFromText(textToScan);

            const headers = aoa[headerRowIndex] ? aoa[headerRowIndex].map(h => String(h ?? '').trim()) : [];
            const rows: string[][] = [];
            const links: (string | null)[][] = [];

            const rawRows = aoa.slice(headerRowIndex + 1);
            rawRows.forEach((row, rIdx) => {
              if (!Array.isArray(row)) return;
              const processedRow = row.map(cell => cell === null || cell === undefined ? '' : String(cell).trim());
              const hasContent = processedRow.some(cell => cell !== '');
              if (!hasContent) return;

              const sheetRowIndex = headerRowIndex + 1 + rIdx;
              const cellHyperlinks = row.map((cellVal, colIdx) => {
                const cellAddress = XLSX.utils.encode_cell({ r: sheetRowIndex, c: colIdx });
                const cellObj = worksheet[cellAddress];
                return extractCellHyperlink(cellObj, cellVal);
              });

              rows.push(processedRow);
              links.push(cellHyperlinks);
            });

            // Column Map Auto Discovery
            const initialMap: Record<string, number> = {};
            const synonymsFields = [
              { key: 'name', synonyms: ['name', 'graduate', 'alumni', 'student', 'candidate', 'full name', 'person name', 'alumnus'] },
              { key: 'batch', synonyms: ['batch', 'year', 'class', 'cohort', 'graduation', 'passout', 'pass out year', 'grad year', 'class year', 'batch year'] },
              { key: 'department', synonyms: ['department', 'major', 'stream', 'degree', 'discipline', 'course', 'program', 'branch'] },
              { key: 'currentRole', synonyms: ['role', 'designation', 'position', 'current title', 'title', 'job title', 'current role', 'designation/role', 'present designation'] },
              { key: 'currentCompany', synonyms: ['company', 'employer', 'org', 'organization', 'current company', 'current org', 'company name', 'workplace', 'present organization'] },
              { key: 'email', synonyms: ['email', 'email id', 'email address', 'contact email', 'mail id', 'e-mail'] },
              { key: 'linkedinUrl', synonyms: ['linkedin', 'linkedin link', 'linkedin profile', 'url', 'profile link', 'linkedin url'] },
              { key: 'phone', synonyms: ['phone', 'mobile', 'contact', 'telephone', 'phone number', 'mobile number', 'contact no', 'phone no'] },
              { key: 'skills', synonyms: ['skills', 'expertise', 'technologies', 'tools', 'competencies', 'core skills'] },
              { key: 'location', synonyms: LOCATION_COLUMN_SYNONYMS.location },
              { key: 'workLocation', synonyms: LOCATION_COLUMN_SYNONYMS.workLocation },
              { key: 'officeLocation', synonyms: LOCATION_COLUMN_SYNONYMS.officeLocation },
              { key: 'currentLocation', synonyms: LOCATION_COLUMN_SYNONYMS.currentLocation },
              { key: 'city', synonyms: LOCATION_COLUMN_SYNONYMS.city },
              { key: 'state', synonyms: LOCATION_COLUMN_SYNONYMS.state },
              { key: 'country', synonyms: LOCATION_COLUMN_SYNONYMS.country },
              { key: 'address', synonyms: LOCATION_COLUMN_SYNONYMS.address },
              { key: 'education', synonyms: ['education', 'higher studies', 'qualification', 'degree', 'postgrad', 'phd', 'master', 'university', 'further education'] },
              { key: 'industry', synonyms: ['industry', 'sector', 'business area', 'org sector', 'domain'] },
              { key: 'experience', synonyms: ['experience', 'years of experience', 'yoe', 'work exp', 'tenure'] },
              { key: 'headline', synonyms: ['headline', 'bio', 'summary', 'about', 'profile headline'] },
              { key: 'alumniId', synonyms: ['id', 'alumni id', 'student id', 'roll', 'roll number', 'rollno', 'reference number', 'enrollment no', 'registration no'] }
            ];

            synonymsFields.forEach(field => {
              const idx = headers.findIndex(h => 
                field.synonyms.some(syn => h.toLowerCase().includes(syn))
              );
              if (idx !== -1) {
                initialMap[field.key] = idx;
              }
            });

            resolve({
              file,
              headers,
              rows,
              columnMapping: initialMap,
              rowHyperlinks: links,
              detectedBatchHeading: detectedBatch,
              parsedAlumni: []
            });
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Handle CSV
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            if (!text) {
              reject(new Error("File text is empty"));
              return;
            }

            const isTSV = file.name.endsWith('.tsv');
            const delimiter = isTSV ? '\t' : ',';
            const { headers, rows: rawAOA } = parseCSVText(text, delimiter);

            const textToScan = file.name;
            const detectedBatch = extractBatchFromText(textToScan);

            const links: (string | null)[][] = rawAOA.map(row => 
              row.map(cellVal => extractLinkedInUrlFromString(cellVal))
            );

            // Auto Mapping
            const initialMap: Record<string, number> = {};
            const synonymsFields = [
              { key: 'name', synonyms: ['name', 'graduate', 'alumni', 'student'] },
              { key: 'batch', synonyms: ['batch', 'year', 'class', 'cohort', 'graduation'] },
              { key: 'department', synonyms: ['department', 'major', 'stream', 'degree', 'discipline'] },
              { key: 'currentRole', synonyms: ['role', 'designation', 'position', 'current title', 'title'] },
              { key: 'currentCompany', synonyms: ['company', 'employer', 'org', 'organization', 'current company'] },
              { key: 'email', synonyms: ['email', 'email id', 'email address', 'contact email'] },
              { key: 'linkedinUrl', synonyms: ['linkedin', 'linkedin link', 'linkedin profile', 'url'] },
              { key: 'phone', synonyms: ['phone', 'mobile', 'contact', 'telephone', 'phone number'] },
              { key: 'skills', synonyms: ['skills', 'expertise', 'technologies', 'tools'] },
              { key: 'location', synonyms: LOCATION_COLUMN_SYNONYMS.location },
              { key: 'workLocation', synonyms: LOCATION_COLUMN_SYNONYMS.workLocation },
              { key: 'officeLocation', synonyms: LOCATION_COLUMN_SYNONYMS.officeLocation },
              { key: 'currentLocation', synonyms: LOCATION_COLUMN_SYNONYMS.currentLocation },
              { key: 'city', synonyms: LOCATION_COLUMN_SYNONYMS.city },
              { key: 'state', synonyms: LOCATION_COLUMN_SYNONYMS.state },
              { key: 'country', synonyms: LOCATION_COLUMN_SYNONYMS.country },
              { key: 'address', synonyms: LOCATION_COLUMN_SYNONYMS.address },
              { key: 'education', synonyms: ['education', 'higher studies', 'qualification', 'degree'] }
            ];

            synonymsFields.forEach(field => {
              const idx = headers.findIndex(h => 
                field.synonyms.some(syn => h.toLowerCase().includes(syn))
              );
              if (idx !== -1) {
                initialMap[field.key] = idx;
              }
            });

            resolve({
              file,
              headers: headers.map(h => h.trim()),
              rows: rawAOA,
              columnMapping: initialMap,
              rowHyperlinks: links,
              detectedBatchHeading: detectedBatch,
              parsedAlumni: []
            });
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let selectedFiles: File[] = [];
    if ('files' in e.target && e.target.files) {
      selectedFiles = Array.from(e.target.files);
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      selectedFiles = Array.from(e.dataTransfer.files);
    }

    const validFiles = selectedFiles.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv') || f.name.endsWith('.tsv')
    );

    if (validFiles.length === 0) {
      triggerToast("No valid spreadsheet files (.xlsx, .xls, .csv, .tsv) were selected.", "error");
      return;
    }

    triggerToast(`Parsing ${validFiles.length} file(s)...`, "info");

    const newQueueItems: QueueItem[] = [];
    for (const file of validFiles) {
      const id = `file-upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      try {
        const parsedMeta = await processSingleFileToQueue(file);
        
        // Build the initial alumni mapping
        const initialAlumni = mapRowsToAlumni(
          parsedMeta.rows, 
          parsedMeta.columnMapping, 
          parsedMeta.rowHyperlinks, 
          parsedMeta.detectedBatchHeading,
          file.name,
          parsedMeta.headers
        );

        const validationResult = validateUploadedData(
          parsedMeta.rows,
          parsedMeta.columnMapping,
          parsedMeta.headers,
          parsedMeta.detectedBatchHeading
        );

        newQueueItems.push({
          id,
          ...parsedMeta,
          parsedAlumni: initialAlumni,
          status: 'mapped',
          progress: 100,
          validationResult
        });
      } catch (err: any) {
        newQueueItems.push({
          id,
          file,
          status: 'failed',
          progress: 100,
          error: err.message || 'Parsing failed',
          headers: [],
          rows: [],
          columnMapping: {},
          rowHyperlinks: [],
          detectedBatchHeading: null,
          parsedAlumni: []
        });
      }
    }

    setQueue(prev => {
      const updated = [...prev, ...newQueueItems];
      // Select the first successfully parsed file by default
      const firstValid = updated.find(item => item.status === 'mapped');
      if (firstValid && !selectedQueueId) {
        setSelectedQueueId(firstValid.id);
      }
      return updated;
    });

    triggerToast(`Added ${newQueueItems.length} file(s) to ingestion queue.`, "success");
  };

  const mapRowsToAlumni = (
    rows: string[][], 
    mapping: Record<string, number>, 
    hyperlinks: (string | null)[][],
    detectedBatch: string | null,
    fileName: string,
    headers: string[] = []
  ): Alumni[] => {
    const nameIdx = mapping['name'];
    if (nameIdx === undefined || nameIdx === -1) return [];

    return rows.map((row, rowIndex) => {
      const getVal = (key: string, def: string = ''): string => {
        const idx = mapping[key];
        if (idx === undefined || idx === -1 || idx >= row.length) return def;
        const rawVal = row[idx];
        if (rawVal === undefined || rawVal === null) return def;
        return String(rawVal).replace(/^"|"$/g, '').trim();
      };

      const name = getVal('name');
      const batchRaw = getVal('batch');

      let batch = batchRaw.trim();
      if (!batch && detectedBatch) {
        batch = detectedBatch;
      }
      if (!batch) {
        batch = 'Batch Not Available';
      }

      const email = getVal('email') || `${name.toLowerCase().replace(/\s+/g, '') || 'graduate'}@alumni.com`;

      // Check hyperlink first, then fall back to column mapping
      let linkedin = '';
      if (hyperlinks[rowIndex] && nameIdx !== undefined && nameIdx !== -1 && hyperlinks[rowIndex][nameIdx]) {
        linkedin = formatLinkedInUrl(hyperlinks[rowIndex][nameIdx]);
      }
      
      const linkedinColIdx = mapping['linkedinUrl'];
      if (!linkedin && linkedinColIdx !== undefined && linkedinColIdx !== -1) {
        if (hyperlinks[rowIndex] && hyperlinks[rowIndex][linkedinColIdx]) {
          linkedin = formatLinkedInUrl(hyperlinks[rowIndex][linkedinColIdx]);
        } else {
          linkedin = formatLinkedInUrl(getVal('linkedinUrl'));
        }
      }

      let baseYear = new Date().getFullYear();
      const match = String(batch).match(/\d+/);
      if (match) {
        baseYear = parseInt(match[0]);
      }

      let currentRole = getVal('currentRole');
      let currentCompany = getVal('currentCompany');

      // Dynamically extract sequential career trajectory steps from spreadsheet columns if available
      const sequentialSteps: CareerStep[] = [];
      const stepsToTry = [
        { roleKeys: ['1st', 'first'], compKeys: ['1st', 'first'] },
        { roleKeys: ['2nd', 'second'], compKeys: ['2nd', 'second'] },
        { roleKeys: ['3rd', 'third'], compKeys: ['3rd', 'third'] },
        { roleKeys: ['4th', 'fourth'], compKeys: ['4th', 'fourth'] },
        { roleKeys: ['5th', 'fifth'], compKeys: ['5th', 'fifth'] }
      ];

      stepsToTry.forEach((stepConf, stepNum) => {
        const roleColIdx = headers.findIndex(h => {
          const l = h.toLowerCase();
          return stepConf.roleKeys.some(k => l.includes(k)) && 
                 (l.includes('role') || l.includes('designation') || l.includes('position') || l.includes('title') || l.includes('job'));
        });

        const compColIdx = headers.findIndex(h => {
          const l = h.toLowerCase();
          return stepConf.compKeys.some(k => l.includes(k)) && 
                 (l.includes('company') || l.includes('employer') || l.includes('org') || l.includes('organization'));
        });

        if (roleColIdx !== -1 && compColIdx !== -1 && roleColIdx < row.length && compColIdx < row.length) {
          const rVal = String(row[roleColIdx] ?? '').trim().replace(/^"|"$/g, '').trim();
          const cVal = String(row[compColIdx] ?? '').trim().replace(/^"|"$/g, '').trim();
          if (rVal && cVal && rVal !== '-' && cVal !== '-' && rVal.toLowerCase() !== 'na' && cVal.toLowerCase() !== 'na' && rVal.toLowerCase() !== 'n/a' && cVal.toLowerCase() !== 'n/a') {
            sequentialSteps.push({
              id: `step-${Date.now()}-${rowIndex}-seq-${stepNum}`,
              company: cVal,
              role: rVal,
              startDate: (baseYear + stepNum * 2).toString(),
              endDate: 'Present', // will be adjusted
              location: '', // will be set after intelligent location extraction
              description: `Transition step: ${rVal} at ${cVal}.`
            });
          }
        }
      });

      // Update intermediate step endDates so only the last step is 'Present'
      for (let i = 0; i < sequentialSteps.length - 1; i++) {
        sequentialSteps[i].endDate = sequentialSteps[i + 1].startDate;
      }

      // If we extracted sequential steps but don't have explicit current role/company mapped,
      // use the last step of the sequence as current role/company!
      if (sequentialSteps.length > 0) {
        if (!currentRole || currentRole === 'Alumnus') {
          currentRole = sequentialSteps[sequentialSteps.length - 1].role;
        }
        if (!currentCompany || currentCompany === 'Independent') {
          currentCompany = sequentialSteps[sequentialSteps.length - 1].company;
        }
      }

      if (!currentRole) currentRole = 'Alumnus';
      if (!currentCompany) currentCompany = 'Independent';

      // Perform highly intelligent location extraction using the actual computed company and steps!
      const resolvedLocation = extractIntelligentLocation(row, mapping, headers, currentCompany, sequentialSteps);

      // Backfill the resolved location to the career steps
      sequentialSteps.forEach(step => {
        if (!step.location || step.location === 'Location Not Available') {
          step.location = resolvedLocation;
        }
      });

      const trajectory: CareerStep[] = sequentialSteps.length > 0 ? sequentialSteps : [{
        id: `step-${Date.now()}-${rowIndex}-1`,
        company: currentCompany,
        role: currentRole,
        startDate: baseYear.toString(),
        endDate: 'Present',
        location: resolvedLocation,
        description: `Position as ${currentRole} at ${currentCompany}.`
      }];

      // Detect Higher Studies / Further Education dynamically
      const higherStudiesIdx = headers.findIndex(h => {
        const l = h.toLowerCase();
        return l.includes('higher studies') || l.includes('higher study') || l.includes('higher education') || l.includes('further studies') || l.includes('postgrad');
      });
      let educationVal = getVal('education');
      if (!educationVal && higherStudiesIdx !== -1 && higherStudiesIdx < row.length) {
        const hsVal = String(row[higherStudiesIdx] ?? '').trim().replace(/^"|"$/g, '').trim();
        if (hsVal && hsVal !== '-' && hsVal.toLowerCase() !== 'na' && hsVal.toLowerCase() !== 'n/a') {
          educationVal = hsVal;
        }
      }

      return {
        id: `imported-${Date.now()}-${rowIndex}-${Math.random().toString(36).substring(2, 5)}`,
        name,
        batch,
        department: getVal('department', 'General'),
        currentRole,
        currentCompany,
        location: resolvedLocation,
        email,
        linkedinUrl: linkedin || undefined,
        skills: getVal('skills') ? getVal('skills').split(',').map(s => s.trim()) : ['Social Impact'],
        avatarUrl: '',
        phone: getVal('phone') || undefined,
        education: educationVal || undefined,
        industry: getVal('industry') || undefined,
        experience: getVal('experience') || undefined,
        headline: getVal('headline') || undefined,
        alumniId: getVal('alumniId') || undefined,
        trajectory
      };
    }).filter(a => a && a.name && a.name.length > 0);
  };

  const handleUpdateMapping = (field: string, index: number) => {
    if (!selectedItem) return;

    const nextMapping = { ...selectedItem.columnMapping, [field]: index };
    const nextAlumni = mapRowsToAlumni(
      selectedItem.rows, 
      nextMapping, 
      selectedItem.rowHyperlinks, 
      selectedItem.detectedBatchHeading,
      selectedItem.file.name,
      selectedItem.headers
    );

    const nextValidation = validateUploadedData(
      selectedItem.rows,
      nextMapping,
      selectedItem.headers,
      selectedItem.detectedBatchHeading
    );

    setQueue(prev => prev.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          columnMapping: nextMapping,
          parsedAlumni: nextAlumni,
          validationResult: nextValidation
        };
      }
      return item;
    }));
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue(prev => {
      const next = prev.filter(item => item.id !== id);
      if (selectedQueueId === id) {
        setSelectedQueueId(next[0]?.id || null);
      }
      return next;
    });
  };

  // Sequentially commit all files in the queue
  const handleIngestQueue = async () => {
    const pendingFiles = queue.filter(item => item.status === 'mapped');
    if (pendingFiles.length === 0) {
      triggerToast("No pending files with structured mapping found.", "info");
      return;
    }

    setIsProcessingAll(true);
    setConsolidatedReport(null);

    let filesDone = 0;
    let addedTotal = 0;
    let updatedTotal = 0;
    let skippedTotal = 0;

    const updatedQueue = [...queue];

    for (const item of pendingFiles) {
      const idx = updatedQueue.findIndex(q => q.id === item.id);
      if (idx === -1) continue;

      updatedQueue[idx].status = 'importing';
      setQueue([...updatedQueue]);

      try {
        // 1. Register file upload meta in SQLite first to satisfy foreign key constraints
        await dataService.addUploadedFile({
          id: item.id,
          file_name: item.file.name,
          record_count: item.parsedAlumni.length,
          status: 'processed',
          rawRows: item.rows,
          columnMapping: item.columnMapping,
          detected_batch: item.detectedBatchHeading || '',
          rowHyperlinks: item.rowHyperlinks
        });

        // 2. Send the structured list to the append API
        const appendResult = await dataService.appendAlumni(
          item.parsedAlumni, 
          item.file.name, 
          item.id
        );

        updatedQueue[idx].status = 'completed';
        updatedQueue[idx].stats = {
          added: appendResult.added,
          updated: appendResult.updated,
          skipped: appendResult.skipped
        };

        addedTotal += appendResult.added;
        updatedTotal += appendResult.updated;
        skippedTotal += appendResult.skipped;
        filesDone++;
      } catch (err: any) {
        console.error("Failed importing file", item.file.name, err);
        updatedQueue[idx].status = 'failed';
        updatedQueue[idx].error = err.message || 'Server ingestion failed';
      }

      setQueue([...updatedQueue]);
    }

    setIsProcessingAll(false);
    
    // Set consolidated summary report
    setConsolidatedReport({
      processedFiles: filesDone,
      totalAdded: addedTotal,
      totalUpdated: updatedTotal,
      totalSkipped: skippedTotal
    });

    triggerToast(`Ingested ${filesDone} class sheet(s) successfully!`, "success");

    // Retrieve master list to update home view
    const masterAlumni = await dataService.getAlumni();
    onCommit(masterAlumni, 'append', 'Multi-file Upload');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Copied & AI Ingest tabs
  const handlePasteParse = () => {
    if (!pastedText.trim()) return;
    const { headers, rows } = parseCSVText(pastedText, '\t');
    if (headers.length === 0) {
      triggerToast("No data found in clipboard content.", "error");
      return;
    }

    // Attempt simple index map
    const map: Record<string, number> = {};
    headers.forEach((h, i) => {
      const hl = h.toLowerCase();
      if (hl.includes('name') || hl.includes('student')) map['name'] = i;
      if (hl.includes('batch') || hl.includes('year')) map['batch'] = i;
      if (hl.includes('email')) map['email'] = i;
      if (hl.includes('linkedin')) map['linkedinUrl'] = i;
      if (hl.includes('company') || hl.includes('employer')) map['currentCompany'] = i;
      if (hl.includes('role') || hl.includes('title')) map['currentRole'] = i;
      if (hl.includes('dept') || hl.includes('subject')) map['department'] = i;
      if (hl.includes('location') || hl.includes('city')) map['location'] = i;
    });

    const hyperlinks = rows.map(r => r.map(c => extractLinkedInUrlFromString(c)));
    const parsed = mapRowsToAlumni(rows, map, hyperlinks, '2018', 'Clipboard Paste', headers);
    setNonQueueParsedAlumni(parsed);
    triggerToast(`Parsed ${parsed.length} items from clipboard copy.`, "success");
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setIsAiParsing(true);
    try {
      const list = await parseAlumniDataWithAI(aiText);
      setNonQueueParsedAlumni(list);
      triggerToast(`AI parsed ${list.length} profiles from unstructured text!`, "success");
    } catch (e: any) {
      triggerToast(e.message || "AI failed to analyze the block.", "error");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleCommitNonQueue = async () => {
    if (nonQueueParsedAlumni.length === 0) return;
    try {
      const appendResult = await dataService.appendAlumni(
        nonQueueParsedAlumni,
        'Direct Text Ingest'
      );
      triggerToast(`Successfully committed ${nonQueueParsedAlumni.length} entries.`, "success");
      setNonQueueParsedAlumni([]);
      const masterAlumni = await dataService.getAlumni();
      onCommit(masterAlumni, 'append', 'Direct Text Ingest');
      onClose();
    } catch (e) {
      triggerToast("Failed to save entries to the SQLite database.", "error");
    }
  };

  // Enrichment
  const handleEnrichSingle = async (index: number) => {
    if (!selectedItem) return;
    const alumnus = selectedItem.parsedAlumni[index];
    if (!alumnus || !alumnus.linkedinUrl) return;

    setEnrichingIndex(index);
    setEnrichmentResults(prev => ({ ...prev, [index]: { status: 'pending' } }));

    try {
      const res = await enrichAlumnusWithLinkedInAI(alumnus);
      if (res && res.isValidMatch && res.profile) {
        const up = res.profile;
        const enriched: Alumni = {
          ...alumnus,
          avatarUrl: up.avatarUrl || alumnus.avatarUrl || '',
          headline: up.headline || alumnus.headline || '',
          currentRole: up.currentRole || alumnus.currentRole,
          currentCompany: up.currentCompany || alumnus.currentCompany,
          location: up.location || alumnus.location,
          education: up.education || alumnus.education,
          skills: Array.from(new Set([...(alumnus.skills || []), ...(up.skills || [])])).filter(Boolean),
          trajectory: up.trajectory && up.trajectory.length > 0
            ? up.trajectory.map((step: any, sIdx: number) => ({
                id: `step-enriched-${Date.now()}-${index}-${sIdx}`,
                company: step.company || 'Independent',
                role: step.role || 'Alumnus',
                startDate: step.startDate || alumnus.batch?.toString() || 'N/A',
                endDate: step.endDate || 'Present',
                location: step.location || alumnus.location || 'Location Not Available',
                description: step.description || ''
              }))
            : alumnus.trajectory
        };

        setQueue(prev => prev.map(item => {
          if (item.id === selectedItem.id) {
            const nextAlumni = [...item.parsedAlumni];
            nextAlumni[index] = enriched;
            return { ...item, parsedAlumni: nextAlumni };
          }
          return item;
        }));

        setEnrichmentResults(prev => ({
          ...prev,
          [index]: { status: 'success', score: res.confidenceScore, explanation: res.explanation }
        }));
        triggerToast(`Enriched ${alumnus.name} via LinkedIn!`, "success");
      } else {
        setEnrichmentResults(prev => ({
          ...prev,
          [index]: { status: 'failed', score: res.confidenceScore, explanation: res.explanation }
        }));
      }
    } catch {
      setEnrichmentResults(prev => ({ ...prev, [index]: { status: 'error' } }));
    } finally {
      setEnrichingIndex(null);
    }
  };

  const handleEnrichAll = async () => {
    if (!selectedItem) return;
    const itemsToEnrich = selectedItem.parsedAlumni
      .map((a, i) => ({ a, i }))
      .filter(x => x.a.linkedinUrl && !enrichmentResults[x.i]);

    if (itemsToEnrich.length === 0) {
      triggerToast("No pending LinkedIn profiles available for enrichment.", "info");
      return;
    }

    setIsBatchEnriching(true);
    triggerToast(`Starting batch verification of ${itemsToEnrich.length} profiles...`, "info");

    for (const item of itemsToEnrich) {
      await handleEnrichSingle(item.i);
    }

    setIsBatchEnriching(false);
    triggerToast("Batch LinkedIn validation completed.", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl h-[85vh] bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden z-10"
      >
        {/* Header banner */}
        <div className="p-6 border-b border-zinc-100 shrink-0 flex items-center justify-between bg-zinc-50">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-900 font-sans tracking-tight">Class Sheet Ingestion Console</h2>
            <p className="text-xs text-zinc-500 font-sans">
              Populate the centralized alumni directory via drag-and-drop batch excel sheets, copy-pasting tabular grids, or raw text blocks.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-100 px-6 shrink-0 bg-white gap-2 py-1.5">
          <button
            onClick={() => setImportTab('upload')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              importTab === 'upload' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
            )}
          >
            Spreadsheet Batch Ingest
          </button>
          <button
            onClick={() => setImportTab('paste')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              importTab === 'paste' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
            )}
          >
            Tabular Copy & Paste
          </button>
          <button
            onClick={() => setImportTab('ai')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              importTab === 'ai' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
            )}
          >
            Unstructured Text (AI Parse)
          </button>
        </div>

        {/* Core Workspace body */}
        <div className="flex-1 overflow-hidden">
          {importTab === 'upload' && (
            <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-100">
              {/* Queue sidebar panel */}
              <div className="w-full md:w-80 p-4 overflow-y-auto bg-zinc-50/50 flex flex-col shrink-0">
                <div className="mb-4">
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleFilesSelected}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl p-6 text-center cursor-pointer bg-white transition-all hover:bg-zinc-50 space-y-2"
                  >
                    <Upload className="w-6 h-6 text-zinc-400 mx-auto" />
                    <span className="text-xs font-bold text-zinc-700 block">Select sheets</span>
                    <span className="text-[10px] text-zinc-400 block font-medium">Multi-selection XLSX / CSV supported</span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFilesSelected}
                      multiple
                      accept=".xlsx,.xls,.csv,.tsv"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">File Ingestion Queue ({queue.length})</h3>
                  {queue.length > 0 ? (
                    <div className="space-y-2 max-h-[30vh] md:max-h-none overflow-y-auto pr-1">
                      {queue.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedQueueId(item.id)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center",
                            selectedQueueId === item.id 
                              ? "bg-white border-zinc-900 shadow-sm" 
                              : "bg-white border-zinc-100 hover:border-zinc-200"
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-xs font-bold text-zinc-800 truncate block" title={item.file.name}>
                              {item.file.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] text-zinc-400 font-semibold block">
                                {(item.file.size / 1024).toFixed(1)} KB
                              </span>
                              {item.status === 'completed' && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">
                                  <Check className="w-2 h-2" />
                                  Committed
                                </span>
                              )}
                              {item.status === 'importing' && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-zinc-900 text-white px-1 py-0.5 rounded">
                                  <Loader2 className="w-2 h-2 animate-spin" />
                                  Ingesting
                                </span>
                              )}
                              {item.status === 'failed' && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-red-100 text-red-800 px-1 py-0.5 rounded" title={item.error}>
                                  <AlertCircle className="w-2 h-2" />
                                  Failed
                                </span>
                              )}
                              {item.status === 'mapped' && (
                                item.validationResult && !item.validationResult.isValid ? (
                                  <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-red-100 text-red-800 px-1 py-0.5 rounded">
                                    <AlertCircle className="w-2 h-2 animate-pulse" />
                                    Fatal Errors ({item.validationResult.errors.length})
                                  </span>
                                ) : (
                                  <span className={cn(
                                    "inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded",
                                    item.validationResult && item.validationResult.warnings.length > 0
                                      ? "bg-amber-100 text-amber-800 animate-pulse"
                                      : "bg-blue-100 text-blue-800"
                                  )}>
                                    Ready ({item.parsedAlumni.length} rows)
                                    {item.validationResult && item.validationResult.warnings.length > 0 && ` (${item.validationResult.warnings.length}w)`}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromQueue(item.id);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-zinc-100 italic text-zinc-400 text-xs">
                      Queue is currently empty.
                    </div>
                  )}
                </div>

                {queue.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100 shrink-0 space-y-2">
                    {queue.some(q => q.status === 'mapped' && q.validationResult && !q.validationResult.isValid) && (
                      <div className="p-2.5 bg-red-50 border border-red-100 text-red-800 text-[10px] font-bold rounded-xl flex items-start gap-1.5 leading-normal">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-600" />
                        <span>
                          Cannot commit: One or more sheets have fatal schema errors. Click on the sheets with errors in the queue and fix their mappings or spreadsheet files.
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleIngestQueue}
                      disabled={isProcessingAll || queue.filter(q => q.status === 'mapped').length === 0 || queue.some(q => q.status === 'mapped' && q.validationResult && !q.validationResult.isValid)}
                      className="w-full py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isProcessingAll ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Ingesting Batch...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Commit Pending Sheets ({queue.filter(q => q.status === 'mapped').length})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Main detail configuration panel */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col h-full bg-white">
                {consolidatedReport && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                      Consolidated Batch Report
                    </h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Processed</span>
                        <span className="text-sm font-extrabold text-zinc-900 block mt-0.5">{consolidatedReport.processedFiles} sheet(s)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">New Alumni</span>
                        <span className="text-sm font-extrabold text-zinc-900 block mt-0.5">+{consolidatedReport.totalAdded} added</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Merged</span>
                        <span className="text-sm font-extrabold text-zinc-900 block mt-0.5">+{consolidatedReport.totalUpdated} updated</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Ignored</span>
                        <span className="text-sm font-extrabold text-zinc-900 block mt-0.5">{consolidatedReport.totalSkipped} skipped</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItem ? (
                  <div className="space-y-6">
                    {/* Header bar of selected item */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4.5 h-4.5 text-zinc-400" />
                          Configuring: {selectedItem.file.name}
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                          Synonyms auto-mapped. Adjust column headings manually below if needed.
                        </p>
                      </div>
                      {selectedItem.detectedBatchHeading && (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Heading Year: {selectedItem.detectedBatchHeading}
                        </span>
                      )}
                    </div>

                    {/* Mapping grid */}
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Field Column Headings Alignment</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[
                          { key: 'name', label: 'Alumni Name (Req)', req: true },
                          { key: 'batch', label: 'Batch Year' },
                          { key: 'department', label: 'Department' },
                          { key: 'currentRole', label: 'Current Role' },
                          { key: 'currentCompany', label: 'Current Organization' },
                          { key: 'email', label: 'Email ID' },
                          { key: 'linkedinUrl', label: 'LinkedIn Link' },
                          { key: 'phone', label: 'Contact Phone' },
                          { key: 'skills', label: 'Skills' },
                          { key: 'location', label: 'Location' },
                          { key: 'education', label: 'Education' },
                          { key: 'industry', label: 'Industry / Sector' },
                          { key: 'experience', label: 'Experience / YOE' },
                          { key: 'headline', label: 'Headline / Bio' },
                          { key: 'alumniId', label: 'Alumni / Student ID' }
                        ].map(field => {
                          const mappedIdx = selectedItem.columnMapping[field.key];
                          return (
                            <div key={field.key} className="bg-white p-2.5 rounded-xl border border-zinc-100 flex flex-col gap-1.5">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block">{field.label}</span>
                              <select
                                value={mappedIdx !== undefined ? mappedIdx : -1}
                                onChange={(e) => handleUpdateMapping(field.key, parseInt(e.target.value))}
                                className="w-full text-[10px] font-bold bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                              >
                                <option value={-1}>-- Not Provided --</option>
                                {selectedItem.headers.map((h, i) => (
                                  <option key={i} value={i}>{h}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Strict Schema Validation Panel */}
                    {selectedItem.validationResult && (
                      <div className={cn(
                        "p-4 rounded-2xl border flex flex-col gap-3",
                        selectedItem.validationResult.isValid 
                          ? (selectedItem.validationResult.warnings.length > 0 
                              ? "bg-amber-50/50 border-amber-200" 
                              : "bg-emerald-50/50 border-emerald-200")
                          : "bg-red-50/50 border-red-200"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedItem.validationResult.isValid ? (
                              selectedItem.validationResult.warnings.length > 0 ? (
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                              )
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                            )}
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900">
                                {selectedItem.validationResult.isValid 
                                  ? (selectedItem.validationResult.warnings.length > 0 
                                      ? "Strict Schema Validation: Passed with Warnings" 
                                      : "Strict Schema Validation: Clean Pass")
                                  : "Strict Schema Validation: Action Required"}
                              </h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {selectedItem.validationResult.isValid 
                                  ? `This file satisfies all strict schema ingestion requirements. (${selectedItem.validationResult.warnings.length} warning(s) found)`
                                  : `${selectedItem.validationResult.errors.length} fatal error(s) and ${selectedItem.validationResult.warnings.length} warning(s) must be reviewed or fixed before importing.`
                                }
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                            selectedItem.validationResult.isValid 
                              ? (selectedItem.validationResult.warnings.length > 0 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-emerald-100 text-emerald-800")
                              : "bg-red-100 text-red-800"
                          )}>
                            {selectedItem.validationResult.isValid ? "Valid" : "Blocked"}
                          </span>
                        </div>

                        {/* List of validation errors/warnings */}
                        {(selectedItem.validationResult.errors.length > 0 || selectedItem.validationResult.warnings.length > 0) && (
                          <div className="bg-white border border-zinc-100 rounded-xl max-h-[180px] overflow-y-auto divide-y divide-zinc-100 text-[11px]">
                            {/* Fatal Errors */}
                            {selectedItem.validationResult.errors.map((err, errIdx) => (
                              <div key={`err-${errIdx}`} className="p-2.5 flex gap-2 hover:bg-zinc-50 transition-all">
                                <span className="bg-red-100 text-red-800 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase h-fit mt-0.5 shrink-0">
                                  Error
                                </span>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-zinc-400 font-bold text-[9px]">
                                      [Row {err.row || 'N/A'}] [Col: {err.column || 'Unmapped'}]
                                    </span>
                                  </div>
                                  <span className="text-zinc-800 font-medium block">{err.message}</span>
                                  {err.value !== undefined && err.value !== '' && (
                                    <div className="text-[9px] text-zinc-500 font-semibold bg-zinc-50 border border-zinc-100 px-1 py-0.5 rounded w-fit mt-1">
                                      Value: "{err.value}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Warnings */}
                            {selectedItem.validationResult.warnings.map((warn, warnIdx) => (
                              <div key={`warn-${warnIdx}`} className="p-2.5 flex gap-2 hover:bg-zinc-50 transition-all">
                                <span className="bg-amber-100 text-amber-800 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase h-fit mt-0.5 shrink-0">
                                  Warn
                                </span>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-zinc-400 font-bold text-[9px]">
                                      [Row {warn.row || 'N/A'}] [Col: {warn.column || 'Unmapped'}]
                                    </span>
                                  </div>
                                  <span className="text-zinc-600 font-medium block">{warn.message}</span>
                                  {warn.value !== undefined && warn.value !== '' && (
                                    <div className="text-[9px] text-zinc-500 font-semibold bg-zinc-50 border border-zinc-100 px-1 py-0.5 rounded w-fit mt-1">
                                      Value: "{warn.value}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LinkedIn Enrichment Banner */}
                    {selectedItem.parsedAlumni.some(a => a.linkedinUrl) && (
                      <div className="p-4 bg-zinc-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">Auto-Enrich & Validate Profiles</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                              Validate matches using education and organizations to prevent mismatches. Pull current job, organization, profile pictures, and history.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleEnrichAll}
                          disabled={isBatchEnriching}
                          className="w-full md:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:bg-zinc-700 disabled:text-zinc-500 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {isBatchEnriching ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Enrich All via LinkedIn AI
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Preview Table Feed */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Mapped Alumni Preview ({selectedItem.parsedAlumni.length} entries detected)
                      </h4>
                      <div className="border border-zinc-200 rounded-2xl divide-y divide-zinc-100 max-h-[300px] overflow-y-auto bg-zinc-50/50 p-2 space-y-2">
                        {selectedItem.parsedAlumni.map((alumnus, idx) => {
                          const enrichment = enrichmentResults[idx];
                          const hasLinkedIn = !!alumnus.linkedinUrl;

                          return (
                            <div key={idx} className="bg-white border border-zinc-50 p-3 rounded-xl shadow-xs flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {alumnus.avatarUrl ? (
                                  <img 
                                    src={alumnus.avatarUrl} 
                                    alt={alumnus.name} 
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-full object-cover border border-zinc-100"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-xs shrink-0">
                                    {alumnus.name[0]}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-zinc-900">{alumnus.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded">
                                      Batch: {alumnus.batch}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">
                                    {alumnus.currentRole} at <span className="font-semibold text-zinc-700">{alumnus.currentCompany}</span>
                                  </p>
                                  {hasLinkedIn && (
                                    <a 
                                      href={alumnus.linkedinUrl} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-[9px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5 mt-1"
                                    >
                                      <Globe className="w-3 h-3" />
                                      {alumnus.linkedinUrl}
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {hasLinkedIn && !enrichment && (
                                  <button
                                    onClick={() => handleEnrichSingle(idx)}
                                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                                  >
                                    Enrich
                                  </button>
                                )}
                                {enrichment?.status === 'pending' && (
                                  <span className="text-[9px] text-zinc-400 font-bold flex items-center gap-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                                  </span>
                                )}
                                {enrichment?.status === 'success' && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                    Verified ({enrichment.score}%)
                                  </span>
                                )}
                                {enrichment?.status === 'failed' && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded" title={enrichment.explanation}>
                                    Mismatch ({enrichment.score}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <FileSpreadsheet className="w-12 h-12 text-zinc-300 animate-bounce" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800">Select or Drag Sheet to Begin</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mt-1">
                        Upload multi-class Excel files or CSV spreadsheets. The ingest engine auto-discovers batch columns and hyperlinks.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {importTab === 'paste' && (
            <div className="p-6 h-full flex flex-col gap-4 bg-white">
              <div className="space-y-1 shrink-0">
                <h3 className="text-sm font-bold text-zinc-900">Tabular Copy-Paste Ingestion</h3>
                <p className="text-xs text-zinc-400">Copy cells directly from Excel/Google Sheets and paste them in the zone below.</p>
              </div>

              <textarea
                placeholder="Paste rows here (headers in first row, tab-separated cols)..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="flex-1 w-full p-4 border border-zinc-200 rounded-2xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />

              <div className="flex justify-end gap-3 shrink-0">
                <button
                  onClick={handlePasteParse}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
                >
                  Parse Clipboard
                </button>
              </div>

              {nonQueueParsedAlumni.length > 0 && (
                <div className="border border-zinc-100 rounded-2xl p-4 bg-zinc-50 space-y-3">
                  <span className="text-xs font-bold text-zinc-700 block">Structured Result Preview ({nonQueueParsedAlumni.length})</span>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                    {nonQueueParsedAlumni.map((item, idx) => (
                      <div key={idx} className="bg-white p-2 border border-zinc-100 rounded-lg flex justify-between text-xs">
                        <span className="font-bold">{item.name}</span>
                        <span className="text-zinc-500">{item.currentRole} at {item.currentCompany}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCommitNonQueue}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                    >
                      Commit to Cloud SQLite
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {importTab === 'ai' && (
            <div className="p-6 h-full flex flex-col gap-4 bg-white">
              <div className="space-y-1 shrink-0">
                <h3 className="text-sm font-bold text-zinc-900">Unstructured Text AI Parser</h3>
                <p className="text-xs text-zinc-400">Paste raw text blocks (directories, emails, reports) and let Gemini structure them.</p>
              </div>

              <textarea
                placeholder="Paste unstructured paragraph text or raw profiles here..."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                className="flex-1 w-full p-4 border border-zinc-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />

              <div className="flex justify-end gap-3 shrink-0">
                <button
                  onClick={handleAiParse}
                  disabled={isAiParsing}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {isAiParsing && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  AI Parse Text block
                </button>
              </div>

              {nonQueueParsedAlumni.length > 0 && (
                <div className="border border-zinc-100 rounded-2xl p-4 bg-zinc-50 space-y-3">
                  <span className="text-xs font-bold text-zinc-700 block">AI Structured Result Preview ({nonQueueParsedAlumni.length})</span>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                    {nonQueueParsedAlumni.map((item, idx) => (
                      <div key={idx} className="bg-white p-2 border border-zinc-100 rounded-lg flex justify-between text-xs">
                        <span className="font-bold">{item.name}</span>
                        <span className="text-zinc-500">{item.currentRole} at {item.currentCompany}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCommitNonQueue}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                    >
                      Commit to Cloud SQLite
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
