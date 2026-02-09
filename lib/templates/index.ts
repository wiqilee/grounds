// lib/templates/index.ts
// Decision Templates Library with 11 Theme Categories and Recommendations
// All templates include recommendations for actionable next steps

export type DecisionTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: string;
  category: "strategic" | "operational" | "tactical" | "personal";
  
  title: string;
  context: string;
  intent: string;
  options: string;
  assumptions: string;
  risks: string;
  evidence: string;
  
  difficulty: "simple" | "moderate" | "complex";
  estimatedTime: string;
  tags: string[];
  recommendations: string[];
};

export type TemplateCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: DecisionTemplate[];
};

// ============================================================================
// TECHNOLOGY TEMPLATES
// ============================================================================

const techTemplates: DecisionTemplate[] = [
  {
    id: "tech-cloud-migration",
    name: "Cloud Migration Decision",
    description: "Evaluate moving infrastructure to cloud providers",
    icon: "☁️",
    theme: "technology",
    category: "strategic",
    title: "Should we migrate our on-premise infrastructure to cloud?",
    context: `Current State:
- Running 50+ servers in on-premise data center
- Annual infrastructure cost: $500,000
- 3 FTE dedicated to maintenance
- 99.5% uptime last year

Business Context:
- Company growing 30% YoY
- Remote workforce increased to 60%
- Compliance requirements: SOC2, GDPR
- Current contract expires in 6 months`,
    intent: `Success looks like:
- Reduce infrastructure costs by 30%
- Improve uptime to 99.9%
- Enable faster deployment cycles (days → hours)
- Reduce maintenance burden to 1 FTE
- Maintain compliance certifications`,
    options: `Option A: Full migration to AWS
Option B: Hybrid approach (Azure + on-prem)
Option C: Multi-cloud strategy (AWS + GCP)
Option D: Stay on-premise with modernization`,
    assumptions: `- Current team can be retrained within 3 months
- Cloud costs will remain stable (±10%) for 3 years
- Data transfer to cloud is feasible within compliance
- No major application rewrites needed`,
    risks: `- Data security during migration
- Unexpected cloud costs (egress, storage)
- Service disruption during transition
- Skills gap in cloud technologies`,
    evidence: `- Gartner: 85% enterprises will be cloud-first by 2025
- AWS TCO calculator shows 35% cost reduction
- Competitor X migrated successfully in 8 months`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["cloud", "infrastructure", "digital transformation"],
    recommendations: [
      "Start with a detailed TCO analysis comparing all options over 3-5 years",
      "Run a pilot migration with non-critical workloads first",
      "Establish cloud governance policies before migration",
      "Create a rollback plan for each migration phase",
      "Invest in cloud certification training for your team",
      "Consider hiring a cloud architect consultant for initial planning",
    ],
  },
];

// ============================================================================
// HEALTHCARE TEMPLATES
// ============================================================================

const healthcareTemplates: DecisionTemplate[] = [
  {
    id: "health-ehr-selection",
    name: "EHR System Selection",
    description: "Choose an Electronic Health Record system",
    icon: "🏥",
    theme: "healthcare",
    category: "strategic",
    title: "Which EHR system should we implement for our clinic network?",
    context: `Organization Profile:
- 12 clinic locations, 150 physicians, 400 staff
- 250,000 patient records
- Current system: Legacy paper + basic digital
- Requirements: HIPAA compliance, telehealth, patient portal`,
    intent: `Success Criteria:
- Full deployment within 18 months
- Less than 5% workflow disruption
- 95% staff adoption within 6 months
- Zero HIPAA violations`,
    options: `Option A: Epic Systems (market leader)
Option B: Cerner/Oracle Health (cloud-native)
Option C: Allscripts (cost-effective)
Option D: Custom built solution`,
    assumptions: `- Budget of $2-5M is approved
- Staff will receive adequate training
- Data migration can be completed safely`,
    risks: `- Data migration errors
- Staff resistance to change
- Integration failures
- Budget overruns`,
    evidence: `- KLAS rankings for EHR satisfaction
- Reference calls with similar organizations
- Vendor implementation timelines`,
    difficulty: "complex",
    estimatedTime: "60 min",
    tags: ["healthcare IT", "EHR", "compliance", "digital health"],
    recommendations: [
      "Conduct site visits to similar-sized healthcare organizations",
      "Form a physician advisory committee to evaluate clinical workflows",
      "Negotiate implementation support and training guarantees in contract",
      "Plan for 6+ months of parallel operation during transition",
      "Establish clear data migration validation procedures",
      "Budget for 20-30% contingency on implementation costs",
    ],
  },
];

