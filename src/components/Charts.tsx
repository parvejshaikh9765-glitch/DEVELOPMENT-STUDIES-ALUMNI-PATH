import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend 
} from 'recharts';
import { motion } from 'motion/react';

// 1. Batch Distribution Area Chart
export function BatchDistributionChart({ data }: { data: Array<{ batch: number; count: number }> }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
        No batch distribution details available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Area type="monotone" dataKey="count" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 2. Top Employers Horizontal Bar Visualizer (using clean CSS)
export function TopEmployersChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400 text-sm font-medium">
        No company distribution details available.
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className="space-y-6">
      {data.map((company, i) => (
        <div key={company.name} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-100">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-zinc-700">{company.name}</span>
              <span className="text-xs font-medium text-zinc-400">{company.count} alumni</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(company.count / maxCount) * 100}%` }}
                className="h-full bg-zinc-950 rounded-full"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Aggregate Industry Alignment Line Chart
export function IndustryAlignmentChart() {
  const lineData = [
    { year: '2018', public_sector: 32, corporate: 10, advocacy: 5 },
    { year: '2020', public_sector: 35, corporate: 18, advocacy: 12 },
    { year: '2022', public_sector: 40, corporate: 25, advocacy: 18 },
    { year: '2024', public_sector: 45, corporate: 32, advocacy: 25 },
    { year: '2026', public_sector: 50, corporate: 42, advocacy: 35 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={lineData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Line type="monotone" dataKey="public_sector" name="Public Sector & Policy" stroke="#18181b" strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="corporate" name="Corporate Advisory" stroke="#71717a" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="advocacy" name="Advocacy & NGOs" stroke="#a1a1aa" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 4. Batch Comparison Radar Chart
export function BatchComparisonRadarChart({ data, batchA, batchB }: { data: any[]; batchA: string; batchB: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
        <Radar name={`Batch ${batchA}`} dataKey="A" stroke="#18181b" fill="#18181b" fillOpacity={0.15} strokeWidth={2} />
        <Radar name={`Batch ${batchB}`} dataKey="B" stroke="#71717a" fill="#71717a" fillOpacity={0.05} strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, color: '#3f3f46' }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
