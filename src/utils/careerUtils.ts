import { Alumni, CareerStep } from '../types';

/**
 * Enriches the career steps with inferred fields when they are not explicitly provided
 */
export function enrichTrajectory(trajectory: CareerStep[]): (CareerStep & { orgType: string })[] {
  if (!trajectory) return [];
  
  return trajectory.map((step, idx) => {
    // 1. Employment Type
    let employmentType = step.employmentType || '';
    if (!employmentType) {
      const rLower = (step.role || '').toLowerCase();
      if (rLower.includes('intern') || rLower.includes('trainee')) employmentType = 'Internship';
      else if (rLower.includes('fellow')) employmentType = 'Fellowship';
      else if (rLower.includes('consultant')) employmentType = 'Consultant';
      else if (rLower.includes('advisor') || rLower.includes('advisory')) employmentType = 'Advisor';
      else if (rLower.includes('contract') || rLower.includes('freelance')) employmentType = 'Contract';
      else employmentType = 'Full-time';
    }

    // 2. City & Country
    let city = step.city || '';
    let country = step.country || '';
    if (!city || !country) {
      const loc = step.location || '';
      if (loc.includes('/')) {
        const parts = loc.split('/');
        city = parts[0]?.trim() || '';
        country = parts[1]?.trim() || 'India';
      } else if (loc.includes(',')) {
        const parts = loc.split(',');
        city = parts[0]?.trim() || '';
        country = parts[1]?.trim() || 'India';
      } else if (loc) {
        city = loc;
        country = loc.toLowerCase().includes('usa') || loc.toLowerCase().includes('dc') || loc.toLowerCase().includes('york') 
          ? 'USA' 
          : (loc.toLowerCase().includes('london') || loc.toLowerCase().includes('uk') ? 'UK' : 'India');
      } else {
        city = 'Location Not Available';
        country = 'Location Not Available';
      }
    }

    // 3. Organization Type
    const companyLower = (step.company || '').toLowerCase();
    let orgType = 'Corporate';
    if (companyLower.includes('foundation') || companyLower.includes('trust') || companyLower.includes('charity') || companyLower.includes('ngo') || companyLower.includes('united for') || companyLower.includes('youth4jobs')) {
      orgType = 'NGO';
    } else if (companyLower.includes('consulting') || companyLower.includes('consultancy') || companyLower.includes('insights') || companyLower.includes('advisory') || companyLower.includes('behavioral insights')) {
      orgType = 'Consulting';
    } else if (companyLower.includes('government') || companyLower.includes('govt') || companyLower.includes('ministry') || companyLower.includes('department of') || companyLower.includes('municipal') || companyLower.includes('office')) {
      orgType = 'Government';
    } else if (companyLower.includes('university') || companyLower.includes('college') || companyLower.includes('school') || companyLower.includes('academy') || companyLower.includes('institute') || companyLower.includes('edinburgh') || companyLower.includes('columbia')) {
      orgType = 'Academic Institution';
    } else if (companyLower.includes('un ') || companyLower.includes('united nations') || companyLower.includes('who') || companyLower.includes('world bank') || companyLower.includes('imf') || companyLower.includes('unesco') || companyLower.includes('development agency')) {
      orgType = 'International Organization';
    } else if (companyLower.includes('think tank') || companyLower.includes('policy labs') || companyLower.includes('sambodhi') || companyLower.includes('j-pal') || companyLower.includes('research')) {
      orgType = 'Think Tank';
    } else if (companyLower.includes('startup') || companyLower.includes('intelehealth')) {
      orgType = 'Social Enterprise';
    } else if (companyLower.includes('marketing') || companyLower.includes('digital flame')) {
      orgType = 'Startup';
    }

    // 4. Sector & Industry
    let sector = step.sector || '';
    let industry = step.industry || '';
    
    if (!sector) {
      const rLower = (step.role || '').toLowerCase();
      const cLower = (step.company || '').toLowerCase();
      if (rLower.includes('policy') || cLower.includes('policy') || rLower.includes('advocacy') || cLower.includes('advocacy')) sector = 'Public Policy';
      else if (rLower.includes('sustainability') || cLower.includes('sustainability') || rLower.includes('esg') || cLower.includes('esg') || rLower.includes('climate') || cLower.includes('climate') || rLower.includes('environment')) sector = 'Climate';
      else if (rLower.includes('health') || cLower.includes('health') || rLower.includes('mental') || cLower.includes('mental') || cLower.includes('intelehealth')) sector = 'Healthcare';
      else if (rLower.includes('education') || cLower.includes('education') || rLower.includes('teach') || cLower.includes('teach') || rLower.includes('school') || cLower.includes('school') || rLower.includes('academic')) sector = 'Education';
      else if (rLower.includes('evaluation') || cLower.includes('evaluation') || rLower.includes('mle') || cLower.includes('mle') || rLower.includes('monitoring') || cLower.includes('monitoring') || rLower.includes('m&e')) sector = 'Monitoring & Evaluation';
      else if (rLower.includes('research') || cLower.includes('research') || rLower.includes('data') || cLower.includes('data') || cLower.includes('study')) sector = 'Research';
      else if (cLower.includes('ngo') || cLower.includes('foundation') || cLower.includes('charity')) sector = 'Social Impact';
      else if (rLower.includes('finance') || cLower.includes('finance') || rLower.includes('bank') || cLower.includes('bank') || rLower.includes('economic') || cLower.includes('economic')) sector = 'Finance';
      else if (rLower.includes('consulting') || cLower.includes('consulting') || rLower.includes('advisor') || cLower.includes('advisor')) sector = 'Consulting';
      else if (rLower.includes('operation') || cLower.includes('operation')) sector = 'Operations';
      else if (rLower.includes('strategy') || cLower.includes('strategy')) sector = 'Strategy';
      else if (rLower.includes('tech') || cLower.includes('tech') || rLower.includes('software') || cLower.includes('software') || rLower.includes('developer')) sector = 'Technology';
      else sector = 'Social Impact'; // default
    }

    if (!industry) {
      if (sector === 'Healthcare') industry = 'Mental Health / Digital Health';
      else if (sector === 'Public Policy') industry = 'Advisory & Policy Advocacy';
      else if (sector === 'Education') industry = 'Higher Education / Pedagogy';
      else if (sector === 'Climate') industry = 'Sustainability & Conservation';
      else if (sector === 'Finance') industry = 'Development Economics & Banking';
      else if (sector === 'Monitoring & Evaluation') industry = 'Data Evaluation & Impact Metrics';
      else industry = 'Development & NGO Operations';
    }

    // 5. Duration Calculation
    let duration = step.duration || '';
    if (!duration) {
      const sYear = parseInt(step.startDate);
      const eYear = step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate);
      if (!isNaN(sYear) && !isNaN(eYear)) {
        const diff = eYear - sYear;
        duration = diff <= 0 ? 'Less than a year' : `${diff} year${diff > 1 ? 's' : ''}`;
      } else {
        duration = '1 year';
      }
    }

    return {
      ...step,
      employmentType,
      city,
      country,
      sector,
      industry,
      duration,
      orgType
    };
  });
}

