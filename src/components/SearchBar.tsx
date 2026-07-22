import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { cn, displayBatch } from '../utils/displayUtils';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  batchFilter: string;
  setBatchFilter: (b: string) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (s: boolean) => void;
  batches: Array<string | number>;
  totalResults: number;
}

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  batchFilter,
  setBatchFilter,
  showAdvancedFilters,
  setShowAdvancedFilters,
  batches,
  totalResults
}: SearchBarProps) {
  return (
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
          className={cn(
            "flex items-center gap-2 border rounded-2xl px-4 py-2.5 shadow-sm text-xs font-bold transition-all cursor-pointer",
            showAdvancedFilters 
              ? "bg-zinc-900 border-zinc-900 text-white" 
              : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          )}
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
            {batches.map(year => (
              <option key={String(year)} value={String(year)}>
                {displayBatch(year)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{totalResults} results</p>
      </div>
    </div>
  );
}
