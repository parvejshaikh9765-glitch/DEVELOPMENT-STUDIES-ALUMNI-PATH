import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Activity, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  Calendar, 
  X, 
  Lock, 
  Unlock, 
  Smartphone, 
  Cpu, 
  Chrome,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Key,
  Database,
  Wrench,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { dataService } from '../services/dataService';

interface SuperAdminConsoleProps {
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SuperAdminConsole({ triggerToast }: SuperAdminConsoleProps) {
  // Navigation tabs: 'analytics' | 'credentials' | 'performance'
  const [activeTab, setActiveTab] = useState<'analytics' | 'credentials' | 'performance'>('analytics');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Credentials Management State
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [forceFirstChange, setForceFirstChange] = useState<boolean>(true);
  const [submittingReset, setSubmittingReset] = useState<boolean>(false);

  // Performance Tuning State
  const [tuningInProg, setTuningInProg] = useState<boolean>(false);
  const [tuningResult, setTuningResult] = useState<any | null>(null);

  const loadAllAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await dataService.getSuperAdminDashboard();
      setMetrics(data.metrics);
      setCharts(data.charts);
      setSessionHistory(data.sessionHistory);
      
      // Load initial audit logs
      const logs = await dataService.getActivityLogs();
      setAuditLogs(logs);

      if (isRefresh) {
        triggerToast("Super Admin metrics refreshed successfully.", "success");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to load administrative analytics data.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlatformUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await dataService.getPlatformUsers();
      setPlatformUsers(users);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to retrieve platform users list.", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFilterLogs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoadingLogs(true);
    try {
      const logs = await dataService.getActivityLogs(filterUser, filterAction, filterDate, searchQuery);
      setAuditLogs(logs);
      triggerToast(`Found ${logs.length} matching audit entries.`, "info");
    } catch (err) {
      triggerToast("Failed to filter audit logs.", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleResetFilters = async () => {
    setFilterUser('');
    setFilterAction('');
    setFilterDate('');
    setSearchQuery('');
    setLoadingLogs(true);
    try {
      const logs = await dataService.getActivityLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleUnlockUser = async (username: string) => {
    try {
      const res = await dataService.unlockUserAccount(username);
      if (res.success) {
        triggerToast(res.message || `Unlocked user account: ${username}`, "success");
        loadPlatformUsers(); // refresh table
      } else {
        triggerToast(res.error || "Unlock operation failed.", "error");
      }
    } catch (err) {
      triggerToast("Failed to unlock user account.", "error");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) return;
    setSubmittingReset(true);
    try {
      const res = await dataService.resetUserPassword(resetUser.username, newPassword.trim(), forceFirstChange);
      if (res.success) {
        triggerToast(res.message || `Password reset successful for ${resetUser.username}`, "success");
        setResetUser(null);
        setNewPassword('');
        loadPlatformUsers(); // refresh
      } else {
        triggerToast(res.error || "Reset password failed.", "error");
      }
    } catch (err) {
      triggerToast("Failed to reset user password.", "error");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleRegulatePerformance = async () => {
    setTuningInProg(true);
    setTuningResult(null);
    try {
      const res = await dataService.regulatePerformance();
      if (res.success) {
        setTuningResult(res.details);
        triggerToast(res.message || "Database optimized successfully.", "success");
        loadAllAnalytics(); // refresh analytics numbers
      } else {
        triggerToast(res.error || "Tuning operation failed.", "error");
      }
    } catch (err) {
      triggerToast("Error executing database optimizations.", "error");
    } finally {
      setTuningInProg(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'credentials') {
      loadPlatformUsers();
    }
  }, [activeTab]);

  const formatDuration = (sec: number) => {
    if (!sec) return '0s';
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  const exportLogsAsCSV = () => {
    if (!auditLogs.length) return;
    const headers = ['ID', 'Session ID', 'Username', 'Role', 'Timestamp', 'IP Address', 'Browser', 'Device', 'OS', 'Action', 'Page URL', 'Details'];
    const rows = auditLogs.map(log => [
      log.id,
      log.session_id,
      log.username,
      log.role,
      log.timestamp,
      log.ip_address,
      log.browser,
      log.device_type,
      log.os,
      log.action,
      log.page_url,
      log.details?.replace(/,/g, ';') // replace commas to prevent CSV breakage
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AlumniPlatform_AuditLogs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Audit logs exported to CSV successfully.", "success");
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Super Admin Panel...</p>
      </div>
    );
  }

  const actionsList = ['LOGIN', 'LOGOUT', 'VISIT_PAGE', 'SEARCH_QUERY', 'VIEW_PROFILE', 'APPLY_FILTER', 'VIEW_CHART', 'USE_AI_TOOL', 'DOWNLOAD_REPORT', 'FILE_DOWNLOAD', 'FAILED_LOGIN_ATTEMPT', 'WIPE_DATABASE', 'APPROVE_SUGGESTION', 'REJECT_SUGGESTION', 'UPDATE_PROFILE', 'PASSWORD_RESET_BY_ADMIN', 'UNLOCK_USER_BY_ADMIN', 'REGULATE_PERFORMANCE'];

  // Filter users
  const filteredUsers = platformUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter ? user.role === userRoleFilter : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 animate-fadeIn" id="superadmin-console-root">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
            <Shield className="w-3.5 h-3.5" />
            Security & Administration Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mt-1">Super Admin Dashboard</h1>
          <p className="text-zinc-500 font-medium text-sm mt-0.5">Securely audit user activity records, manage platform credentials, regulate database performance, and maintain privacy controls.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'credentials') loadPlatformUsers();
              else loadAllAnalytics(true);
            }}
            disabled={refreshing || loadingUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loadingUsers ? 'animate-spin' : ''}`} />
            {refreshing || loadingUsers ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* HORIZONTAL TAB NAVIGATION */}
      <div className="flex border-b border-zinc-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-zinc-900 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Activity className="w-4 h-4" />
          📊 Activity Analytics & Auditing
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'credentials'
              ? 'border-zinc-900 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Key className="w-4 h-4" />
          🔑 User Credentials & Control Panel
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'performance'
              ? 'border-zinc-900 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Database className="w-4 h-4" />
          ⚙️ Performance & DB Regulation
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ACTIVITY ANALYTICS & AUDITING                      */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Metrics Row */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Registered Users</span>
                  <span className="text-2xl font-black text-zinc-950 block">{metrics.totalUsers}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Students, Faculty & Admins</span>
                </div>
                <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Active (Last 24h)</span>
                  <span className="text-2xl font-black text-emerald-600 block">{metrics.activeUsers24h}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Distinct session log-ins</span>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Login Frequency</span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xl font-black text-zinc-950">{metrics.dailyLogins}d</span>
                    <span className="text-sm font-bold text-zinc-400">/</span>
                    <span className="text-sm font-bold text-zinc-600">{metrics.weeklyLogins}w</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Daily & weekly active count</span>
                </div>
                <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Avg Session Time</span>
                  <span className="text-2xl font-black text-zinc-950 block">{formatDuration(metrics.avgDurationSec)}</span>
                  {metrics.failedLogins > 0 ? (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {metrics.failedLogins} Failed attempts blocked
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold">All sessions authentic</span>
                  )}
                </div>
                <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Analytics Charts Grid */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Login Activity Trends */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4 text-zinc-400" />
                    Login Activity Trend
                  </h3>
                  <p className="text-xs text-zinc-400">Daily system logins tracked over the last 14 days.</p>
                </div>
                <div className="h-64">
                  {charts.loginTrends && charts.loginTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={charts.loginTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #f4f4f5' }} />
                        <Line type="monotone" dataKey="count" stroke="#18181b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      No log-in history recorded yet
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Peak Hourly Usage */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    Peak Usage Hours
                  </h3>
                  <p className="text-xs text-zinc-400">Logins count grouped hourly (00:00 to 23:00) to understand user engagement.</p>
                </div>
                <div className="h-64">
                  {charts.peakHours && charts.peakHours.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.peakHours}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(hour) => `${String(hour).padStart(2, '0')}:00`} />
                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #f4f4f5' }} labelFormatter={(hour) => `${String(hour).padStart(2, '0')}:00`} />
                        <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      Gathering active hours statistics...
                    </div>
                  )}
                </div>
              </div>

              {/* Table: Most Visited Pages & Top Searches */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Top Pages Visited</h3>
                  <p className="text-xs text-zinc-400">Platform pages with highest view count.</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {charts.topPages && charts.topPages.length > 0 ? (
                    charts.topPages.map((page: any, idx: number) => (
                      <div key={`page-${idx}`} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-zinc-400 bg-white w-6 h-6 rounded-lg flex items-center justify-center border border-zinc-100">{idx + 1}</span>
                          <span className="text-xs font-bold text-zinc-700">{page.page}</span>
                        </div>
                        <span className="text-xs font-extrabold text-zinc-950 bg-white px-2.5 py-1 rounded-full border border-zinc-100">{page.count} views</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400 text-center py-8">No page visits recorded.</div>
                  )}
                </div>
              </div>

              {/* Table: Most Active Users */}
              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Most Active Users</h3>
                  <p className="text-xs text-zinc-400">Top students & administrators by engagement and duration.</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {charts.activeUsersList && charts.activeUsersList.length > 0 ? (
                    charts.activeUsersList.map((user: any, idx: number) => (
                      <div key={`user-${idx}`} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-zinc-400">{idx + 1}</span>
                            <span className="text-xs font-extrabold text-zinc-950">{user.username}</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded uppercase">{user.role}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Spent {formatDuration(user.total_duration)} over {user.sessions_count} logins</p>
                        </div>
                        <span className="text-xs font-black text-zinc-950 bg-zinc-100 px-3 py-1.5 rounded-xl">{user.sessions_count} sessions</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400 text-center py-8">No user records loaded.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Filter Form and Table */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-50 pb-4">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-zinc-500" />
                  Detailed Action Audit Logs
                </h2>
                <p className="text-xs text-zinc-400">Filter, search, and verify granular user events and navigation trajectories.</p>
              </div>
              
              <button
                onClick={exportLogsAsCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Audit to CSV
              </button>
            </div>

            {/* Filter Bar */}
            <form onSubmit={handleFilterLogs} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Username / Roll No</label>
                <input 
                  type="text" 
                  placeholder="e.g. M2025DS001" 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Action Type</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs font-semibold cursor-pointer"
                >
                  <option value="">All Activities</option>
                  {actionsList.map(action => (
                    <option key={`opt-${action}`} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Date Selection</label>
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs font-semibold cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Keyword Search</label>
                <input 
                  type="text" 
                  placeholder="IP, page, or details..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 items-end pt-4.5 sm:pt-0">
                <button
                  type="submit"
                  disabled={loadingLogs}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  {loadingLogs ? 'Applying...' : 'Apply Filters'}
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto border border-zinc-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-4 py-3">Roll Number / User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action performed</th>
                    <th className="px-4 py-3">Target View / URL</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Device / Browser</th>
                    <th className="px-4 py-3 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => {
                      const isFailedAttempt = log.action === 'FAILED_LOGIN_ATTEMPT' || log.action === 'FAILED_LOGIN';
                      return (
                        <tr key={log.id} className={`hover:bg-zinc-50/50 text-xs font-medium transition-all ${isFailedAttempt ? 'bg-red-50/20' : ''}`}>
                          <td className="px-4 py-3.5">
                            <span className="font-extrabold text-zinc-900">{log.username || 'Anonymous'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-500">
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">{log.role || 'Visitor'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-400 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isFailedAttempt
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : log.action === 'LOGIN' || log.action === 'PLATFORM_LOGIN'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : log.action === 'WIPE_DATABASE'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-zinc-600 font-mono text-[10px] max-w-[150px] truncate" title={log.page_url}>
                            {log.page_url}
                          </td>
                          <td className="px-4 py-3.5 text-zinc-500 font-mono text-[10px]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-3.5 text-zinc-500 flex items-center gap-1.5 pt-4">
                            {log.device_type === 'Mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                            <span className="text-[10px] font-semibold">{log.os} ({log.browser})</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-[10px] font-bold text-zinc-950 hover:underline cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                        No matching activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Session History Log */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-500" />
                User Login & Session History
              </h2>
              <p className="text-xs text-zinc-400">Auditable list of recent log-in sessions, active states, and browser clients.</p>
            </div>

            <div className="overflow-x-auto border border-zinc-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Log-in Time</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3">Active Duration</th>
                    <th className="px-4 py-3">Browser / Platform</th>
                    <th className="px-4 py-3">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {sessionHistory.length > 0 ? (
                    sessionHistory.map((sess) => {
                      const isActiveNow = !sess.logout_time && (Date.now() - new Date(sess.last_active).getTime() < 60 * 1000);
                      return (
                        <tr key={sess.session_id} className="hover:bg-zinc-50/50 text-xs font-medium transition-all">
                          <td className="px-4 py-3 font-mono text-[9px] text-zinc-400">{sess.session_id}</td>
                          <td className="px-4 py-3 font-extrabold text-zinc-950">{sess.username}</td>
                          <td className="px-4 py-3 text-zinc-500">
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">{sess.role}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono text-[10px]">{new Date(sess.login_time).toLocaleString()}</td>
                          <td className="px-4 py-3 text-zinc-400 font-mono text-[10px]">
                            {isActiveNow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                Active Now
                              </span>
                            ) : (
                              new Date(sess.last_active).toLocaleString()
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-950 font-bold">{formatDuration(sess.duration)}</td>
                          <td className="px-4 py-3 text-zinc-500 font-mono text-[10px]">{sess.browser} on {sess.os}</td>
                          <td className="px-4 py-3 text-zinc-500 font-mono text-[10px]">{sess.ip_address}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                        No active user sessions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: USER CREDENTIALS & CONTROL PANEL                  */}
      {/* ========================================================= */}
      {activeTab === 'credentials' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 space-y-6">
            
            {/* Title & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-50 pb-4">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-zinc-500" />
                  User Account Security Manager
                </h2>
                <p className="text-xs text-zinc-400">Observe registered system roll numbers, view plain default credentials, reset custom passwords, and clear lockout states instantly.</p>
              </div>
              <div className="text-[11px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-150 px-3.5 py-1.5 rounded-xl">
                Loaded <span className="text-zinc-950 font-black">{platformUsers.length}</span> user accounts
              </div>
            </div>

            {/* Local Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search user accounts by Roll Number or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 text-xs font-semibold"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs font-semibold cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="Student">Students Only</option>
                  <option value="Admin">Admins Only</option>
                  <option value="Super Admin">Super Admins Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            {loadingUsers ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Synchronizing credentials...</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-150 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <th className="px-5 py-3.5">Roll Number / User</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Credential / Password Status</th>
                      <th className="px-5 py-3.5">Security Context / Lockout</th>
                      <th className="px-5 py-3.5">Next Action status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => {
                        const isUserLocked = user.lockedUntil && (new Date(user.lockedUntil).getTime() > Date.now());
                        return (
                          <tr key={user.username} className="hover:bg-zinc-50/40 text-xs font-medium transition-all">
                            <td className="px-5 py-4 font-extrabold text-zinc-950">
                              {user.username}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                user.role === 'Super Admin'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : user.role === 'Admin'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {user.isDefault ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    Default Password Active
                                  </span>
                                  <div className="text-[10px] text-zinc-400 font-bold mt-1">
                                    Plain: <span className="font-mono text-emerald-700 font-extrabold select-all">{user.visiblePassword}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    Custom Secure Password
                                  </span>
                                  <div className="text-[10px] text-zinc-400 font-bold mt-1">
                                    Plain: <span className="font-mono text-indigo-700 font-extrabold select-all">{user.visiblePassword}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {isUserLocked ? (
                                <div className="space-y-0.5 text-red-600">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    Account Locked
                                  </span>
                                  <div className="text-[9px] font-mono font-bold text-zinc-400">
                                    Until {new Date(user.lockedUntil).toLocaleTimeString()}
                                  </div>
                                </div>
                              ) : user.failedAttempts > 0 ? (
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                  {user.failedAttempts} Failed Attempts
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold">
                                  ✓ Secure State
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {user.isFirstLogin === 1 ? (
                                <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                                  Force Pwd Change On Login
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                                  Password Configured
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right space-x-2">
                              {isUserLocked || user.failedAttempts > 0 ? (
                                <button
                                  onClick={() => handleUnlockUser(user.username)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                  title="Clear lockout status & failed attempts"
                                >
                                  Unlock User
                                </button>
                              ) : null}
                              <button
                                onClick={() => setResetUser(user)}
                                className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Set Password
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 font-medium">
                          No users matching search filters found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PERFORMANCE & DB REGULATION                        */}
      {/* ========================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-zinc-500" />
                Database Tuning & Query Optimization
              </h2>
              <p className="text-xs text-zinc-400">Run structural garbage collection (VACUUM), rebuild analytics indices (ANALYZE), and prune historic log weight for peak responsiveness.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              <div className="p-5 border border-zinc-150 rounded-2xl bg-zinc-50/50 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 font-bold text-xs">1</div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">Prune Verbose History</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">Keeps the platform lightweight by archiving or deleting user logs older than 1000 items, keeping search queries lightning fast.</p>
              </div>

              <div className="p-5 border border-zinc-150 rounded-2xl bg-zinc-50/50 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 font-bold text-xs">2</div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">De-fragment Storage</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">Runs SQLite's structural VACUUM command, defragmenting database pages and reclaiming unused OS disk space.</p>
              </div>

              <div className="p-5 border border-zinc-150 rounded-2xl bg-zinc-50/50 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 font-bold text-xs">3</div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wide">Update Query Plans</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">Executes ANALYZE to refresh column indices and data density statistics, so query planners always select the fastest path.</p>
              </div>

            </div>

            {/* Performance tuning actions */}
            <div className="pt-6 border-t border-zinc-50 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-1">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Trigger Maintenance Regulation Cycle</h3>
                <p className="text-[11px] text-zinc-400">Recommended during peak registration hours or after bulk data imports to maintain supreme app performance.</p>
              </div>

              <button
                onClick={handleRegulatePerformance}
                disabled={tuningInProg}
                className="w-full md:w-auto px-6 py-3 bg-zinc-950 text-white font-extrabold text-xs rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {tuningInProg ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                    Executing Optimizations...
                  </>
                ) : (
                  <>
                    <Wrench className="w-3.5 h-3.5" />
                    Optimize & Regulate Performance
                  </>
                )}
              </button>
            </div>

            {/* Success Results Card */}
            {tuningResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 border border-emerald-100 bg-emerald-50/25 rounded-3xl space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wide">Tuning Complete & System Status Perfect!</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Logs Pruned</span>
                    <span className="text-base font-extrabold text-emerald-700 block">{tuningResult.logsPruned} rows</span>
                    <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Heavy history reduced</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Activity Log count</span>
                    <span className="text-base font-extrabold text-zinc-900 block">{tuningResult.afterLogCount} / {tuningResult.beforeLogCount}</span>
                    <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Current weight index</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">VACUUM Status</span>
                    <span className="text-base font-extrabold text-emerald-700 block">De-fragmented</span>
                    <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Disks space reclaimed</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100/30">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Tuned Tables</span>
                    <span className="text-base font-extrabold text-zinc-900 block">{tuningResult.optimizedTables?.length || 5} Tables</span>
                    <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Optimizer verified</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(tuningResult.optimizedTables || []).map((t: string) => (
                    <span key={t} className="text-[9px] font-extrabold bg-emerald-100/55 text-emerald-700 px-2 py-0.5 rounded">
                      ⚡ {t}.db optimized
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

          </div>

        </div>
      )}

      {/* Audit Log Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-md w-full rounded-3xl border border-zinc-100 shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-zinc-500" />
                Audit Record Inspection
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">User Account</span>
                  <span className="text-xs font-bold text-zinc-900">{selectedLog.username || 'Anonymous'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">System Role</span>
                  <span className="text-xs font-bold text-zinc-900 uppercase">{selectedLog.role || 'Viewer'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Activity Timestamp</span>
                <span className="text-xs font-mono font-semibold text-zinc-700">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Action performed</span>
                  <span className="text-xs font-bold text-zinc-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Target page</span>
                  <span className="text-xs font-mono font-semibold text-zinc-700 break-all">{selectedLog.page_url}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">Granular Activity Details</span>
                <p className="text-xs text-zinc-700 font-semibold leading-relaxed break-all">{selectedLog.details || 'No additional parameters provided.'}</p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3.5 text-[11px] text-zinc-400 font-semibold">
                <div>IP: {selectedLog.ip_address}</div>
                <div>Device: {selectedLog.device_type} ({selectedLog.os})</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Close Record
            </button>
          </motion.div>
        </div>
      )}

      {/* Reset User Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-md w-full rounded-3xl border border-zinc-100 shadow-2xl p-6 space-y-5"
          >
            <div className="flex justify-between items-center border-b border-zinc-50 pb-3">
              <h3 className="text-sm font-extrabold text-zinc-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Key className="w-4 h-4 text-zinc-500" />
                Override User Password
              </h3>
              <button 
                onClick={() => setResetUser(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Account Target</span>
                <div className="text-xs font-extrabold text-zinc-950 flex items-center gap-2">
                  <span>{resetUser.username}</span>
                  <span className="text-[9px] bg-zinc-200 px-2 py-0.5 rounded text-zinc-600 uppercase font-black">{resetUser.role}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">New Secure Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g., studentReset2026! or custom"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="force-change-check"
                  checked={forceFirstChange}
                  onChange={(e) => setForceFirstChange(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/5 cursor-pointer w-4 h-4"
                />
                <label htmlFor="force-change-check" className="text-[11px] text-zinc-500 font-semibold select-none leading-normal">
                  <span className="text-zinc-950 font-bold block">Force change password on next sign-in</span>
                  User will be prompted to replace this password with their own unique password upon logging in.
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset || !newPassword.trim()}
                  className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {submittingReset ? (
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    'Set Password'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