/**
 * Calculates total years of experience from trajectory.
 */
export function calculateYearsOfExperience(alumnus: Alumni): number {
  if (!alumnus.trajectory || alumnus.trajectory.length === 0) return 1;
  
  let totalYears = 0;
  alumnus.trajectory.forEach(step => {
    const s = parseInt(step.startDate);
    const e = step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate);
    if (!isNaN(s) && !isNaN(e)) {
      totalYears += Math.max(1, e - s);
    } else {
      totalYears += 1;
    }
  });
  
  return totalYears || 1;
}

/**
 * Categorizes an alumnus's experience level based on current role and years of experience.
 */
export function getExperienceLevel(alumnus: Alumni): 'Entry' | 'Mid' | 'Senior' | 'Leadership' {
  const role = (alumnus.currentRole || '').toLowerCase();
  const expYears = calculateYearsOfExperience(alumnus);
  
  if (
    role.includes('director') || 
    role.includes('vp') || 
    role.includes('vice president') || 
    role.includes('founder') || 
    role.includes('chief') || 
    role.includes('ceo') || 
    role.includes('cto') || 
    role.includes('head') || 
    role.includes('partner')
  ) {
    return 'Leadership';
  }
  
  if (role.includes('senior') || role.includes('sr') || role.includes('principal') || role.includes('lead') || expYears > 8) {
    return 'Senior';
  }
  
  if (role.includes('associate') || role.includes('manager') || role.includes('consultant') || role.includes('officer') || role.includes('analyst') || expYears > 2) {
    return 'Mid';
  }
  
  return 'Entry';
}

