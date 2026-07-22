import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Mail, 
  GraduationCap, 
  Linkedin, 
  Smartphone, 
  Sparkles, 
  RefreshCw, 
  Award, 
  Briefcase, 
  Building2,
  Wrench,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Alumni, CareerStep } from '../types';
import { isVerifiedLinkedInUrl, formatLinkedInUrl, displayBatch } from '../utils/displayUtils';
import { formatDisplayLocation } from '../utils/locationUtils';
import AlumniCareerDashboard from './AlumniCareerDashboard';
import { dataService } from '../services/dataService';

interface AlumniProfileProps {
  alumnus: Alumni;
  onClose: () => void;
  analysis: string | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onUpdate?: (updated: Alumni) => void;
}

export default function AlumniProfile({
  alumnus,
  onClose,
  analysis,
  isAnalyzing,
  onRunAnalysis,
  onSync,
  isSyncing,
  onUpdate
}: AlumniProfileProps) {
  const hasLinkedin = isVerifiedLinkedInUrl(alumnus.linkedinUrl);

  // Get active session and role contexts to determine secure permissions
  const currentUserStr = sessionStorage.getItem('platform_current_user');
  let loggedInRole = '';
  if (currentUserStr) {
    try {
      loggedInRole = JSON.parse(currentUserStr).role;
    } catch (e) {}
  }
  const activeRole = sessionStorage.getItem('alumni_directory_user_role') || 'Viewer';
  const isAdminLike = ['Super Admin', 'Admin', 'Placement Committee'].includes(activeRole);
  
  // Grounding & Contact details visible ONLY to Super Admin, Admin, and Placement Committee
  const canViewContactInfo = ['Super Admin', 'Admin', 'Placement Committee'].includes(activeRole) || ['Super Admin', 'Admin', 'Placement Committee'].includes(loggedInRole);
  const isSuperAdminOrAdmin = ['Super Admin', 'Admin'].includes(activeRole) || ['Super Admin', 'Admin'].includes(loggedInRole);

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form Fields
  const [formRole, setFormRole] = useState(alumnus.currentRole || '');
  const [formCompany, setFormCompany] = useState(alumnus.currentCompany || '');
  const [formLocation, setFormLocation] = useState(alumnus.location || '');
  const [formEmail, setFormEmail] = useState(alumnus.email || '');
  const [formPhone, setFormPhone] = useState(alumnus.phone || '');
  const [formLinkedin, setFormLinkedin] = useState(alumnus.linkedinUrl || '');
  const [formSkills, setFormSkills] = useState(alumnus.skills ? alumnus.skills.join(', ') : '');
  const [formEducation, setFormEducation] = useState(alumnus.education || '');

  useEffect(() => {
    setFormRole(alumnus.currentRole || '');
    setFormCompany(alumnus.currentCompany || '');
    setFormLocation(alumnus.location || '');
    setFormEmail(alumnus.email || '');
    setFormPhone(alumnus.phone || '');
    setFormLinkedin(alumnus.linkedinUrl || '');
    setFormSkills(alumnus.skills ? alumnus.skills.join(', ') : '');
    setFormEducation(alumnus.education || '');
  }, [alumnus]);

  const triggerLocalToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isAdminLike) {
        // Direct modification
        const updatedAlumnus: Alumni = {
          ...alumnus,
          currentRole: formRole,
          currentCompany: formCompany,
          location: formLocation,
          // Guard sensitive updates to Admin/Super Admin
          email: isSuperAdminOrAdmin ? formEmail : alumnus.email,
          phone: isSuperAdminOrAdmin ? formPhone : alumnus.phone,
          linkedinUrl: formLinkedin,
          skills: formSkills.split(',').map(s => s.trim()).filter(Boolean),
          education: formEducation
        };
        await dataService.updateAlumnus(updatedAlumnus);
        if (onUpdate) {
          onUpdate(updatedAlumnus);
        }
        triggerLocalToast("Profile updated successfully!", "success");
        setTimeout(() => setShowEditModal(false), 1000);
      } else {
        // Suggestion submit
        const fields: any = {
          currentRole: formRole,
          currentCompany: formCompany,
          location: formLocation,
          linkedinUrl: formLinkedin,
          skills: formSkills,
          education: formEducation
        };
        // Non-admins cannot submit suggestions for email or phone unless they are Super Admin or Admin
        if (isSuperAdminOrAdmin) {
          fields.email = formEmail;
          fields.phone = formPhone;
        }
        await dataService.submitSuggestion(alumnus.id, alumnus.name, activeRole, fields);
        triggerLocalToast("Suggestion submitted to Placement Committee for review!", "success");
        setTimeout(() => setShowEditModal(false), 2000);
      }
    } catch (err: any) {
      triggerLocalToast(err.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl border-l border-zinc-200 z-[100] flex flex-col overflow-hidden animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 font-sans">{alumnus.name}</h2>
            <p className="text-xs text-zinc-500 font-sans">
              {displayBatch(alumnus.batch)} • {alumnus.department || 'General'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5" />
            {isAdminLike ? 'Edit Profile' : 'Suggest Edits'}
          </button>
          {hasLinkedin && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
              title="Sync current company & title directly from live LinkedIn"
            >
              <RefreshCw className={isSyncing ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
              Sync LinkedIn
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        
        {/* AI Generated Alumni Profile Summary Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-zinc-50 border border-purple-200/70 rounded-2xl p-5 md:p-6 shadow-sm space-y-4" id="alumni-ai-summary-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-wider font-sans">
                    AI-Generated Alumni Profile Summary
                  </h3>
                  <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Gemini AI
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Automated analysis of career progression, leadership trajectory, and domain competencies
                </p>
              </div>
            </div>

            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={isAnalyzing ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
              {isAnalyzing ? "Analyzing..." : analysis ? "Regenerate Summary" : "Generate Summary"}
            </button>
          </div>

          {/* Summary Body */}
          {isAnalyzing ? (
            <div className="space-y-3 py-3 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                <Sparkles className="w-4 h-4 animate-spin text-purple-600" />
                <span>Generating tailored career summary for {alumnus.name}...</span>
              </div>
              <div className="h-3 bg-purple-200/50 rounded-full w-full"></div>
              <div className="h-3 bg-purple-200/40 rounded-full w-11/12"></div>
              <div className="h-3 bg-purple-200/40 rounded-full w-4/5"></div>
              <div className="h-3 bg-purple-200/30 rounded-full w-2/3"></div>
            </div>
          ) : analysis ? (
            <div className="bg-white/90 backdrop-blur-sm p-4 md:p-5 rounded-xl border border-purple-100/80 shadow-sm">
              <div className="prose prose-zinc max-w-none text-xs text-zinc-700 leading-relaxed space-y-2">
                <ReactMarkdown
                  components={{
                    h3: ({ node, ...props }) => <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider mt-3 mb-1.5 border-b border-purple-100 pb-1 flex items-center gap-1.5" {...props} />,
                    p: ({ node, ...props }) => <p className="text-xs text-zinc-700 font-medium leading-relaxed my-1.5" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2 text-xs text-zinc-700 font-medium" {...props} />,
                    li: ({ node, ...props }) => <li className="text-xs text-zinc-700 font-medium" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-purple-950" {...props} />
                  }}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 p-4 rounded-xl border border-dashed border-purple-200 text-center space-y-2">
              <p className="text-xs text-zinc-500 font-medium">No AI summary generated yet for {alumnus.name}.</p>
              <button
                onClick={onRunAnalysis}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Click here to generate Gemini AI career summary
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visual Dashboard & Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <AlumniCareerDashboard 
              alumnus={alumnus} 
              analysis={analysis} 
              isAnalyzing={isAnalyzing} 
            />
          </div>

          {/* Quick Details Sidebar */}
          <div className="space-y-6">
            {/* Contact Details Card */}
            <section className="bg-zinc-50/50 rounded-2xl p-5 border border-zinc-100 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Grounding Details</h4>
              
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-800">Current Location</p>
                    <p className="text-zinc-600 mt-0.5 font-medium">{formatDisplayLocation(alumnus.location)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <Mail className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                      Email Address 
                      {!canViewContactInfo && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60">Restricted</span>}
                    </p>
                    {canViewContactInfo ? (
                      <a href={`mailto:${alumnus.email}`} className="text-zinc-600 hover:text-zinc-900 mt-0.5 font-medium break-all">
                        {alumnus.email || 'N/A'}
                      </a>
                    ) : (
                      <p className="text-zinc-400 italic text-[11px] font-medium mt-0.5 flex items-center gap-1">
                        ••••••••••••••• <span className="text-[10px] text-zinc-400 font-normal">(Admin / Placement Comm. Only)</span>
                      </p>
                    )}
                  </div>
                </div>

                {hasLinkedin && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <Linkedin className="w-4 h-4 text-[#0077b5] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-800">LinkedIn Profile</p>
                      <a 
                        href={formatLinkedInUrl(alumnus.linkedinUrl)} 
                        target="_blank" 
                        rel="noreferrer noopener"
                        className="text-[#0077b5] hover:underline mt-0.5 font-medium break-all"
                      >
                        {alumnus.linkedinUrl}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 text-xs">
                  <Smartphone className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                      Phone Number 
                      {!canViewContactInfo && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60">Restricted</span>}
                    </p>
                    {canViewContactInfo ? (
                      <p className="text-zinc-600 mt-0.5 font-mono font-medium">{alumnus.phone || 'N/A'}</p>
                    ) : (
                      <p className="text-zinc-400 italic text-[11px] font-medium mt-0.5 flex items-center gap-1">
                        ••••••••••••••• <span className="text-[10px] text-zinc-400 font-normal">(Admin / Placement Comm. Only)</span>
                      </p>
                    )}
                  </div>
                </div>

                {alumnus.education && (
                  <div className="flex items-start gap-2.5 text-xs">
                    <GraduationCap className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-800">Higher Education</p>
                      <p className="text-zinc-600 mt-0.5 font-medium">{alumnus.education}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Skills / Expertise */}
            <section className="bg-zinc-50/50 rounded-2xl p-5 border border-zinc-100 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Core Expertise</h4>
              <div className="flex flex-wrap gap-1.5">
                {alumnus.skills && alumnus.skills.length > 0 ? (
                  alumnus.skills.map((skill, index) => (
                    <span 
                      key={`${alumnus.id}-skills-${index}`} 
                      className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500 italic">No skills listed</span>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Edit/Suggest Modal Overlay */}
      {showEditModal && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-[200] animate-fadeIn p-4">
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-zinc-900" />
                  {isAdminLike ? 'Edit Alumnus Profile' : 'Suggest Profile Edits'}
                </h3>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                  {isAdminLike 
                    ? 'Your changes will be saved directly into the live database.' 
                    : 'Your suggestions will be submitted to the Placement Committee for approval.'}
                </p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {toastMsg && (
              <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                toastMsg.type === 'error'
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {toastMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                {toastMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Designation / Role</label>
                  <input 
                    type="text" 
                    value={formRole} 
                    onChange={e => setFormRole(e.target.value)} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                    placeholder="e.g. Director of Operations"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Organization / Company</label>
                  <input 
                    type="text" 
                    value={formCompany} 
                    onChange={e => setFormCompany(e.target.value)} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                    placeholder="e.g. World Health Organization"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Location</label>
                <input 
                  type="text" 
                  value={formLocation} 
                  onChange={e => setFormLocation(e.target.value)} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                  placeholder="e.g. Geneva, Switzerland"
                />
              </div>

              {isSuperAdminOrAdmin ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <input 
                      type="email" 
                      value={formEmail} 
                      onChange={e => setFormEmail(e.target.value)} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                      placeholder="e.g. graduate@alumni.com"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone Number</label>
                    <input 
                      type="text" 
                      value={formPhone} 
                      onChange={e => setFormPhone(e.target.value)} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">LinkedIn URL</label>
                <input 
                  type="text" 
                  value={formLinkedin} 
                  onChange={e => setFormLinkedin(e.target.value)} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                  placeholder="e.g. https://linkedin.com/in/username"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Core Expertise (comma-separated)</label>
                <input 
                  type="text" 
                  value={formSkills} 
                  onChange={e => setFormSkills(e.target.value)} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                  placeholder="e.g. Policy Advocacy, Fundraising, Strategic Partnerships"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Higher Education / Degree</label>
                <input 
                  type="text" 
                  value={formEducation} 
                  onChange={e => setFormEducation(e.target.value)} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 shadow-sm"
                  placeholder="e.g. Master of Public Administration - Harvard Kennedy School"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    isAdminLike ? 'Save Changes' : 'Submit Suggestions'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
