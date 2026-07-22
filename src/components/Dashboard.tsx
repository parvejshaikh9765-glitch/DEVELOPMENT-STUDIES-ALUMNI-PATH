import React, { useMemo } from 'react';
import { 
  Users, 
  Building2, 
  MapPin, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import { Alumni } from '../types';
import { formatDisplayLocation } from '../utils/locationUtils';
import { BatchDistributionChart, TopEmployersChart } from './Charts';

interface DashboardProps {
  alumniList: Alumni[];
}

// Sub-Component: KPI Metrics display block
const StatCard = ({ title, value, icon: Icon, subtitle }: { title: string, value: string | number, icon: any, subtitle?: string }) => (
  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
        <Icon className="w-5 h-5 text-zinc-600" />
      </div>
      {subtitle && (
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {subtitle}
        </span>
      )}
    </div>
    <h3 className="text-sm font-semibold text-zinc-500">{title}</h3>
    <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
  </div>
);

export default function Dashboard({ alumniList }: DashboardProps) {
  // Statistics summaries
  const stats = useMemo(() => {
    const companies = alumniList.map(a => a.currentCompany || 'Independent').filter(c => c !== 'N/A' && c !== 'None');
    
    // Top 5 employers
    const topCompanies = Object.entries(
      companies.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {} as Record<string, number>)
    ).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));

    // Batch Distribution (Count per year)
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

    // Dynamic metrics
    const totalAlumni = alumniList.length;
    const activeCompanies = new Set(companies).size;
    const citiesCount = new Set(
      alumniList
        .map(a => formatDisplayLocation(a.location))
        .filter(l => l !== 'Location Not Available')
    ).size || 1;
    const totalRoles = alumniList.reduce((sum, a) => sum + (a.trajectory?.length || 1), 0);
    const avgGrowth = totalAlumni > 0 ? (totalRoles / totalAlumni).toFixed(1) : '0';

    return { 
      topCompanies, 
      batchDistribution,
      totalAlumni,
      activeCompanies,
      citiesCount,
      avgGrowth
    };
  }, [alumniList]);

  return (
    <div className="space-y-8">
      {/* Visual Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Network Overview</h1>
        <p className="text-zinc-500">Aggregated tracking across professional career paths.</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Alumni" 
          value={stats.totalAlumni} 
          icon={Users} 
          subtitle={stats.totalAlumni > 0 ? `${new Set(alumniList.map(a => a.batch)).size} Classes` : undefined} 
        />
        <StatCard 
          title="Active Employers" 
          value={stats.activeCompanies} 
          icon={Building2} 
        />
        <StatCard 
          title="Global Locations" 
          value={`${stats.citiesCount} Cities`} 
          icon={MapPin} 
        />
        <StatCard 
          title="Avg. Trajectory" 
          value={`${stats.avgGrowth} Roles`} 
          icon={TrendingUp} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Batch Distribution Graph */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold">Batch Distribution</h2>
              <p className="text-sm text-zinc-500">Graduates distribution per class year</p>
            </div>
            <Calendar className="w-5 h-5 text-zinc-300" />
          </div>
          <div className="h-[260px] sm:h-[300px] w-full">
            <BatchDistributionChart data={stats.batchDistribution} />
          </div>
        </div>

        {/* Top Companies Listing */}
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold">Top Employers</h2>
              <p className="text-sm text-zinc-500">Most common alumni companies</p>
            </div>
            <Building2 className="w-5 h-5 text-zinc-300" />
          </div>
          <TopEmployersChart data={stats.topCompanies} />
        </div>
      </div>
    </div>
  );
}