// ============================================================================
// FINANCE TEMPLATES
// ============================================================================

const financeTemplates: DecisionTemplate[] = [
  {
    id: "finance-investment",
    name: "Investment Strategy",
    description: "Evaluate investment opportunities for growth",
    icon: "💰",
    theme: "finance",
    category: "strategic",
    title: "Should we invest in expanding to new markets vs. strengthening existing operations?",
    context: `Company Financial Position:
- Annual revenue: $50M, Cash reserves: $10M
- Debt-to-equity ratio: 0.3
- Current market share: 15%
- Industry growth: 8% annually`,
    intent: `Investment Goals:
- 25% revenue growth in 3 years
- Maintain profitability margins above 15%
- Maximize ROI with acceptable risk`,
    options: `Option A: Expand to new geographic markets ($5M, 35% ROI)
Option B: Invest in R&D and product innovation ($3M, 40% ROI)
Option C: Acquire smaller competitor ($8M, 25% ROI)
Option D: Strengthen core business operations ($2M, 20% ROI)`,
    assumptions: `- Economic conditions remain stable
- Key talent can be retained/hired
- Competitive landscape doesn't shift dramatically`,
    risks: `- Market entry failure
- Overextension of resources
- Integration challenges (acquisition)
- Opportunity cost of wrong choice`,
    evidence: `- Market research reports from Gartner/Forrester
- Financial projections and models
- Competitor analysis`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["investment", "growth strategy", "market expansion"],
    recommendations: [
      "Model multiple scenarios (optimistic, base, pessimistic) for each option",
      "Consider a staged investment approach to reduce risk",
      "Evaluate the impact on company culture and values",
      "Assess management bandwidth for each option",
      "Create clear success metrics and milestone checkpoints",
      "Develop exit strategies for each investment path",
    ],
  },
];

// ============================================================================
// EDUCATION TEMPLATES
// ============================================================================

const educationTemplates: DecisionTemplate[] = [
  {
    id: "edu-curriculum-update",
    name: "Curriculum Modernization",
    description: "Update educational curriculum for modern needs",
    icon: "📚",
    theme: "education",
    category: "strategic",
    title: "How should we modernize our curriculum to include AI and digital skills?",
    context: `Current Situation:
- Traditional curriculum last updated 5 years ago
- Student enrollment declining 10% YoY
- Industry demands for AI/ML skills increasing
- Faculty expertise gap in new technologies`,
    intent: `Goals:
- Increase student employability by 30%
- Attract more applicants with modern curriculum
- Maintain academic rigor and accreditation
- Prepare students for AI-augmented workplace`,
    options: `Option A: Full curriculum overhaul with AI integration
Option B: Add elective AI/ML courses only
Option C: Partner with tech companies for specialized tracks
Option D: Hybrid approach with core + electives`,
    assumptions: `- Faculty can be retrained or new hires made
- Accreditation body will approve changes
- Students will embrace new curriculum`,
    risks: `- Faculty resistance to change
- Accreditation delays
- Resource allocation challenges
- Technology becoming obsolete quickly`,
    evidence: `- Industry surveys on required skills
- Competitor curriculum analysis
- Student feedback and career outcomes`,
    difficulty: "complex",
    estimatedTime: "40 min",
    tags: ["education", "curriculum", "AI", "digital transformation"],
    recommendations: [
      "Survey industry partners on specific skill requirements",
      "Create faculty development program before implementation",
      "Pilot new courses with volunteer cohorts first",
      "Establish industry advisory board for ongoing curriculum review",
      "Build partnerships with tech companies for guest lectures and internships",
      "Include ethics and responsible AI use in all technology courses",
    ],
  },
];

// ============================================================================
// LEGAL TEMPLATES
// ============================================================================

