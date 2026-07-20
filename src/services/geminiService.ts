import { GoogleGenAI } from "@google/genai";
import { Alumni } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const analyzeTrajectory = async (alumnus: Alumni) => {
  const prompt = `
    You are an expert, professional career intelligence and alumni analysis assistant.
    Generate a comprehensive, highly detailed, structured Career Trajectory & Alumni Insights Report for this alumnus.
    
    CRITICAL INSTRUCTIONS:
    1. You MUST ONLY use the provided dataset fields. Do NOT use any external information or search the web.
    2. Do NOT invent, assume, or hallucinate any experience, qualifications, achievements, start/end years, roles, or companies that are not explicitly present in the provided JSON data.
    3. Output the report in beautiful Markdown with the following specific sections:
       
       ### 1. Executive Summary
       Provide a highly accurate, professional career summary of approximately 100-150 words.
       
       ### 2. Career Progression Analysis
       Analyze and describe:
       - **Career Growth Pattern**: Describe how their career has grown over time.
       - **Functional Expertise & Specialization**: Their main professional areas and domain specializations.
       - **Leadership Progression**: Growth in seniority and responsibilities.
       - **Typical Roles Held**: Categories and types of titles they usually have.
       - **Career Transition Patterns**: Transition between organizations, roles, or sectors.
       - **Skills Gained at Each Stage**: Map specific skills to different milestones of their career.
       - **Current Level**: Explicitly state and justify whether they are at an Entry, Mid, Senior, or Leadership level.

       ### 3. Career Growth Insights
       Provide actionable strategic insights about:
       - **Progression Speed & Promotion Intervals**: Assessment of their career speed and advancement.
       - **Stability vs. Job Switching**: Balance between tenure length and switching employers.
       - **Cross-Sector Mobility**: Ability to traverse different organization types or sectors.
       - **International Exposure**: Geographic footprint and exposure.
       - **Suggested Future Career Direction**: Concrete recommendations for their next logical career step.

    4. INSUFFICIENT DATA RULE: If the provided data contains very limited details (e.g. only a name and a single job title, with no skill details or career description, or if most fields are blank or NA), you MUST output exactly:
       "Career summary cannot be generated from available data."
       Do not attempt to make up or invent any career history.
    
    Alumnus Dataset:
    Name: ${alumnus.name}
    Batch: ${alumnus.batch}
    Department: ${alumnus.department}
    Current Role: ${alumnus.currentRole} at ${alumnus.currentCompany}
    Location: ${alumnus.location}
    Email: ${alumnus.email}
    Skills: ${alumnus.skills.join(', ') || 'None provided'}
    Education: ${alumnus.education || 'None provided'}
    Phone: ${alumnus.phone || 'None provided'}
    Career History Trajectory:
    ${alumnus.trajectory.length > 0 
      ? alumnus.trajectory.map((step, i) => `${i + 1}. ${step.role} at ${step.company} (${step.location || 'Remote'}) - ${step.startDate || 'N/A'} to ${step.endDate || 'N/A'}. Sector: ${step.sector || 'N/A'}, Industry: ${step.industry || 'N/A'}, Employment Type: ${step.employmentType || 'N/A'}`).join('\n')
      : 'None provided'
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return response.text?.trim() || "Career summary cannot be generated from available data.";
  } catch (error) {
    console.error("Error analyzing trajectory:", error);
    return "Career summary cannot be generated from available data.";
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error syncing with LinkedIn:", error);
    return { hasUpdates: false, error: "Sync service temporarily unavailable" };
  }
};

export const getBatchTrends = async (batch: number | string, alumni: Alumni[]) => {
  const batchAlumni = alumni.filter(a => a.batch === batch);
  const prompt = `
    Analyze the career trends for the Batch of ${batch}.
    Total Alumni in this sample: ${batchAlumni.length}
    
    Top Companies: ${JSON.stringify(getTopItems(batchAlumni.map(a => a.currentCompany)))}
    Top Roles: ${JSON.stringify(getTopItems(batchAlumni.map(a => a.currentRole)))}
    
    Provide a high-level summary of where this batch is now, common career pivots they've made, and the overall industry distribution.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return response.text;
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const text = response.text || "[]";
    const parsed = JSON.parse(text);
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing file with Gemini:", error);
    throw new Error("Gemini AI failed to parse this file. Please ensure it is a high-quality PDF, image, or CSV spreadsheet.");
  }
};

function getTopItems(items: string[]) {
  const counts: Record<string, number> = {};
  items.forEach(item => counts[item] = (counts[item] || 0) + 1);
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating batch comparison:", error);
    return "Comparative analysis temporarily unavailable.";
  }
};

