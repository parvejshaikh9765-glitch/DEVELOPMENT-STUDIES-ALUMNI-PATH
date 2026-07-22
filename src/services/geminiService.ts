import { Alumni } from "../types";

// In-memory cache for generated AI profile summaries to improve speed and coverage
const profileSummaryCache = new Map<string, string>();

export const generateClientFallbackSummary = (alumnus: Alumni): string => {
  const name = alumnus.name || 'Alumnus';
  const role = alumnus.currentRole || 'Professional';
  const company = alumnus.currentCompany || 'N/A';
  const skills = Array.isArray(alumnus.skills) && alumnus.skills.length > 0
    ? alumnus.skills.join(', ')
    : 'Public Policy, Quantitative Analysis, Strategic Advisory, Stakeholder Management';
  const batch = alumnus.batch || 'Recent Cohort';
  const dept = alumnus.department || 'Public Policy & Governance';
  const location = alumnus.location || 'India';
  const trajectory = Array.isArray(alumnus.trajectory) ? alumnus.trajectory : [];
  
  const currentYear = 2026;
  const gradYear = parseInt(String(batch), 10) || 2020;
  const yearsExp = Math.max(1, currentYear - gradYear);
  
  let seniorityLevel = 'Mid-Level Specialist';
  if (yearsExp >= 8) seniorityLevel = 'Senior Executive / Director Level';
  else if (yearsExp >= 4) seniorityLevel = 'Mid-Senior Lead';
  else seniorityLevel = 'Early Career / Associate';

  let trajectoryText = '';
  if (trajectory.length > 0) {
    trajectoryText = trajectory.map((t, i) => 
      `- **Milestone ${i+1}**: ${t.role || 'Role'} at **${t.company || 'Organization'}** (${t.startDate || 'N/A'} - ${t.endDate || 'Present'})${t.description ? `: ${t.description}` : ''}`
    ).join('\n');
  } else {
    trajectoryText = `- **Current Primary Role**: ${role} at **${company}** (${location})\n- **Academic Foundation**: ${dept} (Batch ${batch})`;
  }

  return `### 1. Executive Profile & Career Summary
**${name}** is a **${seniorityLevel}** currently serving as **${role}** at **${company}**. An alumnus of the **${dept}** program (Batch ${batch}), they possess approximately **${yearsExp} years** of post-graduation industry experience in policy formulation, strategic execution, and organizational advisory.

### 2. Career Progression & Functional Competencies
- **Seniority & Trajectory Level**: Positioned as **${seniorityLevel}** with demonstrated functional leadership and domain accountability.
- **Core Domain Competencies**: Key expertise in **${skills}**.
- **Organizational Footprint**: Driving key operational and strategic initiatives at **${company}** in **${location}**.
- **Historical Trajectory Highlights**:
${trajectoryText}

### 3. Growth Trajectory & Future Recommendations
- **Progression Velocity**: Consistent upward advancement aligning with cohort peer benchmarks for Batch ${batch}.
- **Domain Focus**: Strong potential for senior policy leadership, cross-sector consultancy, and director-level oversight.
- **Strategic Action Plan**:
  1. Leverage existing network at **${company}** to lead high-visibility strategic programs.
  2. Pursue executive certifications or cross-functional leadership in emerging development sectors.`;
};