const legalTemplates: DecisionTemplate[] = [
  {
    id: "legal-compliance",
    name: "Regulatory Compliance Strategy",
    description: "Navigate complex regulatory requirements",
    icon: "⚖️",
    theme: "legal",
    category: "strategic",
    title: "How should we approach GDPR/CCPA compliance for our global operations?",
    context: `Business Context:
- Operating in 15 countries with customer data
- Current compliance: partial, inconsistent
- Regulatory fines risk: $10M+ potential
- Customer trust increasingly important`,
    intent: `Compliance Goals:
- Achieve full GDPR/CCPA compliance within 12 months
- Minimize business disruption during implementation
- Build privacy as competitive advantage
- Reduce regulatory risk exposure`,
    options: `Option A: Build in-house compliance team
Option B: Outsource to specialized consultancy
Option C: Hybrid approach with tech automation
Option D: Minimal compliance (accept some risk)`,
    assumptions: `- Leadership committed to compliance investment
- Technology solutions can automate 60%+ of processes
- Customers value privacy transparency`,
    risks: `- Underestimating compliance complexity
- Ongoing regulatory changes
- Data breach during transition
- Vendor/partner non-compliance`,
    evidence: `- Regulatory enforcement trends and fines
- Industry benchmarks for compliance costs
- Technology vendor capabilities`,
    difficulty: "complex",
    estimatedTime: "50 min",
    tags: ["compliance", "GDPR", "CCPA", "privacy", "regulatory"],
    recommendations: [
      "Conduct comprehensive data mapping across all systems",
      "Appoint a dedicated Data Protection Officer (DPO)",
      "Implement privacy-by-design in all new product development",
      "Create clear data retention and deletion policies",
      "Train all employees on data handling procedures",
      "Establish vendor assessment process for third-party compliance",
    ],
  },
];

// ============================================================================
// REAL ESTATE TEMPLATES
// ============================================================================

const realEstateTemplates: DecisionTemplate[] = [
  {
    id: "realestate-office",
    name: "Office Space Strategy",
    description: "Evaluate office space needs post-pandemic",
    icon: "🏢",
    theme: "realestate",
    category: "operational",
    title: "Should we downsize office space given hybrid work trends?",
    context: `Current Situation:
- 50,000 sq ft office, $2M annual lease
- Hybrid work: 40% in-office average
- Lease renewal in 18 months
- Employee preference: 60% want hybrid`,
    intent: `Goals:
- Reduce real estate costs by 30%+
- Maintain culture and collaboration
- Attract and retain talent
- Flexible space for future growth`,
    options: `Option A: Downsize to 30,000 sq ft with hot-desking
Option B: Keep current space, redesign for collaboration
Option C: Move to flexible coworking arrangement
Option D: Full remote with occasional event space`,
    assumptions: `- Hybrid work is permanent trend
- Employees can be productive remotely
- Collaboration tools are adequate`,
    risks: `- Culture erosion with less face time
- Productivity concerns for some roles
- Difficulty onboarding new employees
- Lease break penalties`,
    evidence: `- Employee surveys on work preferences
- Industry benchmarks for hybrid space
- Cost analysis of all options`,
    difficulty: "moderate",
    estimatedTime: "35 min",
    tags: ["real estate", "hybrid work", "office", "cost optimization"],
    recommendations: [
      "Survey employees on ideal work arrangements and office needs",
      "Pilot hot-desking with one department before full rollout",
      "Negotiate lease flexibility for future adjustments",
      "Invest in collaboration technology for hybrid meetings",
      "Create clear policies for in-office vs remote days",
      "Design spaces for collaboration rather than individual work",
    ],
  },
];

// ============================================================================
// TRAVEL TEMPLATES
// ============================================================================

