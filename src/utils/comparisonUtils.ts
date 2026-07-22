import { Alumni } from '../types';
import { getExperienceLevel, calculateYearsOfExperience, enrichTrajectory } from './careerUtils';

export interface BatchComparisonMetrics {
  count: number;
  leadershipPercent: number;
  corpConsultingPercent: number;
  socialNGOPercent: number;
  globalReachPercent: number;
  academiaResearchPercent: number;
  avgRoles: number;
  experiencePercent: number;
  topEmployer: string;
  topSector: string;
  topRole: string;
  avgExperience: number;
  expLevelSplit: { Entry: number; Mid: number; Senior: number; Leadership: number };
}

export function getBatchComparisonMetrics(batchStr: string, list: Alumni[]): BatchComparisonMetrics {
  const batchAlumni = list.filter(a => String(a.batch) === batchStr);
  const totalCount = batchAlumni.length;
  
  if (totalCount === 0) {
    return {
      count: 0,
      leadershipPercent: 0,
      corpConsultingPercent: 0,
      socialNGOPercent: 0,
      globalReachPercent: 0,
      academiaResearchPercent: 0,
      avgRoles: 0,
      experiencePercent: 0,
      topEmployer: 'None',
      topSector: 'None',
      topRole: 'None',
      avgExperience: 0,
      expLevelSplit: { Entry: 0, Mid: 0, Senior: 0, Leadership: 0 }
    };
  }

  // 1. Leadership % (Senior or Leadership levels)
  let seniorOrLeadershipCount = 0;
  const expLevelSplit = { Entry: 0, Mid: 0, Senior: 0, Leadership: 0 };
  
  batchAlumni.forEach(a => {
    const level = getExperienceLevel(a);
    expLevelSplit[level] = (expLevelSplit[level] || 0) + 1;
    if (level === 'Senior' || level === 'Leadership') {
      seniorOrLeadershipCount++;
    }
  });
  const leadershipPercent = parseFloat(((seniorOrLeadershipCount / totalCount) * 100).toFixed(1));

  // 2. Corp & Consulting % (Corporate, Consulting, or Startup)
  let corpConsultingCount = 0;
  batchAlumni.forEach(a => {
    const enriched = enrichTrajectory(a.trajectory || []);
    const latestStep = enriched[enriched.length - 1];
    if (latestStep) {
      const orgType = latestStep.orgType || 'Corporate';
      if (orgType === 'Corporate' || orgType === 'Consulting' || orgType === 'Startup') {
        corpConsultingCount++;
      }
    }
  });
  const corpConsultingPercent = parseFloat(((corpConsultingCount / totalCount) * 100).toFixed(1));

  // 3. Social & NGO Focus % (NGO, Social Enterprise, Government, International Organization)
  let socialNGOCount = 0;
  batchAlumni.forEach(a => {
    const enriched = enrichTrajectory(a.trajectory || []);
    const latestStep = enriched[enriched.length - 1];
    if (latestStep) {
      const orgType = latestStep.orgType || 'Corporate';
      if (orgType === 'NGO' || orgType === 'Social Enterprise' || orgType === 'Government' || orgType === 'International Organization') {
        socialNGOCount++;
      }
    }
  });
  const socialNGOPercent = parseFloat(((socialNGOCount / totalCount) * 100).toFixed(1));

  // 4. Global Reach % (relocation international or international career steps)
  let globalReachCount = 0;
  batchAlumni.forEach(a => {
    const enriched = enrichTrajectory(a.trajectory || []);
    const hasInternational = enriched.some(step => step.country && step.country.toLowerCase() !== 'india');
    if (hasInternational) {
      globalReachCount++;
    }
  });
  const globalReachPercent = parseFloat(((globalReachCount / totalCount) * 100).toFixed(1));

  // 5. Academia & Research Intensity % (Research/Education sector or Academic/Think Tank OrgType)
  let academiaResearchCount = 0;
  batchAlumni.forEach(a => {
    const enriched = enrichTrajectory(a.trajectory || []);
    const latestStep = enriched[enriched.length - 1];
    if (latestStep) {
      const sector = latestStep.sector || '';
      const orgType = latestStep.orgType || '';
      if (sector === 'Research' || sector === 'Education' || orgType === 'Academic Institution' || orgType === 'Think Tank') {
        academiaResearchCount++;
      }
    }
  });
  const academiaResearchPercent = parseFloat(((academiaResearchCount / totalCount) * 100).toFixed(1));

  // 6. Experience / Growth Momentum (Avg roles normalized 0-100)
  const totalRoles = batchAlumni.reduce((sum, a) => sum + (a.trajectory?.length || 1), 0);
  const avgRoles = parseFloat((totalRoles / totalCount).toFixed(1));
  const experiencePercent = parseFloat((Math.min(100, (avgRoles / 5) * 100)).toFixed(1));

  // Average experience in years
  const totalExpYears = batchAlumni.reduce((sum, a) => sum + calculateYearsOfExperience(a), 0);
  const avgExperience = parseFloat((totalExpYears / totalCount).toFixed(1));

  // Top Employer
  const employerCounts = batchAlumni.reduce((acc, a) => {
    const co = a.currentCompany || 'Independent';
    if (co !== 'Independent' && co !== 'N/A' && co !== 'None' && co !== 'Alumnus') {
      acc[co] = (acc[co] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const sortedEmployers = Object.entries(employerCounts).sort(([, a], [, b]) => b - a);
  const topEmployer = sortedEmployers[0] ? sortedEmployers[0][0] : 'Various';

  // Top Sector
  const sectorCounts = batchAlumni.reduce((acc, a) => {
    const enriched = enrichTrajectory(a.trajectory || []);
    const latestStep = enriched[enriched.length - 1];
    if (latestStep && latestStep.sector) {
      acc[latestStep.sector] = (acc[latestStep.sector] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const sortedSectors = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a);
  const topSector = sortedSectors[0] ? sortedSectors[0][0] : 'Various';

  return {
    count: totalCount,
    leadershipPercent,
    corpConsultingPercent,
    socialNGOPercent,
    globalReachPercent,
    academiaResearchPercent,
    avgRoles,
    experiencePercent,
    topEmployer,
    topSector,
    topRole: 'Various',
    avgExperience,
    expLevelSplit
  };
}