/**
 * Calculates advanced career statistics for an alumnus.
 */
export function getCareerStatistics(alumnus: Alumni) {
  const enriched = enrichTrajectory(alumnus.trajectory || []);
  const totalYears = calculateYearsOfExperience(alumnus);
  
  const orgs = new Set(enriched.map(step => (step.company || '').trim().toLowerCase()));
  const numOrgs = orgs.size;
  
  const numInternships = enriched.filter(step => step.employmentType === 'Internship').length;
  const numFullTime = enriched.filter(step => step.employmentType === 'Full-time').length;
  
  // Promotion count
  const companyCounts: Record<string, number> = {};
  enriched.forEach(step => {
    const co = (step.company || '').toLowerCase().trim();
    if (co) companyCounts[co] = (companyCounts[co] || 0) + 1;
  });
  let numPromotions = 0;
  Object.values(companyCounts).forEach(count => {
    if (count > 1) numPromotions += (count - 1);
  });
  
  // Tenures
  const tenures = enriched.map(step => {
    const s = parseInt(step.startDate);
    const e = step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate);
    return !isNaN(s) && !isNaN(e) ? Math.max(1, e - s) : 1;
  });
  
  const longestTenure = tenures.length > 0 ? Math.max(...tenures) : 0;
  const shortestTenure = tenures.length > 0 ? Math.min(...tenures) : 0;
  const avgTenure = tenures.length > 0 ? parseFloat((tenures.reduce((s, t) => s + t, 0) / tenures.length).toFixed(1)) : 0;
  
  const currentOrg = alumnus.currentCompany || (enriched[enriched.length - 1]?.company) || 'Independent';
  const currentPosition = alumnus.currentRole || (enriched[enriched.length - 1]?.role) || 'Independent Scholar';
  
  // Countries
  const countries = enriched.map(step => step.country).filter(Boolean);
  const currentCountry = enriched.find(step => step.endDate === 'Present')?.country || enriched[enriched.length - 1]?.country || 'India';
  
  return {
    totalYears,
    numOrgs,
    numInternships,
    numFullTime,
    numPromotions,
    avgTenure,
    longestTenure,
    shortestTenure,
    currentOrg,
    currentPosition,
    currentCountry,
    countries: Array.from(new Set(countries))
  };
}

export interface TrajectoryWarning {
  type: 'error' | 'warning' | 'info' | 'success';
  field: string;
  message: string;
  description: string;
}

/**
 * Scans an alumnus's career trajectory for missing, inconsistent, or anomalous data fields.
 */
