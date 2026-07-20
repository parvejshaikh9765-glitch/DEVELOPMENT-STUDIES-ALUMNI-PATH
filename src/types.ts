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
  phone?: string;
  education?: string;
  industry?: string;
  experience?: string;
  sourceSheets?: string[];
  alumniId?: string;
};

export type BatchStats = {
  batch: number;
  count: number;
  topCompanies: { name: string; count: number }[];
  topRoles: { name: string; count: number }[];
};
