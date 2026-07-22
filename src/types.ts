export type CareerStep = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | 'Present';
  location: string;
  description?: string;
  employmentType?: string;
  duration?: string;
  country?: string;
  city?: string;
  sector?: string;
  industry?: string;
};

export type Alumni = {
  id: string;
  name: string;
  batch: number | string;
  department: string;
  currentRole: string;
  currentCompany: string;
  location: string;
  email: string;
  linkedinUrl?: string;
  trajectory: CareerStep[];
  skills: string[];
  avatarUrl: string;
  headline?: string;
  phone?: string;
  education?: string;
  industry?: string;
  experience?: string;
  sourceSheets?: string[];
  alumniId?: string;
  imported_file_id?: string;
};

export type BatchStats = {
  batch: number;
  count: number;
  topCompanies: { name: string; count: number }[];
  topRoles: { name: string; count: number }[];
};

export type UserRole = 'Super Admin' | 'Admin' | 'Placement Committee' | 'Faculty' | 'Student' | 'Viewer';

export interface AuditLog {
  id: string;
  timestamp: string;
  user_role: string;
  action: string;
  details: string;
  ip_address?: string;
}

export interface Suggestion {
  id: string;
  alumniId: string;
  alumniName: string;
  submittedAt: string;
  suggestedBy: string;
  fields: {
    currentRole?: string;
    currentCompany?: string;
    location?: string;
    email?: string;
    linkedinUrl?: string;
    skills?: string;
    education?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
}

export interface DataQualitySummary {
  totalDuplicates: number;
  invalidEmails: number;
  invalidPhones: number;
  brokenLinkedIn: number;
  missingFields: number;
}