const travelTemplates: DecisionTemplate[] = [
  {
    id: "travel-corporate-policy",
    name: "Corporate Travel Policy",
    description: "Modernize business travel guidelines",
    icon: "✈️",
    theme: "travel",
    category: "operational",
    title: "How should we update our corporate travel policy for sustainability and cost?",
    context: `Current State:
- Annual travel spend: $3M
- 500+ employees travel regularly
- No sustainability metrics tracked
- Complaints about booking flexibility`,
    intent: `Policy Goals:
- Reduce travel costs by 20%
- Cut carbon footprint by 40%
- Improve employee satisfaction
- Maintain business effectiveness`,
    options: `Option A: Strict policy with approval tiers
Option B: Flexible policy with carbon budget per person
Option C: Virtual-first with travel as exception
Option D: AI-optimized booking with sustainability scoring`,
    assumptions: `- Virtual meetings can replace 50% of travel
- Employees will accept sustainability constraints
- Technology can automate policy enforcement`,
    risks: `- Relationship damage from less face time
- Employee pushback on restrictions
- Competitive disadvantage vs. more flexible companies`,
    evidence: `- Travel spend analysis by purpose
- Carbon footprint calculations
- Employee feedback surveys`,
    difficulty: "moderate",
    estimatedTime: "30 min",
    tags: ["travel", "sustainability", "policy", "cost management"],
    recommendations: [
      "Categorize travel by necessity (essential, important, optional)",
      "Implement carbon offsetting for unavoidable travel",
      "Create clear approval workflows based on trip value",
      "Invest in high-quality video conferencing equipment",
      "Set department-level travel budgets with flexibility",
      "Track and report sustainability metrics quarterly",
    ],
  },
];

// ============================================================================
// HR TEMPLATES
// ============================================================================

const hrTemplates: DecisionTemplate[] = [
  {
    id: "hr-remote-policy",
    name: "Remote Work Policy",
    description: "Define hybrid/remote work arrangements",
    icon: "👥",
    theme: "hr",
    category: "operational",
    title: "What should our permanent remote/hybrid work policy be?",
    context: `Current Situation:
- 500 employees, currently 60% remote capable
- Productivity maintained during remote period
- Some teams struggle with remote collaboration
- Talent pool could expand with remote option`,
    intent: `Policy Goals:
- Attract top talent regardless of location
- Maintain team cohesion and culture
- Ensure equitable treatment across arrangements
- Support employee wellbeing and flexibility`,
    options: `Option A: Full flexibility (employee choice)
Option B: Structured hybrid (3 days in-office)
Option C: Role-based (some remote, some in-office)
Option D: Remote-first with optional offices`,
    assumptions: `- Productivity can be measured effectively
- Technology supports remote collaboration
- Managers can lead remote teams`,
    risks: `- Culture erosion over time
- Inequity between remote and in-office
- Career advancement bias
- Communication gaps`,
    evidence: `- Employee surveys on preferences
- Productivity data from remote period
- Competitor policies and talent market`,
    difficulty: "moderate",
    estimatedTime: "35 min",
    tags: ["HR", "remote work", "policy", "talent", "culture"],
    recommendations: [
      "Survey employees on work preferences and constraints",
      "Train managers on leading hybrid and remote teams",
      "Establish clear communication norms and response times",
      "Create equity guidelines for promotions and opportunities",
      "Invest in collaboration tools and home office stipends",
      "Schedule regular in-person team building events",
    ],
  },
];

// ============================================================================
// RESEARCH TEMPLATES
// ============================================================================

const researchTemplates: DecisionTemplate[] = [
  {
    id: "research-methodology",
    name: "Research Methodology Selection",
    description: "Choose appropriate research approach",
    icon: "🔬",
    theme: "research",
    category: "tactical",
    title: "What research methodology should we use for our market study?",
    context: `Research Context:
- New product launch decision pending
- Budget: $100,000 for research
- Timeline: 3 months to decision
- Need both quantitative and qualitative insights`,
    intent: `Research Goals:
- Understand market size and segments
- Validate product-market fit
- Identify competitive positioning
- Quantify willingness to pay`,
    options: `Option A: Large quantitative survey (n=2000)
Option B: In-depth qualitative interviews (n=50)
Option C: Mixed methods (survey + interviews)
Option D: Ethnographic observation + surveys`,
    assumptions: `- Target audience is accessible
- Budget is sufficient for chosen method
- Team has research expertise`,
    risks: `- Sampling bias affecting results
- Time constraints limiting depth
- Misinterpretation of findings
- Stakeholder disagreement on methodology`,
    evidence: `- Past research effectiveness
- Industry standard methodologies
- Academic best practices`,
    difficulty: "moderate",
    estimatedTime: "25 min",
    tags: ["research", "methodology", "market research", "product"],
    recommendations: [
      "Start with qualitative to inform quantitative survey design",
      "Define clear research questions before choosing methodology",
      "Ensure sample represents target customer segments",
      "Plan for iterative analysis with stakeholder input",
      "Document methodology for reproducibility",
      "Budget for follow-up research if initial findings are inconclusive",
    ],
  },
];