export const analyzeTrajectory = async (alumnus: Alumni): Promise<string> => {
  const cacheKey = `summary_${alumnus.id}_${alumnus.batch}_${alumnus.currentRole}_${alumnus.currentCompany}`;
  if (profileSummaryCache.has(cacheKey)) {
    return profileSummaryCache.get(cacheKey)!;
  }

  const skillsFormatted = Array.isArray(alumnus.skills) && alumnus.skills.length > 0
    ? alumnus.skills.join(', ')
    : 'Public Policy, Strategic Analysis, Stakeholder Engagement, Program Evaluation';

  const trajectoryFormatted = Array.isArray(alumnus.trajectory) && alumnus.trajectory.length > 0 
    ? alumnus.trajectory.map((step, i) => `${i + 1}. ${step.role} at ${step.company} (${step.location || 'Remote'}) - ${step.startDate || 'N/A'} to ${step.endDate || 'Present'}. Sector: ${step.sector || 'Policy'}, Description: ${step.description || 'N/A'}`).join('\n')
    : `1. Current: ${alumnus.currentRole} at ${alumnus.currentCompany} (${alumnus.location || 'Location Not Available'}).`;

  const prompt = `
    You are an expert executive career strategist and alumni intelligence advisor.
    Generate a comprehensive, highly insightful, professional Executive Career & Profile Summary for the candidate below.

    CRITICAL REQUIREMENTS:
    - ALWAYS generate a full, highly professional summary for the candidate. NEVER refuse or state that data is insufficient.
    - Synthesize all available candidate data including current role, organization, graduation batch cohort, department, skills, and career history.
    - Infer career seniority based on batch year (e.g. Batch ${alumnus.batch}) and current designation (${alumnus.currentRole}).
    - Output in Markdown using the exact 3 sections below:

    ### 1. Executive Profile & Career Summary
    Write a polished, 100-150 word executive narrative highlighting ${alumnus.name}'s professional profile as ${alumnus.currentRole} at ${alumnus.currentCompany}, their academic background in ${alumnus.department} (Batch ${alumnus.batch}), and their core impact in their sector.

    ### 2. Career Progression Analysis
    - **Seniority & Trajectory Tier**: State and justify their career tier (e.g., Mid-Level Lead, Senior Executive, Early Career Associate) based on their graduation batch (${alumnus.batch}) and designation.
    - **Functional Competencies & Domain Expertise**: Highlight key competencies in ${skillsFormatted}.
    - **Organizational & Sectorial Impact**: Describe the responsibilities and impact delivered in their role at ${alumnus.currentCompany}.
    - **Career Milestones**: Summarize key steps or career transitions.

    ### 3. Career Growth Insights & Recommendations
    - **Progression Velocity**: Evaluate advancement velocity and stability.
    - **Domain Expansion Potential**: Identify adjacent policy, consulting, or leadership verticals they are well-positioned for.
    - **Strategic Action Plan**: Provide 2 concrete recommendations for their next career milestone.

    Candidate Information:
    Name: ${alumnus.name}
    Batch: ${alumnus.batch}
    Department: ${alumnus.department}
    Current Role: ${alumnus.currentRole} at ${alumnus.currentCompany}
    Location: ${alumnus.location}
    Skills: ${skillsFormatted}
    Education: ${alumnus.education || 'Master of Public Policy / Higher Education'}
    Career Steps:
    ${trajectoryFormatted}
  `;

  try {
    const res = await fetch('/api/ai/analyze-trajectory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, alumnus })
    });
    if (!res.ok) throw new Error("API route returned non-OK status");
    const data = await res.json();
    if (data.text && data.text.trim().length > 50 && !data.text.includes('cannot be generated from available data')) {
      profileSummaryCache.set(cacheKey, data.text);
      return data.text;
    }
    const fallback = generateClientFallbackSummary(alumnus);
    profileSummaryCache.set(cacheKey, fallback);
    return fallback;
  } catch (e) {
    console.error("Error analyzing trajectory:", e);
    const fallback = generateClientFallbackSummary(alumnus);
    profileSummaryCache.set(cacheKey, fallback);
    return fallback;
  }
};

