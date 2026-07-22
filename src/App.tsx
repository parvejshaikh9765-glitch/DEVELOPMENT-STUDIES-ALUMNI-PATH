import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  GraduationCap, 
  Sparkles,
  Shield,
  Layers,
  MapPin,
  Mail,
  Linkedin,
  Smartphone,
  Info,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  ShieldAlert,
  Calendar,
  Activity,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Types & Services
import { Alumni } from './types';
import { dataService } from './services/dataService';
import { 
  analyzeTrajectory, 
  getBatchTrends, 
  syncAlumnusData, 
  getBatchComparisonAI 
} from './services/geminiService';

// Reusable Sub-components & Helpers
import AlumniDirectory from './components/AlumniDirectory';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import AlumniProfile from './components/AlumniProfile';
import PlacementIntelligence from './components/PlacementIntelligence';
import SuperAdminConsole from './components/SuperAdminConsole';
import { BatchComparisonRadarChart } from './components/Charts';
import { displayBatch, isVerifiedLinkedInUrl } from './utils/displayUtils';
import { getBatchComparisonMetrics } from './utils/comparisonUtils';

export default function App() {
  // Platform User Authentication state
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; sessionId: string } | null>(() => {
    const saved = sessionStorage.getItem('platform_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Password reset state for first-time students
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<string>('');

  // Active Simulated User Role state (retained as backup/simulation)
  const [activeRole, setActiveRole] = useState<string>(() => {
    const saved = sessionStorage.getItem('alumni_directory_user_role');
    if (!saved) {
      sessionStorage.setItem('alumni_directory_user_role', 'Viewer');
      return 'Viewer';
    }
    return saved;
  });

  // Global directory list state
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active View tabs
  const [activeTab, setActiveTab] = useState<string>('directory');

  // Currently focused alumnus details
  const [selectedAlumnus, setSelectedAlumnus] = useState<Alumni | null>(null);
  
  // Gemini Interactive insights states
  const [trajectoryAnalysis, setTrajectoryAnalysis] = useState<string | null>(null);
  const [isAnalyzingTrajectory, setIsAnalyzingTrajectory] = useState<boolean>(false);
  const [isSyncingAlumnus, setIsSyncingAlumnus] = useState<boolean>(false);
  const [syncingAlumnusId, setSyncingAlumnusId] = useState<string | null>(null);

  // Cohort comparison states
  const [compareBatchA, setCompareBatchA] = useState<string>('');
  const [compareBatchB, setCompareBatchB] = useState<string>('');
  const [batchCompareAIResult, setBatchCompareAIResult] = useState<string | null>(null);
  const [isComparingAI, setIsComparingAI] = useState<boolean>(false);

  // Toast alerts state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Role authentication and password challenge states (for simulated role changes)
  const [rolesPasswordStatus, setRolesPasswordStatus] = useState<Record<string, boolean>>({});
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [promptPasswordInput, setPromptPasswordInput] = useState<string>('');
  const [promptError, setPromptError] = useState<string | null>(null);

  // Inactivity timeout handling (15 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds
    let timeoutId: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout(true);
      }, INACTIVITY_LIMIT);
    };

    // User interaction events to monitor active states
    const activeEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activeEvents.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    
    // Initial start
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      activeEvents.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [currentUser]);

  // Keep-Alive loop every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(() => {
      dataService.platformKeepAlive(currentUser.sessionId);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Track page navigation changes in the audit logs
  useEffect(() => {
    if (!currentUser) return;
    
    dataService.platformLogActivity(
      currentUser.sessionId,
      currentUser.username,
      currentUser.role,
      'VISIT_PAGE',
      `/${activeTab}`,
      `User navigated to the ${activeTab} tab.`
    );
  }, [activeTab, currentUser]);

  // Fetch roles password status
  const loadRolesPasswordStatus = () => {
    dataService.getRolesPasswordStatus()
      .then(setRolesPasswordStatus)
      .catch(err => console.error('Failed to load roles password status', err));
  };

  // Initialize directory dataset on mount
  useEffect(() => {
    dataService.getAlumni().then(list => {
      setAlumniList(list);
      setIsLoading(false);
    });
    loadRolesPasswordStatus();
  }, []);

  // Handle simulated role switches securely
  const handleRoleChangeAttempt = async (targetRole: string) => {
    if (targetRole === activeRole) return;

    const isRequired = rolesPasswordStatus[targetRole];
    if (isRequired) {
      setPendingRole(targetRole);
      setPromptPasswordInput('');
      setPromptError(null);
      setShowPasswordPrompt(true);
    } else {
      sessionStorage.setItem('alumni_directory_user_role', targetRole);
      setActiveRole(targetRole);
      
      if (['Super Admin', 'Admin'].includes(targetRole)) {
        sessionStorage.setItem('alumni_directory_admin_authed', 'true');
      } else {
        sessionStorage.removeItem('alumni_directory_admin_authed');
      }

      triggerToast(`Switched active session to ${targetRole}.`, 'info');
    }
  };

  const handleVerifyPromptPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRole) return;
    setPromptError(null);

    const res = await dataService.verifyRolePassword(pendingRole, promptPasswordInput);
    if (res.success) {
      // Access granted: switch session
      sessionStorage.setItem('alumni_directory_user_role', pendingRole);
      setActiveRole(pendingRole);

      // Auto authorized Admin Console if Super Admin/Admin
      if (['Super Admin', 'Admin'].includes(pendingRole)) {
        sessionStorage.setItem('alumni_directory_admin_authed', 'true');
      } else {
        sessionStorage.removeItem('alumni_directory_admin_authed');
      }

      triggerToast(`Access granted. Switched session to ${pendingRole}.`, 'success');
      setShowPasswordPrompt(false);
      setPendingRole(null);
      setPromptPasswordInput('');
    } else {
      setPromptError(res.error || 'Incorrect password.');
      triggerToast('Authentication failed.', 'error');
    }
  };

  // Log out of the secure platform session
  const handleLogout = (isTimeout = false) => {
    const savedUserStr = sessionStorage.getItem('platform_current_user');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        dataService.platformLogActivity(
          u.sessionId,
          u.username,
          u.role,
          'LOGOUT',
          '/logout',
          isTimeout ? 'Session timed out due to 15 minutes of inactivity.' : 'User voluntarily logged out.'
        );
      } catch (err) {
        console.error('Logout logging error:', err);
      }
    }
    
    sessionStorage.removeItem('platform_current_user');
    setCurrentUser(null);
    setIsChangingPassword(false);
    triggerToast(
      isTimeout ? "Session expired due to 15 minutes of inactivity." : "Logged out successfully.",
      isTimeout ? "error" : "success"
    );
  };

  // Display helpful toast notifications
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Run AI analysis on select alumnus career trajectory
  const handleSelectAlumnus = async (alumnus: Alumni) => {
    setSelectedAlumnus(alumnus);
    setTrajectoryAnalysis(null);
    setIsAnalyzingTrajectory(true);

    if (currentUser) {
      dataService.platformLogActivity(
        currentUser.sessionId,
        currentUser.username,
        currentUser.role,
        'VIEW_PROFILE',
        `/profile/${alumnus.id}`,
        `Viewed professional career profile of alumnus: "${alumnus.name}"`
      );
    }

    try {
      const res = await analyzeTrajectory(alumnus);
      setTrajectoryAnalysis(res);
    } catch (e) {
      triggerToast("Failed to fetch career analysis.", "error");
    } finally {
      setIsAnalyzingTrajectory(false);
    }
  };

  // Sync profile details directly from live LinkedIn
  const handleSyncLinkedInForAlumnus = async (alumnus: Alumni) => {
    if (!alumnus || !alumnus.linkedinUrl) {
      triggerToast("No valid LinkedIn URL found for this alumnus.", "error");
      return;
    }
    setSyncingAlumnusId(alumnus.id);
    setIsSyncingAlumnus(true);
    triggerToast(`Synchronizing ${alumnus.name}'s profile details from LinkedIn...`, "info");
    try {
      const syncResult = await syncAlumnusData(alumnus);
      if (syncResult && syncResult.hasUpdates) {
        const newRole = syncResult.currentRole && syncResult.currentRole !== 'Alumnus' ? syncResult.currentRole : alumnus.currentRole;
        const newCompany = syncResult.currentCompany && syncResult.currentCompany !== 'Independent' ? syncResult.currentCompany : alumnus.currentCompany;
        const newLocation = syncResult.location && syncResult.location !== 'Location Not Available' ? syncResult.location : alumnus.location;
        const newHeadline = syncResult.headline || alumnus.headline;
        const newSkills = Array.isArray(syncResult.skills) && syncResult.skills.length > 0
          ? Array.from(new Set([...(alumnus.skills || []), ...syncResult.skills]))
          : alumnus.skills;

        // Construct the updated Alumnus profile safely
        const updatedAlumnus: Alumni = {
          ...alumnus,
          currentRole: newRole,
          currentCompany: newCompany,
          location: newLocation,
          headline: newHeadline,
          skills: newSkills
        };

        // Add a new career step in trajectory if there is a new role/company
        const hasNewJob = (newRole !== alumnus.currentRole) || (newCompany !== alumnus.currentCompany);
        
        if (hasNewJob) {
          const latestStep = alumnus.trajectory[alumnus.trajectory.length - 1];
          const matchesLatest = latestStep && 
            latestStep.role === newRole && 
            latestStep.company === newCompany;

          if (!matchesLatest) {
            // End the previous step if it's "Present"
            const updatedTrajectory = alumnus.trajectory.map((step, idx) => {
              if (idx === alumnus.trajectory.length - 1 && step.endDate === 'Present') {
                return { ...step, endDate: new Date().getFullYear().toString() };
              }
              return step;
            });

            updatedTrajectory.push({
              id: `step-sync-${Date.now()}`,
              company: newCompany,
              role: newRole,
              startDate: new Date().getFullYear().toString(),
              endDate: 'Present',
              location: newLocation,
              description: `Synchronized position via LinkedIn.`
            });
            updatedAlumnus.trajectory = updatedTrajectory;
          }
        }

        // Save to datastore
        const updatedList = await dataService.updateAlumnus(updatedAlumnus);
        setAlumniList(updatedList);
        if (selectedAlumnus && selectedAlumnus.id === alumnus.id) {
          setSelectedAlumnus(updatedAlumnus);
        }
        triggerToast(`Successfully synchronized and updated ${updatedAlumnus.name}'s profile.`, "success");
      } else {
        triggerToast("LinkedIn synchronization returned no modifications.", "info");
      }
    } catch (e) {
      console.error("Error syncing with LinkedIn:", e);
      triggerToast("Failed to synchronize with LinkedIn.", "error");
    } finally {
      setIsSyncingAlumnus(false);
      setSyncingAlumnusId(null);
    }
  };

  const handleSyncLinkedIn = async () => {
    if (selectedAlumnus) {
      await handleSyncLinkedInForAlumnus(selectedAlumnus);
    }
  };

  // Extract valid cohorts from list for Comparison tab
  const availableBatches = useMemo(() => {
    return Array.from(new Set(alumniList.map(a => String(a.batch))))
      .filter(b => b && b !== "Batch Not Available" && b.trim() !== "")
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.at(0) || "0");
        const numB = parseInt(b.match(/\d+/)?.at(0) || "0");
        return numB - numA; // Newest first
      });
  }, [alumniList]);

  // Set default comparison batches on update
  useEffect(() => {
    if (availableBatches.length >= 2) {
      if (!compareBatchA) setCompareBatchA(availableBatches[0]);
      if (!compareBatchB) setCompareBatchB(availableBatches[1]);
    } else if (availableBatches.length === 1) {
      if (!compareBatchA) setCompareBatchA(availableBatches[0]);
    }
  }, [availableBatches, compareBatchA, compareBatchB]);

  // Cohort comparison Radar Chart Data
  const radarData = useMemo(() => {
    if (!compareBatchA || !compareBatchB) return [];
    const metricsA = getBatchComparisonMetrics(compareBatchA, alumniList);
    const metricsB = getBatchComparisonMetrics(compareBatchB, alumniList);
    return [
      { subject: 'Leadership Concentration %', A: metricsA.leadershipPercent, B: metricsB.leadershipPercent },
      { subject: 'Corporate & Consulting %', A: metricsA.corpConsultingPercent, B: metricsB.corpConsultingPercent },
      { subject: 'Social Impact & NGOs %', A: metricsA.socialNGOPercent, B: metricsB.socialNGOPercent },
      { subject: 'Academic & Think Tank %', A: metricsA.academiaResearchPercent, B: metricsB.academiaResearchPercent },
      { subject: 'Global Relocation %', A: metricsA.globalReachPercent, B: metricsB.globalReachPercent },
      { subject: 'Experience Growth %', A: metricsA.experiencePercent, B: metricsB.experiencePercent }
    ];
  }, [compareBatchA, compareBatchB, alumniList]);

  // AI-powered batch alignment analysis using Gemini
  const handleCompareBatchesAI = async () => {
    if (!compareBatchA || !compareBatchB) return;
    setIsComparingAI(true);
    setBatchCompareAIResult(null);

    if (currentUser) {
      dataService.platformLogActivity(
        currentUser.sessionId,
        currentUser.username,
        currentUser.role,
        'USE_AI_TOOL',
        '/compare',
        `Used Gemini AI to compare cohorts: "${compareBatchA}" vs "${compareBatchB}"`
      );
    }

    try {
      const res = await getBatchComparisonAI(compareBatchA, compareBatchB, alumniList);
      setBatchCompareAIResult(res);
    } catch (e) {
      triggerToast("AI comparison failed. Check connection.", "error");
    } finally {
      setIsComparingAI(false);
    }
  };

  // Define navigation tabs dynamically based on authenticated role permissions
  const navTabs = useMemo(() => {
    const list = [
      { id: 'directory', label: 'Directory', icon: Users },
      { id: 'placement', label: 'Placement Intelligence', icon: Sparkles },
      { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
      { id: 'compare', label: 'Compare Batches', icon: Layers },
    ];

    if (currentUser) {
      if (['Admin', 'Super Admin'].includes(currentUser.role)) {
        list.push({ id: 'admin', label: 'Admin Console', icon: Shield });
      }
      if (currentUser.role === 'Super Admin') {
        list.push({ id: 'superadmin', label: 'Super Admin Console', icon: Lock });
      }
    }
    return list;
  }, [currentUser]);

  // Fallback if active tab becomes unavailable due to role switch
  useEffect(() => {
    const isAvailable = navTabs.some(t => t.id === activeTab);
    if (!isAvailable) {
      setActiveTab('directory');
    }
  }, [navTabs, activeTab]);

  return (
    <div className="min-h-screen bg-[#fbfcff] text-zinc-950 flex flex-col font-sans" id="application-root">
      
      {/* Toast Notification HUD */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-full"
          >
            <div className={`p-4 rounded-2xl border shadow-xl flex items-center gap-3 ${
              toast.type === 'error' 
                ? 'bg-red-50 border-red-100 text-red-700' 
                : toast.type === 'info'
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <div className="flex-1 text-xs font-bold leading-normal">{toast.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER LOGIN SCREEN IF UNAUTHENTICATED AND NOT RESETTING */}
      {!currentUser && !isChangingPassword && (
        <AppLogin 
          onSuccess={(u) => {
            if (u.isFirstLogin) {
              setPasswordChangeUser(u.username);
              setIsChangingPassword(true);
            } else {
              const sessionData = { username: u.username, role: u.role, sessionId: u.sessionId };
              setCurrentUser(sessionData);
              sessionStorage.setItem('platform_current_user', JSON.stringify(sessionData));
              triggerToast(`Welcome back, ${u.username}! Successfully logged in as ${u.role}.`, 'success');
            }
          }}
          triggerToast={triggerToast}
        />
      )}

      {/* RENDER MANDATORY PASSWORD SETUP FOR FIRST LOGIN */}
      {!currentUser && isChangingPassword && (
        <AppChangePassword 
          username={passwordChangeUser}
          onSuccess={() => {
            setIsChangingPassword(false);
            setCurrentUser(null); // Force real login with new password to verify
          }}
          triggerToast={triggerToast}
        />
      )}

      {/* MAIN PLATFORM INTERFACE */}
      {currentUser && (
        <>
          {/* Main Header / Navigation rail */}
          <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50 px-6 py-4.5">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
              
              {/* Logo and Context */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-md">
                    <GraduationCap className="w-5.5 h-5.5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-extrabold tracking-tight text-zinc-950">Alumni Directory & Tracker</h1>
                    <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-0.5">Alumni Trajectory Platform</p>
                  </div>
                </div>

                {/* Simulated Role Selector (kept for context sync) */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-xl px-2.5 py-1 shadow-sm">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">Context:</span>
                  <select
                    value={activeRole}
                    onChange={(e) => handleRoleChangeAttempt(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-bold text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    {['Super Admin', 'Admin', 'Placement Committee', 'Faculty', 'Student', 'Viewer'].map(role => (
                      <option key={role} value={role}>
                        {role} {rolesPasswordStatus[role] ? '🔒' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="flex items-center bg-zinc-100 p-1 rounded-2xl overflow-x-auto max-w-full scrollbar-none snap-x shrink-0">
                {navTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSelectedAlumnus(null);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer snap-start shrink-0 whitespace-nowrap ${
                      activeTab === tab.id 
                        ? "bg-white text-zinc-950 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* User Profile Badge & Logout Control */}
              <div className="flex items-center gap-3 shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 pt-3 lg:pt-0 lg:pl-4 w-full lg:w-auto justify-end">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {currentUser.username}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-0.5">
                    {currentUser.role}
                  </span>
                </div>
                
                <button
                  onClick={() => handleLogout(false)}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </header>

          {/* Main application viewer section */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading alumni directory...</p>
          </div>
        ) : (
          <div className="min-h-full">
            {activeTab === 'directory' && (
              <div className="space-y-6">
                <AlumniDirectory 
                  alumniList={alumniList} 
                  onSelectAlumnus={handleSelectAlumnus} 
                  triggerToast={triggerToast}
                  onSyncLinkedIn={handleSyncLinkedInForAlumnus}
                  syncingAlumnusId={syncingAlumnusId}
                />
              </div>
            )}

            {activeTab === 'placement' && (
              <PlacementIntelligence alumniList={alumniList} />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard alumniList={alumniList} />
            )}

            {activeTab === 'compare' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold tracking-tight">Compare Cohorts</h1>
                  <p className="text-zinc-500 font-medium">Analyse side-by-side trends between different graduation cohorts.</p>
                </div>

                {availableBatches.length < 2 ? (
                  <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                      <Sparkles className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-800 font-sans">Multiple Batches Required</h3>
                    <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed font-sans">
                      To visualize comparison trends, your active database must contain at least two different graduation cohorts. Please sign in as Administrator to ingest additional spreadsheet datasets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Selector Panel */}
                    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-zinc-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-950"></span>
                          Select Primary Cohort (Cohort A)
                        </label>
                        <select
                          value={compareBatchA}
                          onChange={(e) => setCompareBatchA(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm"
                        >
                          {availableBatches.map(b => (
                            <option key={`comp-a-${b}`} value={b} disabled={b === compareBatchB}>
                              {displayBatch(b)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          Select Secondary Cohort (Cohort B)
                        </label>
                        <select
                          value={compareBatchB}
                          onChange={(e) => setCompareBatchB(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm"
                        >
                          {availableBatches.map(b => (
                            <option key={`comp-b-${b}`} value={b} disabled={b === compareBatchA}>
                              {displayBatch(b)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Compare Dashboards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Radar Chart */}
                      <div className="lg:col-span-5 bg-white p-5 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between h-[420px] sm:h-[480px] lg:h-[500px]">
                        <div>
                          <h2 className="text-lg font-bold">Cohort Alignment Radar</h2>
                          <p className="text-xs text-zinc-400 mt-1">Comparing concentration percentages across core path variables.</p>
                        </div>
                        
                        <div className="h-[280px] sm:h-[320px] w-full mt-4">
                          <BatchComparisonRadarChart 
                            data={radarData} 
                            batchA={compareBatchA} 
                            batchB={compareBatchB} 
                          />
                        </div>
                      </div>

                      {/* Cohort Comparison Metrics List */}
                      <div className="lg:col-span-7 bg-white p-5 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-bold mb-6">Cohort Comparative Analysis</h3>
                        
                        <div className="space-y-4">
                          {[
                            {
                              title: 'Sample Size',
                              calc: (m: any) => `${m.count} graduates`,
                              desc: 'Count of verified records in the database.'
                            },
                            {
                              title: 'Avg. Experience',
                              calc: (m: any) => `${m.avgExperience} years`,
                              desc: 'Total active professional experience years.'
                            },
                            {
                              title: 'Avg. Positions',
                              calc: (m: any) => `${m.avgRoles} roles`,
                              desc: 'Average career modifications or promotions.'
                            },
                            {
                              title: 'Primary Sector',
                              calc: (m: any) => m.topSector,
                              desc: 'Highest career density sector.'
                            },
                            {
                              title: 'Key Employer',
                              calc: (m: any) => m.topEmployer,
                              desc: 'Most recurring organization.'
                            },
                          ].map((item, index) => {
                            const mA = getBatchComparisonMetrics(compareBatchA, alumniList);
                            const mB = getBatchComparisonMetrics(compareBatchB, alumniList);
                            return (
                              <div key={`metric-comp-${index}`} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="min-w-0 pr-2">
                                    <h4 className="text-sm font-semibold text-zinc-800">{item.title}</h4>
                                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                                  </div>
                                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 text-xs font-bold font-mono mt-1.5 sm:mt-0">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-black sm:hidden mb-0.5">Cohort A</span>
                                      <span className="text-zinc-900 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 min-w-[105px] text-center truncate">
                                        {item.calc(mA)}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[8px] uppercase tracking-wider text-indigo-400 font-black sm:hidden mb-0.5">Cohort B</span>
                                      <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 min-w-[105px] text-center truncate">
                                        {item.calc(mB)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* AI Smart Cohort Alignment Analysis */}
                    <div className="bg-white border border-zinc-100 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-sm">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-950 font-sans uppercase tracking-wider">AI Comparative Report</h3>
                            <p className="text-xs text-zinc-400 font-sans">Gemini analyzes trajectory alignments between {displayBatch(compareBatchA)} and {displayBatch(compareBatchB)}.</p>
                          </div>
                        </div>

                        {!batchCompareAIResult && (
                          <button 
                            onClick={handleCompareBatchesAI}
                            disabled={isComparingAI}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                          >
                            {isComparingAI ? (
                              <>
                                <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
                                Extracting Cohort Insights...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                                Run Gemini Cohort AI
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {batchCompareAIResult && (
                        <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100/60 text-xs leading-relaxed font-medium text-zinc-700 max-w-none prose prose-zinc">
                          <ReactMarkdown>{batchCompareAIResult}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && (
              <AdminPanel 
                alumniList={alumniList} 
                onUpdateAlumniList={(updated) => setAlumniList(updated)} 
                triggerToast={triggerToast}
                refreshSecurityStatus={loadRolesPasswordStatus}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'superadmin' && currentUser && currentUser.role === 'Super Admin' && (
              <SuperAdminConsole triggerToast={triggerToast} />
            )}
          </div>
        )}
      </main>

      {/* Slide-over Profile Drawer Panel */}
      <AnimatePresence>
        {selectedAlumnus && (
          <AlumniProfile 
            alumnus={selectedAlumnus}
            onClose={() => setSelectedAlumnus(null)}
            analysis={trajectoryAnalysis}
            isAnalyzing={isAnalyzingTrajectory}
            onRunAnalysis={() => handleSelectAlumnus(selectedAlumnus)}
            onSync={handleSyncLinkedIn}
            isSyncing={isSyncingAlumnus}
            onUpdate={(updatedAlumnus) => {
              setAlumniList(prev => prev.map(a => a.id === updatedAlumnus.id ? updatedAlumnus : a));
              setSelectedAlumnus(updatedAlumnus);
            }}
          />
        )}
      </AnimatePresence>

      {/* Password Challenge Prompt Modal */}
      <AnimatePresence>
        {showPasswordPrompt && pendingRole && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white max-w-sm w-full rounded-3xl border border-zinc-100 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 font-sans">Security Check Required</h3>
                  <p className="text-xs text-zinc-400">Please authenticate to gain access to {pendingRole} role.</p>
                </div>
              </div>

              <form onSubmit={handleVerifyPromptPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Role Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={promptPasswordInput}
                    onChange={(e) => setPromptPasswordInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                    autoFocus
                    required
                  />
                  {promptError && (
                    <p className="text-[11px] font-bold text-red-500 mt-1">{promptError}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setPendingRole(null);
                      setPromptPasswordInput('');
                      setPromptError(null);
                    }}
                    className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ==========================================
// DETAILED DEMO & SECURE SIGN-IN ENGINE
// ==========================================

const studentDemos = [
  { label: 'Student M2025DS001 (First Login)', username: 'M2025DS001', password: 'M2025DS001', desc: 'Will require password change' },
  { label: 'Student M2025DS025 (Active)', username: 'M2025DS025', password: 'M2025DS025', desc: 'Pre-registered student' }
];

const adminDemos = [
  { label: 'Placement Staff', username: 'admin', password: 'admin123', desc: 'Manage profiles and placement reports' }
];

const superAdminDemos = [
  { label: 'Platform Security Officer', username: 'superadmin', password: 'superadmin123', desc: 'Audit records & Performance tuning' }
];

interface AppLoginProps {
  onSuccess: (user: { username: string; role: string; isFirstLogin: boolean; sessionId: string }) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function AppLogin({ onSuccess, triggerToast }: AppLoginProps) {
  // Active login role option: 'student' | 'admin' | 'superadmin'
  const [selectedRole, setSelectedRole] = useState<'student' | 'admin' | 'superadmin'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsLoading(true);
    setErrorMessage(null);

    const cleanUser = username.trim();
    const cleanPwd = password.trim();

    const res = await dataService.platformLogin(cleanUser, cleanPwd);
    setIsLoading(false);
    if (res.success && res.username && res.role && res.sessionId) {
      onSuccess({
        username: res.username,
        role: res.role,
        isFirstLogin: !!res.isFirstLogin,
        sessionId: res.sessionId
      });
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      triggerToast(res.error || 'Authentication failed.', 'error');
    }
  };

  const handleSelectDemo = (demo: { username: string; password: string }) => {
    setUsername(demo.username);
    setPassword(demo.password);
    setErrorMessage(null);
    triggerToast(`Prefilled credentials for ${demo.username}`, 'info');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-[90vh]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-zinc-150 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-md mx-auto">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950 font-sans">Alumni Trajectory Hub</h2>
          <p className="mt-1 text-xs text-zinc-400 font-semibold uppercase tracking-widest">Platform Authentication</p>
        </div>

        {/* ROLE OPTIONS SWITCHER */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block text-center">Select Login Workspace</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('student');
                setErrorMessage(null);
              }}
              className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              🎓
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setErrorMessage(null);
              }}
              className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              💼
              <span>Admin Staff</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('superadmin');
                setErrorMessage(null);
              }}
              className={`py-2 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                selectedRole === 'superadmin'
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              🔑
              <span>Super Admin</span>
            </button>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 text-red-700 text-xs font-semibold leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {selectedRole === 'student' ? 'Student Roll Number' : 'Administrator Username'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  selectedRole === 'student' 
                    ? 'e.g., M2025DS001' 
                    : selectedRole === 'admin' 
                    ? 'e.g., admin' 
                    : 'e.g., superadmin'
                }
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              `Sign In as ${selectedRole === 'student' ? 'Student' : selectedRole === 'admin' ? 'Admin Staff' : 'Super Admin'}`
            )}
          </button>
        </form>

        {/* Dynamic Context Helpers & Pre-fill Options */}
        <div className="pt-6 border-t border-zinc-100 space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
            {selectedRole === 'student' ? 'Student Workspace Credentials' : selectedRole === 'admin' ? 'Admin Staff Credentials' : 'Super Admin Credentials'}
          </p>

          <div className="space-y-2">
            {selectedRole === 'student' && studentDemos.map((demo) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className="w-full p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-150 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-zinc-800 block">{demo.label}</span>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">{demo.desc}</p>
                </div>
                <span className="text-[9px] bg-zinc-200/60 font-extrabold px-2 py-1 rounded text-zinc-700">Quick Sign-in</span>
              </button>
            ))}

            {selectedRole === 'admin' && adminDemos.map((demo) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className="w-full p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-150 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-zinc-800 block">{demo.label}</span>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">{demo.desc}</p>
                </div>
                <span className="text-[9px] bg-zinc-200/60 font-extrabold px-2 py-1 rounded text-zinc-700">Quick Sign-in</span>
              </button>
            ))}

            {selectedRole === 'superadmin' && superAdminDemos.map((demo) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className="w-full p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-150 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-zinc-800 block">{demo.label}</span>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">{demo.desc}</p>
                </div>
                <span className="text-[9px] bg-zinc-200/60 font-extrabold px-2 py-1 rounded text-zinc-700">Quick Sign-in</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppChangePasswordProps {
  username: string;
  onSuccess: () => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function AppChangePassword({ username, onSuccess, triggerToast }: AppChangePasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Requirement checks
  const reqMinChar = newPassword.length >= 8;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqNum = /\d/.test(newPassword);
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  
  const allValid = reqMinChar && reqUpper && reqLower && reqNum && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await dataService.platformChangePassword(username, username, newPassword);
    setIsLoading(false);
    if (res.success) {
      triggerToast("Secure password established. Please sign in with your new password.", "success");
      onSuccess();
    } else {
      setErrorMessage(res.error || 'Password update failed. Verify security requirements.');
      triggerToast(res.error || 'Password change failed.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 min-h-[90vh]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-zinc-150 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-md mx-auto">
            <Key className="w-6 h-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">Set Your Secure Password</h2>
          <p className="mt-1 text-xs text-zinc-400 font-semibold uppercase tracking-widest">Mandatory First Login Reset</p>
          <p className="text-zinc-500 font-medium text-xs mt-2">
            Roll number <span className="font-extrabold text-zinc-900">{username}</span> successfully authenticated. You must establish a new secure password before accessing the platform.
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 text-red-700 text-xs font-semibold leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Verify strong password"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-150 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Password Strength Requirements</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                {reqMinChar ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-full shrink-0" />}
                <span className={`font-semibold ${reqMinChar ? 'text-emerald-700' : 'text-zinc-500'}`}>At least 8 characters long</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {reqUpper ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-full shrink-0" />}
                <span className={`font-semibold ${reqUpper ? 'text-emerald-700' : 'text-zinc-500'}`}>At least one uppercase letter (A-Z)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {reqLower ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-full shrink-0" />}
                <span className={`font-semibold ${reqLower ? 'text-emerald-700' : 'text-zinc-500'}`}>At least one lowercase letter (a-z)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {reqNum ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-full shrink-0" />}
                <span className={`font-semibold ${reqNum ? 'text-emerald-700' : 'text-zinc-500'}`}>At least one numeric digit (0-9)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {isMatch ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-300 rounded-full shrink-0" />}
                <span className={`font-semibold ${isMatch ? 'text-emerald-700' : 'text-zinc-500'}`}>Passwords match perfectly</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !allValid}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-950 rounded-full animate-spin" />
            ) : (
              'Save & Complete Setup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