// ============================================================================
// STARTUP TEMPLATES
// ============================================================================

const startupTemplates: DecisionTemplate[] = [
  {
    id: "startup-funding",
    name: "Funding Strategy",
    description: "Evaluate fundraising options and timing",
    icon: "🚀",
    theme: "startup",
    category: "strategic",
    title: "Should we raise Series A now or bootstrap for another year?",
    context: `Startup Status:
- 18 months post-launch, $500K ARR
- Growing 15% MoM, runway 8 months
- Product-market fit validated in one segment
- Team of 12, key hires needed`,
    intent: `Funding Goals:
- Extend runway to 24+ months
- Hire 5 key positions
- Expand to adjacent market segments
- Maintain founder control`,
    options: `Option A: Raise Series A ($5M at $20M valuation)
Option B: Raise bridge round ($1M convertible)
Option C: Bootstrap with revenue focus
Option D: Strategic partnership with revenue share`,
    assumptions: `- Market conditions remain favorable
- Can close round within 3-4 months
- Valuation expectations are realistic`,
    risks: `- Dilution reducing founder control
- Pressure to scale prematurely
- Failed fundraise damaging morale
- Market downturn affecting terms`,
    evidence: `- Comparable company valuations
- Investor feedback from initial conversations
- Financial projections and scenarios`,
    difficulty: "complex",
    estimatedTime: "40 min",
    tags: ["startup", "funding", "Series A", "venture capital"],
    recommendations: [
      "Build relationships with 30+ investors before officially fundraising",
      "Have 18+ months runway before starting raise",
      "Prepare data room with key metrics and projections",
      "Get warm introductions rather than cold outreach",
      "Negotiate terms beyond just valuation (board seats, pro-rata)",
      "Have a Plan B if fundraise takes longer than expected",
    ],
  },
];

// ============================================================================
// GENERAL/PERSONAL TEMPLATES
// ============================================================================

const generalTemplates: DecisionTemplate[] = [
  {
    id: "personal-job-offer",
    name: "Job Offer Evaluation",
    description: "Compare job offers and career moves",
    icon: "👔",
    theme: "general",
    category: "personal",
    title: "Should I accept this new job offer or stay at my current company?",
    context: `Current Position:
- Role: Senior Developer, 4 years tenure
- Salary: $120,000 + benefits
- Good work-life balance, limited growth

New Offer:
- Role: Tech Lead, Salary: $150,000 + equity
- Startup environment, higher responsibility`,
    intent: `Career Goals:
- Advance to leadership role within 2 years
- Increase compensation by 30%
- Work on challenging technical problems
- Maintain work-life balance`,
    options: `Option A: Accept new offer as-is
Option B: Negotiate better terms with new company
Option C: Counter-offer at current company
Option D: Decline and wait for better opportunity`,
    assumptions: `- New company is financially stable
- Role responsibilities are as described
- I can perform well in new environment`,
    risks: `- Startup instability
- Culture mismatch
- Loss of existing relationships
- Higher stress in leadership role`,
    evidence: `- Glassdoor reviews of new company
- LinkedIn network feedback
- Industry salary benchmarks`,
    difficulty: "moderate",
    estimatedTime: "30 min",
    tags: ["career", "job offer", "compensation", "leadership"],
    recommendations: [
      "Talk to current/former employees of the new company",
      "Calculate total compensation including benefits and equity",
      "Consider the 5-year career trajectory for both options",
      "Evaluate work-life balance impact on family",
      "Have an honest conversation with your current manager first",
      "Negotiate at least 2-3 key terms before accepting",
    ],
  },
  {
    id: "personal-relocation",
    name: "Relocation Decision",
    description: "Evaluate moving to a new city",
    icon: "🏠",
    theme: "general",
    category: "personal",
    title: "Should I relocate to a new city for better career opportunities?",
    context: `Current: City A, 8 years, strong network, moderate cost
Potential: City B, tech hub, 40% higher cost, no network`,
    intent: `Life Goals:
- Accelerate career growth
- Maintain quality of life
- Build financial stability
- Stay connected with family`,
    options: `Option A: Full relocation
Option B: Remote work from current city
Option C: Hybrid (frequent travel)
Option D: Stay and explore local opportunities`,
    assumptions: `- Job market in City B will remain strong
- I can build new social connections
- Family will be supportive`,
    risks: `- Loneliness in new city
- Higher cost of living strain
- Career opportunity may not materialize
- Relationship strain with family`,
    evidence: `- Job market data for both cities
- Cost of living calculators
- Network contacts in City B`,
    difficulty: "complex",
    estimatedTime: "40 min",
    tags: ["relocation", "career", "life decision", "family"],
    recommendations: [
      "Visit the new city for at least 1-2 weeks before deciding",
      "Create a detailed 12-month budget for both scenarios",
      "Identify 3-5 potential social/professional groups to join",
      "Have explicit conversations with family about expectations",
      "Negotiate relocation assistance if moving for work",
      "Set a trial period mindset (commit for 2 years, then reassess)",
    ],
  },
];

