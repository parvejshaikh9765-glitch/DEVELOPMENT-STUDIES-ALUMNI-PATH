import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  Building2, 
  MapPin, 
  GraduationCap, 
  Linkedin, 
  ChevronRight,
  Search,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alumni } from '../types';
import { displayBatch, isVerifiedLinkedInUrl, formatLinkedInUrl } from '../utils/displayUtils';
import { calculateYearsOfExperience, getExperienceLevel } from '../utils/careerUtils';
import { formatDisplayLocation } from '../utils/locationUtils';
import { dataService } from '../services/dataService';
import SearchBar from './SearchBar';
import Filters from './Filters';

interface AlumniDirectoryProps {
  alumniList: Alumni[];
  onSelectAlumnus: (alumnus: Alumni) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSyncLinkedIn?: (alumnus: Alumni) => Promise<void>;
  syncingAlumnusId?: string | null;
}

// Sub-Component: Deterministic placeholder generator for profile photos
export const AlumniAvatar = ({ name, avatarUrl, linkedinUrl, size = 'md' }: { name: string, avatarUrl?: string, linkedinUrl?: string, size?: 'sm' | 'md' | 'lg' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    let init = '';
    if (parts.length > 0 && parts[0]) init += parts[0][0].toUpperCase();
    if (parts.length > 1 && parts[parts.length - 1]) init += parts[parts.length - 1][0].toUpperCase();
    return init || 'A';
  }, [name]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px] font-bold rounded-full',
    md: 'w-12 h-12 text-sm font-semibold rounded-full',
    lg: 'w-24 h-24 text-2xl font-bold rounded-3xl',
  };

  const borderRoundClass = size === 'lg' ? 'rounded-3xl' : 'rounded-full';

  if (avatarUrl && !imgFailed) {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-zinc-200 flex items-center justify-center bg-zinc-50 shadow-sm ${sizeClasses[size]} ${borderRoundClass}`}>
        <img 
          src={avatarUrl} 
          alt={name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center border shrink-0 font-sans select-none shadow-sm bg-zinc-100 text-zinc-800 border-zinc-200 ${sizeClasses[size]}`}>
      {initials}
    </div>
  );
};