export function analyzeTrajectoryQuality(alumnus: Alumni): TrajectoryWarning[] {
  const warnings: TrajectoryWarning[] = [];
  const steps = alumnus.trajectory || [];

  // Check email
  const isPlaceholderEmail = !alumnus.email || alumnus.email.endsWith('@alumni.com') || alumnus.email.includes('placeholder');
  if (isPlaceholderEmail) {
    warnings.push({
      type: 'warning',
      field: 'email',
      message: 'Placeholder Contact Email',
      description: `The email "${alumnus.email || 'N/A'}" is an auto-generated placeholder. Authentic contact information is missing.`
    });
  }

  // Check phone
  if (!alumnus.phone) {
    warnings.push({
      type: 'warning',
      field: 'phone',
      message: 'Missing Grounding Phone Number',
      description: 'No physical telephone or mobile contact number is registered for this alumnus.'
    });
  }

  // Check trajectory count
  if (steps.length === 0) {
    warnings.push({
      type: 'error',
      field: 'trajectory',
      message: 'No Professional Milestones',
      description: 'This alumnus profile has an empty professional trajectory. No career milestones were uploaded.'
    });
    return warnings;
  }

  // Check individual steps
  steps.forEach((step, idx) => {
    const roleLabel = step.role || 'Unspecified Role';
    const companyLabel = step.company || 'Unspecified Organization';

    // 1. Missing Role / Company
    if (!step.role || step.role.toLowerCase() === 'alumnus' || step.role.toLowerCase() === 'graduate') {
      warnings.push({
        type: 'warning',
        field: 'role',
        message: `Generic Title at Milestone #${idx + 1}`,
        description: `Designation is listed as generic "${step.role || 'empty'}". Explicit designation details were missing in sheet.`
      });
    }
    if (!step.company || step.company.toLowerCase() === 'independent' || step.company.toLowerCase() === 'n/a') {
      warnings.push({
        type: 'warning',
        field: 'company',
        message: `Generic Employer at Milestone #${idx + 1}`,
        description: `Organization is listed as "${step.company || 'empty'}". Specific corporate or institutional entity was not defined.`
      });
    }

    // 2. Chronological order & range integrity
    const sYear = parseInt(step.startDate);
    const eYear = step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate);
    
    if (isNaN(sYear)) {
      warnings.push({
        type: 'error',
        field: 'startDate',
        message: `Invalid Start Year at Milestone #${idx + 1}`,
        description: `Start year "${step.startDate}" is non-numeric or missing. Cannot calculate career duration.`
      });
    }
    
    if (step.endDate !== 'Present' && isNaN(parseInt(step.endDate))) {
      warnings.push({
        type: 'error',
        field: 'endDate',
        message: `Invalid End Year at Milestone #${idx + 1}`,
        description: `End year "${step.endDate}" is non-numeric or missing.`
      });
    }

    if (!isNaN(sYear) && step.endDate !== 'Present' && !isNaN(eYear) && sYear > eYear) {
      warnings.push({
        type: 'error',
        field: 'dates',
        message: `Reverse Chronology at Milestone #${idx + 1}`,
        description: `Start year (${sYear}) is listed after End year (${eYear}) for "${roleLabel}" at "${companyLabel}".`
      });
    }

    // 3. Location issues
    if (!step.location || step.location.includes('Not Available')) {
      warnings.push({
        type: 'warning',
        field: 'location',
        message: `Unspecified Location at Milestone #${idx + 1}`,
        description: `No physical city or country was registered for "${roleLabel}" at "${companyLabel}".`
      });
    }

    // 4. Inferred fields vs raw fields
    if (!step.sector) {
      warnings.push({
        type: 'info',
        field: 'sector',
        message: `Auto-Inferred Sector at Milestone #${idx + 1}`,
        description: `The sector was automatically inferred based on keywords in the role and company.`
      });
    }

    if (!step.industry) {
      warnings.push({
        type: 'info',
        field: 'industry',
        message: `Auto-Inferred Industry at Milestone #${idx + 1}`,
        description: `The industry classification was automatically mapped from the primary sector.`
      });
    }
  });

  // Check temporal integrity across milestones (overlaps and gaps)
  const sortedSteps = [...steps]
    .map((step, originalIndex) => ({
      step,
      index: originalIndex,
      sYear: parseInt(step.startDate),
      eYear: step.endDate === 'Present' ? new Date().getFullYear() : parseInt(step.endDate)
    }))
    .filter(item => !isNaN(item.sYear) && !isNaN(item.eYear))
    .sort((a, b) => a.sYear - b.sYear);

  for (let i = 0; i < sortedSteps.length - 1; i++) {
    const current = sortedSteps[i];
    const next = sortedSteps[i + 1];

    // Check overlap (exclusive of same year start/end which is normal transition)
    if (current.eYear > next.sYear) {
      warnings.push({
        type: 'warning',
        field: 'overlap',
        message: `Overlapping Trajectory Range`,
        description: `Milestone #${current.index + 1} (${current.step.company}: ending ${current.step.endDate}) overlaps with Milestone #${next.index + 1} (${next.step.company}: starting ${next.step.startDate}).`
      });
    }

    // Check gaps (2+ years)
    const gap = next.sYear - current.eYear;
    if (gap >= 2) {
      warnings.push({
        type: 'info',
        field: 'gap',
        message: `Chronological Gap Detected (${gap} years)`,
        description: `There is a gap of ${gap} years between "${current.step.company}" (ended ${current.step.endDate}) and "${next.step.company}" (started ${next.step.startDate}).`
      });
    }
  }

  // If zero errors/warnings, push success
  const criticalCount = warnings.filter(w => w.type === 'error' || w.type === 'warning').length;
  if (criticalCount === 0) {
    warnings.unshift({
      type: 'success',
      field: 'overall',
      message: 'Pristine Data Integrity',
      description: 'All trajectory milestones, dates, locations, and structural variables align with zero detected anomalies!'
    });
  }

  return warnings;
}