// ============================================================================
// TEMPLATE CATEGORIES - 11 THEMES
// ============================================================================

export const templateCategories: TemplateCategory[] = [
  {
    id: "technology",
    name: "Technology",
    icon: "💻",
    description: "Software, infrastructure, and digital transformation",
    templates: techTemplates,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: "🏥",
    description: "Clinical, operational, and health IT decisions",
    templates: healthcareTemplates,
  },
  {
    id: "finance",
    name: "Finance",
    icon: "💰",
    description: "Investment, budgeting, and financial strategy",
    templates: financeTemplates,
  },
  {
    id: "education",
    name: "Education",
    icon: "📚",
    description: "Curriculum, teaching, and institutional decisions",
    templates: educationTemplates,
  },
  {
    id: "legal",
    name: "Legal",
    icon: "⚖️",
    description: "Compliance, contracts, and regulatory matters",
    templates: legalTemplates,
  },
  {
    id: "realestate",
    name: "Real Estate",
    icon: "🏢",
    description: "Property, office space, and location decisions",
    templates: realEstateTemplates,
  },
  {
    id: "travel",
    name: "Travel",
    icon: "✈️",
    description: "Corporate travel and mobility policies",
    templates: travelTemplates,
  },
  {
    id: "hr",
    name: "HR & People",
    icon: "👥",
    description: "Hiring, policies, and workforce decisions",
    templates: hrTemplates,
  },
  {
    id: "research",
    name: "Research",
    icon: "🔬",
    description: "Methodology, studies, and analysis approaches",
    templates: researchTemplates,
  },
  {
    id: "startup",
    name: "Startup",
    icon: "🚀",
    description: "Funding, growth, and entrepreneurial decisions",
    templates: startupTemplates,
  },
  {
    id: "general",
    name: "Personal & Career",
    icon: "👤",
    description: "Career moves, life decisions, and personal choices",
    templates: generalTemplates,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getAllTemplates(): DecisionTemplate[] {
  return templateCategories.flatMap(cat => cat.templates);
}

export function getTemplateById(id: string): DecisionTemplate | undefined {
  return getAllTemplates().find(t => t.id === id);
}

export function getTemplatesByTheme(theme: string): DecisionTemplate[] {
  return getAllTemplates().filter(t => t.theme === theme || t.theme === "general");
}

export function getTemplatesByCategory(category: DecisionTemplate["category"]): DecisionTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

export function searchTemplates(keyword: string): DecisionTemplate[] {
  const lower = keyword.toLowerCase();
  return getAllTemplates().filter(t => 
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.toLowerCase().includes(lower)) ||
    t.title.toLowerCase().includes(lower) ||
    t.theme.toLowerCase().includes(lower)
  );
}

export function getTemplateCount(): number {
  return getAllTemplates().length;
}

export function getCategoryCount(categoryId: string): number {
  const category = templateCategories.find(c => c.id === categoryId);
  return category?.templates.length || 0;
}

export function getTemplateRecommendations(templateId: string): string[] {
  const template = getTemplateById(templateId);
  return template?.recommendations || [];
}

export function getCategoryForTheme(theme: string): TemplateCategory | undefined {
  return templateCategories.find(c => c.id === theme);
}