export const syncAlumnusData = async (alumnus: Alumni) => {
  const prompt = `
    Find the most recent professional information on LinkedIn for this candidate.
    We must prevent false matches at all costs. Verify using multiple fields below.
    
    Candidate Data to Verify:
    - Name: ${alumnus.name}
    - Current Role (in our records): ${alumnus.currentRole} at ${alumnus.currentCompany}
    - Batch Year: ${alumnus.batch}
    - Department: ${alumnus.department}
    - Location: ${alumnus.location}
    - Education: ${alumnus.education || 'N/A'}

    CRITICAL INSTRUCTIONS:
    1. Search LinkedIn and find the profile of this exact candidate.
    2. Check if they have a new role or company.
    3. Validate that the LinkedIn profile matches the candidate using Name, Organization, Designation, Location, and Education to prevent any false match.
    4. If no verified LinkedIn profile matches this person, or if there is any ambiguity, return hasUpdates as false.
    
    Return the data in the following JSON format:
    {
      "hasUpdates": boolean,
      "currentRole": "string",
      "currentCompany": "string",
      "location": "string",
      "summaryOfChanges": "string"
    }
    If no updates are found, set hasUpdates to false.
  `;

  try {
    const res = await fetch('/api/ai/sync-linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    try {
      return JSON.parse(data.text);
    } catch {
      return { hasUpdates: false };
    }
  } catch (error) {
    console.error("Error syncing LinkedIn data:", error);
    return { hasUpdates: false };
  }
};

export const enrichAlumnusWithLinkedInAI = async (alumnus: Alumni) => {
  const prompt = `
    Search for this alumnus's LinkedIn profile and pull their complete career history.
    Name: ${alumnus.name}
    Education: ${alumnus.education || 'N/A'}
    Current Role: ${alumnus.currentRole} at ${alumnus.currentCompany}

    Return the verified information in this strict JSON format:
    {
      "isValidMatch": boolean,
      "confidenceScore": number, // 0 to 100
      "explanation": "string describing why this is or isn't a match",
      "profile": {
        "headline": "string",
        "location": "string",
        "industry": "string",
        "skills": ["string"],
        "trajectory": [
          {
            "company": "string",
            "role": "string",
            "startDate": "string",
            "endDate": "string",
            "location": "string",
            "description": "string"
          }
        ]
      }
    }
  `;

  try {
    const res = await fetch('/api/ai/enrich-alumnus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return JSON.parse(data.text || "{}");
  } catch (error) {
    console.error("Error enriching alumnus with LinkedIn:", error);
    return {
      isValidMatch: false,
      confidenceScore: 0,
      explanation: "Failed to connect to the LinkedIn enrichment service."
    };
  }
};

export const getBatchTrends = async (batch: number | string, alumni: Alumni[]) => {
  const batchAlumni = alumni.filter(a => String(a.batch) === String(batch));
  
  const getTopItems = (items: string[]) => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      if (item) counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  const prompt = `
    Analyze the career trends for the Batch of ${batch}.
    Total Alumni in this sample: ${batchAlumni.length}
    
    Top Companies: ${JSON.stringify(getTopItems(batchAlumni.map(a => a.currentCompany)))}
    Top Roles: ${JSON.stringify(getTopItems(batchAlumni.map(a => a.currentRole)))}
    
    Provide a high-level summary of where this batch is now, common career pivots they've made, and the overall industry distribution.
  `;

  const topCompaniesList = getTopItems(batchAlumni.map(a => a.currentCompany)).map(x => x.name).join(', ');
  const topRolesList = getTopItems(batchAlumni.map(a => a.currentRole)).map(x => x.name).join(', ');
  try {
    const res = await fetch('/api/ai/batch-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        batch,
        topCompanies: topCompaniesList,
        topRoles: topRolesList
      })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.text;
  } catch (error) {
    console.error("Error analyzing batch trends:", error);
    return "Trend analysis currently unavailable.";
  }
};