// Sub-Component: Individual Alumni Card with verified profile hyperlinks
export const AlumniCard = ({ 
  alumnus, 
  onClick, 
  onSync, 
  isSyncing = false 
}: { 
  alumnus: Alumni; 
  onClick: () => void; 
  onSync?: (alumnus: Alumni) => void; 
  isSyncing?: boolean; 
}) => {
  const hasLinkedin = isVerifiedLinkedInUrl(alumnus.linkedinUrl);
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
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
            <div className="flex items-center gap-1">
              {hasLinkedin ? (
                <a 
                  href={formatLinkedInUrl(alumnus.linkedinUrl)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-zinc-400 hover:text-[#0077b5] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title={`Open ${alumnus.name}'s Live Profile`}
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              ) : null}
              {hasLinkedin && onSync ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync(alumnus);
                  }}
                  disabled={isSyncing}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isSyncing 
                      ? 'text-indigo-600 bg-indigo-50/50 cursor-not-allowed' 
                      : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title={`Sync ${alumnus.name}'s Profile with LinkedIn`}
                  id={`sync-linkedin-btn-${alumnus.id}`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              ) : null}
            </div>
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
            <span className="truncate">{formatDisplayLocation(alumnus.location)}</span>
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

export default function AlumniDirectory({
  alumniList,
  onSelectAlumnus,
  triggerToast,
  onSyncLinkedIn,
  syncingAlumnusId
}: AlumniDirectoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Track searches in directory with a debounced logger
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const handler = setTimeout(() => {
      const savedUserStr = sessionStorage.getItem('platform_current_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          dataService.platformLogActivity(
            u.sessionId,
            u.username,
            u.role,
            'SEARCH_QUERY',
            '/directory',
            `Searched Directory for: "${searchQuery}"`
          );
        } catch (e) {
          console.error(e);
        }
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Advanced filters state variables
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterFunction, setFilterFunction] = useState('all');
  const [filterExpLevel, setFilterExpLevel] = useState('all');
  const [filterYears, setFilterYears] = useState('all');
  const [filterCurrentCompany, setFilterCurrentCompany] = useState('all');
  const [filterCurrentRole, setFilterCurrentRole] = useState('all');

  const ITEMS_PER_PAGE = 12;

  // Filter options derived organically
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
      
      if (a.trajectory) {
        a.trajectory.forEach(t => {
          if (t.company) orgs.add(t.company.trim());
          if (t.sector) sectors.add(t.sector.trim());
          if (t.country) countries.add(t.country.trim());
          if (t.industry) industries.add(t.industry.trim());
        });
      }
    });

    return {
      orgs: Array.from(orgs).filter(Boolean).sort(),
      sectors: Array.from(sectors).filter(Boolean).sort(),
      countries: Array.from(countries).filter(Boolean).sort(),
      industries: Array.from(industries).filter(Boolean).sort(),
      currentCompanies: Array.from(currentCompanies).filter(Boolean).sort(),
      currentRoles: Array.from(currentRoles).filter(Boolean).sort(),
      functions: ['Program Management', 'Project Management', 'Research', 'Policy', 'Consulting', 'Operations', 'Strategy', 'Fundraising', 'Technology']
    };
  }, [alumniList]);

  // Unique list of batches
  const batches = useMemo(() => {
    return Array.from(new Set(alumniList.map(a => a.batch)))
      .sort((a, b) => {
        const numA = parseInt(String(a).match(/\d+/)?.at(0) || "0");
        const numB = parseInt(String(b).match(/\d+/)?.at(0) || "0");
        return numB - numA;
      });
  }, [alumniList]);

  // Comprehensive multi-term fuzzy filter matching Name, current role, location, etc.
  const filteredAlumni = useMemo(() => {
    let list = alumniList;

    if (batchFilter !== 'all') {
      list = list.filter(a => String(a.batch) === String(batchFilter));
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      list = list.filter(a => 
        a.name.toLowerCase().includes(term) ||
        (a.currentRole || '').toLowerCase().includes(term) ||
        (a.currentCompany || '').toLowerCase().includes(term) ||
        (a.location || '').toLowerCase().includes(term) ||
        (a.skills || []).some(s => s.toLowerCase().includes(term))
      );
    }

    // Advanced column matching
    if (filterCurrentCompany !== 'all') {
      list = list.filter(a => a.currentCompany?.toLowerCase() === filterCurrentCompany.toLowerCase());
    }
    if (filterCurrentRole !== 'all') {
      list = list.filter(a => a.currentRole?.toLowerCase() === filterCurrentRole.toLowerCase());
    }
    if (filterExpLevel !== 'all') {
      list = list.filter(a => getExperienceLevel(a).toLowerCase() === filterExpLevel.toLowerCase());
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

    return list;
  }, [
    alumniList, 
    searchQuery, 
    batchFilter, 
    filterCurrentCompany, 
    filterCurrentRole, 
    filterExpLevel, 
    filterYears
  ]);

  // Reset page pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, batchFilter, filterCurrentCompany, filterCurrentRole, filterExpLevel, filterYears]);

  const totalPages = Math.ceil(filteredAlumni.length / ITEMS_PER_PAGE);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlumni.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlumni, currentPage]);

  return (
    <div className="space-y-6">
      <SearchBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        batchFilter={batchFilter}
        setBatchFilter={setBatchFilter}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        batches={batches}
        totalResults={filteredAlumni.length}
      />

      <AnimatePresence>
        {showAdvancedFilters && (
          <Filters 
            filterCurrentCompany={filterCurrentCompany}
            setFilterCurrentCompany={setFilterCurrentCompany}
            filterCurrentRole={filterCurrentRole}
            setFilterCurrentRole={setFilterCurrentRole}
            filterYears={filterYears}
            setFilterYears={setFilterYears}
            filterExpLevel={filterExpLevel}
            setFilterExpLevel={setFilterExpLevel}
            filterOrg={filterOrg}
            setFilterOrg={setFilterOrg}
            filterSector={filterSector}
            setFilterSector={setFilterSector}
            filterCountry={filterCountry}
            setFilterCountry={setFilterCountry}
            filterFunction={filterFunction}
            setFilterFunction={setFilterFunction}
            filterIndustry={filterIndustry}
            setFilterIndustry={setFilterIndustry}
            filterOptions={filterOptions}
          />
        )}
      </AnimatePresence>

      {/* Directory Grid */}
      {paginatedList.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedList.map(a => (
              <AlumniCard 
                key={a.id} 
                alumnus={a} 
                onClick={() => onSelectAlumnus(a)} 
                onSync={onSyncLinkedIn}
                isSyncing={syncingAlumnusId === a.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-100">
              <p className="text-xs text-zinc-500 font-medium">
                Showing <span className="font-bold text-zinc-800">{Math.min(filteredAlumni.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
                <span className="font-bold text-zinc-800">{Math.min(filteredAlumni.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
                <span className="font-bold text-zinc-800">{filteredAlumni.length}</span> alumni
              </p>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 bg-white hover:bg-zinc-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-zinc-950 text-white shadow-sm font-bold"
                        : "border border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

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
          <p className="text-sm font-bold text-zinc-800">No matching alumni found</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">Try checking spellings or adjusting filters. Fuzzy matching checks Name, current Organization, Designation, and Location.</p>
        </div>
      )}
    </div>
  );
}
