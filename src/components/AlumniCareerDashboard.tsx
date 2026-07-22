import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Building2, 
  Calendar, 
  MapPin, 
  GraduationCap, 
  Globe, 
  Award, 
  TrendingUp, 
  Sparkles, 
  BarChart2, 
  CheckCircle2, 
  ChevronRight, 
  Milestone, 
  Compass, 
  Map,
  Clock,
  BriefcaseIcon,
  Shield,
  Layers,
  ArrowRight,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Alumni, CareerStep } from '../types';
import { enrichTrajectory, getCareerStatistics, getExperienceLevel, analyzeTrajectoryQuality } from '../utils/careerUtils';

interface AlumniCareerDashboardProps {
  alumnus: Alumni;
  analysis: string | null;
  isAnalyzing: boolean;
}

export default function AlumniCareerDashboard({ alumnus, analysis, isAnalyzing }: AlumniCareerDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'stats' | 'sectors' | 'geography'>('timeline');

  // Get data quality warnings
  const qualityWarnings = useMemo(() => {
    return analyzeTrajectoryQuality(alumnus);
  }, [alumnus]);

  const criticalIssues = useMemo(() => {
    return qualityWarnings.filter(w => w.type === 'error' || w.type === 'warning');
  }, [qualityWarnings]);

  // 1. Get enriched career data
  const enrichedSteps = useMemo(() => {
    return enrichTrajectory(alumnus.trajectory || []);
  }, [alumnus.trajectory]);

  // 2. Get statistics
  const stats = useMemo(() => {
    return getCareerStatistics(alumnus);
  }, [alumnus]);

  // 3. Experience level
  const experienceLevel = useMemo(() => {
    return getExperienceLevel(alumnus);
  }, [alumnus]);

  // 4. Organization Types Analysis
  const orgTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedSteps.forEach(step => {
      const type = step.orgType || 'Corporate';
      counts[type] = (counts[type] || 0) + 1;
    });

    const total = enrichedSteps.length || 1;
    const data = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: parseFloat(((value / total) * 100).toFixed(1))
    }));

    // Sort descending
    data.sort((a, b) => b.value - a.value);

    const mostCommon = data[0]?.name || 'Corporate';

    // Transition path
    const transitionPath = enrichedSteps.map(step => step.orgType || 'Corporate');

    return {
      distribution: data,
      mostCommon,
      transitionPath
    };
  }, [enrichedSteps]);

  // 5. Sector Distribution & Expertise
  const sectorData = useMemo(() => {
    const yearsBySector: Record<string, number> = {};
    enrichedSteps.forEach(step => {
      const sec = step.sector || 'Social Impact';
      const s = parseInt(step.startDate);
      const e = step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate);
      const tenure = !isNaN(s) && !isNaN(e) ? Math.max(1, e - s) : 1;
      yearsBySector[sec] = (yearsBySector[sec] || 0) + tenure;
    });

    const data = Object.entries(yearsBySector).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const primarySector = data[0]?.name || 'Social Impact';
    const emergingSector = data.length > 1 ? data[1]?.name : 'None';

    return {
      distribution: data,
      primarySector,
      emergingSector
    };
  }, [enrichedSteps]);

  // 6. Geographic Distribution
  const geoData = useMemo(() => {
    const countries = enrichedSteps.map(step => step.country).filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries));
    const isInternational = uniqueCountries.some(c => c.toLowerCase() !== 'india');

    // Counts per country
    const countryCounts: Record<string, number> = {};
    enrichedSteps.forEach(step => {
      const c = step.country || 'India';
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });

    const countryWiseList = Object.entries(countryCounts).map(([name, count]) => ({
      name,
      count
    }));

    const domesticCount = enrichedSteps.filter(step => (step.country || '').toLowerCase() === 'india').length;
    const internationalCount = enrichedSteps.filter(step => (step.country || '').toLowerCase() !== 'india' && step.country).length;
    const totalSteps = enrichedSteps.length || 1;

    const domesticPercent = parseFloat(((domesticCount / totalSteps) * 100).toFixed(0));
    const internationalPercent = parseFloat(((internationalCount / totalSteps) * 100).toFixed(0));

    return {
      uniqueCountries,
      isInternational,
      countryWiseList,
      domesticPercent,
      internationalPercent,
      internationalCount
    };
  }, [enrichedSteps]);

  // 7. Functional Role Analysis
  const functionalData = useMemo(() => {
    const functionPool = [
      'Program Management', 'Project Management', 'Research', 'Policy',
      'Consulting', 'Operations', 'Strategy', 'Monitoring & Evaluation',
      'Communications', 'Fundraising', 'HR', 'Finance', 'Data Analysis',
      'GIS', 'Technology', 'Advocacy', 'Partnerships'
    ];

    const funcCounts: Record<string, number> = {};
    enrichedSteps.forEach(step => {
      const role = (step.role || '').toLowerCase();
      const company = (step.company || '').toLowerCase();
      
      // Look for function matches in role name
      let matched = false;
      functionPool.forEach(func => {
        const words = func.toLowerCase().split(' ');
        const matchesAll = words.every(word => role.includes(word) || company.includes(word));
        if (matchesAll) {
          funcCounts[func] = (funcCounts[func] || 0) + 1;
          matched = true;
        }
      });

      // Default if no specific match
      if (!matched) {
        if (role.includes('manager')) {
          funcCounts['Project Management'] = (funcCounts['Project Management'] || 0) + 1;
        } else if (role.includes('analyst') || role.includes('officer')) {
          funcCounts['Research'] = (funcCounts['Research'] || 0) + 1;
        } else {
          funcCounts['Operations'] = (funcCounts['Operations'] || 0) + 1;
        }
      }
    });

    const list = Object.entries(funcCounts).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const primary = list[0]?.name || 'Operations';
    const secondary = list.slice(1, 3).map(l => l.name);

    // Transition path
    const transitionList = enrichedSteps.map(step => {
      const role = (step.role || '').toLowerCase();
      let stepFunc = 'Operations';
      for (const func of functionPool) {
        const words = func.toLowerCase().split(' ');
        if (words.every(word => role.includes(word))) {
          stepFunc = func;
          break;
        }
      }
      return stepFunc;
    });

    return {
      primary,
      secondary,
      transitionPath: transitionList
    };
  }, [enrichedSteps]);

  // 8. Recharts colors
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-10" id="alumni-career-intelligence-dashboard">
      {/* Visual Sub Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200/80 pb-3 overflow-x-auto max-w-full scrollbar-none snap-x" id="career-intelligence-tabs">
        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap ${
            activeSubTab === 'timeline'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
          id="tab-career-timeline"
        >
          <Milestone className="w-3.5 h-3.5" /> Career Timeline & Skills
        </button>
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap ${
            activeSubTab === 'stats'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
          id="tab-statistics"
        >
          <BarChart2 className="w-3.5 h-3.5" /> Statistics & Org Trends
        </button>
        <button
          onClick={() => setActiveSubTab('sectors')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap ${
            activeSubTab === 'sectors'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
          id="tab-sectors"
        >
          <Compass className="w-3.5 h-3.5" /> Sector & Functional Analysis
        </button>
        <button
          onClick={() => setActiveSubTab('geography')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap ${
            activeSubTab === 'geography'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
          id="tab-geography"
        >
          <Globe className="w-3.5 h-3.5" /> Geographic Footprint
        </button>
      </div>

      {/* Subtab Contents */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-10 animate-fadeIn" id="content-timeline-section">
          
          {/* Data Quality & Trajectory Reconciliation Intelligence Hub */}
          <div className="bg-zinc-55 border border-zinc-200/80 rounded-2xl p-5 space-y-4 shadow-sm" id="trajectory-reconciliation-hub">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-950 uppercase tracking-wider">Trajectory Integrity & Reconciliation Hub</h4>
                  <p className="text-[10px] font-medium text-zinc-400">Scanned and cross-referenced from spreadsheet sources and timelines</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                {criticalIssues.length > 0 ? (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" /> {criticalIssues.length} Quality Alerts
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Perfect Integrity
                  </span>
                )}
              </div>
            </div>

            {/* Inconsistency cards list */}
            {qualityWarnings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {qualityWarnings.map((w, wIdx) => {
                  const typeStyles = {
                    error: 'border-red-100 bg-red-50/30 text-red-900',
                    warning: 'border-amber-200 bg-amber-50/20 text-amber-900',
                    info: 'border-indigo-100 bg-indigo-50/25 text-indigo-900',
                    success: 'border-emerald-150 bg-emerald-50/30 text-emerald-900',
                  };
                  const bulletBadge = {
                    error: '🔴 Error',
                    warning: '⚠️ Warning',
                    info: '💡 Inferred',
                    success: '🟢 OK',
                  };
                  return (
                    <div key={`quality-alert-${wIdx}`} className={`p-3.5 rounded-xl border flex gap-3 text-xs leading-normal transition-all hover:border-zinc-300 ${typeStyles[w.type]}`}>
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-[9px] uppercase tracking-wider">{bulletBadge[w.type]}</span>
                          <span className="text-[9px] font-bold text-zinc-400 capitalize">{w.field} check</span>
                        </div>
                        <p className="font-black text-zinc-950 text-xs">{w.message}</p>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{w.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-150 text-[10px] text-zinc-500 leading-relaxed font-medium">
              <span className="font-bold text-zinc-700">💡 Platform Resolution Logic:</span> Missing city/countries are normalized, tenure durations are computed chronologically, and sectors/industries are auto-assigned using key phrase analysis from designations.
            </div>
          </div>

          {/* Enhanced Chronological Timeline */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Milestone className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-base font-bold text-zinc-900">Career Trajectory Milestones</h4>
              </div>
              <span className="text-[10px] bg-zinc-100 font-bold text-zinc-500 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {enrichedSteps.length} milestones found
              </span>
            </div>

            {/* Timelines list */}
            <div className="relative border-l border-zinc-200/80 ml-4 pl-8 space-y-10">
              {enrichedSteps.map((step, idx) => {
                const isPromotion = idx > 0 && enrichedSteps[idx - 1].company.toLowerCase().trim() === step.company.toLowerCase().trim();
                return (
                  <div key={step.id || `step-enriched-${idx}`} className="relative group">
                    {/* Circle Node */}
                    <div className={`absolute -left-[41px] mt-1.5 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm transition-all group-hover:scale-110 ${
                      isPromotion 
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-50' 
                        : 'bg-zinc-900 text-white'
                    }`}>
                      {isPromotion ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <Briefcase className="w-2.5 h-2.5" />
                      )}
                    </div>

                    <div className="bg-white border border-zinc-100 hover:border-zinc-300 rounded-2xl p-5 hover:shadow-md transition-all space-y-4">
                      {/* Job header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-bold text-zinc-900 text-sm group-hover:text-zinc-700 transition-colors">{step.role}</h5>
                            {isPromotion && (
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Promotion Milestone
                              </span>
                            )}
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {step.employmentType}
                            </span>
                          </div>
                          
                          <p className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400" /> {step.company} 
                            <span className="text-zinc-300">•</span> 
                            <span className="text-[11px] font-semibold text-zinc-500">{step.orgType}</span>
                          </p>
                        </div>

                        <div className="flex flex-col items-end text-right">
                          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-400" /> {step.startDate} — {step.endDate}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 mt-0.5">
                            {step.duration}
                          </span>
                        </div>
                      </div>

                      {/* Geographic, Sector, and Industry Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-b border-zinc-100/80 py-3.5 text-[11px] text-zinc-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">Location: <strong className="text-zinc-800">{step.city}, {step.country}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">Sector: <strong className="text-zinc-800">{step.sector}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">Industry: <strong className="text-zinc-800">{step.industry}</strong></span>
                        </div>
                      </div>

                      {/* Description / Responsibilities */}
                      {step.description && (
                        <div className="space-y-1.5 bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-100/60 text-xs text-zinc-600 leading-relaxed font-medium">
                          <p className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-zinc-400" /> Key Responsibilities & Highlights
                          </p>
                          <p className="italic">"{step.description}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Evolution Timeline */}
          <div className="bg-zinc-50/60 border border-zinc-150 rounded-2xl p-6 space-y-6" id="skills-evolution-section">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Skills Evolution Timeline</h4>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Visualization of core expertise application and tools accumulated at each progressive timeline milestone:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {enrichedSteps.map((step, idx) => (
                <div key={`skill-evol-${idx}`} className="bg-white border border-zinc-200/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase">
                      <span>Milestone {idx + 1}</span>
                      <span>{step.startDate}</span>
                    </div>
                    <h5 className="font-bold text-zinc-900 text-xs truncate">{step.role}</h5>
                    <p className="text-[10px] text-zinc-500 font-medium truncate">{step.company}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {alumnus.skills && alumnus.skills.slice(0, 4 + idx).map((skill, sIdx) => (
                      <span key={`skill-node-${idx}-${sIdx}`} className="text-[9px] font-bold bg-zinc-50 border border-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'stats' && (
        <div className="space-y-10 animate-fadeIn" id="content-stats-section">
          {/* Career Statistics Dashboard Grid */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Career Statistics Dashboard</h4>
            </div>

            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Experience</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.totalYears}</span>
                  <span className="text-xs font-bold text-zinc-500">years</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-300" /> Total tenure span
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Organizations</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.numOrgs}</span>
                  <span className="text-xs font-bold text-zinc-500">employers</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-zinc-300" /> Unique companies
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Promotions</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.numPromotions}</span>
                  <span className="text-xs font-bold text-zinc-500">milestones</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> In-company growth
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Average Tenure</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.avgTenure}</span>
                  <span className="text-xs font-bold text-zinc-500">years</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-300" /> Mean stay duration
                </p>
              </div>

              {/* Card 5 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Internships</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.numInternships}</span>
                  <span className="text-xs font-bold text-zinc-500">roles</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Foundational stays</p>
              </div>

              {/* Card 6 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Full-Time Roles</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-zinc-900">{stats.numFullTime}</span>
                  <span className="text-xs font-bold text-zinc-500">roles</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Core active tenures</p>
              </div>

              {/* Card 7 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Tenure Extreme</p>
                <div className="mt-2.5 flex flex-col">
                  <span className="text-xs font-bold text-zinc-800">Longest: {stats.longestTenure}y</span>
                  <span className="text-xs font-bold text-zinc-400">Shortest: {stats.shortestTenure}y</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">Milestone retention</p>
              </div>

              {/* Card 8 */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4.5 hover:shadow-sm transition-all flex flex-col justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Current Country</p>
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-zinc-900 truncate">{stats.currentCountry}</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-zinc-300" /> Geographic anchor
                </p>
              </div>
            </div>

            {/* Sub Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-4 text-xs font-medium space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Current Employer</span>
                <span className="font-bold text-zinc-800">{stats.currentOrg}</span>
              </div>
              <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-4 text-xs font-medium space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Current Position</span>
                <span className="font-bold text-zinc-800">{stats.currentPosition}</span>
              </div>
            </div>
          </div>

          {/* Organization Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8" id="org-trends-subgrid">
            {/* Visual Chart Pane */}
            <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900">Organization Type Distribution</h4>
                <p className="text-xs text-zinc-500 font-medium">Categorization of employers across milestones:</p>
              </div>

              <div className="h-60" id="org-type-distribution-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orgTypeData.distribution} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#52525b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(244, 244, 245, 0.6)' }} contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#4f46e5" radius={6} barSize={14}>
                      {orgTypeData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Insights Pane */}
            <div className="lg:col-span-2 bg-zinc-50/60 border border-zinc-150 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">Organization Intelligence</h4>
                  <p className="text-xs text-zinc-500 font-medium font-mono">Statistical footprint</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Most Common Type</span>
                      <strong className="text-sm text-zinc-800">{orgTypeData.mostCommon}</strong>
                    </div>
                    <span className="text-xs font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">
                      {orgTypeData.distribution[0]?.percentage || 0}%
                    </span>
                  </div>

                  {/* Career movement between organization types */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Organization Transition Flow</span>
                    <div className="flex flex-wrap items-center gap-1.5 p-3.5 bg-white border border-zinc-200/60 rounded-xl">
                      {orgTypeData.transitionPath.map((type, idx) => (
                        <React.Fragment key={`path-${idx}`}>
                          <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md">
                            {type}
                          </span>
                          {idx < orgTypeData.transitionPath.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-zinc-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-semibold mt-4 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Re-evaluated in real time based on active records
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'sectors' && (
        <div className="space-y-10 animate-fadeIn" id="content-sectors-section">
          {/* Sector distribution & statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Sector distribution bar chart */}
            <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900">Experience by Sector (Tenure Years)</h4>
                <p className="text-xs text-zinc-500 font-medium">Accumulated years spent in each industry vertical:</p>
              </div>

              <div className="h-60" id="sector-distribution-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData.distribution} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#52525b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#10b981" radius={6} barSize={14}>
                      {sectorData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expertise Insights panel */}
            <div className="lg:col-span-2 bg-zinc-50/60 border border-zinc-150 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">Expertise Analysis</h4>
                  <p className="text-xs text-zinc-500 font-medium font-mono">Strategic specialization index</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Primary Sector of Expertise</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-zinc-800">{sectorData.primarySector}</strong>
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Core Anchor
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Emerging Specialization</span>
                    <strong className="text-sm text-zinc-800">{sectorData.emergingSector}</strong>
                  </div>

                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Primary Function Indicator</span>
                    <strong className="text-sm text-zinc-800">{functionalData.primary}</strong>
                  </div>
                </div>
              </div>

              {/* Transition flow of functions */}
              <div className="space-y-2 mt-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Function Transition Over Time</span>
                <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white border border-zinc-200/60 rounded-xl">
                  {functionalData.transitionPath.map((func, idx) => (
                    <React.Fragment key={`func-path-${idx}`}>
                      <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {func}
                      </span>
                      {idx < functionalData.transitionPath.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'geography' && (
        <div className="space-y-10 animate-fadeIn" id="content-geography-section">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Geo list and experience metric */}
            <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900">Geographic Footprint Registry</h4>
                <p className="text-xs text-zinc-500 font-medium">Recorded countries of operation across career timeline:</p>
              </div>

              {/* Country list with visual cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {geoData.countryWiseList.map((country, idx) => (
                  <div key={`geo-wise-${idx}`} className="bg-zinc-50/60 border border-zinc-200/60 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-extrabold uppercase">
                        {country.name.slice(0, 2)}
                      </div>
                      <div>
                        <strong className="text-xs text-zinc-800 block">{country.name}</strong>
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase">{country.name === stats.currentCountry ? 'Current Residence' : 'Prior Stature'}</span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-zinc-500">
                      {country.count} active {country.count > 1 ? 'roles' : 'role'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Domestic vs International Experience analysis */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Domestic vs International Distribution</span>
                <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden flex">
                  <div 
                    style={{ width: `${geoData.domesticPercent}%` }} 
                    className="bg-zinc-900 h-full flex items-center justify-center text-[9px] font-bold text-white transition-all"
                    title={`Domestic: ${geoData.domesticPercent}%`}
                  >
                    {geoData.domesticPercent > 15 && `Domestic: ${geoData.domesticPercent}%`}
                  </div>
                  <div 
                    style={{ width: `${geoData.internationalPercent}%` }} 
                    className="bg-indigo-500 h-full flex items-center justify-center text-[9px] font-bold text-white transition-all"
                    title={`International: ${geoData.internationalPercent}%`}
                  >
                    {geoData.internationalPercent > 15 && `International: ${geoData.internationalPercent}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Map metadata dashboard panel */}
            <div className="lg:col-span-2 bg-zinc-50/60 border border-zinc-150 rounded-2xl p-6 flex flex-col justify-between" id="country-map-visualizer">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-900">Geographic Intelligence</h4>
                  <p className="text-xs text-zinc-500 font-medium font-mono">Internationality Index</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Countries</span>
                      <strong className="text-lg text-zinc-800">{geoData.uniqueCountries.length}</strong>
                    </div>
                    <Globe className="w-8 h-8 text-zinc-200" />
                  </div>

                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">International Exposure Rating</span>
                    <strong className="text-sm text-zinc-800">
                      {geoData.uniqueCountries.length > 2 
                        ? 'High Global Footprint' 
                        : (geoData.isInternational ? 'Moderate International Stature' : 'Primarily Domestic Focus')}
                    </strong>
                  </div>

                  <div className="bg-white border border-zinc-200/60 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Prior Experience Scope</span>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                      This alumnus has operational footprint spanning across <strong className="text-zinc-800">{geoData.uniqueCountries.join(', ')}</strong> with a key focus on the {stats.currentCountry} market.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-semibold mt-4 flex items-center gap-1.5">
                <Map className="w-4 h-4" /> Comprehensive geographic audit compiled
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
