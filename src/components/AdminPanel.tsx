import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Trash2, 
  Upload, 
  LogOut, 
  FileSpreadsheet, 
  History, 
  Database, 
  Lock, 
  User, 
  AlertTriangle,
  FileCheck,
  Check,
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alumni } from '../types';
import { dataService, UploadedFile } from '../services/dataService';
import { displayBatch, cn } from '../utils/displayUtils';
import UploadManager from './UploadManager';

interface AdminPanelProps {
  alumniList: Alumni[];
  onUpdateAlumniList: (list: Alumni[]) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  refreshSecurityStatus?: () => void;
  currentUser?: { username: string; role: string; sessionId: string } | null;
}

export default function AdminPanel({
  alumniList,
  onUpdateAlumniList,
  triggerToast,
  refreshSecurityStatus,
  currentUser
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modal / panel toggles
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadedFile[]>([]);
  
  // Viewing individual files modal
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [fileSearch, setFileSearch] = useState('');

  // Role Security Manager States
  const [securityRoles, setSecurityRoles] = useState<Record<string, boolean>>({});
  const [selectedSecurityRole, setSelectedSecurityRole] = useState<string>('Placement Committee');
  const [newRolePassword, setNewRolePassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Check simple session-level authentication and synchronize with current user role
  useEffect(() => {
    if (currentUser && ['Admin', 'Super Admin'].includes(currentUser.role)) {
      setIsAuthenticated(true);
      sessionStorage.setItem('alumni_directory_admin_authed', 'true');
    } else {
      const isAuthed = sessionStorage.getItem('alumni_directory_admin_authed');
      if (isAuthed === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, [currentUser]);

  // Load security status
  const loadSecurityStatus = () => {
    dataService.getRolesPasswordStatus().then(setSecurityRoles).catch(console.error);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSecurityStatus();
    }
  }, [isAuthenticated]);

  // Ingestion history loading
  useEffect(() => {
    if (isAuthenticated) {
      dataService.getUploadHistory().then(setUploadLogs);
    }
  }, [isAuthenticated, alumniList]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    try {
      // Allow database-backed validation
      const superAdminTry = await dataService.verifyRolePassword('Super Admin', cleanPassword);
      const adminTry = await dataService.verifyRolePassword('Admin', cleanPassword);
      const isHardcodedAdmin = ((cleanUsername === 'admin' && cleanPassword === 'admin123') || (cleanUsername === 'superadmin' && cleanPassword === 'superadmin123'));

      if (isHardcodedAdmin || superAdminTry.success || adminTry.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('alumni_directory_admin_authed', 'true');
        triggerToast("Welcome administrator. Panel opened successfully.", "success");
      } else {
        setLoginError("Invalid administrator credentials. Check your details.");
        triggerToast("Authentication failed.", "error");
      }
    } catch (err) {
      setLoginError("Database verification failed. Reverting to local fallback.");
      if ((cleanUsername === 'admin' && cleanPassword === 'admin123') || (cleanUsername === 'superadmin' && cleanPassword === 'superadmin123')) {
        setIsAuthenticated(true);
        sessionStorage.setItem('alumni_directory_admin_authed', 'true');
        triggerToast("Welcome administrator (offline mode).", "success");
      } else {
        triggerToast("Authentication failed.", "error");
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('alumni_directory_admin_authed');
    triggerToast("Logged out of Admin Mode.", "info");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    try {
      const res = await dataService.changeRolePassword(selectedSecurityRole, undefined, newRolePassword, true);
      if (res.success) {
        triggerToast(`Updated password for ${selectedSecurityRole} successfully.`, 'success');
        setNewRolePassword('');
        loadSecurityStatus();
        if (refreshSecurityStatus) {
          refreshSecurityStatus();
        }
      } else {
        triggerToast(res.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      triggerToast('Error updating password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleClearPassword = async () => {
    if (confirm(`Are you sure you want to remove the password requirement for ${selectedSecurityRole}? Anyone will be able to log in to this role without security.`)) {
      setIsUpdatingPassword(true);
      try {
        const res = await dataService.changeRolePassword(selectedSecurityRole, undefined, '', true);
        if (res.success) {
          triggerToast(`Removed password requirement for ${selectedSecurityRole}.`, 'success');
          setNewRolePassword('');
          loadSecurityStatus();
          if (refreshSecurityStatus) {
            refreshSecurityStatus();
          }
        } else {
          triggerToast(res.error || 'Failed to clear password.', 'error');
        }
      } catch (err) {
        triggerToast('Error clearing password.', 'error');
      } finally {
        setIsUpdatingPassword(false);
      }
    }
  };

  const handleImporterCommit = async (parsed: Alumni[], mode: 'replace' | 'append', fileName: string) => {
    try {
      const updatedList = await dataService.getAlumni();
      onUpdateAlumniList(updatedList);
      const updatedLogs = await dataService.getUploadHistory();
      setUploadLogs(updatedLogs);
    } catch (e) {
      triggerToast("Failed to sync sheet ingestion.", "error");
    }
  };

  const canDelete = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin';

  const handleBulkDelete = async () => {
    if (!canDelete) {
      triggerToast("Deletion is restricted to Admin and Super Admin.", "error");
      return;
    }
    if (selectedForDeletion.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedForDeletion.length} selected profiles?`)) {
      await dataService.deleteMultipleAlumni(selectedForDeletion);
      const updatedList = await dataService.getAlumni();
      onUpdateAlumniList(updatedList);
      setSelectedForDeletion([]);
      triggerToast("Selected profiles removed from cloud dataset.", "success");
    }
  };

  const handleWipeDatabase = async () => {
    if (!canDelete) {
      triggerToast("Wiping the database is restricted to Admin and Super Admin.", "error");
      return;
    }
    await dataService.deleteCompleteDataset();
    onUpdateAlumniList([]);
    setUploadLogs([]);
    setShowWipeConfirm(false);
    triggerToast("All cloud records completely cleared.", "info");
  };

  const toggleSelectAlumnus = (id: string) => {
    setSelectedForDeletion(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSingleDelete = async (id: string, name: string) => {
    if (!canDelete) {
      triggerToast("Profile deletion is restricted to Admin and Super Admin.", "error");
      return;
    }
    if (confirm(`Are you sure you want to delete ${name}'s profile?`)) {
      await dataService.deleteAlumnus(id);
      const updatedList = await dataService.getAlumni();
      onUpdateAlumniList(updatedList);
      triggerToast("Alumni record deleted successfully.");
    }
  };

  // Delete a complete uploaded file and its cascade records
  const handleDeleteFile = async (id: string, fileName: string) => {
    if (!canDelete) {
      triggerToast("File deletion is restricted to Admin and Super Admin.", "error");
      return;
    }
    if (confirm(`Are you sure you want to delete file "${fileName}"?\n\nThis will instantly remove all alumni profiles imported by this file from the database.`)) {
      try {
        await dataService.deleteUploadedFile(id);
        const updatedList = await dataService.getAlumni();
        onUpdateAlumniList(updatedList);
        const updatedLogs = await dataService.getUploadHistory();
        setUploadLogs(updatedLogs);
        triggerToast(`Successfully removed "${fileName}" and all associated records.`, "success");
      } catch (err) {
        triggerToast("Failed to delete file records.", "error");
      }
    }
  };

  // Trigger quick automated reprocessing for a file
  const handleReprocessFile = async (id: string, fileName: string) => {
    try {
      triggerToast(`Reprocessing sheet "${fileName}"...`, "info");
      const res = await fetch(`/api/uploaded-files/${id}/reprocess`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error();
      }
      const data = await res.json();
      const updatedList = await dataService.getAlumni();
      onUpdateAlumniList(updatedList);
      triggerToast(`Reprocessed successfully! Re-imported ${data.count} records.`, "success");
    } catch (err) {
      triggerToast(`Failed to automatically reprocess "${fileName}".`, "error");
    }
  };

  // Filter alumni belonging to currently viewed file
  const viewedAlumni = viewingFile
    ? alumniList.filter(a => a.imported_file_id === viewingFile.id)
    : [];

  const filteredViewedAlumni = viewedAlumni.filter(a =>
    a.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
    (a.currentRole || '').toLowerCase().includes(fileSearch.toLowerCase()) ||
    (a.currentCompany || '').toLowerCase().includes(fileSearch.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fadeIn bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Administrator Console</h2>
          <p className="text-xs text-zinc-500 font-sans">Sign in to manage database, edit records, or upload spreadsheet files.</p>
        </div>

        {loginError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Admin Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Admin Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
          >
            Authenticate Credentials
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-100">
          <span className="text-[10px] font-semibold text-zinc-400">Default Demo: admin / admin123</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Admin Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-6 rounded-3xl shadow-lg border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
            <Shield className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans">Authorized Console Mode</h1>
            <p className="text-xs text-zinc-400 font-sans">You have root controls to upload spreadsheets, modify records, or purge lists.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImporterOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Ingest Class Sheet
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Database Metrics & Ingested Files History */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-950 font-sans uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-zinc-400" />
                Cloud Store Status
              </h2>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Class Size</span>
                <span className="text-lg font-bold text-zinc-900 mt-1 block">{alumniList.length} profiles</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Cohort Count</span>
                <span className="text-lg font-bold text-zinc-900 mt-1 block">
                  {new Set(alumniList.map(a => a.batch)).size} cohorts
                </span>
              </div>
            </div>

            {canDelete && (
              <div className="pt-2">
                <button 
                  onClick={() => setShowWipeConfirm(true)}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Complete Database
                </button>
              </div>
            )}
          </div>

          {/* Ingested Files File Management list */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-950 font-sans uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-zinc-400" />
              File Ingestion Manager
            </h2>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {uploadLogs.length > 0 ? uploadLogs.map((file) => (
                <div key={file.id} className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100 space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-extrabold text-zinc-800 truncate block" title={file.file_name}>
                        {file.file_name}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-medium block mt-0.5">
                        Uploaded on {new Date(file.uploaded_at).toLocaleDateString()} at {new Date(file.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0 uppercase tracking-wider">
                      {file.record_count} Rows
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-1.5 justify-end pt-1 border-t border-zinc-100/60">
                    <button
                      onClick={() => setViewingFile(file)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      title="View file entries"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleReprocessFile(file.id, file.file_name)}
                      className="p-1.5 text-zinc-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      title="Reprocess spreadsheet alignment"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-Sync
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteFile(file.id, file.file_name)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Delete file and associated alumni profiles"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-xs text-zinc-400 italic">No spreadsheet files ingested yet.</p>
              )}
            </div>
          </div>

          {/* Role Password Manager Card */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-zinc-950 font-sans uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-zinc-400" />
              Role Password Manager
            </h2>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              Configure, set, and change active passwords for admins, placement committee, and all other user roles.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Role</label>
                <select
                  value={selectedSecurityRole}
                  onChange={(e) => {
                    setSelectedSecurityRole(e.target.value);
                    setNewRolePassword('');
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 shadow-sm"
                >
                  {['Super Admin', 'Admin', 'Placement Committee', 'Faculty', 'Student', 'Viewer'].map(role => (
                    <option key={`sec-role-${role}`} value={role}>
                      {role} {securityRoles[role] ? '🔒 (Password Active)' : '🔓 (No Password)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Set New Password</label>
                  {securityRoles[selectedSecurityRole] && (
                    <button
                      type="button"
                      onClick={handleClearPassword}
                      className="text-[9px] font-extrabold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Disable Password
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="Enter secure password"
                  value={newRolePassword}
                  onChange={(e) => setNewRolePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 text-xs font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword || !newRolePassword}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUpdatingPassword ? 'Saving changes...' : 'Save Password Change'}
              </button>
            </form>
          </div>
        </div>

        {/* Directory Row Records Administration List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Directory Ingestion List</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Remove individual records or use multi-select deletions.</p>
            </div>
            
            {selectedForDeletion.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedForDeletion.length})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 mt-2 pr-1">
            {alumniList.length > 0 ? alumniList.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between hover:bg-zinc-50/50 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <input 
                    type="checkbox"
                    checked={selectedForDeletion.includes(a.id)}
                    onChange={() => toggleSelectAlumnus(a.id)}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate font-medium">
                      {displayBatch(a.batch)} • {a.currentRole} at {a.currentCompany}
                    </p>
                  </div>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleSingleDelete(a.id, a.name)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={`Delete ${a.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <Database className="w-8 h-8 text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-700">Database is completely empty</p>
                <p className="text-[10px] text-zinc-400 max-w-xs">Upload an Excel spreadsheet or copy tabular data to seed the directory.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Ingester Modal */}
      <AnimatePresence>
        {isImporterOpen && (
          <UploadManager 
            onClose={() => setIsImporterOpen(false)}
            onCommit={handleImporterCommit}
            triggerToast={triggerToast}
          />
        )}
      </AnimatePresence>

      {/* Viewing individual file's alumni modal */}
      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingFile(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl h-[70vh] bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 flex flex-col z-10 animate-fadeIn"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Spreadsheet Record Inspector</h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Showing alumni profiles imported by "{viewingFile.file_name}"</p>
                </div>
                <button
                  onClick={() => setViewingFile(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="my-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search imported names, roles, or organizations..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              {/* Alumni Table */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 pr-1">
                {filteredViewedAlumni.length > 0 ? filteredViewedAlumni.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">{item.name}</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        Class of {item.batch} • {item.currentRole} at {item.currentCompany}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleSingleDelete(item.id, item.name)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="text-xs text-zinc-400 italic text-center py-8">No matching imported profiles found.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secure confirmation wipe modal */}
      <AnimatePresence>
        {showWipeConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWipeConfirm(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 space-y-4 z-10 animate-fadeIn"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 font-sans">Clear Cloud Dataset?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                  This action completely purges the directory database. All graduate profiles, skills registries, and career timelines will be wiped out instantly. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowWipeConfirm(false)}
                  className="flex-1 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleWipeDatabase}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Wipe Database
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
