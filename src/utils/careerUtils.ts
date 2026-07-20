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
        city = 'Remote';
        country = 'India';
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
