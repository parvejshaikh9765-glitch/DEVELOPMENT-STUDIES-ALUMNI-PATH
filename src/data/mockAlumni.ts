import { Alumni, CareerStep } from '../types';

const skillsPool = [
  'Policy Analysis', 'Research', 'Data Science', 'Project Management',
  'Strategic Planning', 'Monitoring & Evaluation', 'Public Health',
  'Sustainable Development', 'Economics', 'Community Development',
  'Stakeholder Engagement', 'Impact Assessment', 'Financial Modeling'
];

const createTrajectory = (steps: { role: string; company: string }[]): CareerStep[] => {
  return steps.map((step, i) => ({
    id: Math.random().toString(36).substr(2, 9),
    company: step.company,
    role: step.role,
    startDate: (2018 + i).toString(),
    endDate: i === steps.length - 1 ? 'Present' : (2019 + i).toString(),
    location: 'Remote / India',
    description: `Contributed to key initiatives at ${step.company} as a ${step.role}.`
  }));
};

export const mockAlumniData: Alumni[] = [
  {
    id: 'alumni-1',
    name: 'Aastha Sethi',
    batch: 2018,
    department: 'Public Policy',
    currentRole: 'Senior Officer, Policy and Advocacy',
    currentCompany: 'United for Global Mental Health',
    location: 'London / Remote',
    email: 'aastha.sethi7@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/aasthasethi',
    trajectory: createTrajectory([
      { role: "Consultant, CM's Office", company: "Govt of Maharashtra" },
      { role: "Project and Policy Officer", company: "The University of Edinburgh" },
      { role: "Advisor", company: "The Behavioural Insights Team" },
      { role: "Senior Officer, Policy and Advocacy", company: "United for Global Mental Health" }
    ]),
    skills: ['Policy Analysis', 'Global Health', 'Advocacy', 'Research'],
    avatarUrl: 'https://picsum.photos/seed/aastha/200/200'
  },
  {
    id: 'alumni-2',
    name: 'Abhishek Deshwal',
    batch: 2017,
    department: 'Economics',
    currentRole: 'Teaching Fellow',
    currentCompany: 'Columbia University',
    location: 'New York, USA',
    email: 'abhi.deshwal018@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/abhishekdeshwal',
    trajectory: createTrajectory([
      { role: "Research Associate", company: "J-PAL" },
      { role: "Consultant", company: "EPIC India" },
      { role: "Consultant", company: "World Bank" },
      { role: "Teaching Fellow", company: "Columbia University" }
    ]),
    skills: ['Sustainable Development', 'Economics', 'Research', 'Teaching'],
    avatarUrl: 'https://picsum.photos/seed/abhishek/200/200'
  },
  {
    id: 'alumni-3',
    name: 'Aditya Naskar',
    batch: 2019,
    department: 'Management',
    currentRole: 'Director-MLE',
    currentCompany: 'Intelehealth',
    location: 'Mumbai, India',
    email: 'adityanaskar@hotmail.com',
    linkedinUrl: 'https://linkedin.com/in/adityanaskar',
    trajectory: createTrajectory([
      { role: "Deputy Manager-Research", company: "Sambodhi" },
      { role: "Manager-MLE", company: "Intelehealth" },
      { role: "Policy Manager", company: "J-PAL" },
      { role: "Director-MLE", company: "Intelehealth" }
    ]),
    skills: ['Monitoring & Evaluation', 'Public Health', 'Management', 'Research'],
    avatarUrl: 'https://picsum.photos/seed/aditya/200/200'
  },
  {
    id: 'alumni-4',
    name: 'Anand Pradeep Kshirsagar',
    batch: 2020,
    department: 'Social Work',
    currentRole: 'Harris Policy Labs Team Member',
    currentCompany: 'World Bank',
    location: 'Washington DC, USA',
    email: 'a.ksagar24@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/anandkshirsagar',
    trajectory: createTrajectory([
      { role: "Project Manager-College Connect", company: "Youth4Jobs Foundation" },
      { role: "Content Writer", company: "The Unique Academy" },
      { role: "Content Writer/Strategist", company: "Digital Flame Marketing Solutions" },
      { role: "Harris Policy Labs Team Member", company: "World Bank" }
    ]),
    skills: ['Project Management', 'Content Strategy', 'Public Policy'],
    avatarUrl: 'https://picsum.photos/seed/anand/200/200'
  },
  {
    id: 'alumni-5',
    name: 'Anwesha Mishra',
    batch: 2021,
    department: 'Development Studies',
    currentRole: 'Partnerships and Brand Consultant',
    currentCompany: 'GroupM',
    location: 'Bangalore, India',
    email: 'anwesha.mishra67@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/anweshamishra',
    trajectory: createTrajectory([
      { role: "Project Associate", company: "Outline India" },
      { role: "Deputy Manager-Research", company: "Sambodhi" },
      { role: "Associate Director", company: "Kantar Public" },
      { role: "Partnerships and Brand Consultant", company: "GroupM" }
    ]),
    skills: ['Market Research', 'Partnerships', 'Brand Strategy'],
    avatarUrl: 'https://picsum.photos/seed/anwesha/200/200'
  },
  {
    id: 'alumni-6',
    name: 'Diwakar Kumar',
    batch: 2022,
    department: 'Rural Development',
    currentRole: 'Associate Manager',
    currentCompany: 'The Nudge Institute',
    location: 'Patna, India',
    email: 'diwakarkumardev@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/diwakarkumar',
    trajectory: createTrajectory([
      { role: "Young Professional", company: "Bihar Rural Livelihoods Promotion Society" },
      { role: "Associate", company: "Swaniti Initiative" },
      { role: "CMGG Associate", company: "Govt of Haryana" },
      { role: "Associate Manager", company: "The Nudge Institute" }
    ]),
    skills: ['Rural Development', 'Livelihoods', 'Governance'],
    avatarUrl: 'https://picsum.photos/seed/diwakar/200/200'
  },
  {
    id: 'alumni-7',
    name: 'Ekta Godara',
    batch: 2023,
    department: 'Development Studies',
    currentRole: 'Assistant Manager',
    currentCompany: 'MicroSave Consulting',
    location: 'Lucknow, India',
    email: 'ekta.godara@yahoo.com',
    linkedinUrl: 'https://linkedin.com/in/ektagodara',
    trajectory: createTrajectory([
      { role: "Development Analyst", company: "Cafal Advisors" },
      { role: "Associate Consultant", company: "KPMG" },
      { role: "Assistant Manager", company: "MicroSave Consulting" }
    ]),
    skills: ['Consulting', 'Financial Inclusion', 'Research'],
    avatarUrl: 'https://picsum.photos/seed/ekta/200/200'
  },
  {
    id: 'alumni-8',
    name: 'Karthik Roy',
    batch: 2016,
    department: 'Social Work',
    currentRole: 'Manager-MLE',
    currentCompany: 'Swades Foundation',
    location: 'Raigad, India',
    email: 'karthikroy3@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/karthikroy',
    trajectory: createTrajectory([
      { role: "Program Officer", company: "TISS" },
      { role: "Manager-MLE", company: "Swades Foundation" }
    ]),
    skills: ['Monitoring & Evaluation', 'Community Development', 'Social Work'],
    avatarUrl: 'https://picsum.photos/seed/karthik/200/200'
  },
  {
    id: 'alumni-9',
    name: 'Nandini Bhattacharya',
    batch: 2015,
    department: 'Urban Planning',
    currentRole: 'Program Fellow',
    currentCompany: 'Smart Cities Mission, GoI',
    location: 'Delhi, India',
    email: 'nandini.sen.bhattacharya@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/nandinib',
    trajectory: createTrajectory([
      { role: "Program Manager", company: "Valley In-Store India Pvt Ltd" },
      { role: "Program Fellow", company: "Smart Cities Mission, GoI" }
    ]),
    skills: ['Urban Planning', 'Program Management', 'Governance'],
    avatarUrl: 'https://picsum.photos/seed/nandini/200/200'
  },
  {
    id: 'alumni-10',
    name: 'Paras Ratna',
    batch: 2014,
    department: 'International Relations',
    currentRole: 'Reporting Associate',
    currentCompany: 'UNHCR',
    location: 'Geneva / Remote',
    email: 'parasratan@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/parasratna',
    trajectory: createTrajectory([
      { role: "Research Associate", company: "Vision India Foundation" },
      { role: "Reporting Associate", company: "UNHCR" }
    ]),
    skills: ['International Relations', 'Reporting', 'Humanitarian Aid'],
    avatarUrl: 'https://picsum.photos/seed/paras/200/200'
  },
  {
    id: 'alumni-11',
    name: 'Roshna Shirin K.',
    batch: 2013,
    department: 'Social Work',
    currentRole: 'Independent Consultant',
    currentCompany: 'Freelance',
    location: 'Kerala, India',
    email: 'roshnashirin36@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/roshnashirin',
    trajectory: createTrajectory([
      { role: "District Lead", company: "Tata Trusts" },
      { role: "Independent Consultant", company: "Freelance" }
    ]),
    skills: ['Consulting', 'Social Work', 'District Management'],
    avatarUrl: 'https://picsum.photos/seed/roshna/200/200'
  },
  {
    id: 'alumni-12',
    name: 'Shalvi Garima Negi',
    batch: 2012,
    department: 'Management',
    currentRole: 'ESG Research Analyst',
    currentCompany: 'ISS',
    location: 'Mumbai, India',
    email: 'shalvigarima@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/shalvigarima',
    trajectory: createTrajectory([
      { role: "Young Professional", company: "RGAVP" },
      { role: "ESG Research Analyst", company: "ISS" }
    ]),
    skills: ['ESG Research', 'Management', 'Sustainability'],
    avatarUrl: 'https://picsum.photos/seed/shalvi/200/200'
  },
  {
    id: 'alumni-13',
    name: 'Shehanas Pazhoor',
    batch: 2011,
    department: 'Education',
    currentRole: 'Visiting Faculty',
    currentCompany: 'FLAME University',
    location: 'Pune, India',
    email: 'shehanasp4@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/shehanas',
    trajectory: createTrajectory([
      { role: "Research Consultant", company: "Evidence for Policy Design" },
      { role: "Visiting Faculty", company: "FLAME University" }
    ]),
    skills: ['Education', 'Policy Design', 'Teaching'],
    avatarUrl: 'https://picsum.photos/seed/shehanas/200/200'
  },
  {
    id: 'alumni-14',
    name: 'Shivanshi Asthana',
    batch: 2010,
    department: 'Development Studies',
    currentRole: 'Research Associate',
    currentCompany: '5 Elements Sustainable Development Group',
    location: 'Delhi, India',
    email: 'shiviasth@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/shivanshi',
    trajectory: createTrajectory([
      { role: "Research Associate", company: "IILM" },
      { role: "Research Associate", company: "5 Elements Sustainable Development Group" }
    ]),
    skills: ['Sustainable Development', 'Research', 'Impact Assessment'],
    avatarUrl: 'https://picsum.photos/seed/shivanshi/200/200'
  },
  {
    id: 'alumni-15',
    name: 'Shruti Gupta',
    batch: 2009,
    department: 'Economics',
    currentRole: 'Resarch Consultant',
    currentCompany: 'ICRW',
    location: 'Delhi, India',
    email: 'shrutigupta278@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/shrutigupta',
    trajectory: createTrajectory([
      { role: "Research Fellow", company: "Aapti Institute and Microsoft Research" },
      { role: "Resarch Consultant", company: "ICRW" }
    ]),
    skills: ['Economics', 'Gender Research', 'Consulting'],
    avatarUrl: 'https://picsum.photos/seed/shruti/200/200'
  },
  {
    id: 'alumni-16',
    name: 'Sudarshan Ankush Kasbe',
    batch: 2008,
    department: 'Social Work',
    currentRole: 'Qualitative Researcher',
    currentCompany: 'ASER Centre',
    location: 'Delhi, India',
    email: 'sudarshankasbe@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/sudarshan',
    trajectory: createTrajectory([
      { role: "Program Lead", company: "Youth Dreamers Foundation" },
      { role: "Qualitative Researcher", company: "ASER Centre" }
    ]),
    skills: ['Qualitative Research', 'Education', 'Social Work'],
    avatarUrl: 'https://picsum.photos/seed/sudarshan/200/200'
  },
  {
    id: 'alumni-17',
    name: 'Sumati Bajaj',
    batch: 2007,
    department: 'Public Health',
    currentRole: 'Research Fellow',
    currentCompany: 'UCL Institute for Global Health',
    location: 'London, UK',
    email: 'sumsbajaj31@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/sumatibajaj',
    trajectory: createTrajectory([
      { role: "Research Analyst", company: "International Food Policy Research Institute" },
      { role: "Research Fellow", company: "UCL Institute for Global Health" }
    ]),
    skills: ['Public Health', 'Nutrition', 'Global Health'],
    avatarUrl: 'https://picsum.photos/seed/sumati/200/200'
  },
  {
    id: 'alumni-18',
    name: 'Sanghmitra Tripathy',
    batch: 2006,
    department: 'Management',
    currentRole: 'Associate',
    currentCompany: 'Indus Action',
    location: 'Delhi, India',
    email: 'sanghmitra.tripathy@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/sanghmitra',
    trajectory: createTrajectory([
      { role: "Associate Consultant", company: "Third Sector Partners" },
      { role: "Associate", company: "Indus Action" }
    ]),
    skills: ['Management', 'Social Impact', 'Consulting'],
    avatarUrl: 'https://picsum.photos/seed/sanghmitra/200/200'
  },
  {
    id: 'alumni-19',
    name: 'Lavdeep Kaur',
    batch: 2024,
    department: 'Finance',
    currentRole: 'Deputy Manager',
    currentCompany: 'Punjab National Bank',
    location: 'Punjab, India',
    email: 'lavdeep_kaur@iitgn.ac.in',
    linkedinUrl: 'https://linkedin.com/in/lavdeepkaur',
    trajectory: createTrajectory([
      { role: "Deputy Manager", company: "Punjab National Bank" }
    ]),
    skills: ['Banking', 'Finance', 'Management'],
    avatarUrl: 'https://picsum.photos/seed/lavdeep/200/200'
  },
  {
    id: 'alumni-20',
    name: 'Moitreyee Nandi',
    batch: 2025,
    department: 'Development Studies',
    currentRole: 'Program Manager M&L',
    currentCompany: 'Imago Global Grassroots',
    location: 'Delhi, India',
    email: 'moitreyee.mistu08nandi@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/moitreyee',
    trajectory: createTrajectory([
      { role: "Field Coordinator", company: "Kudumbashree NRO" },
      { role: "Program Manager M&L", company: "Imago Global Grassroots" }
    ]),
    skills: ['Monitoring & Evaluation', 'Grassroots Development', 'Research'],
    avatarUrl: 'https://picsum.photos/seed/moitreyee/200/200'
  }
];

