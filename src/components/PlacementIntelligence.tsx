import React, { useState, useMemo } from 'react';
import {
  Building2, Briefcase, Search, Filter, Globe, MapPin, Map as MapIcon, Compass,
  DollarSign, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, TrendingDown,
  Award, ArrowUpRight, BarChart2, PieChart as PieIcon, Network, RefreshCw,
  SlidersHorizontal, Eye, HeartHandshake, BookOpen, GraduationCap, Sparkles,
  ChevronRight, Calendar, Users, FileText, Send, Building, Lock, ArrowRight,
  ShieldAlert, BadgeCheck, Network as NetworkIcon, Percent, Linkedin, Info
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Alumni, CareerStep } from '../types';
import { cn } from '../utils/displayUtils';
import { getAiPlacementRecommendations, PlacementEngineRecommendation } from '../services/geminiService';

// ==========================================
// PREDEFINED DETAILED ORGANIZATIONS METADATA
// ==========================================
interface PredefinedOrgMetadata {
  name: string;
  website: string | null;
  linkedinUrl: string | null;
  industry: string;
  sector: string;
  headquarters: string | null;
  country: string | null;
  companySize: string;
  orgType: string; // NGO, CSR, Corporate, Government, Think Tank, Startup, Social Enterprise, Consulting, Research Institute, International Organization, Foundation
  description?: string;
  mission?: string;
  vision?: string;
  focusAreas?: string[];
  programs?: string[];
  recruitmentPage: string | null;
  careersPage: string | null;
  internshipPage: string | null;
  openOpportunities?: string[];
  csrActivities?: string[];
  esgInitiatives?: string[];
  sdgs?: string[];
  workCulture?: string;
  followers?: string;
  employeeCount?: number;
  specialties?: string[];
  locationsOfOperation?: string[];
}

// Helper function to resolve active clickable website URLs for all organizations
export function resolveOrgWebsite(orgName: string, rawWebsite?: string | null): string {
  if (rawWebsite && rawWebsite.trim().length > 0) {
    let url = rawWebsite.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }
  const nameLower = orgName.toLowerCase().trim();
  if (nameLower.includes('world bank')) return 'https://www.worldbank.org';
  if (nameLower.includes('unicef')) return 'https://www.unicef.org';
  if (nameLower.includes('j-pal') || nameLower.includes('poverty action lab')) return 'https://www.povertyactionlab.org';
  if (nameLower.includes('columbia')) return 'https://www.columbia.edu';
  if (nameLower.includes('edinburgh')) return 'https://www.ed.ac.uk';
  if (nameLower.includes('epic india')) return 'https://epic.uchicago.edu/india/';
  if (nameLower.includes('behavioural insights') || nameLower.includes('nudge')) return 'https://www.bi.team';
  if (nameLower.includes('mckinsey')) return 'https://www.mckinsey.com';
  if (nameLower.includes('kpmg')) return 'https://www.kpmg.com';
  if (nameLower.includes('pwc')) return 'https://www.pwc.com';
  if (nameLower.includes('ey') || nameLower.includes('ernst & young')) return 'https://www.ey.com';
  if (nameLower.includes('deloitte')) return 'https://www.deloitte.com';
  if (nameLower.includes('niti aayog')) return 'https://www.niti.gov.in';
  if (nameLower.includes('teach for india')) return 'https://www.teachforindia.org';
  if (nameLower.includes('gates foundation')) return 'https://www.gatesfoundation.org';
  if (nameLower.includes('azim premji')) return 'https://azimpremjifoundation.org';
  if (nameLower.includes('tata trusts')) return 'https://www.tatatrusts.org';
  if (nameLower.includes('clinton health')) return 'https://www.clintonhealthaccess.org';
  if (nameLower.includes('united for global mental health') || nameLower.includes('united29')) return 'https://unitedgmh.org';
  if (nameLower.includes('undp')) return 'https://www.undp.org';
  if (nameLower.includes('who') || nameLower.includes('world health organization')) return 'https://www.who.int';
  if (nameLower.includes('maharashtra')) return 'https://www.maharashtra.gov.in';

  // Fallback to Google search for official website
  return `https://www.google.com/search?q=${encodeURIComponent(orgName + ' official website')}`;
}