export const parseAlumniDataWithAI = async (rawText: string): Promise<Alumni[]> => {
  const prompt = `
    You are an expert data migration assistant. Parse the following raw unstructured text or copy-pasted list containing alumni details into a structured JSON array matching our database schema.
    
    Each alumnus object in the JSON array MUST match this TypeScript type structure exactly:
    {
      "id": "string", // Generate a unique identifier starting with 'imported-', e.g., "imported-1", "imported-2", etc.
      "name": "string",
      "batch": number, // e.g. 2018. MUST be a number, not a string.
      "department": "string", // e.g., "Public Policy", "Economics", "Management", "Social Work", "Development Studies"
      "currentRole": "string",
      "currentCompany": "string",
      "location": "string", // e.g. "Delhi, India" or "Remote / London"
      "email": "string",
      "linkedinUrl": "string", // optional, LinkedIn profile URL if mentioned. Empty string if not.
      "trajectory": [ // Array of career steps. If only current job is mentioned, make a single entry matching the current role.
        {
          "id": "string", // Unique ID
          "company": "string",
          "role": "string",
          "startDate": "string", // e.g., "2020" or "2021"
          "endDate": "string", // "Present" or graduation year
          "location": "string"
        }
      ],
      "skills": ["string"], // Array of skill strings, e.g., ["Research", "Policy Analysis"]
      "avatarUrl": "string" // Generate empty string or placeholder initials.
    }

    The input text might be structured with sequential jobs (First job title after grad, First Employer/Org, Second job, etc.).
    Extract all jobs sequentially into the "trajectory" array (from oldest to newest). The last valid job in the sequence is their current role and company.
    Estimate realistic years for each job step starting from their graduation year (batch year).

    Raw text to parse:
    ${rawText}

    Return ONLY a valid JSON array of Alumni objects. Do not include any markdown code block wrappers (like \`\`\`json) or comments outside of the JSON block. It must be directly parseable by JSON.parse().
  `;

  try {
    const res = await fetch('/api/ai/parse-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const parsed = JSON.parse(data.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    throw new Error("AI parsing failed. Please check the text format or use the CSV column mapping tool instead.");
  }
};

export const parseAlumniFileWithAI = async (base64Data: string, mimeType: string, fileName?: string): Promise<Alumni[]> => {
  const prompt = `
    You are an expert data migration assistant. We have uploaded an alumni database sheet (it could be a PDF directory, a CSV/TSV table, or an Excel screenshot image).
    
    Parse this document and extract all alumni records. Focus on the tabular format matching the following column sequences:
    - Alumnus Name / Name of the Alumni
    - First job title after grad & First Employer/Org
    - Second job title after grad & Second Employer/Org
    - Third job title after grad & Third Employer/Org
    - Fourth job title after grad & Fourth Employer/Org
    - Fifth job title after grad & Fifth Employer/Org
    - Higher Studies (if any)
    - Linkedin Link
    - Phone Number
    - Email ID / Email Address

    Crucial Rules for Trajectory & Role Parsing:
    1. "trajectory": This is a chronological sequence of the person's professional steps. Build this array starting from the "First job title after grad" up to the last filled job title column (e.g., if columns 1, 2, 3, 4 are filled, trajectory should have 4 steps in that exact order). Ignore empty cells, "-" or "Not Found".
    2. "currentRole" & "currentCompany": This must match the LATEST filled job in the sequence (e.g. if the 4th job is their latest, that is their current role and company).
    3. "batch": Extract the graduation year (e.g., if the file says 'Batch of 2016-18', use 2018 as the batch year). If not specified in the document, default to 2018 or try to infer it from the file name: "${fileName || ''}".
    4. "department": Infer the department or major based on the roles/higher studies or default to "Public Policy" or "Economics".
    5. Estimate start/end dates for each trajectory step relative to their graduation batch (e.g. if they graduated in 2018, first job 2018-2020, second job 2020-2022, latest job 2022-Present).
    6. Generate empty string for avatarUrl.

    Return ONLY a valid JSON array of Alumni objects matching this exact TypeScript structure:
    {
      "id": "string", // Unique ID e.g. "imported-1", "imported-2"
      "name": "string",
      "batch": number,
      "department": "string",
      "currentRole": "string",
      "currentCompany": "string",
      "location": "string",
      "email": "string",
      "linkedinUrl": "string", // if LinkedIn link exists
      "trajectory": [
        {
          "id": "string",
          "company": "string",
          "role": "string",
          "startDate": "string",
          "endDate": "string",
          "location": "string"
        }
      ],
      "skills": ["string"], // Infer 3-5 key skills based on their roles
      "avatarUrl": "string"
    }

    Return ONLY the valid JSON block. No markdown, no triple backticks, no notes or warnings.
  `;

  try {
    const res = await fetch('/api/ai/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType, prompt })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const parsed = JSON.parse(data.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing file with Gemini:", error);
    throw new Error("Gemini AI failed to parse this file. Please ensure it is a high-quality PDF, image, or CSV spreadsheet.");
  }
};

export const getBatchComparisonAI = async (batchA: string, batchB: string, alumni: Alumni[]) => {
  const alumniA = alumni.filter(a => String(a.batch) === batchA);
  const alumniB = alumni.filter(a => String(a.batch) === batchB);

  const dataA = alumniA.map(a => ({
    name: a.name,
    currentRole: a.currentRole,
    currentCompany: a.currentCompany,
    location: a.location,
    skills: a.skills,
    rolesCount: a.trajectory?.length || 1
  }));

  const dataB = alumniB.map(a => ({
    name: a.name,
    currentRole: a.currentRole,
    currentCompany: a.currentCompany,
    location: a.location,
    skills: a.skills,
    rolesCount: a.trajectory?.length || 1
  }));

  const prompt = `
    You are an expert academic and professional career alignment analyst.
    Provide an elegant, highly analytical side-by-side comparative report between two alumni cohorts:
    
    Batch A (Class of ${batchA}): ${alumniA.length} alumni
    Batch B (Class of ${batchB}): ${alumniB.length} alumni

    Sample Alumni profiles from Class of ${batchA}:
    ${JSON.stringify(dataA.slice(0, 10))}

    Sample Alumni profiles from Class of ${batchB}:
    ${JSON.stringify(dataB.slice(0, 10))}

    Analyze:
    1. **Sector Alignment Shifts**: How did the sector focus evolve between Class of ${batchA} and Class of ${batchB}? Are graduates moving more towards Corporate Advisory, Government roles, or NGOs/Social impact?
    2. **Seniority and Velocity**: Compare their current leadership and seniority speeds based on their years of experience and career step sizes.
    3. **Skills Evolution**: Highlight any key skill shifts or domain changes between the two classes.
    4. **Geographic Distribution**: Note any international or domestic relocation hubs characteristic of either cohort.

    Format your report using professional, polished Markdown. Keep it concise, insightful, and focused on clear trajectory insights. Do not hallucinate or use external search knowledge; analyze only the patterns evident in the provided data.
  `;

  try {
    const res = await fetch('/api/ai/batch-comparison', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        batchA,
        batchB,
        countA: alumniA.length,
        countB: alumniB.length
      })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.text;
  } catch (error) {
    console.error("Error generating batch comparison:", error);
    return "Comparative analysis temporarily unavailable.";
  }
};

export interface PlacementEngineRecommendation {
  companyName: string;
  placementProbability: number;
  reasons: string[];
  recommendedFocusSkills: string[];
  suggestedStrategy: string;
  outreachDraft: string;
}

export interface PlacementEngineResponse {
  studentRecommendations: PlacementEngineRecommendation[];
  globalStrategySummary: string;
}

export const getAiPlacementRecommendations = async (
  studentProfile: any
): Promise<PlacementEngineResponse> => {
  try {
    const res = await fetch('/api/ai/placement-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentProfile })
    });
    if (!res.ok) {
      throw new Error('Placement engine call failed');
    }
    const data = await res.json();
    const parsedText = data.text ? JSON.parse(data.text) : {};
    return {
      studentRecommendations: parsedText.studentRecommendations || [],
      globalStrategySummary: parsedText.globalStrategySummary || ""
    };
  } catch (error) {
    console.error("Error invoking placement AI engine:", error);
    return {
      studentRecommendations: [],
      globalStrategySummary: "We encountered an issue connecting to the AI Placement Engine. Please try again."
    };
  }
};
