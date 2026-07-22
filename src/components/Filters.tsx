import React from 'react';

interface FilterOptions {
  orgs: string[];
  sectors: string[];
  countries: string[];
  industries: string[];
  currentCompanies: string[];
  currentRoles: string[];
  functions: string[];
}

interface FiltersProps {
  filterCurrentCompany: string;
  setFilterCurrentCompany: (v: string) => void;
  filterCurrentRole: string;
  setFilterCurrentRole: (v: string) => void;
  filterYears: string;
  setFilterYears: (v: string) => void;
  filterExpLevel: string;
  setFilterExpLevel: (v: string) => void;
  filterOrg: string;
  setFilterOrg: (v: string) => void;
  filterSector: string;
  setFilterSector: (v: string) => void;
  filterCountry: string;
  setFilterCountry: (v: string) => void;
  filterFunction: string;
  setFilterFunction: (v: string) => void;
  filterIndustry: string;
  setFilterIndustry: (v: string) => void;
  filterOptions: FilterOptions;
}

export default function Filters({
  filterCurrentCompany,
  setFilterCurrentCompany,
  filterCurrentRole,
  setFilterCurrentRole,
  filterYears,
  setFilterYears,
  filterExpLevel,
  setFilterExpLevel,
  filterOrg,
  setFilterOrg,
  filterSector,
  setFilterSector,
  filterCountry,
  setFilterCountry,
  filterFunction,
  setFilterFunction,
  filterIndustry,
  setFilterIndustry,
  filterOptions
}: FiltersProps) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn" id="advanced-filters-panel">
      {/* Current Employer */}
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

      {/* Current Role */}
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

      {/* Years of Experience */}
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

      {/* Experience Level */}
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

      {/* Past Employer */}
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

      {/* Primary Sector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Primary Sector</label>
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
        >
          <option value="all">Any Sector</option>
          {filterOptions.sectors.map(s => (
            <option key={`sector-${s}`} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Country / Location */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Country / Location</label>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
        >
          <option value="all">Any Location</option>
          {filterOptions.countries.map(c => (
            <option key={`country-${c}`} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Functional Focus */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Functional Focus</label>
        <select
          value={filterFunction}
          onChange={(e) => setFilterFunction(e.target.value)}
          className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
        >
          <option value="all">Any Focus</option>
          {filterOptions.functions.map(f => (
            <option key={`func-${f}`} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Industry / Domain */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Industry / Domain</label>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 shadow-sm"
        >
          <option value="all">Any Industry</option>
          {filterOptions.industries.map(i => (
            <option key={`industry-${i}`} value={i}>{i}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