// Helper function to resolve active clickable LinkedIn URLs for all organizations
export function resolveOrgLinkedin(orgName: string, rawLinkedin?: string | null): string {
  if (rawLinkedin && rawLinkedin.trim().length > 0) {
    let url = rawLinkedin.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    if (url.includes('linkedin.com')) {
      url = url.replace(/https?:\/\/(www\.)?linkedin\.com/i, 'https://www.linkedin.com');
    }
    return url;
  }
  const nameLower = orgName.toLowerCase().trim();
  if (nameLower.includes('world bank')) return 'https://www.linkedin.com/company/the-world-bank';
  if (nameLower.includes('unicef')) return 'https://www.linkedin.com/company/unicef';
  if (nameLower.includes('j-pal')) return 'https://www.linkedin.com/company/j-pal';
  if (nameLower.includes('columbia')) return 'https://www.linkedin.com/school/columbia-university';
  if (nameLower.includes('edinburgh')) return 'https://www.linkedin.com/school/university-of-edinburgh';
  if (nameLower.includes('behavioural insights')) return 'https://www.linkedin.com/company/behavioural-insights-team';
  if (nameLower.includes('mckinsey')) return 'https://www.linkedin.com/company/mckinsey-&-company';
  if (nameLower.includes('kpmg')) return 'https://www.linkedin.com/company/kpmg';
  if (nameLower.includes('pwc')) return 'https://www.linkedin.com/company/pwc';
  if (nameLower.includes('ey') || nameLower.includes('ernst & young')) return 'https://www.linkedin.com/company/ey';
  if (nameLower.includes('deloitte')) return 'https://www.linkedin.com/company/deloitte';
  if (nameLower.includes('niti aayog')) return 'https://www.linkedin.com/company/niti-aayog';
  if (nameLower.includes('teach for india')) return 'https://www.linkedin.com/company/teach-for-india';
  if (nameLower.includes('gates foundation')) return 'https://www.linkedin.com/company/gates-foundation';
  if (nameLower.includes('azim premji')) return 'https://www.linkedin.com/company/azim-premji-foundation';
  if (nameLower.includes('tata trusts')) return 'https://www.linkedin.com/company/tata-trusts';
  if (nameLower.includes('clinton health')) return 'https://www.linkedin.com/company/clinton-health-access-initiative-chai';
  if (nameLower.includes('united for global mental health')) return 'https://www.linkedin.com/company/united-for-global-mental-health';
  if (nameLower.includes('maharashtra')) return 'https://www.linkedin.com/company/government-of-maharashtra';

  // Fallback to direct LinkedIn company search
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(orgName)}`;
}

const PREDEFINED_ORGS: Record<string, PredefinedOrgMetadata> = {
  "World Bank": {
    name: "World Bank",
    website: "https://www.worldbank.org",
    linkedinUrl: "https://www.linkedin.com/company/the-world-bank",
    industry: "International Development",
    sector: "Economic & Financial Advisory",
    headquarters: "Washington DC",
    country: "United States",
    companySize: "10,000+ employees",
    orgType: "International Organization",
    description: "The World Bank is a vital source of financial and technical assistance to developing countries around the world, dedicated to ending extreme poverty and promoting shared prosperity.",
    mission: "To end extreme poverty and promote shared prosperity on a livable planet.",
    vision: "A world free of poverty on a livable planet.",
    focusAreas: ["Global Poverty Reduction", "Climate Finance", "Sustainable Infrastructure", "Public Policy Support", "Health & Education"],
    programs: ["Young Professionals Program (YPP)", "World Bank Internship Scheme", "Junior Professional Officers (JPO)"],
    recruitmentPage: "https://www.worldbank.org/en/about/careers",
    careersPage: "https://www.worldbank.org/en/about/careers/programs",
    internshipPage: "https://www.worldbank.org/en/about/careers/programs/internships",
    openOpportunities: ["Consultant, Public Finance", "Social Development Specialist", "Senior Economist, Global Health", "Research Analyst (M&E)"],
    csrActivities: ["Carbon Neutrality Pledge", "Local Community Support Grants", "Staff Volunteer Operations"],
    esgInitiatives: ["Climate Alignment Standards", "Social Safeguards Auditing", "Anti-Corruption Integrity Framework"],
    sdgs: ["SDG 1: No Poverty", "SDG 8: Decent Work", "SDG 10: Reduced Inequalities", "SDG 13: Climate Action"],
    workCulture: "A global, multicultural environment emphasizing academic rigor, empirical data, consensus-building, and high-impact international governance.",
    followers: "4,250,000 followers",
    employeeCount: 16500,
    specialties: ["Macroeconomics", "International Finance", "Sustainable Development", "Technical Assistance", "Public Administration Reform"],
    locationsOfOperation: ["United States", "India", "Kenya", "Switzerland", "Brazil", "Vietnam"]
  },
  "UNICEF": {
    name: "UNICEF",
    website: "https://www.unicef.org",
    linkedinUrl: "https://www.linkedin.com/company/unicef",
    industry: "Non-profit Organizations",
    sector: "Child Rights & Humanitarian Aid",
    headquarters: "New York City, NY",
    country: "United States",
    companySize: "10,000+ employees",
    orgType: "International Organization",
    description: "UNICEF works in over 190 countries and territories to save children's lives, to defend their rights, and to help them fulfill their potential, from early childhood through adolescence.",
    mission: "To advocate for the protection of children's rights, help meet their basic needs and expand their opportunities.",
    vision: "A world where every child survives, thrives and reaches their full potential.",
    focusAreas: ["Child Survival & Health", "Education Access & Equity", "Emergency Relief Advocacy", "Water & Sanitation Systems", "Policy and Analytics"],
    programs: ["UNICEF Internship Programme", "New and Emerging Talent Initiative (NETI)", "UN Volunteers (UNV)"],
    recruitmentPage: "https://www.unicef.org/careers",
    careersPage: "https://www.unicef.org/careers/work-unicef",
    internshipPage: "https://www.unicef.org/careers/internships",
    openOpportunities: ["Child Protection Officer", "Monitoring & Evaluation Specialist", "Policy & Advocacy Advisor", "Public Health Program Manager"],
    csrActivities: ["Green UNICEF Operations Initiative", "Fair Trade Sourcing Compliance", "Disaster Emergency Fund"],
    esgInitiatives: ["Climate Resilience for Kids", "Social Gender Equality Frameworks", "Organizational Ethics & Integrity Hotline"],
    sdgs: ["SDG 3: Good Health", "SDG 4: Quality Education", "SDG 5: Gender Equality", "SDG 6: Clean Water"],
    workCulture: "Deeply mission-driven, highly collaborative, focused on field deployment, local stakeholder partnerships, and global humanitarian values.",
    followers: "3,890,000 followers",
    employeeCount: 13000,
    specialties: ["Child Protection", "Public Health Response", "Emergency Logistics", "Global Nutrition", "Education Policy and M&E"],
    locationsOfOperation: ["United States", "Switzerland", "India", "Ethiopia", "Jordan", "Congo"]
  },
  "J-PAL": {
    name: "J-PAL",
    website: "https://www.povertyactionlab.org",
    linkedinUrl: "https://www.linkedin.com/company/j-pal",
    industry: "Research Institutes",
    sector: "Randomized Evaluations & Policy",
    headquarters: "Cambridge, MA",
    country: "United States",
    companySize: "501-1,000 employees",
    orgType: "Research Institute",
    description: "The Abdul Latif Jameel Poverty Action Lab (J-PAL) is a global research center working to reduce poverty by ensuring that policy is informed by scientific evidence.",
    mission: "To reduce poverty by ensuring that policy is informed by scientific evidence.",
    vision: "A world where policy decisions are guided by rigorous scientific research to improve lives.",
    focusAreas: ["Randomized Controlled Trials", "Policy Translation", "Capacity Building", "Development Economics", "M&E Training"],
    programs: ["J-PAL Research Fellowship", "Policy & Research Internship", "MicroMasters in Data, Economics, and Development Policy"],
    recruitmentPage: "https://www.povertyactionlab.org/careers",
    careersPage: "https://www.povertyactionlab.org/jobs",
    internshipPage: "https://www.povertyactionlab.org/internships",
    openOpportunities: ["Research Associate (RCT)", "Policy Manager, Environment", "Senior Research Analyst, Public Health", "Training & Capacity Coordinator"],
    csrActivities: ["Environmental Footprint Reduction", "Inclusive Research Sourcing", "Local Education Outreach"],
    esgInitiatives: ["Institutional Review Board (IRB) Ethics Audits", "Data Transparency & Open-Science Replication", "Equity in Field Research Sourcing"],
    sdgs: ["SDG 1: No Poverty", "SDG 4: Quality Education", "SDG 8: Decent Work", "SDG 17: Partnerships"],
    workCulture: "Highly intellectual, scientifically rigorous, quantitative-heavy, focused on academic precision and translation of economics into field policy.",
    followers: "185,000 followers",
    employeeCount: 820,
    specialties: ["Randomized Controlled Trials (RCTs)", "Development Economics", "Policy Design", "Empirical Research", "Impact Assessment"],
    locationsOfOperation: ["United States", "India", "Indonesia", "Chile", "South Africa", "France"]
  },
  "Govt of Maharashtra": {
    name: "Govt of Maharashtra",
    website: "https://www.maharashtra.gov.in",
    linkedinUrl: "https://www.linkedin.com/company/government-of-maharashtra",
    industry: "Government Administration",
    sector: "Public Policy & Administration",
    headquarters: "Mumbai, Maharashtra",
    country: "India",
    companySize: "10,000+ employees",
    orgType: "Government",
    description: "The state government of Maharashtra, the second-most populous and most industrialized state in India, implementing public infrastructure, social welfare, and economic governance.",
    mission: "To provide progressive, citizen-centric administration and drive socio-economic growth.",
    vision: "A highly developed, equitable, and digitally connected Maharashtra.",
    focusAreas: ["State Planning & Finance", "CM Fellowship Programs", "Rural Livelihoods Expansion", "Smart Cities Infrastructure", "Health & Welfare Delivery"],
    programs: ["Chief Minister's Fellowship Program", "State Public Policy Internships", "Administrative Officers Academy"],
    recruitmentPage: "https://www.maharashtra.gov.in/careers",
    careersPage: "https://www.maharashtra.gov.in/fellowship",
    internshipPage: "https://www.maharashtra.gov.in/internship",
    openOpportunities: ["Policy Advisor, CM's Office", "District Evaluation Associate", "Livelihood Mission Coordinator", "E-Governance Program Lead"],
    csrActivities: ["State Social Relief Funds", "Afforestation and Watershed Operations", "Slum Housing Modernization"],
    esgInitiatives: ["Renewable Energy Sourcing Targets", "Transparent Public Procurements (GeM)", "Social Audit Panels for Tribal Welfare"],
    sdgs: ["SDG 9: Industry & Innovation", "SDG 11: Sustainable Cities", "SDG 2: Zero Hunger", "SDG 6: Clean Water"],
    workCulture: "Dynamic administrative flow, high stakeholder navigation, bureaucratic execution structures, large scale field impact, and public sector governance focus.",
    followers: "95,000 followers",
    employeeCount: 150000,
    specialties: ["Public Administration", "Policy Drafting", "State Budgeting", "Public-Private Partnerships (PPP)", "Urban and Rural Planning"],
    locationsOfOperation: ["India"]
  },
  "United for Global Mental Health": {
    name: "United for Global Mental Health",
    website: "https://unitedgmh.org",
    linkedinUrl: "https://www.linkedin.com/company/united-for-global-mental-health",
    industry: "NGO & Non-Profit",
    sector: "Global Mental Health & Policy Advocacy",
    headquarters: "London",
    country: "United Kingdom",
    companySize: "51-200 employees",
    orgType: "NGO",
    description: "United for Global Mental Health is an international non-governmental organization advocating for increased investment and political action on global mental health.",
    mission: "To foster a world where everyone, everywhere has someone to turn to in support of their mental health.",
    vision: "Global access to mental health support for all.",
    focusAreas: ["Global Health Policy", "Mental Health Investment", "Advocacy & Campaigns", "Research Integration"],
    programs: ["Global Advocacy Network", "Policy Fellowship"],
    recruitmentPage: "https://unitedgmh.org/about/careers",
    careersPage: "https://unitedgmh.org/about/careers",
    internshipPage: "https://unitedgmh.org/about/careers",
    openOpportunities: ["Senior Officer, Policy and Advocacy", "Research Lead", "Campaign Manager"],
    csrActivities: ["Mental Health in the Workplace Charter"],
    esgInitiatives: ["Ethical Advocacy & Lived Experience Voice Safeguards"],
    sdgs: ["SDG 3: Good Health and Well-being"],
    workCulture: "Empathetic, research-backed, international advocacy environment.",
    followers: "45,000 followers",
    employeeCount: 120,
    specialties: ["Policy Advocacy", "Mental Health Reform", "Global Health Equity"],
    locationsOfOperation: ["United Kingdom", "Global"]
  },
  "The Behavioural Insights Team": {
    name: "The Behavioural Insights Team",
    website: "https://www.bi.team",
    linkedinUrl: "https://www.linkedin.com/company/behavioural-insights-team",
    industry: "Management Consulting",
    sector: "Nudge & Behavioural Economics",
    headquarters: "London",
    country: "United Kingdom",
    companySize: "201-500 employees",
    orgType: "Consulting",
    description: "The Behavioural Insights Team (BIT), also known as the original 'Nudge Unit', is a global social purpose organization applying behavioural science to improve public services and policy outcomes.",
    mission: "To apply behavioural insights to design and improve public services, policies, and systems.",
    vision: "A world where policies and services are designed around a realistic understanding of human behavior.",
    focusAreas: ["Behavioural Economics", "Nudge Design & Testing", "A/B Testing & Trials", "Public Health Compliance", "Financial Capability"],
    programs: ["BIT Advisor Graduate Programme", "Summer Research Internship", "Behavioural Insights Executive Course"],
    recruitmentPage: "https://www.bi.team/careers",
    careersPage: "https://www.bi.team/vacancies",
    internshipPage: "https://www.bi.team/careers/internships",
    openOpportunities: ["Associate Advisor, Health", "Quantitative Research Lead", "Advisor, Global Advisory", "Evaluation Specialist"],
    csrActivities: ["Pro-Bono Behavioural Auditing for Charities", "Employee Mental Well-being Policy", "Zero-Carbon Operations Sourcing"],
    esgInitiatives: ["Transparent Trials Protocol Registry", "DEI Hiring Blind Resumes Policy", "Ethical Behavioral Intervention Audits"],
    sdgs: ["SDG 3: Good Health", "SDG 12: Responsible Consumption", "SDG 16: Peace & Justice", "SDG 17: Partnerships"],
    workCulture: "Highly academic, experimental, friendly and collaborative, rapid trial design iteration, heavily focused on scientific evidence and psychological insights.",
    followers: "120,000 followers",
    employeeCount: 350,
    specialties: ["Behavioural Economics", "Nudge Interventions", "Randomized Controlled Trials", "Behavioral Auditing", "Public Policy Design"],
    locationsOfOperation: ["United Kingdom", "United States", "Australia", "Singapore", "Canada"]
  },
  "McKinsey & Company": {
    name: "McKinsey & Company",
    website: "https://www.mckinsey.com",
    linkedinUrl: "https://www.linkedin.com/company/mckinsey-&-company",
    industry: "Management Consulting",
    sector: "Strategy and Corporate Advisory",
    headquarters: "New York City, NY",
    country: "United States",
    companySize: "10,000+ employees",
    orgType: "Consulting",
    description: "McKinsey & Company is a global management consulting firm that serves a broad mix of private, public, and social sector organizations, helping clients solve their toughest strategy and operations challenges.",
    mission: "To help our clients make distinctive, lasting, and substantial improvements in their performance and to build a great firm that attracts, develops, excites, and retains exceptional people.",
    vision: "The premier trusted advisor to the world's leading businesses, governments, and institutions.",
    focusAreas: ["Corporate Strategy", "Public Sector Transformation", "Digital & Tech Enablement", "Operations & Mergers", "Sustainability & ESG Advisory"],
    programs: ["Business Analyst Internship", "Junior Consultant Graduate Track", "McKinsey Global Fellowships"],
    recruitmentPage: "https://www.mckinsey.com/careers",
    careersPage: "https://www.mckinsey.com/careers/search-jobs",
    internshipPage: "https://www.mckinsey.com/careers/students",
    openOpportunities: ["Associate Consultant, Public Sector", "ESG Strategy Analyst", "Engagement Manager, Energy", "Operations Consultant"],
    csrActivities: ["McKinsey Social Initiative (Generation)", "Pro-Bono Climate Advisory", "Global Educational Fellowships"],
    esgInitiatives: ["Net Zero Target by 2030 Pledge", "Diverse Corporate Sourcing Guidelines", "Strict Ethics & Client Risk Assessment System"],
    sdgs: ["SDG 8: Decent Work", "SDG 9: Industry & Innovation", "SDG 13: Climate Action", "SDG 17: Partnerships"],
    workCulture: "Extremely fast-paced, high intellectual expectations, performance-oriented (up-or-out model), structured mentorship, and exceptional professional networks.",
    followers: "5,800,000 followers",
    employeeCount: 38000,
    specialties: ["Management Consulting", "Strategy Formulation", "Digital Transformation", "Public Finance", "ESG Transformation Advisory"],
    locationsOfOperation: ["United States", "United Kingdom", "India", "Germany", "Japan", "Brazil", "Australia"]
  }
};

// ==========================================
// SECTOR & TYPE COMPLIANT LABELS
// ==========================================
const ORG_TYPES = [
  "NGO", "CSR", "Corporate", "Government", "Think Tank", "Startup",
  "Social Enterprise", "Consulting", "Research Institute", "International Organization", "Foundation"
];

const MODES = ["Onsite", "Hybrid", "Remote"];

export default function PlacementIntelligence({ alumniList }: { alumniList: Alumni[] }) {
  // Navigation & Subviews: 'directory' | 'profile' | 'analytics' | 'recommendations' | 'insights' | 'heatmaps' | 'seasonality'
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics' | 'recommendations' | 'insights' | 'heatmaps' | 'seasonality'>('directory');
  
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedMode, setSelectedMode] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedHiringProb, setSelectedHiringProb] = useState<string>('All');

  // Recruitment Seasonality Index Filters State
  const [seasonalityOrgFilter, setSeasonalityOrgFilter] = useState<string>('All');
  const [seasonalitySectorFilter, setSeasonalitySectorFilter] = useState<string>('All');
  const [seasonalityViewMode, setSeasonalityViewMode] = useState<'heatmap' | 'trend' | 'timeline'>('heatmap');

  // Currently opened organization profile page
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);

  // Simulated AI operations state
  const [isAnalyzingWeb, setIsAnalyzingWeb] = useState(false);
  const [webAnalysisCache, setWebAnalysisCache] = useState<Record<string, string>>({});
  const [searchSuccessToast, setSearchSuccessToast] = useState<string | null>(null);

  // Real-time Placement Opportunity AI Engine States
  const [isCalculatingPlacement, setIsCalculatingPlacement] = useState(false);
  const [calculatedRecommendations, setCalculatedRecommendations] = useState<Record<string, PlacementEngineRecommendation[]>>({});
  const [globalStrategySummaries, setGlobalStrategySummaries] = useState<Record<string, string>>({});
  const [selectedOutreachRec, setSelectedOutreachRec] = useState<any | null>(null);

  // Active student simulation context (for AI recommendations)
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    // Pick the first alumni if available
    return alumniList[0]?.id || '';
  });

  // Student vs Recruiter Skill Gap Radar State
  const [selectedRadarStudentId, setSelectedRadarStudentId] = useState<string>(() => alumniList[0]?.id || '');
  const [selectedRadarOrgName, setSelectedRadarOrgName] = useState<string>('McKinsey & Company');

  // Keep selectedRadarStudentId synced when activeStudentId changes
  React.useEffect(() => {
    if (activeStudentId) {
      setSelectedRadarStudentId(activeStudentId);
    }
  }, [activeStudentId]);

  // Keep selectedRadarOrgName synced when selectedOrgName changes
  React.useEffect(() => {
    if (selectedOrgName) {
      setSelectedRadarOrgName(selectedOrgName);
    }
  }, [selectedOrgName]);

  // Pick simulating student
  const activeStudent = useMemo(() => {
    return alumniList.find(a => a.id === activeStudentId) || alumniList[0] || null;
  }, [activeStudentId, alumniList]);

  // Handle Dynamic Search Success Notifications
  const triggerSearchToast = (msg: string) => {
    setSearchSuccessToast(msg);
    setTimeout(() => setSearchSuccessToast(null), 3000);
  };

  const handleRunPlacementEngine = async () => {
    if (!activeStudent) return;
    setIsCalculatingPlacement(true);
    triggerSearchToast(`Invoking Placement Opportunity AI Engine for ${activeStudent.name}...`);
    try {
      const response = await getAiPlacementRecommendations(activeStudent);
      setCalculatedRecommendations(prev => ({
        ...prev,
        [activeStudent.id]: response.studentRecommendations
      }));
      setGlobalStrategySummaries(prev => ({
        ...prev,
        [activeStudent.id]: response.globalStrategySummary
      }));
      triggerSearchToast("Successfully calculated real-time placement probability and career matches!");
    } catch (err) {
      console.error(err);
      triggerSearchToast("Failed to run Placement AI Engine. Please try again.");
    } finally {
      setIsCalculatingPlacement(false);
    }
  };

  // ========================================================
  // 1. EXTRACT UNIQUE ORGANIZATIONS FROM THE ALUMNI DATASET
  // ========================================================
  const organizationsData = useMemo(() => {
    const orgMap = new Map<string, {
      name: string;
      alumniList: Alumni[];
      currentCount: number;
      pastCount: number;
      departments: Set<string>;
      skills: Set<string>;
      roles: string[];
      tenures: number[]; // track approximate tenure in years
      avgExp: number;
    }>();

    // Scan every alumnus
    alumniList.forEach(alumnus => {
      // 1. Current Company
      if (alumnus.currentCompany && alumnus.currentCompany.trim() !== '') {
        const cleanName = alumnus.currentCompany.trim();
        if (!orgMap.has(cleanName)) {
          orgMap.set(cleanName, {
            name: cleanName,
            alumniList: [],
            currentCount: 0,
            pastCount: 0,
            departments: new Set<string>(),
            skills: new Set<string>(),
            roles: [],
            tenures: [],
            avgExp: 0
          });
        }
        const o = orgMap.get(cleanName)!;
        if (!o.alumniList.some(al => al.id === alumnus.id)) {
          o.alumniList.push(alumnus);
        }
        o.currentCount += 1;
        if (alumnus.department) o.departments.add(alumnus.department);
        if (alumnus.skills) alumnus.skills.forEach(s => o.skills.add(s));
        if (alumnus.currentRole) o.roles.push(alumnus.currentRole);

        // approximate experience
        let expYr = 3; // default
        if (alumnus.experience) {
          const matched = alumnus.experience.match(/\d+/);
          if (matched) expYr = parseInt(matched[0], 10);
        } else if (typeof alumnus.batch === 'number') {
          expYr = Math.max(1, 2026 - alumnus.batch);
        }
        o.tenures.push(expYr);
      }

      // 2. Trajectory Steps (Past Companies)
      if (alumnus.trajectory) {
        alumnus.trajectory.forEach(step => {
          if (step.company && step.company.trim() !== '') {
            const cleanName = step.company.trim();
            if (!orgMap.has(cleanName)) {
              orgMap.set(cleanName, {
                name: cleanName,
                alumniList: [],
                currentCount: 0,
                pastCount: 0,
                departments: new Set<string>(),
                skills: new Set<string>(),
                roles: [],
                tenures: [],
                avgExp: 0
              });
            }
            const o = orgMap.get(cleanName)!;
            if (!o.alumniList.some(al => al.id === alumnus.id)) {
              o.alumniList.push(alumnus);
            }
            
            if (step.endDate !== 'Present' && cleanName !== alumnus.currentCompany) {
              o.pastCount += 1;
            } else if (step.endDate === 'Present') {
              // Current
              if (cleanName === alumnus.currentCompany) {
                // Already counted as current
              } else {
                o.currentCount += 1;
              }
            }

            if (alumnus.department) o.departments.add(alumnus.department);
            if (step.role) o.roles.push(step.role);
            if (step.startDate && step.endDate) {
              const startVal = parseInt(step.startDate, 10);
              const endVal = step.endDate === 'Present' ? 2026 : parseInt(step.endDate, 10);
              if (!isNaN(startVal) && !isNaN(endVal)) {
                o.tenures.push(Math.max(1, endVal - startVal));
              }
            }
          }
        });
      }
    });

    // Translate org map to complete metrics and merge with metadata
    return Array.from(orgMap.values()).map(org => {
      const predefined = PREDEFINED_ORGS[org.name];
      const website = resolveOrgWebsite(org.name, predefined?.website);
      const linkedinUrl = resolveOrgLinkedin(org.name, predefined?.linkedinUrl);

      const metadata: PredefinedOrgMetadata = {
        name: org.name,
        website,
        linkedinUrl,
        industry: predefined?.industry || "Public Policy & Social Development",
        sector: predefined?.sector || "Development Sector",
        headquarters: predefined?.headquarters || null,
        country: predefined?.country || (() => {
          for (const al of org.alumniList) {
            if (al.location && al.location !== 'Location Not Available') {
              const parts = al.location.split(',').map(s => s.trim());
              if (parts.length > 1) return parts[parts.length - 1];
              if (parts.length === 1) return parts[0];
            }
          }
          return null;
        })(),
        companySize: predefined?.companySize || (org.alumniList.length > 5 ? "501-1,000 employees" : "51-200 employees"),
        orgType: predefined?.orgType || (
                 org.name.toLowerCase().includes("govt") || org.name.toLowerCase().includes("state") || org.name.toLowerCase().includes("panchayat") ? "Government" :
                 org.name.toLowerCase().includes("institute") || org.name.toLowerCase().includes("university") || org.name.toLowerCase().includes("school") ? "Research Institute" :
                 org.name.toLowerCase().includes("consulting") || org.name.toLowerCase().includes("team") || org.name.toLowerCase().includes("mckinsey") || org.name.toLowerCase().includes("kpmg") || org.name.toLowerCase().includes("pwc") || org.name.toLowerCase().includes("ey") ? "Consulting" :
                 org.name.toLowerCase().includes("bank") || org.name.toLowerCase().includes("unicef") || org.name.toLowerCase().includes("undp") || org.name.toLowerCase().includes("who") ? "International Organization" :
                 org.name.toLowerCase().includes("foundation") || org.name.toLowerCase().includes("trust") ? "Foundation" : "NGO"
        ),
        description: predefined?.description || `${org.name} is an active recruiter and employer of alumni, operating in development, governance, and strategy.`,
        mission: predefined?.mission || `Driving high-impact initiatives and policy excellence in ${org.name}.`,
        vision: predefined?.vision || `Fostering sustainable development and governance innovation.`,
        focusAreas: predefined?.focusAreas || ["Public Policy", "Governance", "Monitoring & Evaluation", "Program Management"],
        programs: predefined?.programs || ["Fellowships & Consultancy", "Young Professionals Track", "Graduate Internships"],
        recruitmentPage: predefined?.recruitmentPage || `https://www.google.com/search?q=${encodeURIComponent(org.name + ' careers jobs recruitment')}`,
        careersPage: predefined?.careersPage || `https://www.google.com/search?q=${encodeURIComponent(org.name + ' careers')}`,
        internshipPage: predefined?.internshipPage || `https://www.google.com/search?q=${encodeURIComponent(org.name + ' internship programs')}`,
        openOpportunities: predefined?.openOpportunities || ["Policy Consultant", "Program Associate", "Research Lead (M&E)", "Strategy Manager"],
        csrActivities: predefined?.csrActivities || ["Community Impact Projects", "Sustainability Mandates"],
        esgInitiatives: predefined?.esgInitiatives || ["Governance Integrity", "Environmental Footprint Reduction"],
        sdgs: predefined?.sdgs || ["SDG 8: Decent Work", "SDG 10: Reduced Inequalities", "SDG 17: Partnerships"],
        workCulture: predefined?.workCulture || "Impact-oriented, collaborative, and analytical environment.",
        followers: predefined?.followers || `${Math.max(12, org.alumniList.length * 1500).toLocaleString()} followers`,
        employeeCount: predefined?.employeeCount || Math.max(50, org.alumniList.length * 40),
        specialties: predefined?.specialties || ["Public Policy", "Social Impact", "Strategic Advisory"],
        locationsOfOperation: predefined?.locationsOfOperation || ["India", "United States", "Global"]
      };

      // Calculate aggregates
      const totalAlumni = org.alumniList.length;
      const currentCount = org.currentCount || Math.max(1, Math.round(totalAlumni * 0.6));
      const pastCount = Math.max(0, totalAlumni - currentCount);
      const uniqueDeps = Array.from(org.departments);
      const uniqueSkills = Array.from(org.skills);

      // Determine highest position held
      let highestPosition = "Consultant / Fellow";
      const seniorKeywords = ["Director", "President", "VP", "Lead", "Senior", "Advisor", "Manager", "Consultant"];
      for (const keyword of seniorKeywords) {
        const foundRole = org.roles.find(r => r.toLowerCase().includes(keyword.toLowerCase()));
        if (foundRole) {
          highestPosition = foundRole;
          break;
        }
      }
      if (org.roles.length > 0 && highestPosition === "Consultant / Fellow") {
        highestPosition = org.roles[0];
      }

      // Average experience
      const totalTenures = org.tenures.reduce((a, b) => a + b, 0);
      const avgExpVal = org.tenures.length > 0 ? Number((totalTenures / org.tenures.length).toFixed(1)) : 3.5;

      // Trends
      const hiringTrend = totalAlumni > 4 ? "Increasing" : totalAlumni > 1 ? "Stable" : "Stable";
      const growthTrend = totalAlumni > 3 ? "Fast" : "Steady";

      // ========================================================
      // 3. EXPLAINABLE ORGANIZATION SCORES
      // ========================================================
      // Growth Score: Based on recent alumni count
      const growthScore = Math.min(100, Math.round(60 + (totalAlumni * 4) + (currentCount * 3)));
      // Career Growth Index: Based on highest position held keywords and tenure diversity
      const careerGrowthIndex = Math.min(100, Math.round(55 + (uniqueSkills.length * 1.5) + (org.roles.length * 2)));
      // Placement Strength Score: Formula (Total Alumni * 5) + (Current Employees * 8)
      const placementStrength = Math.min(100, Math.round((totalAlumni * 6) + (currentCount * 8)));
      // Leadership Opportunity Score: Based on proportion of senior keywords
      const seniorCount = org.roles.filter(r => seniorKeywords.some(kw => r.toLowerCase().includes(kw.toLowerCase()))).length;
      const leadershipScore = Math.min(100, Math.round(50 + (seniorCount * 12)));
      // Career Stability Score: Derived from average tenure
      const stabilityScore = Math.min(100, Math.round(40 + (avgExpVal * 12)));
      // Networking Strength: Alumni density in this workspace
      const networkingStrength = Math.min(100, Math.round((totalAlumni * 10) + 20));
      // Average Promotion Speed: Formula based on tenure values
      const promotionSpeed = (Math.max(1.2, 3 - (uniqueSkills.length * 0.05))).toFixed(1);
      // Retention Score: proportion of current to total
      const retentionScore = totalAlumni > 0 ? Math.round((currentCount / totalAlumni) * 100) : 80;
      // Global Exposure Score: based on countries represented
      const globalExposure = (metadata.country === "India" || !metadata.country) && (!metadata.locationsOfOperation || metadata.locationsOfOperation.length <= 1) ? 45 : 85;
      // Prestige Score
      let prestigeScore = 70;
      if (metadata.orgType === "International Organization") prestigeScore = 95;
      else if (metadata.orgType === "Consulting" && totalAlumni > 3) prestigeScore = 92;
      else if (metadata.orgType === "Corporate") prestigeScore = 88;
      else if (metadata.orgType === "Government") prestigeScore = 84;
      else if (metadata.orgType === "NGO" && totalAlumni > 2) prestigeScore = 82;
      else prestigeScore = 78;

      const skillDiversityIndex = uniqueSkills.length;

      // ========================================================
      // 4. PLACEMENT OPPORTUNITY MODEL CALCULATOR
      // ========================================================
      // Estimated percentage of probability based on explainable factors
      const currentAlumniFactor = Math.min(30, currentCount * 10);
      const skillDiversityFactor = Math.min(25, skillDiversityIndex * 2);
      const networkStrengthFactor = Math.min(25, networkingStrength * 0.25);
      const historicalHiringFactor = Math.min(20, pastCount * 8);

      const probabilityPercent = Math.max(25, Math.min(98, Math.round(currentAlumniFactor + skillDiversityFactor + networkStrengthFactor + historicalHiringFactor + (prestigeScore * 0.1))));

      let probabilityTier: 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low' = 'Medium';
      if (probabilityPercent >= 85) probabilityTier = 'Very High';
      else if (probabilityPercent >= 70) probabilityTier = 'High';
      else if (probabilityPercent >= 50) probabilityTier = 'Medium';
      else if (probabilityPercent >= 35) probabilityTier = 'Low';
      else probabilityTier = 'Very Low';

      return {
        ...metadata,
        alumniCount: totalAlumni,
        currentCount,
        pastCount,
        departmentsList: uniqueDeps,
        skillsList: uniqueSkills,
        highestPosition,
        avgExperience: avgExpVal,
        hiringTrend,
        growthTrend,

        // Analysis Scores
        growthScore,
        careerGrowthIndex,
        placementStrength,
        leadershipScore,
        stabilityScore,
        networkingStrength,
        promotionSpeed,
        retentionScore,
        globalExposure,
        prestigeScore,
        skillDiversityIndex,

        // Opportunity Score
        probabilityPercent,
        probabilityTier,
        alumniList: org.alumniList
      };
    }).sort((a, b) => b.alumniCount - a.alumniCount); // Sort by maximum alumni
  }, [alumniList]);

  // Unique filters lists
  const availableCountries = useMemo(() => {
    const list = new Set<string>();
    organizationsData.forEach(o => { if (o.country) list.add(o.country); });
    return Array.from(list);
  }, [organizationsData]);

  const availableSizes = useMemo(() => {
    const list = new Set<string>();
    organizationsData.forEach(o => { if (o.companySize) list.add(o.companySize); });
    return Array.from(list);
  }, [organizationsData]);

  // Filtered organizations
  const filteredOrgs = useMemo(() => {
    return organizationsData.filter(org => {
      const matchSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.country.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = selectedType === 'All' || org.orgType === selectedType;
      const matchCountry = selectedCountry === 'All' || org.country === selectedCountry;
      const matchSize = selectedSize === 'All' || org.companySize === selectedSize;
      
      let matchHiring = true;
      if (selectedHiringProb !== 'All') {
        matchHiring = org.probabilityTier === selectedHiringProb;
      }

      return matchSearch && matchType && matchCountry && matchSize && matchHiring;
    });
  }, [organizationsData, searchTerm, selectedType, selectedCountry, selectedSize, selectedHiringProb]);

  // Selected Organization Details
  const selectedOrg = useMemo(() => {
    if (!selectedOrgName) return null;
    return organizationsData.find(o => o.name === selectedOrgName) || null;
  }, [selectedOrgName, organizationsData]);

  // ========================================================
  // RECRUITMENT SEASONALITY INDEX DATA ENGINE
  // ========================================================
  const seasonalityData = useMemo(() => {
    const MONTH_LABELS_ARR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const FULL_MONTH_ARR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const stringHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const parseMonthIndex = (dateStr?: string, seed: number = 0): number => {
      if (!dateStr || typeof dateStr !== 'string') return seed % 12;
      const lower = dateStr.toLowerCase().trim();

      for (let i = 0; i < 12; i++) {
        if (lower.includes(MONTH_LABELS_ARR[i].toLowerCase()) || lower.includes(FULL_MONTH_ARR[i].toLowerCase())) {
          return i;
        }
      }

      const isoMatch = lower.match(/\b(19\d\d|20\d\d)[-/](0[1-9]|1[0-2])\b/);
      if (isoMatch && isoMatch[2]) return parseInt(isoMatch[2], 10) - 1;

      const slashMatch = lower.match(/\b(0[1-9]|1[0-2])[-/](19\d\d|20\d\d)\b/);
      if (slashMatch && slashMatch[1]) return parseInt(slashMatch[1], 10) - 1;

      const weightedMonths = [5, 6, 6, 7, 5, 6, 0, 1, 2, 5, 6, 8, 4, 5, 6, 7, 9];
      return weightedMonths[seed % weightedMonths.length];
    };

    return organizationsData.map(org => {
      const monthCounts = new Array(12).fill(0);
      let totalStarts = 0;

      org.alumniList.forEach(alumnus => {
        if (alumnus.currentCompany && alumnus.currentCompany.trim().toLowerCase() === org.name.toLowerCase()) {
          const currentStep = alumnus.trajectory?.find(t => t.company?.trim().toLowerCase() === org.name.toLowerCase());
          const dateStr = currentStep?.startDate || (alumnus.batch ? `Jun ${alumnus.batch}` : '');
          const mIdx = parseMonthIndex(dateStr, stringHash(alumnus.id + org.name));
          monthCounts[mIdx] += 1;
          totalStarts += 1;
        }

        if (alumnus.trajectory) {
          alumnus.trajectory.forEach(step => {
            if (step.company && step.company.trim().toLowerCase() === org.name.toLowerCase()) {
              const mIdx = parseMonthIndex(step.startDate, stringHash(alumnus.id + step.id));
              monthCounts[mIdx] += 1;
              totalStarts += 1;
            }
          });
        }
      });

      if (totalStarts < 3) {
        const typeLower = org.orgType.toLowerCase();
        const seed = stringHash(org.name);
        if (typeLower.includes("research") || typeLower.includes("institute") || typeLower.includes("ngo")) {
          [4, 5, 5, 6, 6, 7].forEach((m, idx) => { monthCounts[(m + seed + idx) % 12] += 1; totalStarts += 1; });
        } else if (typeLower.includes("consulting") || typeLower.includes("corporate")) {
          [0, 1, 2, 6, 7, 8].forEach((m, idx) => { monthCounts[(m + seed + idx) % 12] += 1; totalStarts += 1; });
        } else if (typeLower.includes("international") || typeLower.includes("bank")) {
          [5, 6, 6, 7, 8].forEach((m, idx) => { monthCounts[(m + seed + idx) % 12] += 1; totalStarts += 1; });
        } else {
          [4, 5, 6, 7].forEach((m, idx) => { monthCounts[(m + seed + idx) % 12] += 1; totalStarts += 1; });
        }
      }

      let maxVal = Math.max(...monthCounts);
      if (maxVal === 0) maxVal = 1;
      const peakIndices = monthCounts.reduce<number[]>((acc, val, idx) => {
        if (val === maxVal || val >= maxVal * 0.8) acc.push(idx);
        return acc;
      }, []);

      const peakMonthNames = peakIndices.map(i => MONTH_LABELS_ARR[i]);
      const firstPeak = peakIndices[0] ?? 5;
      const applyStartMonth = (firstPeak - 3 + 12) % 12;
      const applyEndMonth = (firstPeak - 2 + 12) % 12;

      const peakWindowLabel = peakMonthNames.length > 1
        ? `${peakMonthNames[0]} – ${peakMonthNames[peakMonthNames.length - 1]}`
        : peakMonthNames[0] || "June";

      const recommendedApplyWindow = `${MONTH_LABELS_ARR[applyStartMonth]} – ${MONTH_LABELS_ARR[applyEndMonth]}`;

      const peakRatio = maxVal / Math.max(1, totalStarts);
      const hiringPattern: "Cohort-Based Intake" | "Rolling Intake" | "Biannual Cycle" =
        peakRatio > 0.4 ? "Cohort-Based Intake" : peakRatio < 0.25 ? "Rolling Intake" : "Biannual Cycle";

      return {
        orgName: org.name,
        orgType: org.orgType,
        sector: org.sector,
        alumniCount: org.alumniCount,
        monthCounts,
        totalStarts,
        peakMonths: peakMonthNames,
        peakWindowLabel,
        recommendedApplyWindow,
        hiringPattern
      };
    }).sort((a, b) => b.totalStarts - a.totalStarts);
  }, [organizationsData]);

  const seasonalityAggregate = useMemo(() => {
    const MONTH_LABELS_ARR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const FULL_MONTH_ARR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const filtered = seasonalityData.filter(d => {
      const matchesOrg = seasonalityOrgFilter === 'All' || d.orgName === seasonalityOrgFilter;
      const matchesSector = seasonalitySectorFilter === 'All' || d.orgType === seasonalitySectorFilter || d.sector === seasonalitySectorFilter;
      return matchesOrg && matchesSector;
    });

    const totals = new Array(12).fill(0);
    filtered.forEach(d => {
      d.monthCounts.forEach((count, idx) => {
        totals[idx] += count;
      });
    });

    const grandTotal = totals.reduce((a, b) => a + b, 0);
    const maxMonthVal = Math.max(...totals, 1);
    const peakMonthIdx = totals.indexOf(maxMonthVal);

    const peakMonthName = MONTH_LABELS_ARR[peakMonthIdx] || "Jun";
    const appMonth1 = MONTH_LABELS_ARR[(peakMonthIdx - 3 + 12) % 12];
    const appMonth2 = MONTH_LABELS_ARR[(peakMonthIdx - 2 + 12) % 12];

    const monthlyChartData = MONTH_LABELS_ARR.map((month, idx) => ({
      month,
      fullMonth: FULL_MONTH_ARR[idx],
      hires: totals[idx],
      percentage: grandTotal > 0 ? Math.round((totals[idx] / grandTotal) * 100) : 0,
      isPeak: idx === peakMonthIdx
    }));

    return {
      filteredOrgs: filtered,
      totals,
      grandTotal,
      maxMonthVal,
      peakMonthIdx,
      peakMonthName,
      peakSeasonWindow: `${MONTH_LABELS_ARR[(peakMonthIdx - 1 + 12) % 12]} – ${MONTH_LABELS_ARR[(peakMonthIdx + 1) % 12]} (${Math.round((totals[peakMonthIdx] / Math.max(1, grandTotal)) * 100)}% of intake)`,
      recommendedApplyWindow: `${appMonth1} – ${appMonth2}`,
      monthlyChartData
    };
  }, [seasonalityData, seasonalityOrgFilter, seasonalitySectorFilter]);

  const selectedOrgSeasonality = useMemo(() => {
    if (!selectedOrgName) return null;
    return seasonalityData.find(s => s.orgName.toLowerCase() === selectedOrgName.toLowerCase()) || null;
  }, [selectedOrgName, seasonalityData]);

  // ========================================================
  // 9. AI RECOMMENDATION ENGINE (STUDENT SPECIFIC MATCH)
  // ========================================================
  const aiRecommendations = useMemo(() => {
    if (!activeStudent) return [];

    // Filter organizations and score them based on Student properties
    return organizationsData.map(org => {
      // Analyze skill match proportion
      const studentSkills = activeStudent.skills || [];
      const orgSkills = org.skillsList || [];
      const overlappingSkills = studentSkills.filter(s => orgSkills.some(os => os.toLowerCase().includes(s.toLowerCase())));
      
      const skillScore = studentSkills.length > 0 ? (overlappingSkills.length / studentSkills.length) * 40 : 15;
      const networkScore = Math.min(30, org.alumniCount * 8);
      const prestigeBonus = org.prestigeScore * 0.15; // up to 15 points
      const departmentMatch = org.departmentsList.some(d => d.toLowerCase() === activeStudent.department?.toLowerCase()) ? 15 : 0;

      const totalMatchScore = Math.max(35, Math.min(97, Math.round(skillScore + networkScore + prestigeBonus + departmentMatch)));

      // Generate realistic connective suggestions
      const connectiveAlumni = org.alumniList.slice(0, 3);

      return {
        org,
        matchScore: totalMatchScore,
        overlappingSkills,
        connectiveAlumni,
        reasons: [
          overlappingSkills.length > 0 
            ? `Excellent skill alignment: Your expertise in ${overlappingSkills.slice(0, 2).join(', ')} directly aligns with this organization.` 
            : `Opportunity to apply your analytical training to their ${org.sector} sector operations.`,
          org.alumniCount > 0 
            ? `Active alumni presence: ${org.alumniCount} fellow graduate(s) have established footprints here, easing warm referrals.` 
            : `Pioneering role: Be the catalyst to establish our institution's placement pipeline with this growing recruiter.`,
          org.probabilityPercent >= 70 
            ? `Robust recruitment health: This team holds a ${org.probabilityPercent}% future hiring capacity forecast.` 
            : `Highly stable structural footprint: Perfect for career longevity with an average employee tenure of ${org.avgExperience} years.`
        ]
      };
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }, [activeStudent, organizationsData]);

  // Merge dynamic Gemini AI placement calculations if available, else use fallback
  const activeRecommendationsList = useMemo(() => {
    if (!activeStudent) return [];
    
    const realRecs = calculatedRecommendations[activeStudent.id];
    if (realRecs && realRecs.length > 0) {
      return realRecs.map(r => {
        const matchedOrg = organizationsData.find(o => o.name.toLowerCase() === r.companyName.toLowerCase()) || {
          name: r.companyName,
          orgType: "Public Sector",
          industry: "Strategy & Operations",
          alumniCount: 0,
          probabilityPercent: r.placementProbability,
          prestigeScore: 80,
          avgExperience: 3.5,
          skillsList: r.recommendedFocusSkills,
          alumniList: []
        };
        
        return {
          org: matchedOrg,
          matchScore: r.placementProbability,
          reasons: r.reasons,
          recommendedFocusSkills: r.recommendedFocusSkills,
          suggestedStrategy: r.suggestedStrategy,
          outreachDraft: r.outreachDraft,
          connectiveAlumni: matchedOrg.alumniList ? matchedOrg.alumniList.slice(0, 3) : [],
          isRealAi: true
        };
      });
    }
    
    // Otherwise fallback to local heuristics (already calculated in aiRecommendations)
    return aiRecommendations.map(rec => ({
      ...rec,
      recommendedFocusSkills: rec.overlappingSkills,
      suggestedStrategy: `Apply with customized resume emphasizing ${rec.overlappingSkills.slice(0, 2).join(', ')}.`,
      outreachDraft: `Subject: Connecting with alumni from our program - ${activeStudent.name}\n\nDear Alumnus,\n\nI hope you are doing well. I noticed you are currently working as ${rec.org.highestPosition} at ${rec.org.name} after graduating from our policy track. I'm a current student in the same department and would love to ask you a few questions about your career trajectory and team goals. Let me know if you might have 10 minutes for a virtual coffee!\n\nBest regards,\n${activeStudent.name}`,
      isRealAi: false
    }));
  }, [activeStudent, calculatedRecommendations, organizationsData, aiRecommendations]);

  // ========================================================
  // STUDENT VS RECRUITER SKILL GAP RADAR ENGINE
  // ========================================================
  const radarComparisonData = useMemo(() => {
    const student = alumniList.find(a => a.id === selectedRadarStudentId) || activeStudent || alumniList[0];
    const targetOrgName = selectedRadarOrgName || (organizationsData[0]?.name || '');
    const targetOrg = organizationsData.find(o => o.name.toLowerCase() === targetOrgName.toLowerCase()) || organizationsData[0];

    if (!student || !targetOrg) {
      return {
        student: null,
        targetOrg: null,
        chartData: [],
        strengths: [],
        gaps: [],
        overallMatchPercent: 0
      };
    }

    const DIMENSIONS = [
      { key: 'data', label: 'Quantitative & Data Analysis', keywords: ['data', 'analytics', 'python', 'r', 'excel', 'stata', 'quantitative', 'spss', 'gis', 'statistics', 'sql', 'modeling'] },
      { key: 'policy', label: 'Policy & Strategic Formulation', keywords: ['policy', 'strategy', 'governance', 'public policy', 'regulatory', 'advisory', 'formulation', 'advocacy', 'legal', 'frameworks'] },
      { key: 'project', label: 'Project Management & M&E', keywords: ['project', 'program', 'management', 'monitoring', 'evaluation', 'm&e', 'agile', 'operations', 'budgeting', 'delivery'] },
      { key: 'stakeholder', label: 'Stakeholder Communication', keywords: ['stakeholder', 'communication', 'negotiation', 'outreach', 'public relations', 'writing', 'presentation', 'media', 'client'] },
      { key: 'domain', label: 'Domain & Sector Expertise', keywords: ['esg', 'sustainability', 'health', 'finance', 'education', 'csr', 'climate', 'economics', 'public finance', 'social', 'development'] },
      { key: 'leadership', label: 'Leadership & Governance', keywords: ['leadership', 'team', 'management', 'cross-functional', 'mentorship', 'board', 'change management', 'executive'] }
    ];

    // Collect skills from alumni employed at targetOrg and targetOrg skills metadata
    const orgAlumni = targetOrg.alumniList || [];
    const orgSkillsAll: string[] = [...(targetOrg.skillsList || [])];
    orgAlumni.forEach(al => {
      if (al.skills) orgSkillsAll.push(...al.skills);
    });

    const studentSkills = student.skills || [];

    const chartData = DIMENSIONS.map(dim => {
      let orgHits = 0;
      orgSkillsAll.forEach(sk => {
        if (dim.keywords.some(kw => sk.toLowerCase().includes(kw))) {
          orgHits += 1;
        }
      });

      const recruiterScore = Math.min(95, Math.max(65, 60 + Math.min(35, orgHits * 5)));

      let studentHits = 0;
      studentSkills.forEach(sk => {
        if (dim.keywords.some(kw => sk.toLowerCase().includes(kw))) {
          studentHits += 1;
        }
      });

      let studentScore = studentHits > 0 ? Math.min(98, 70 + (studentHits - 1) * 10) : 45;

      if (student.currentRole && dim.keywords.some(kw => student.currentRole.toLowerCase().includes(kw))) {
        studentScore = Math.min(98, studentScore + 12);
      }
      if (student.department && dim.keywords.some(kw => student.department.toLowerCase().includes(kw))) {
        studentScore = Math.min(98, studentScore + 8);
      }

      const diff = studentScore - recruiterScore;

      return {
        subject: dim.label,
        Student: studentScore,
        RecruiterBenchmark: recruiterScore,
        diff,
        isStrength: diff >= 0
      };
    });

    const strengths = chartData.filter(d => d.isStrength);
    const gaps = chartData.filter(d => !d.isStrength);

    const avgRatio = chartData.reduce((acc, curr) => acc + (curr.Student >= curr.RecruiterBenchmark ? 100 : (curr.Student / curr.RecruiterBenchmark) * 100), 0) / chartData.length;
    const overallMatchPercent = Math.min(98, Math.max(40, Math.round(avgRatio)));

    return {
      student,
      targetOrg,
      chartData,
      strengths,
      gaps,
      overallMatchPercent
    };
  }, [selectedRadarStudentId, selectedRadarOrgName, activeStudent, alumniList, organizationsData]);

  // Render function for Student vs Recruiter Skill Gap Radar Widget
  const renderRadarChartWidget = () => {
    if (!radarComparisonData.targetOrg) return null;

    return (
      <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div className="space-y-1">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Competency Alignment Radar
            </span>
            <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
              Student vs. Recruiter Skill Gap Analysis
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Compares individual student skills against aggregated top skills of alumni currently employed at {radarComparisonData.targetOrg.name}.
            </p>
          </div>

          {/* Controls for switching Student and Target Org */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedRadarStudentId}
                onChange={(e) => setSelectedRadarStudentId(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-bold text-zinc-900"
              >
                {alumniList.map(a => (
                  <option key={`radar-st-${a.id}`} value={a.id}>{a.name} ({a.batch})</option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-zinc-400">vs</span>

            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800">
              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <select
                value={selectedRadarOrgName}
                onChange={(e) => setSelectedRadarOrgName(e.target.value)}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-bold text-zinc-900"
              >
                {organizationsData.map(o => (
                  <option key={`radar-org-${o.name}`} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Radar Chart Visual */}
          <div className="lg:col-span-7 bg-zinc-50/60 p-4 rounded-3xl border border-zinc-100 flex flex-col items-center justify-center relative">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Alignment Score:</span>
              <span className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                {radarComparisonData.overallMatchPercent}% Match
              </span>
            </div>

            <div className="w-full h-80 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarComparisonData.chartData}>
                  <PolarGrid stroke="#e4e4e7" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 8 }} />
                  <Radar 
                    name={`${radarComparisonData.student?.name || 'Student'} Skills`} 
                    dataKey="Student" 
                    stroke="#4f46e5" 
                    fill="#6366f1" 
                    fillOpacity={0.4} 
                  />
                  <Radar 
                    name={`${radarComparisonData.targetOrg.name} Recruiter Benchmark`} 
                    dataKey="RecruiterBenchmark" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.25} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-900 text-white p-3 rounded-xl text-xs space-y-1 shadow-2xl border border-zinc-800">
                            <p className="font-extrabold text-indigo-300">{data.subject}</p>
                            <p className="text-zinc-200"><span className="font-bold text-indigo-400">Student Score:</span> {data.Student}/100</p>
                            <p className="text-zinc-200"><span className="font-bold text-amber-400">Recruiter Benchmark:</span> {data.RecruiterBenchmark}/100</p>
                            <p className={cn("text-[10px] font-bold mt-1", data.isStrength ? "text-emerald-400" : "text-amber-300")}>
                              {data.isStrength ? `✓ Meets benchmark (+${data.diff} pts)` : `⚠️ Skill gap detected (${data.diff} pts)`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strengths & Skill Gaps Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Competitive Strengths */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  Verified Strengths ({radarComparisonData.strengths.length})
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Exceeds Level</span>
              </div>

              <div className="space-y-2 pt-1">
                {radarComparisonData.strengths.length > 0 ? (
                  radarComparisonData.strengths.map(s => (
                    <div key={`str-${s.subject}`} className="bg-white p-2.5 rounded-xl border border-emerald-100/80 text-xs space-y-0.5 shadow-2xs">
                      <div className="flex items-center justify-between font-extrabold text-zinc-900">
                        <span>{s.subject}</span>
                        <span className="text-emerald-700 text-[10px] font-bold">+{s.diff} pts above benchmark</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic">No skill dimensions currently exceed the recruiter baseline.</p>
                )}
              </div>
            </div>

            {/* Priority Growth & Skill Gaps */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Priority Skill Gaps ({radarComparisonData.gaps.length})
                </h4>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Growth Areas</span>
              </div>

              <div className="space-y-2 pt-1">
                {radarComparisonData.gaps.length > 0 ? (
                  radarComparisonData.gaps.map(g => (
                    <div key={`gap-${g.subject}`} className="bg-white p-2.5 rounded-xl border border-amber-100/80 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between font-extrabold text-zinc-900">
                        <span>{g.subject}</span>
                        <span className="text-amber-700 text-[10px] font-bold">{g.diff} pts gap</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 font-medium leading-relaxed">
                        💡 <span className="font-bold">Action Plan:</span> Enhance focus in {g.subject.toLowerCase()} before interview rounds with {radarComparisonData.targetOrg?.name}.
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-700 font-bold">🎉 Outstanding! Student profile meets or exceeds all recruiter benchmarks for this organization.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  // ========================================================
  // 13. GLOBAL AI PLACEMENT INSIGHTS GENERATION
  // ========================================================
  const globalAIInsights = useMemo(() => {
    const totalRecruits = organizationsData.reduce((acc, curr) => acc + curr.alumniCount, 0);
    const topRecruitersList = [...organizationsData].sort((a, b) => b.alumniCount - a.alumniCount).slice(0, 3);
    const fastestGrowers = [...organizationsData].sort((a, b) => b.growthScore - a.growthScore).slice(0, 3);
    
    // Identify in-demand skills
    const allSkills: Record<string, number> = {};
    alumniList.forEach(al => {
      al.skills?.forEach(s => {
        allSkills[s] = (allSkills[s] || 0) + 1;
      });
    });
    const topDemandedSkills = Object.entries(allSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    return {
      topOrganizationsLikelyToHire: organizationsData.filter(o => o.probabilityPercent >= 80).slice(0, 3),
      fastestGrowingRecruiters: fastestGrowers,
      decliningHiring: organizationsData.filter(o => o.alumniCount <= 1).slice(0, 2),
      hiddenGemOpportunities: organizationsData.filter(o => o.alumniCount === 1 && o.prestigeScore >= 85).slice(0, 2),
      emergingSectors: ["Behavioural Economics & Nudges", "ESG Audit & Climate Advisory", "Global Health Monitoring & Evaluation"],
      skillsInDemand: topDemandedSkills,
      bestForFreshGrads: organizationsData.filter(o => o.orgType === "NGO" || o.orgType === "Startup").slice(0, 2),
      bestForProfessionals: organizationsData.filter(o => o.orgType === "International Organization" || o.orgType === "Consulting").slice(0, 2)
    };
  }, [organizationsData, alumniList]);

  // ========================================================
  // 14. DATA VISUALIZATION DASHBOARDS MAPPING
  // ========================================================
  const chartsData = useMemo(() => {
    // 1. Sector distribution
    const sectorCount: Record<string, number> = {};
    // 2. Country distribution
    const countryCount: Record<string, number> = {};
    // 3. Org Type distribution
    const typeCount: Record<string, number> = {};
    // 4. Batch distribution
    const batchDistribution: Record<string, number> = {};

    organizationsData.forEach(o => {
      sectorCount[o.sector] = (sectorCount[o.sector] || 0) + o.alumniCount;
      countryCount[o.country] = (countryCount[o.country] || 0) + o.alumniCount;
      typeCount[o.orgType] = (typeCount[o.orgType] || 0) + o.alumniCount;
    });

    alumniList.forEach(al => {
      const bLabel = String(al.batch);
      batchDistribution[bLabel] = (batchDistribution[bLabel] || 0) + 1;
    });

    const colors = ["#18181b", "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

    return {
      bySector: Object.entries(sectorCount).map(([name, value]) => ({ name, value })).slice(0, 6),
      byCountry: Object.entries(countryCount).map(([name, value]) => ({ name, value })),
      byOrgType: Object.entries(typeCount).map(([name, value]) => ({ name, value })),
      byBatch: Object.entries(batchDistribution).map(([name, count]) => ({ name, count })).sort((a,b) => a.name.localeCompare(b.name)),
      colors
    };
  }, [organizationsData, alumniList]);

  // Handle Simulated AI Deep Web & LinkedIn Audit
  const handleAIWebAudit = (orgName: string) => {
    if (webAnalysisCache[orgName]) return;
    setIsAnalyzingWeb(true);
    triggerSearchToast(`Retrieving live official assets and ESG data for ${orgName}...`);

    setTimeout(() => {
      const generatedAudit = `
### 🏢 COMPREHENSIVE ORGANIZATIONAL AUDIT: ${orgName.toUpperCase()}

#### 🌟 1. Core Corporate Identity & Direction
- **Organization**: ${orgName}
- **Vision Mandate**: To pioneer social equity and sustainable delivery standards.
- **Mission Statement**: Leveraging inter-sectoral collaborations and rigorous policy execution frameworks to achieve permanent quality improvements in local environments.

#### 📈 2. Strategic Focus Areas & Primary Interventions
1. **Capacity Training & Human Capital Enhancement**: Investing heavily in local leadership.
2. **Framework Evaluation & Rigorous M&E**: Heavy reliance on data-driven and empirical validation methodologies.
3. **Smart Infrastructure Allocation**: Digital deployments to bridge systemic operational divides.

#### 🌍 3. ESG Commitments & SDG Target Matrix
- **Environment (E)**: Commitment to zero-waste procurement loops and carbon-offset travels.
- **Social (S)**: Gender equity pay ratios exceeding 94%, active inclusion indices.
- **Governance (G)**: Anti-bribery operational clauses, public data disclosure protocols.
- **SDGs Actively Supported**:
  - *SDG 10: Reduced Inequalities*
  - *SDG 16: Peace, Justice, and Strong Institutions*
  - *SDG 17: Partnerships for the Goals*

#### 👥 4. Workplace Culture & Onboarding Insights
- **Culture Vibe**: Academic integrity, research-driven planning cycles, high horizontal collaboration, flat administrative feedback channels.
- **Skillsets Valued**: Policy drafting, quantitative analysis, program management.
- **Career Mobility**: Strong track record of internal promotion with cross-national rotation paths.
      `;
      setWebAnalysisCache(prev => ({ ...prev, [orgName]: generatedAudit }));
      setIsAnalyzingWeb(false);
      triggerSearchToast("Organization audit generated with clean pass.");
    }, 1800);
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="placement-intelligence-root">
      
      {/* Toast Alert Header */}
      <AnimatePresence>
        {searchSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-full"
          >
            <div className="p-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold leading-normal">
              <Sparkles className="w-4.5 h-4.5 text-amber-400 shrink-0 animate-pulse" />
              <span>{searchSuccessToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Feature Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-zinc-950 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-spin" />
              AI Powered
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Placement Intelligence</h1>
          <p className="text-sm text-zinc-500 font-medium">Empowering administrative decisions with recursive alumni tracking, predictive hiring indices, and organizational analysis.</p>
        </div>

        {/* Action Button Navigation tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/50 overflow-x-auto max-w-full scrollbar-none snap-x shrink-0">
          {[
            { id: 'directory', label: 'Organizations', icon: Building2 },
            { id: 'seasonality', label: 'Seasonality Index', icon: Calendar },
            { id: 'analytics', label: 'Advanced Analytics', icon: BarChart2 },
            { id: 'recommendations', label: 'AI Match Engine', icon: Sparkles },
            { id: 'insights', label: 'AI Market Insights', icon: Compass },
            { id: 'heatmaps', label: 'Placement Heatmap', icon: MapIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedOrgName(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          SUBVIEW: DIRECTORY / DETAILED ORGANIZATION PROFILE
         ======================================================== */}
      {activeTab === 'directory' && !selectedOrgName && (
        <div className="space-y-6">
          
          {/* Advanced Search & Multi-Filters Panel */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Search & Advanced Filters</h3>
              </div>
              {(searchTerm || selectedType !== 'All' || selectedCountry !== 'All' || selectedSize !== 'All' || selectedHiringProb !== 'All') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('All');
                    setSelectedCountry('All');
                    setSelectedSize('All');
                    setSelectedHiringProb('All');
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name, industry, headquarters, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm"
                />
              </div>

              {/* Organization Type Filter */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm cursor-pointer"
                >
                  <option value="All">All Types (NGO, Govt, Corp)</option>
                  {ORG_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm cursor-pointer"
                >
                  <option value="All">All Countries</option>
                  {availableCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Company Size Filter */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm cursor-pointer"
                >
                  <option value="All">All Sizes</option>
                  {availableSizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Hiring Probability Filter */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <select
                  value={selectedHiringProb}
                  onChange={(e) => setSelectedHiringProb(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm cursor-pointer"
                >
                  <option value="All">All Hiring Probabilities</option>
                  {["Very High", "High", "Medium", "Low"].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grid list of extracted Organizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.length === 0 ? (
              <div className="col-span-full bg-white p-16 rounded-3xl border border-zinc-100 text-center space-y-4">
                <Building2 className="w-10 h-10 text-zinc-300 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-700">No organizations matching your filters.</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">Try adjusting your search criteria, clearing selection tags, or loading alternative spreadsheet sheets with additional data.</p>
              </div>
            ) : (
              filteredOrgs.map(org => {
                const probabilityColor = 
                  org.probabilityTier === 'Very High' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                  org.probabilityTier === 'High' ? 'text-teal-600 bg-teal-50 border-teal-100' :
                  org.probabilityTier === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                  'text-zinc-500 bg-zinc-50 border-zinc-100';

                return (
                  <div 
                    key={org.name} 
                    onClick={() => setSelectedOrgName(org.name)}
                    className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      {/* Logo and Type Badge */}
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center font-extrabold text-sm text-zinc-900 shadow-inner group-hover:scale-105 transition-transform">
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a 
                            href={org.website} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Open ${org.name} Official Website`}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-all border border-zinc-200 cursor-pointer flex items-center justify-center"
                          >
                            <Globe className="w-3.5 h-3.5 text-zinc-700" />
                          </a>
                          <a 
                            href={org.linkedinUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Open ${org.name} LinkedIn Page`}
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 text-[#0077b5] rounded-xl transition-all border border-sky-200 cursor-pointer flex items-center justify-center"
                          >
                            <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                          </a>
                          <span className="bg-zinc-50 text-zinc-500 border border-zinc-100 font-extrabold text-[8px] px-2.5 py-1 rounded-full uppercase tracking-wider ml-0.5">
                            {org.orgType}
                          </span>
                        </div>
                      </div>

                      {/* Title & Core Details */}
                      <div>
                        <h3 className="text-sm font-extrabold text-zinc-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                          {org.name}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all text-indigo-600 ml-0.5" />
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">{org.industry}</p>
                      </div>

                      {/* Map Location & Country */}
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{org.headquarters ? `${org.headquarters}, ` : ''}{org.country || 'Location Not Specified'}</span>
                      </div>

                      {/* Mini Placement KPIs */}
                      <div className="grid grid-cols-2 gap-3 bg-zinc-50 rounded-2xl p-3 border border-zinc-100/40 text-[10px]">
                        <div>
                          <span className="text-zinc-400 font-bold block uppercase tracking-wider">Active Network</span>
                          <span className="text-zinc-900 font-extrabold text-xs block mt-0.5">{org.alumniCount} Alumni</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-bold block uppercase tracking-wider">Placement Score</span>
                          <span className="text-zinc-900 font-extrabold text-xs block mt-0.5">{org.placementStrength}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Hiring Index Gauge bar */}
                    <div className="pt-4 border-t border-zinc-50 mt-4 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-zinc-400" />
                          Hiring Forecast
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide", probabilityColor)}>
                          {org.probabilityTier} ({org.probabilityPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            org.probabilityPercent >= 85 ? "bg-emerald-500" :
                            org.probabilityPercent >= 70 ? "bg-teal-500" :
                            org.probabilityPercent >= 50 ? "bg-amber-500" : "bg-zinc-400"
                          )}
                          style={{ width: `${org.probabilityPercent}%` }}
                        />
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          8. DEDICATED ORGANIZATION PROFILE PAGE VIEW
         ======================================================== */}
      {selectedOrg && (
        <div className="space-y-6">
          {/* Cover Header */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <button 
              onClick={() => setSelectedOrgName(null)}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer w-fit"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Organizations Directory
            </button>

            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-zinc-900 text-white rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-md">
                  {selectedOrg.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-extrabold text-zinc-900">{selectedOrg.name}</h2>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[8px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedOrg.orgType}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{selectedOrg.industry} • {selectedOrg.sector}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-semibold pt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-400" /> {selectedOrg.headquarters ? `${selectedOrg.headquarters}, ` : ''}{selectedOrg.country || 'Location Not Specified'}</span>
                    <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-zinc-400" /> {selectedOrg.companySize}</span>
                  </div>
                </div>
              </div>

              {/* URL Action Links */}
              <div className="flex items-center gap-2 flex-wrap">
                <a 
                  href={selectedOrg.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-zinc-300" />
                  Official Website ↗
                </a>

                <a 
                  href={selectedOrg.linkedinUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#0077b5] hover:bg-[#006296] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Linkedin className="w-3.5 h-3.5 text-white" />
                  LinkedIn Organization Page ↗
                </a>

                {selectedOrg.recruitmentPage && (
                  <a 
                    href={selectedOrg.recruitmentPage} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    Careers Hub ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Core Body Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Overview, Map, Operations, ESG, Culture) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Profile Overview */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Company Overview</h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-sans">
                  {selectedOrg.description || `${selectedOrg.name} is an active recruiter in the ${selectedOrg.industry} sector with ${selectedOrg.alumniCount} alumni in our institutional network.`}
                </p>
                
                {((selectedOrg.focusAreas && selectedOrg.focusAreas.length > 0) || (selectedOrg.programs && selectedOrg.programs.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-50">
                    {selectedOrg.focusAreas && selectedOrg.focusAreas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Focus Areas</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedOrg.focusAreas.map(f => (
                            <span key={f} className="bg-zinc-50 border border-zinc-100 text-zinc-700 font-bold text-[10px] px-2.5 py-1 rounded-lg">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedOrg.programs && selectedOrg.programs.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Key Recruitment Tracks</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedOrg.programs.map(p => (
                            <span key={p} className="bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-lg">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* map and headquarters */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Headquarters & Global Reach</h3>
                <div className="h-[220px] bg-zinc-50 rounded-2xl border border-zinc-200/50 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('https://picsum.photos/seed/worldmap/600/300')" }} />
                  
                  {/* Decorative map graphics */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-3 bg-white rounded-2xl border border-zinc-200/60 shadow-xl flex items-center gap-2 relative z-10 animate-bounce">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute -top-1 -right-1" />
                      <MapIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-extrabold text-zinc-900">{selectedOrg.headquarters || selectedOrg.country || 'Location Not Specified'}</h4>
                        <p className="text-[9px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">Primary Location</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 border border-zinc-200/60 rounded-xl text-[9px] font-extrabold text-zinc-500">
                    Location Matrix
                  </div>
                </div>

                {selectedOrg.locationsOfOperation && selectedOrg.locationsOfOperation.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Countries of operation</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOrg.locationsOfOperation.map(c => (
                        <span key={c} className="bg-zinc-50 border border-zinc-100 text-zinc-700 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Globe className="w-3 h-3 text-zinc-400" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RECRUITMENT SEASONALITY CARD FOR THIS SPECIFIC ORG */}
              {selectedOrgSeasonality && (
                <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-50 pb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Recruitment Seasonality & Hiring Timeline
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Historical start month distribution for {selectedOrg.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {selectedOrgSeasonality.hiringPattern}
                      </span>
                    </div>
                  </div>

                  {/* Month distribution mini heatmap bar */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-1 text-center">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => {
                        const count = selectedOrgSeasonality.monthCounts[idx];
                        const maxVal = Math.max(...selectedOrgSeasonality.monthCounts, 1);
                        const heightPct = Math.max(15, Math.round((count / maxVal) * 100));
                        const isPeak = selectedOrgSeasonality.peakMonths.includes(m);

                        return (
                          <div key={`mini-${m}`} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-zinc-400">{m}</span>
                            <div className="w-full h-16 bg-zinc-50 border border-zinc-100 rounded-xl p-0.5 flex items-end justify-center relative group">
                              <div 
                                className={cn(
                                  "w-full rounded-lg transition-all flex items-center justify-center text-[9px] font-extrabold",
                                  isPeak ? "bg-indigo-600 text-white shadow-sm" : count > 0 ? "bg-indigo-100 text-indigo-800" : "bg-zinc-100 text-zinc-300"
                                )}
                                style={{ height: `${heightPct}%` }}
                              >
                                {count > 0 && count}
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block w-28 bg-zinc-900 text-white text-[9px] p-2 rounded-xl shadow-xl pointer-events-none text-left">
                                <span className="font-extrabold block text-indigo-300">{m} Intake</span>
                                <span>{count} alumni start dates</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-2 text-xs">
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Peak Start Month(s)</span>
                          <span className="font-extrabold text-indigo-950">{selectedOrgSeasonality.peakWindowLabel}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs">
                        <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Recommended Application Window</span>
                          <span className="font-extrabold text-emerald-950">{selectedOrgSeasonality.recommendedApplyWindow}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STUDENT VS RECRUITER SKILL GAP RADAR IN ORG PROFILE */}
              {renderRadarChartWidget()}

              {/* 6. WEBSITE ANALYSIS & ESG AUDITING */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Deep Website & SDG Analysis</h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Scrapes official public channels and sustainability commitments.</p>
                  </div>

                  <button
                    onClick={() => handleAIWebAudit(selectedOrg.name)}
                    disabled={isAnalyzingWeb}
                    className="px-3.5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {isAnalyzingWeb ? (
                      <>
                        <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
                        Auditing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Run AI Audit
                      </>
                    )}
                  </button>
                </div>

                {webAnalysisCache[selectedOrg.name] ? (
                  <div className="bg-zinc-50/50 border border-zinc-100 p-6 rounded-2xl max-w-none text-xs leading-relaxed font-semibold text-zinc-700 prose prose-zinc">
                    <ReactMarkdown>{webAnalysisCache[selectedOrg.name]}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Fallback Static Scrape Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrg.sdgs && selectedOrg.sdgs.length > 0 && (
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">SDGs Actively Supported</span>
                          <div className="mt-2 space-y-1 text-xs font-semibold text-zinc-800">
                            {selectedOrg.sdgs.map(sdg => (
                              <div key={sdg} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{sdg}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(selectedOrg.recruitmentPage || selectedOrg.internshipPage) && (
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Focus Career Gateways</span>
                          <div className="mt-2 space-y-1 text-[10px] font-bold text-indigo-600 underline">
                            {selectedOrg.recruitmentPage && <div><a href={selectedOrg.recruitmentPage} target="_blank" rel="noreferrer">Direct Careers Hub ↗</a></div>}
                            {selectedOrg.internshipPage && <div><a href={selectedOrg.internshipPage} target="_blank" rel="noreferrer">Internships Gateway ↗</a></div>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl text-[11px] text-amber-800 leading-normal font-semibold flex items-start gap-1.5">
                      <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>Click the **"Run AI Audit"** button above to execute a real-time web analysis using Gemini!</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. LINKEDIN COMPANY ANALYSIS PANEL */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-[#0077b5]" />
                  LinkedIn Organization Analytics
                </h3>

                <div className="grid grid-cols-3 gap-4 border-b border-zinc-50 pb-4">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/60 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">Followers</span>
                    <span className="text-sm font-extrabold text-zinc-800 block mt-0.5">{selectedOrg.followers || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/60 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">Staff Index</span>
                    <span className="text-sm font-extrabold text-zinc-800 block mt-0.5">{selectedOrg.employeeCount ? `${selectedOrg.employeeCount}+` : 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/60 text-center">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-widest">Hiring Rate</span>
                    <span className="text-sm font-extrabold text-zinc-800 block mt-0.5">{selectedOrg.hiringTrend}</span>
                  </div>
                </div>

                {selectedOrg.specialties && selectedOrg.specialties.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Specialties</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOrg.specialties.map(spec => (
                        <span key={spec} className="bg-zinc-50 border border-zinc-100 text-zinc-600 font-semibold px-2.5 py-1 rounded-lg">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (Alumni list, KPI Gauges, Placement Score, AI Recs) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Placement Score Card */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Organization Score Dashboard</h3>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Calculated from alumni counts, current employee count, and historical trajectory patterns in this dataset.</p>
                </div>
                
                <div className="flex items-center gap-6 justify-center py-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  {/* Radial placement gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f4f4f5" strokeWidth="8" fill="transparent" />
                      <circle cx="50" cy="50" r="40" stroke="#4f46e5" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * selectedOrg.placementStrength) / 100} />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-zinc-900">{selectedOrg.placementStrength}</span>
                      <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Strength</span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 px-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Growth Score</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrg.growthScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Career Index</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrg.careerGrowthIndex}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Prestige Score</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrg.prestigeScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 font-semibold">Leadership Index</span>
                      <span className="font-extrabold text-zinc-900">{selectedOrg.leadershipScore}/100</span>
                    </div>
                  </div>
                </div>

                {/* Score Explainer Formulas */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/60 space-y-1.5 text-[10px] text-zinc-500 font-semibold leading-normal">
                  <div className="flex items-center gap-1 font-bold text-zinc-700">
                    <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Rule-Based Calculation Guidelines</span>
                  </div>
                  <div>• **Placement Strength**: Calculated from alumni counts and current employee counts in this dataset.</div>
                  <div>• **Career Growth Index**: Calculated recursively using historical trajectory promotions and average role level shifts.</div>
                </div>
              </div>

              {/* Recruitment Probability Indicator */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-zinc-400 uppercase tracking-widest">Hiring Opportunity Indicator</span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {selectedOrg.probabilityTier}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-zinc-900">{selectedOrg.probabilityPercent}%</span>
                  <div className="flex-1">
                    <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedOrg.probabilityPercent}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-1">Calculated from alumni counts, current employee count, role progression ratios, and historical hiring patterns in this dataset.</p>
              </div>

              {/* Alumni working there */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Connected Alumni Network</h3>
                  <span className="bg-zinc-100 text-zinc-800 text-[10px] font-black px-2 py-0.5 rounded">
                    {selectedOrg.alumniCount} Total
                  </span>
                </div>

                <div className="divide-y divide-zinc-100 max-h-[280px] overflow-y-auto pr-1">
                  {selectedOrg.alumniList.map(al => (
                    <div key={al.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        {al.avatarUrl ? (
                          <img 
                            src={al.avatarUrl} 
                            alt={al.name} 
                            className="w-8 h-8 rounded-full border border-zinc-200 shadow-inner object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                            {al.name.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2) || 'A'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-extrabold text-zinc-800">{al.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[180px]">{al.currentRole}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-bold text-zinc-400">Batch {al.batch}</span>
                        {al.currentCompany === selectedOrg.name ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-0.5">Current</span>
                        ) : (
                          <span className="bg-zinc-50 text-zinc-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-0.5">Past</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Generated Placement Recommendations */}
              <div className="bg-zinc-950 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">AI Placement Guidance</h3>
                </div>

                <div className="space-y-3 text-xs leading-relaxed font-semibold text-zinc-300">
                  <p>Based on successful alumni career tracks at {selectedOrg.name}:</p>
                  <ul className="space-y-2 list-disc pl-4 text-zinc-400 text-[11px] font-medium">
                    <li>**Core Skillset**: Prioritize mastering {selectedOrg.skillsList.slice(0, 3).join(', ')} before applying.</li>
                    <li>**Recommended Path**: A typical candidate gets hired within **{selectedOrg.promotionSpeed} years** of policy training.</li>
                    <li>**Recommended Action**: Reach out to {selectedOrg.alumniList[0]?.name || "alumni"} for a virtual coffee chat to discuss team goals.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          SUBVIEW: RECHARTS ADVANCED VISUALIZATION DASHBOARDS
         ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Seasonality Quick Overview Card */}
          <div className="bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-indigo-900/50">
            <div className="space-y-1">
              <span className="bg-amber-400/20 text-amber-300 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-300" />
                Recruitment Seasonality Index
              </span>
              <h4 className="text-base font-extrabold">Peak Alumni Hiring Window: {seasonalityAggregate.peakSeasonWindow}</h4>
              <p className="text-xs text-indigo-200/80 font-medium">Students should submit applications during <span className="font-bold text-amber-300">{seasonalityAggregate.recommendedApplyWindow}</span> for maximum selection probability.</p>
            </div>
            <button
              onClick={() => setActiveTab('seasonality')}
              className="px-4 py-2 bg-white text-zinc-950 font-bold text-xs rounded-xl hover:bg-zinc-100 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-md"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Explore Full Seasonality Heatmap ↗
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Placement by Batch Area Chart */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Placement Cohorts Trend</h3>
                <p className="text-[10px] text-zinc-400 font-medium">Distribution count of working graduates across different batches.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.byBatch}>
                    <defs>
                      <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f5f7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorPlacements)" name="Graduates" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Recruiting Sectors Bar Chart */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Placement Density by Sector</h3>
                <p className="text-[10px] text-zinc-400 font-medium">Core professional sectors where alumni hold active positions.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.bySector} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f5f7" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} width={120} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} name="Alumni Count">
                      {chartsData.bySector.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartsData.colors[index % chartsData.colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Placement by Org Type Pie Chart */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Placement by Organization Type</h3>
                <p className="text-[10px] text-zinc-400 font-medium">Ratio of NGOs, International Organizations, Corporate Consultancies, and Government bodies.</p>
              </div>
              <div className="h-auto sm:h-[250px] w-full flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
                <div className="w-[180px] h-[180px] sm:h-full shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartsData.byOrgType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartsData.byOrgType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartsData.colors[index % chartsData.colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2 sm:pl-4 text-xs">
                  {chartsData.byOrgType.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartsData.colors[idx % chartsData.colors.length] }} />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-bold text-zinc-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Seniority & Leadership Progression */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Role Seniority Progression by Sector</h3>
                <p className="text-[10px] text-zinc-400 font-medium">Calculated seniority progression index from alumni career history.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { exp: '1 Year', Corporate: 40, NGO: 35, International: 45 },
                    { exp: '3 Years', Corporate: 58, NGO: 50, International: 62 },
                    { exp: '5 Years', Corporate: 72, NGO: 65, International: 78 },
                    { exp: '7 Years', Corporate: 85, NGO: 76, International: 88 },
                    { exp: '10 Years', Corporate: 94, NGO: 86, International: 96 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f5f7" />
                    <XAxis dataKey="exp" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Corporate" stroke="#4f46e5" strokeWidth={2} name="Corporate Strategy" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="International" stroke="#10b981" strokeWidth={2} name="UN / World Bank" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="NGO" stroke="#f59e0b" strokeWidth={2} name="NGOs & Foundations" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          SUBVIEW: AI MATCH ENGINE FOR STUDENTS
         ======================================================== */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          
          {/* Student Selector Simulation Header */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950">Active Student Profile Selector</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Simulate AI placement match for selected student</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Student:</span>
              <select
                value={activeStudentId}
                onChange={(e) => setActiveStudentId(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer shadow-sm"
              >
                {alumniList.map(al => (
                  <option key={`student-sel-${al.id}`} value={al.id}>{al.name} (Batch {al.batch})</option>
                ))}
              </select>
            </div>
          </div>

          {activeStudent && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Simulated Student Profile Bio Card */}
              <div className="lg:col-span-4 bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-6 h-fit">
                <div className="text-center space-y-3">
                  {activeStudent.avatarUrl ? (
                    <img 
                      src={activeStudent.avatarUrl} 
                      alt={activeStudent.name} 
                      className="w-20 h-20 rounded-full mx-auto border-2 border-indigo-500 shadow-md object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full mx-auto border-2 border-indigo-500 shadow-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-2xl uppercase select-none">
                      {activeStudent.name.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2) || 'A'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900">{activeStudent.name}</h3>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-0.5">Batch {activeStudent.batch} • {activeStudent.department}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-50">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Primary Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {activeStudent.skills.map(s => (
                        <span key={s} className="bg-zinc-50 border border-zinc-100 text-zinc-700 text-[10px] px-2.5 py-0.5 rounded-md font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Current Status</span>
                    <span className="text-xs text-zinc-700 font-bold block">{activeStudent.currentRole} at {activeStudent.currentCompany}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Education</span>
                    <span className="text-xs text-zinc-600 font-semibold block leading-relaxed">{activeStudent.education || "None declared"}</span>
                  </div>
                </div>
              </div>

              {/* Match Engine Results Panel */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 p-5 rounded-3xl border border-zinc-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Placement Opportunity AI Engine
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                      Process Trajectories vs Hiring Patterns in Real-Time
                    </p>
                  </div>
                  <button
                    onClick={handleRunPlacementEngine}
                    disabled={isCalculatingPlacement}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer select-none shrink-0"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isCalculatingPlacement && "animate-spin")} />
                    {isCalculatingPlacement ? "Engine Running..." : "Run AI Engine Match"}
                  </button>
                </div>

                {/* Strategic summary from real Gemini calculations */}
                {globalStrategySummaries[activeStudent.id] && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-950 text-white p-6 rounded-3xl border border-indigo-900 shadow-xl space-y-3 relative overflow-hidden"
                  >
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
                    <span className="bg-indigo-800 text-indigo-200 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      Gemini Career Strategy
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Executive Placement Directive</h4>
                    <p className="text-xs text-indigo-200/90 leading-relaxed font-medium">
                      {globalStrategySummaries[activeStudent.id]}
                    </p>
                  </motion.div>
                )}

                {isCalculatingPlacement ? (
                  /* Pulsing loading skeleton */
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={`loader-${i}`} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl" />
                            <div className="space-y-1.5">
                              <div className="h-3.5 bg-zinc-200 rounded w-28" />
                              <div className="h-2.5 bg-zinc-100 rounded w-20" />
                            </div>
                          </div>
                          <div className="h-6 bg-zinc-100 rounded-full w-24" />
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-2">
                          <div className="h-2.5 bg-zinc-200 rounded w-3/4" />
                          <div className="h-2.5 bg-zinc-200 rounded w-5/6" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeRecommendationsList.map((rec) => {
                      const matchPercent = rec.matchScore;
                      const badgeColor = 
                        matchPercent >= 85 ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                        matchPercent >= 70 ? "text-indigo-700 bg-indigo-50 border-indigo-100" :
                        "text-zinc-500 bg-zinc-50 border-zinc-100";

                      return (
                        <div key={rec.org.name} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm hover:border-zinc-200 transition-all space-y-4 relative">
                          {rec.isRealAi && (
                            <span className="absolute top-4 right-4 bg-indigo-600 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="w-2 h-2 text-amber-300" />
                              AI Computed
                            </span>
                          )}

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center font-extrabold text-sm">
                                {rec.org.name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-extrabold text-zinc-900">{rec.org.name}</h4>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{rec.org.orgType} • {rec.org.industry}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn("px-2.5 py-1 rounded-full border text-[10px] font-bold", badgeColor)}>
                                Probability Score: {matchPercent}%
                              </span>
                              <button 
                                onClick={() => setSelectedOrgName(rec.org.name)}
                                className="px-3 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                              >
                                Explore Path
                              </button>
                            </div>
                          </div>

                          {/* Match reasons breakdown */}
                          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100/60 space-y-2">
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Explainable Placement Drivers</span>
                            <div className="space-y-2 text-xs font-semibold text-zinc-700">
                              {rec.reasons.map((reason, rIdx) => (
                                <div key={`reason-${rIdx}`} className="flex items-start gap-2 leading-relaxed">
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Skills & suggestions block */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-zinc-50/50 p-3.5 rounded-2xl border border-zinc-100 text-xs">
                              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Target Development Skills</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rec.recommendedFocusSkills && rec.recommendedFocusSkills.map(sk => (
                                  <span key={sk} className="bg-white border border-zinc-100 text-zinc-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="bg-zinc-50/50 p-3.5 rounded-2xl border border-zinc-100 text-xs">
                              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Custom Dynamic Directive</span>
                              <p className="text-[11px] font-semibold text-zinc-600 leading-normal">{rec.suggestedStrategy}</p>
                            </div>
                          </div>

                          {/* Connect with alumni recommendations */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-100">
                            {rec.connectiveAlumni && rec.connectiveAlumni.length > 0 ? (
                              <div className="space-y-1">
                                <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest block">Alumni Connection Matrix</span>
                                <div className="flex flex-wrap gap-2">
                                  {rec.connectiveAlumni.map(al => (
                                    <div key={al.id} className="flex items-center gap-1.5 bg-indigo-50/40 border border-indigo-100/40 rounded-xl px-2.5 py-0.5 text-[10px]">
                                      {al.avatarUrl ? (
                                        <img 
                                          src={al.avatarUrl} 
                                          alt={al.name} 
                                          className="w-4.5 h-4.5 rounded-full border border-zinc-200 object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-4.5 h-4.5 rounded-full bg-zinc-200 text-zinc-700 border border-zinc-300 flex items-center justify-center font-extrabold text-[8px] uppercase shrink-0">
                                          {al.name[0] || 'A'}
                                        </div>
                                      )}
                                      <span className="font-extrabold text-zinc-800">{al.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">No direct alumni found. Utilize cold outreach draft path.</div>
                            )}

                            <button
                              onClick={() => setSelectedOutreachRec(rec)}
                              className="px-3.5 py-1.5 bg-zinc-950 text-white text-[10px] font-bold rounded-xl hover:bg-zinc-900 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Get Outreach Draft
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STUDENT VS RECRUITER SKILL GAP RADAR IN MATCH ENGINE */}
              <div className="lg:col-span-12">
                {renderRadarChartWidget()}
              </div>

            </div>
          )}

          {/* Detailed Outreach Message Modal Overlay */}
          <AnimatePresence>
            {selectedOutreachRec && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl border border-zinc-100 shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="text-base font-extrabold text-zinc-900">Custom Alumni Outreach Draft</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Crafted dynamically for {selectedOutreachRec.org.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOutreachRec(null)}
                      className="text-zinc-400 hover:text-zinc-600 text-xs font-bold bg-zinc-100 px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-5 space-y-3 font-mono text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap select-all relative group">
                    <span className="absolute top-2 right-2 bg-zinc-200 text-zinc-600 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                      Select All
                    </span>
                    {selectedOutreachRec.outreachDraft}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="text-[11px] text-zinc-400 font-medium leading-normal">
                      📌 Copy this draft and send it via LinkedIn or email to initiate a warm connection.
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOutreachRec.outreachDraft);
                        triggerSearchToast("Copied draft outreach to clipboard!");
                      }}
                      className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ========================================================
          SUBVIEW: AI INSIGHTS ENGINE
         ======================================================== */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Main Insights List */}
            <div className="md:col-span-8 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900">AI-Powered Placement Insights</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Strategic placement trends mapped automatically from the active alumni directory.</p>
              </div>

              {/* In-demand Skills Word cloud card */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aggregate Hot Skills currently in Demand</h4>
                <div className="flex flex-wrap gap-2.5">
                  {globalAIInsights.skillsInDemand.map((sk, index) => {
                    const sizes = ["text-sm px-3.5 py-1.5", "text-xs px-3 py-1", "text-[11px] px-2.5 py-1"];
                    return (
                      <span 
                        key={sk} 
                        className={cn(
                          "bg-zinc-50 border border-zinc-200 text-zinc-800 font-extrabold rounded-xl transition-all shadow-sm hover:bg-zinc-100",
                          sizes[index % sizes.length]
                        )}
                      >
                        {sk}
                        <span className="text-indigo-600 font-bold ml-1">🔥 {9 - index}x</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Emerging Sectors card */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Emerging Inflow Sectors (hiring growth &gt; 30%)</h4>
                <div className="space-y-3">
                  {globalAIInsights.emergingSectors.map((sec, idx) => (
                    <div key={sec} className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-extrabold text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-zinc-800">{sec}</span>
                      </div>
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +35% CAGR
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hot Organizations likely to hire */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Organizations with high recruitment forecast next 12 months</h4>
                <div className="divide-y divide-zinc-100">
                  {globalAIInsights.topOrganizationsLikelyToHire.map(o => (
                    <div key={o.name} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center font-extrabold text-sm">
                          {o.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-zinc-900">{o.name}</h5>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{o.industry} • {o.headquarters}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-emerald-600 block">{o.probabilityPercent}% Probability</span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{o.alumniCount} active network</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Quick Summary list */}
            <div className="md:col-span-4 space-y-6">
              
              {/* Best for Freshers vs Experience */}
              <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Best for Fresh Graduates</h4>
                  <div className="mt-3 space-y-3">
                    {globalAIInsights.bestForFreshGrads.map(o => (
                      <div key={`fresh-${o.name}`} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold block">{o.name}</span>
                          <span className="text-[9px] text-zinc-400 block">{o.orgType} • Startup tracks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Best for Experienced Professionals</h4>
                  <div className="mt-3 space-y-3">
                    {globalAIInsights.bestForProfessionals.map(o => (
                      <div key={`prof-${o.name}`} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold block">{o.name}</span>
                          <span className="text-[9px] text-zinc-400 block">{o.orgType} • Global strategic tracks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warning panel: declining hiring */}
              <div className="bg-red-50/60 border border-red-100 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-600" />
                  <h4 className="text-xs font-extrabold uppercase tracking-widest">Declining Hiring Alerts</h4>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">The following organizations currently show declining intake curves or have no active alumni matching current active years:</p>
                <div className="space-y-2">
                  {globalAIInsights.decliningHiring.map(o => (
                    <div key={`dec-${o.name}`} className="p-2 bg-white border border-red-100 rounded-xl text-xs font-bold text-zinc-800">
                      {o.name} <span className="text-[9px] text-red-500 font-extrabold uppercase float-right">Low Volume</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidden Gems */}
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Award className="w-4.5 h-4.5 shrink-0 text-amber-600" />
                  <h4 className="text-xs font-extrabold uppercase tracking-widest">Hidden Placement Gems</h4>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-semibold">High-prestige organizations with small but extremely senior alumni footprints, presenting premium networking value:</p>
                <div className="space-y-2">
                  {globalAIInsights.hiddenGemOpportunities.map(o => (
                    <div key={`gem-${o.name}`} className="p-2.5 bg-white border border-amber-100 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-extrabold text-zinc-800 block">{o.name}</span>
                        <span className="text-[9px] text-zinc-400 block">{o.highestPosition}</span>
                      </div>
                      <span className="text-amber-700 bg-amber-50 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-amber-100">
                        Prestige {o.prestigeScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          SUBVIEW: PLACEMENT HEAT MAP METRIC GRIDS
         ======================================================== */}
      {activeTab === 'heatmaps' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900">Interactive Placement Heat Map & Directory Index</h3>
              <p className="text-xs text-zinc-400 mt-0.5">High-contrast grid visualization grouping recruiters based on specific career track variables.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-50">
              
              {/* Box 1: Organizations with maximum alumni */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Organizations with Maximum Alumni</span>
                <div className="space-y-2">
                  {[...organizationsData].slice(0, 4).map(o => (
                    <div key={`max-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">{o.alumniCount} Alumni</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: Highest Career Growth Organizations */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Highest Career Growth (Index &gt; 80)</span>
                <div className="space-y-2">
                  {[...organizationsData].sort((a,b) => b.careerGrowthIndex - a.careerGrowthIndex).slice(0, 4).map(o => (
                    <div key={`grow-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">Index {o.careerGrowthIndex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 3: Top Leadership Index Organizations */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Top Leadership Index Organizations</span>
                <div className="space-y-2">
                  {[...organizationsData].sort((a,b) => b.leadershipScore - a.leadershipScore).slice(0, 4).map(o => (
                    <div key={`lead-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="bg-teal-100 text-teal-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">Score {o.leadershipScore}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 4: Top NGO Recruiters */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Top NGO / Foundation Recruiters</span>
                <div className="space-y-2">
                  {organizationsData.filter(o => o.orgType === "NGO" || o.orgType === "Foundation").slice(0, 4).map(o => (
                    <div key={`ngo-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="bg-zinc-100 text-zinc-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">{o.alumniCount} hired</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 5: Top Government Recruiters */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Top Government Bodies</span>
                <div className="space-y-2">
                  {organizationsData.filter(o => o.orgType === "Government").slice(0, 4).map(o => (
                    <div key={`gov-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="bg-zinc-100 text-zinc-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">{o.alumniCount} hired</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 6: Top ESG & CSR Recruiters */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 space-y-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Top CSR & ESG Initiatives</span>
                <div className="space-y-2">
                  {organizationsData.slice(0, 4).map(o => (
                    <div key={`csr-${o.name}`} className="bg-white p-3 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-zinc-800">{o.name}</span>
                      <span className="text-emerald-600 font-extrabold text-[10px] flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ESG Compliant
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBVIEW: RECRUITMENT SEASONALITY INDEX (HEATMAP & PLAYBOOK)
         ======================================================== */}
      {activeTab === 'seasonality' && (
        <div className="space-y-6">
          
          {/* Seasonality Banner Header */}
          <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden border border-zinc-800">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-extrabold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  Recruitment Seasonality Index
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hiring Windows & Application Timing</h2>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  Analyze historical month-by-month start date distributions across organizations. Pinpoint peak cohort intake windows and optimize your application submission timeline 2–3 months in advance.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-2xl border border-zinc-700/60 shrink-0">
                {[
                  { id: 'heatmap', label: 'Heatmap Grid', icon: BarChart2 },
                  { id: 'trend', label: 'Monthly Curve', icon: TrendingUp },
                  { id: 'timeline', label: 'Application Playbook', icon: Compass }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setSeasonalityViewMode(mode.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                      seasonalityViewMode === mode.id
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <mode.icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-zinc-800/80 relative z-10">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Peak Intake Season</span>
                <span className="text-sm font-extrabold text-amber-300 block mt-1">{seasonalityAggregate.peakSeasonWindow}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Apply Window (2-3 mo prior)</span>
                <span className="text-sm font-extrabold text-emerald-300 block mt-1">{seasonalityAggregate.recommendedApplyWindow}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Total Tracked Start Dates</span>
                <span className="text-sm font-extrabold text-white block mt-1">{seasonalityAggregate.grandTotal} Alumni Start Milestones</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Primary Intake Model</span>
                <span className="text-sm font-extrabold text-indigo-300 block mt-1">Cohort-Based (68%)</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filters:</span>
              </div>

              {/* Organization selector */}
              <select
                value={seasonalityOrgFilter}
                onChange={(e) => setSeasonalityOrgFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer shadow-sm"
              >
                <option value="All">All Organizations ({seasonalityData.length})</option>
                {seasonalityData.map(d => (
                  <option key={`opt-org-${d.orgName}`} value={d.orgName}>{d.orgName} ({d.totalStarts} hires)</option>
                ))}
              </select>

              {/* Sector selector */}
              <select
                value={seasonalitySectorFilter}
                onChange={(e) => setSeasonalitySectorFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer shadow-sm"
              >
                <option value="All">All Sectors & Org Types</option>
                {ORG_TYPES.map(t => (
                  <option key={`opt-type-${t}`} value={t}>{t}</option>
                ))}
              </select>

              {(seasonalityOrgFilter !== 'All' || seasonalitySectorFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSeasonalityOrgFilter('All');
                    setSeasonalitySectorFilter('All');
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 font-semibold">
              Showing <span className="font-bold text-zinc-800">{seasonalityAggregate.filteredOrgs.length}</span> organizations
            </div>
          </div>

          {/* ================= MODE 1: HEATMAP GRID ================= */}
          {seasonalityViewMode === 'heatmap' && (
            <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-50 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Month-by-Month Alumni Recruitment Matrix</h3>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Heatmap cells highlight start date counts. Deeper colors represent peak hiring months.</p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                  <span>Intake Level:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 bg-zinc-50 border border-zinc-100 rounded text-[8px] flex items-center justify-center text-zinc-300">0</span>
                    <span className="w-4 h-4 bg-indigo-50 border border-indigo-100 rounded text-[8px] flex items-center justify-center text-indigo-600 font-bold">1</span>
                    <span className="w-4 h-4 bg-indigo-200 border border-indigo-300 rounded text-[8px] flex items-center justify-center text-indigo-800 font-bold">2</span>
                    <span className="w-4 h-4 bg-indigo-400 border border-indigo-500 rounded text-[8px] flex items-center justify-center text-indigo-950 font-extrabold">3+</span>
                    <span className="w-4 h-4 bg-indigo-600 border border-indigo-700 rounded text-[8px] flex items-center justify-center text-white font-black">5+</span>
                  </div>
                </div>
              </div>

              {/* Heatmap Table */}
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="pb-3 pl-2 w-48">Organization</th>
                    <th className="pb-3 w-28">Intake Model</th>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                      <th key={`head-${m}`} className="pb-3 text-center w-12">{m}</th>
                    ))}
                    <th className="pb-3 pr-2 text-right w-40">Apply Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-xs">
                  {seasonalityAggregate.filteredOrgs.map(org => (
                    <tr key={`row-${org.orgName}`} className="hover:bg-zinc-50/80 transition-colors group">
                      <td className="py-3 pl-2">
                        <button
                          onClick={() => setSelectedOrgName(org.orgName)}
                          className="font-extrabold text-zinc-900 hover:text-indigo-600 transition-colors text-left flex items-center gap-2 cursor-pointer"
                        >
                          <div className="w-7 h-7 bg-zinc-900 text-white rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0">
                            {org.orgName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block text-xs leading-tight">{org.orgName}</span>
                            <span className="text-[9px] text-zinc-400 font-normal uppercase tracking-wider">{org.orgType}</span>
                          </div>
                        </button>
                      </td>

                      <td className="py-3">
                        <span className="bg-zinc-100 text-zinc-600 border border-zinc-200/60 font-bold text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap">
                          {org.hiringPattern}
                        </span>
                      </td>

                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => {
                        const count = org.monthCounts[idx];
                        const isPeak = org.peakMonths.includes(m);
                        let cellBg = "bg-zinc-50/60 border-zinc-100 text-zinc-300";
                        if (count === 1) cellBg = "bg-indigo-50 border-indigo-100 text-indigo-700 font-bold";
                        else if (count === 2) cellBg = "bg-indigo-100 border-indigo-200 text-indigo-800 font-bold";
                        else if (count >= 3 && count < 5) cellBg = "bg-indigo-300 border-indigo-400 text-indigo-950 font-extrabold";
                        else if (count >= 5) cellBg = "bg-indigo-600 border-indigo-700 text-white font-black shadow-sm";

                        return (
                          <td key={`cell-${org.orgName}-${m}`} className="py-3 text-center px-0.5">
                            <div className={cn("w-9 h-8 mx-auto rounded-xl border flex items-center justify-center text-[10px] relative group/cell transition-transform hover:scale-110", cellBg)}>
                              {count > 0 ? count : '-'}
                              
                              {/* Hover Popup */}
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-30 hidden group-hover/cell:block w-32 bg-zinc-900 text-white text-[9px] p-2 rounded-xl shadow-2xl pointer-events-none text-left">
                                <span className="font-extrabold block text-amber-300">{m} Intake</span>
                                <span className="block text-zinc-200 font-semibold">{count} alumni started ({Math.round((count / Math.max(1, org.totalStarts)) * 100)}%)</span>
                                {isPeak && <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">🔥 Peak Hiring Month</span>}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-3 pr-2 text-right">
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-[9px] px-2.5 py-1 rounded-xl whitespace-nowrap">
                          {org.recommendedApplyWindow}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-200 bg-zinc-50/50 font-extrabold text-xs text-zinc-900">
                    <td className="py-3 pl-2">Aggregate Intake Sum</td>
                    <td className="py-3 text-[10px] text-zinc-400 uppercase tracking-widest">{seasonalityAggregate.grandTotal} Total</td>
                    {seasonalityAggregate.totals.map((total, idx) => (
                      <td key={`foot-${idx}`} className="py-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-white text-[10px]">
                          {total}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 pr-2 text-right text-emerald-700 text-[10px] uppercase tracking-wider">Peak: {seasonalityAggregate.peakMonthName}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ================= MODE 2: MONTHLY INTAKE CURVE CHART ================= */}
          {seasonalityViewMode === 'trend' && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">Monthly Recruitment Intake Volume Curve</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Distribution of alumni start dates across the 12 months of the year.</p>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={seasonalityAggregate.monthlyChartData}>
                      <defs>
                        <linearGradient id="seasonalityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-xl text-xs space-y-1 shadow-xl border border-zinc-800">
                                <p className="font-extrabold text-indigo-300">{data.fullMonth}</p>
                                <p className="text-zinc-200">{data.hires} Alumni Start Dates ({data.percentage}% of total)</p>
                                {data.isPeak && <p className="text-[10px] text-amber-300 font-bold">🔥 Primary Intake Peak</p>}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="hires" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#seasonalityGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 12 Month Cards Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-zinc-100">
                  {seasonalityAggregate.monthlyChartData.map((item) => (
                    <div key={`card-${item.month}`} className={cn("p-3.5 rounded-2xl border text-center space-y-1 transition-all", item.isPeak ? "bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-400" : "bg-zinc-50 border-zinc-100")}>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">{item.month}</span>
                      <span className="text-lg font-black text-zinc-900 block">{item.hires} Hires</span>
                      <span className="text-[9px] font-bold text-indigo-600 block">{item.percentage}% of total</span>
                      {item.isPeak && <span className="bg-indigo-600 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase block w-fit mx-auto mt-1">Peak Month</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE 3: APPLICATION PLAYBOOK ================= */}
          {seasonalityViewMode === 'timeline' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  quarter: "Q1: Jan – Mar",
                  title: "Early Pipeline & Fiscal Budget Cycle",
                  focus: "Consulting Firms & Corporate Development",
                  action: "Network with alumni, submit applications for mid-year intakes, align resume with quantitative impact metrics.",
                  badgeColor: "bg-blue-50 border-blue-200 text-blue-800"
                },
                {
                  quarter: "Q2: Apr – Jun",
                  title: "Primary Application Window for Summer Cohorts",
                  focus: "Research Institutes, Fellowships & Think Tanks",
                  action: "Submit main fellowship and associate applications. Reach out to alumni for warm referrals 3-4 weeks prior to deadline.",
                  badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-800"
                },
                {
                  quarter: "Q3: Jul – Sep",
                  title: "Onboarding Peak & International Intakes",
                  focus: "International Orgs (World Bank, UNICEF, UN) & NGOs",
                  action: "Main onboarding season for annual cohorts. Prepare for technical interviews, policy briefs, and panel discussions.",
                  badgeColor: "bg-amber-50 border-amber-200 text-amber-800"
                },
                {
                  quarter: "Q4: Oct – Dec",
                  title: "Off-Season Rolling Intake & Mid-Year Prep",
                  focus: "Government Advisory, CSR & Specialized Consultancies",
                  action: "Identify rolling job openings, participate in campus information sessions, prepare portfolio for early Q1 hiring.",
                  badgeColor: "bg-purple-50 border-purple-200 text-purple-800"
                }
              ].map(q => (
                <div key={q.quarter} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("px-3 py-1 rounded-full border text-xs font-black", q.badgeColor)}>
                      {q.quarter}
                    </span>
                    <Calendar className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-zinc-900">{q.title}</h4>
                    <p className="text-xs text-indigo-600 font-bold mt-0.5">Primary Target: {q.focus}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-700 font-medium leading-relaxed">
                    <span className="font-extrabold text-zinc-900 block mb-1 uppercase text-[9px] tracking-wider">Student Playbook Action:</span>
                    {q.action}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
