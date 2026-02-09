// lib/templates/index.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DECISION TEMPLATES
// Preset templates for common decision scenarios across industries
// ═══════════════════════════════════════════════════════════════════════════════

export type DecisionTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: string;
  category: "strategic" | "operational" | "tactical" | "personal";
  
  // Pre-filled content
  title: string;
  context: string;
  intent: string;
  options: string;
  assumptions: string;
  risks: string;
  evidence: string;
  
  // Metadata
  difficulty: "simple" | "moderate" | "complex";
  estimatedTime: string; // e.g., "15 min", "30 min"
  tags: string[];
};

export type TemplateCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: DecisionTemplate[];
};

/**
 * Technology Decision Templates
 */
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
- Pros: Mature ecosystem, wide service range
- Cons: Potential vendor lock-in, complex pricing

Option B: Hybrid approach (Azure + on-prem)
- Pros: Gradual transition, Microsoft integration
- Cons: Complexity of managing two environments

Option C: Multi-cloud strategy (AWS + GCP)
- Pros: Avoid vendor lock-in, best-of-breed services
- Cons: Higher complexity, skills gap

Option D: Stay on-premise with modernization
- Pros: Full control, predictable costs
- Cons: Scaling limitations, maintenance burden`,
    assumptions: `- Current team can be retrained within 3 months
- Cloud costs will remain stable (±10%) for 3 years
- Data transfer to cloud is feasible within compliance
- No major application rewrites needed
- Executive sponsorship is secured`,
    risks: `- Data security during migration
- Unexpected cloud costs (egress, storage)
- Service disruption during transition
- Skills gap in cloud technologies
- Vendor price increases post-migration
- Compliance certification delays`,
    evidence: `- Gartner: 85% enterprises will be cloud-first by 2025
- AWS TCO calculator shows 35% cost reduction
- Competitor X migrated successfully in 8 months
- Internal survey: 78% of team supports cloud move
- Security audit passed with no critical findings`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["cloud", "infrastructure", "digital transformation", "cost optimization"],
  },
  {
    id: "tech-ai-adoption",
    name: "AI Tool Adoption",
    description: "Decide on implementing AI tools in workflows",
    icon: "🤖",
    theme: "technology",
    category: "tactical",
    title: "Should we adopt AI-powered tools for our development workflow?",
    context: `Current Situation:
- 25 developers in the team
- Average task completion: 2-3 days per feature
- Code review backlog: 15+ PRs waiting
- Manual testing coverage: 60%

Market Context:
- Competitors using GitHub Copilot, Claude
- AI coding tools maturity improved significantly in 2024
- Security concerns around AI-generated code`,
    intent: `Goals:
- Increase developer productivity by 40%
- Reduce code review time by 50%
- Improve test coverage to 80%
- Maintain code quality standards`,
    options: `Option A: GitHub Copilot Enterprise
Option B: Claude for coding + custom integration
Option C: Build internal AI assistant
Option D: No AI adoption (status quo)`,
    assumptions: `- Developers will adopt new tools within 1 month
- AI tools won't compromise security
- ROI will be positive within 6 months
- Quality standards can be maintained`,
    risks: `- AI-generated code security vulnerabilities
- Over-reliance on AI suggestions
- Learning curve affecting short-term productivity
- Licensing costs exceeding budget
- Intellectual property concerns`,
    evidence: `- GitHub reports 55% faster coding with Copilot
- Stack Overflow survey: 70% developers use AI tools
- Internal pilot: 2 developers showed 35% improvement`,
    difficulty: "moderate",
    estimatedTime: "30 min",
    tags: ["AI", "developer tools", "productivity", "automation"],
  },
];

/**
 * Healthcare Decision Templates
 */
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
- 12 clinic locations
- 150 physicians, 400 staff
- 250,000 patient records
- Current system: Legacy paper + basic digital

Requirements:
- HIPAA compliance mandatory
- Integration with lab systems
- Telehealth capabilities
- Patient portal needed`,
    intent: `Success Criteria:
- Full deployment within 18 months
- Less than 5% workflow disruption
- 95% staff adoption within 6 months
- Zero HIPAA violations`,
    options: `Option A: Epic Systems
Option B: Cerner (Oracle Health)
Option C: Allscripts
Option D: Custom built solution`,
    assumptions: `- Budget of $2-5M is approved
- Staff will receive adequate training
- Data migration can be completed safely
- Vendor will provide implementation support`,
    risks: `- Data migration errors
- Staff resistance to change
- Integration failures
- Budget overruns
- Workflow disruptions affecting patient care`,
    evidence: `- KLAS rankings for EHR satisfaction
- Reference calls with similar organizations
- Vendor implementation timelines
- Total cost of ownership analysis`,
    difficulty: "complex",
    estimatedTime: "60 min",
    tags: ["healthcare IT", "EHR", "compliance", "digital health"],
  },
];

/**
 * Finance Decision Templates
 */
const financeTemplates: DecisionTemplate[] = [
  {
    id: "finance-investment",
    name: "Investment Decision",
    description: "Evaluate investment opportunities",
    icon: "💰",
    theme: "finance",
    category: "strategic",
    title: "Should we invest in expanding to new markets vs. strengthening existing operations?",
    context: `Company Financial Position:
- Annual revenue: $50M
- Cash reserves: $10M
- Debt-to-equity ratio: 0.3
- Current market share: 15%

Market Conditions:
- Industry growth: 8% annually
- New market opportunity: $200M TAM
- Existing market: mature, competitive`,
    intent: `Investment Goals:
- 25% revenue growth in 3 years
- Maintain profitability margins above 15%
- Maximize ROI with acceptable risk
- Build sustainable competitive advantage`,
    options: `Option A: Expand to new geographic markets
Option B: Invest in R&D and product innovation
Option C: Acquire smaller competitor
Option D: Strengthen core business operations`,
    assumptions: `- Economic conditions remain stable
- Key talent can be retained/hired
- Competitive landscape doesn't shift dramatically
- Regulatory environment is favorable`,
    risks: `- Market entry failure
- Overextension of resources
- Integration challenges (acquisition)
- Opportunity cost of wrong choice
- Currency/economic fluctuations`,
    evidence: `- Market research reports
- Financial projections and models
- Competitor analysis
- Customer demand surveys
- Historical performance data`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["investment", "growth strategy", "market expansion", "M&A"],
  },
];

/**
 * Personal/Career Decision Templates
 */
const personalTemplates: DecisionTemplate[] = [
  {
    id: "personal-job-offer",
    name: "Job Offer Evaluation",
    description: "Compare job offers and career moves",
    icon: "👔",
    theme: "general",
    category: "personal",
    title: "Should I accept this new job offer or stay at my current company?",
    context: `Current Position:
- Role: Senior Developer at Company A
- Tenure: 4 years
- Salary: $120,000 + benefits
- Good work-life balance
- Limited growth opportunities

New Offer:
- Role: Tech Lead at Company B
- Salary: $150,000 + equity
- Startup environment
- Higher responsibility
- Longer commute (or relocation)`,
    intent: `Career Goals:
- Advance to leadership role within 2 years
- Increase compensation by 30%
- Work on challenging technical problems
- Maintain work-life balance
- Build long-term career security`,
    options: `Option A: Accept new offer as-is
Option B: Negotiate better terms with new company
Option C: Counter-offer at current company
Option D: Decline and wait for better opportunity`,
    assumptions: `- New company is financially stable
- Role responsibilities are as described
- I can perform well in new environment
- Current company won't hold grudge if I leave`,
    risks: `- Startup instability
- Culture mismatch at new company
- Loss of existing relationships/network
- Higher stress in leadership role
- Relocation disruption to family`,
    evidence: `- Glassdoor reviews of new company
- LinkedIn network feedback
- Industry salary benchmarks
- Company financial reports (if public)`,
    difficulty: "moderate",
    estimatedTime: "30 min",
    tags: ["career", "job offer", "compensation", "leadership"],
  },
];

/**
 * Legal Decision Templates
 */
const legalTemplates: DecisionTemplate[] = [
  {
    id: "legal-contract-negotiation",
    name: "Contract Negotiation Strategy",
    description: "Evaluate contract terms and negotiation approach",
    icon: "📜",
    theme: "legal",
    category: "strategic",
    title: "Should we accept the proposed vendor contract terms or negotiate?",
    context: `Contract Overview:
- 3-year service agreement with major vendor
- Total contract value: $2.5M
- Auto-renewal clause with 90-day notice
- Liability cap at 12 months of fees
- Data ownership clause favors vendor

Current Situation:
- We need this service for Q1 launch
- 2 alternative vendors available but less mature
- Legal team flagged 5 concerning clauses
- Vendor has been responsive but firm on pricing`,
    intent: `Success looks like:
- Reduce liability exposure by 50%
- Secure favorable data ownership terms
- Maintain launch timeline
- Establish good vendor relationship
- Get pricing within 10% of budget`,
    options: `Option A: Accept current terms with minor amendments
- Pros: Fast, maintains relationship
- Cons: Higher risk exposure

Option B: Full negotiation on all flagged clauses
- Pros: Better protection, sets precedent
- Cons: May delay timeline, strain relationship

Option C: Walk away and choose alternative vendor
- Pros: Fresh start, leverage in negotiation
- Cons: Less mature product, integration costs

Option D: Phased approach - accept now, renegotiate at renewal
- Pros: Meet timeline, future flexibility
- Cons: Locked in short-term, uncertain future terms`,
    assumptions: `- Vendor wants this deal (we're a reference customer)
- Alternative vendors can deliver by Q2 if needed
- Legal team capacity available for negotiation
- Executive sponsor supports extended timeline if needed
- Industry standard terms are achievable`,
    risks: `- Timeline delay impacts Q1 revenue targets
- Vendor walks away from deal
- Hidden costs in alternative vendors
- Relationship damage affects support quality
- Precedent set affects future negotiations`,
    evidence: `- Industry benchmark: 80% of similar contracts have 24-month liability caps
- Vendor's public customers have better terms (per SEC filings)
- Legal team successfully negotiated 3 similar contracts last year
- Alternative vendor demo scored 7/10 vs current vendor 9/10
- CFO approved up to 15% budget flexibility`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["contract", "negotiation", "vendor", "legal", "risk management"],
  },
];

/**
 * Education Decision Templates
 */
const educationTemplates: DecisionTemplate[] = [
  {
    id: "edu-curriculum-change",
    name: "Curriculum Modernization",
    description: "Evaluate updating educational curriculum and methods",
    icon: "📚",
    theme: "education",
    category: "strategic",
    title: "Should we adopt a competency-based curriculum for our program?",
    context: `Current State:
- Traditional lecture-based program (4 years)
- 500 students enrolled, 85% graduation rate
- Employer satisfaction: 72%
- Student satisfaction: 68%

Market Pressure:
- Competitors launching flexible programs
- Industry demanding more practical skills
- Online alternatives growing 25% yearly
- Accreditation body encouraging innovation`,
    intent: `Success looks like:
- Improve employer satisfaction to 85%+
- Increase student satisfaction to 80%+
- Maintain or improve graduation rates
- Achieve accreditation approval
- Launch within 18 months`,
    options: `Option A: Full competency-based redesign
- Pros: Industry-aligned, flexible pacing
- Cons: Major faculty retraining, 2-year timeline

Option B: Hybrid model (50% competency-based)
- Pros: Gradual transition, lower risk
- Cons: Complexity, mixed student experience

Option C: Add competency modules to existing curriculum
- Pros: Fast implementation, minimal disruption
- Cons: May not move the needle significantly

Option D: Partner with industry for co-designed curriculum
- Pros: Direct employer input, internship pipeline
- Cons: Less academic control, partner dependency`,
    assumptions: `- Faculty will support change with proper incentives
- Accreditation body will approve new model
- Students prefer flexible learning options
- Technology infrastructure can support new model
- Budget available for 2-year transition`,
    risks: `- Faculty resistance slows implementation
- Accreditation complications
- Student confusion during transition
- Technology platform failures
- Industry partner priorities shift`,
    evidence: `- Peer institution saw 15% enrollment increase after similar change
- Survey: 78% of students prefer flexible pacing
- Advisory board unanimously supports modernization
- LMS vendor confirms platform can support competency tracking
- Faculty senate preliminary vote: 65% supportive`,
    difficulty: "complex",
    estimatedTime: "40 min",
    tags: ["curriculum", "education", "innovation", "accreditation", "student success"],
  },
];

/**
 * Environment Decision Templates
 */
const environmentTemplates: DecisionTemplate[] = [
  {
    id: "env-sustainability-initiative",
    name: "Corporate Sustainability Initiative",
    description: "Evaluate environmental sustainability programs",
    icon: "🌱",
    theme: "environment",
    category: "strategic",
    title: "Should we commit to carbon neutrality by 2030?",
    context: `Current Footprint:
- Annual emissions: 50,000 tonnes CO2e
- 60% from operations, 40% from supply chain
- Energy: 70% grid, 30% renewable
- Fleet: 200 vehicles, all diesel

Business Context:
- ESG increasingly important to investors
- 3 major customers require sustainability reporting
- Competitors announcing net-zero commitments
- Potential carbon tax legislation pending`,
    intent: `Success looks like:
- Credible, science-based target set
- Clear roadmap with milestones
- Stakeholder buy-in achieved
- Cost-neutral or positive ROI by 2028
- Enhanced brand reputation`,
    options: `Option A: Commit to net-zero by 2030 (aggressive)
- Pros: Leadership position, attracts talent/customers
- Cons: High cost, execution risk

Option B: Carbon neutral by 2035 (moderate)
- Pros: Achievable, allows technology maturation
- Cons: May be seen as insufficient

Option C: 50% reduction by 2030, net-zero by 2040
- Pros: Balanced approach, phased investment
- Cons: Middle-of-pack positioning

Option D: Focus on operational efficiency only
- Pros: Immediate ROI, no offset costs
- Cons: Doesn't address supply chain, reputation risk`,
    assumptions: `- Renewable energy costs continue declining
- Carbon offset market remains viable
- Suppliers will cooperate on scope 3
- Technology for hard-to-abate sectors improves
- No major business model changes required`,
    risks: `- Cost overruns on transition projects
- Greenwashing accusations if targets missed
- Supply chain partners unable to comply
- Technology solutions don't materialize
- Regulatory changes alter landscape`,
    evidence: `- Peer company achieved 40% reduction in 3 years
- Solar PPA would reduce energy costs by 20%
- Employee survey: 85% support strong climate action
- Customer RFPs increasingly weight sustainability
- McKinsey: Net-zero leaders outperform market by 5%`,
    difficulty: "complex",
    estimatedTime: "45 min",
    tags: ["sustainability", "ESG", "carbon", "climate", "environment"],
  },
];

/**
 * Real Estate Decision Templates
 */
const realEstateTemplates: DecisionTemplate[] = [
  {
    id: "re-office-strategy",
    name: "Office Space Strategy",
    description: "Evaluate office space needs and work model",
    icon: "🏢",
    theme: "realestate",
    category: "strategic",
    title: "Should we downsize office space and adopt hybrid work permanently?",
    context: `Current Situation:
- 100,000 sq ft office, 500 employees
- Lease expires in 18 months
- Current utilization: 40% average
- Monthly rent: $250,000
- 3 years remaining on current lease

Work Patterns Post-Pandemic:
- 60% of employees prefer hybrid (2-3 days office)
- 25% prefer fully remote
- 15% prefer full-time office
- Productivity metrics unchanged since hybrid started`,
    intent: `Success looks like:
- Right-sized space for actual needs
- 30%+ cost reduction
- Employee satisfaction maintained/improved
- Collaboration effectiveness preserved
- Flexibility for future changes`,
    options: `Option A: Downsize to 50,000 sq ft hub + hoteling
- Pros: 50% cost reduction, modern space
- Cons: Change management, potential crowding

Option B: Maintain current space, redesign for collaboration
- Pros: No relocation, space for growth
- Cons: High cost, underutilization continues

Option C: Fully remote with coworking memberships
- Pros: Maximum flexibility, lowest fixed cost
- Cons: Culture risk, no company "home"

Option D: Multiple smaller satellite offices
- Pros: Closer to employees, reduced commute
- Cons: Higher per-sq-ft cost, management complexity`,
    assumptions: `- Hybrid work is permanent, not temporary
- Employees will come in on designated days
- Technology supports seamless remote collaboration
- Real estate market favorable for negotiation
- No significant headcount changes planned`,
    risks: `- Underestimate space needs, employees can't find desks
- Overestimate, stuck with excess space
- Culture and collaboration suffer
- Lease negotiation unfavorable
- Employee backlash to any option`,
    evidence: `- Desk booking data shows 35% peak utilization
- Employee survey: 73% satisfied with hybrid
- Market analysis: 20% rent reduction achievable
- Peer companies averaging 60% space reduction
- IT confirms tech stack supports full remote`,
    difficulty: "moderate",
    estimatedTime: "35 min",
    tags: ["real estate", "office", "hybrid work", "lease", "workplace"],
  },
];

/**
 * Startup Decision Templates
 */
const startupTemplates: DecisionTemplate[] = [
  {
    id: "startup-funding-round",
    name: "Funding Round Decision",
    description: "Evaluate fundraising strategy and timing",
    icon: "🚀",
    theme: "startup",
    category: "strategic",
    title: "Should we raise Series A now or extend runway and grow more?",
    context: `Current Metrics:
- ARR: $1.2M, growing 15% MoM
- Runway: 10 months at current burn
- Team: 15 people
- Net Revenue Retention: 120%

Market Conditions:
- VC market tightening, valuations down 30%
- Our sector still attractive to investors
- 2 competitors recently raised at lower valuations
- Key enterprise customers requesting features faster`,
    intent: `Success looks like:
- 18+ months runway secured
- Valuation reflects our growth trajectory
- Right investors who add strategic value
- Maintain founder control (>50%)
- Funds deployed for clear growth milestones`,
    options: `Option A: Raise Series A now ($8-10M target)
- Pros: Secure runway, capitalize on momentum
- Cons: Lower valuation in current market

Option B: Bridge round ($2M) from existing investors
- Pros: Quick, maintain valuation, more time
- Cons: Smaller amount, signals uncertainty

Option C: Cut burn, extend to 18 months, grow to $2M ARR
- Pros: Better valuation, more leverage
- Cons: Slower growth, team morale risk

Option D: Revenue-based financing + small equity
- Pros: Less dilution, no board seats
- Cons: Cash flow pressure, limited amount`,
    assumptions: `- Growth rate maintainable at current/reduced burn
- Key employees will stay through uncertainty
- Market conditions won't worsen significantly
- Existing investors willing to bridge if needed
- $2M ARR achievable in 8 months`,
    risks: `- Market window closes, unable to raise
- Key employees leave during runway crunch
- Competitors raise and out-execute
- Bridge investors demand unfavorable terms
- Growth stalls without additional investment`,
    evidence: `- Comparable companies raising at 15-20x ARR
- 3 warm VC intros ready to activate
- Customer pipeline: $500K in late-stage deals
- Team retention: 95% last 12 months
- Advisor network includes 2 successful founders in space`,
    difficulty: "complex",
    estimatedTime: "40 min",
    tags: ["startup", "fundraising", "series A", "venture capital", "growth"],
  },
];

/**
 * Marketing Decision Templates
 */
const marketingTemplates: DecisionTemplate[] = [
  {
    id: "marketing-channel-strategy",
    name: "Marketing Channel Strategy",
    description: "Evaluate marketing channel mix and budget allocation",
    icon: "📢",
    theme: "marketing",
    category: "tactical",
    title: "Should we shift budget from paid ads to content marketing?",
    context: `Current Marketing Mix:
- Total budget: $500K/year
- Paid ads: 60% ($300K) - CAC $150
- Content/SEO: 20% ($100K) - CAC $80
- Events: 15% ($75K) - CAC $200
- Other: 5% ($25K)

Performance Trends:
- Paid ad CAC increased 40% YoY
- Organic traffic up 25% from content investment
- Content leads have 2x higher conversion rate
- iOS privacy changes impacting ad targeting`,
    intent: `Success looks like:
- Reduce blended CAC by 20%
- Maintain or increase lead volume
- Build sustainable organic traffic moat
- Diversify away from paid dependency
- Measurable results within 6 months`,
    options: `Option A: Aggressive shift (60% content, 30% paid)
- Pros: Long-term moat, lower CAC potential
- Cons: Short-term lead volume risk

Option B: Gradual shift (40% content, 45% paid)
- Pros: Balanced risk, test and learn
- Cons: May not move needle enough

Option C: Maintain current mix, optimize execution
- Pros: Known playbook, no disruption
- Cons: CAC likely to keep rising

Option D: Add new channel (influencer/community) at 20%
- Pros: Diversification, authentic reach
- Cons: Unproven, measurement challenges`,
    assumptions: `- Content quality can be maintained at scale
- SEO improvements achievable in 6 months
- Paid ad performance won't recover significantly
- Sales team can handle different lead quality
- Competitors not significantly outspending`,
    risks: `- Lead volume drops during transition
- Content doesn't rank as expected
- Sales team rejects content leads
- Competitor increases paid spend
- Algorithm changes hurt organic reach`,
    evidence: `- Industry benchmark: Content CAC 50% lower than paid
- Top 10 ranking keywords would drive 5,000 visits/month
- A/B test: Content leads close at 25% vs 15% for paid
- Competitor analysis: Leader gets 70% traffic from organic
- Team assessment: Can 2x content output with 1 hire`,
    difficulty: "moderate",
    estimatedTime: "30 min",
    tags: ["marketing", "CAC", "content", "paid ads", "SEO", "growth"],
  },
];

/**
 * HR Decision Templates
 */
const hrTemplates: DecisionTemplate[] = [
  {
    id: "hr-remote-policy",
    name: "Remote Work Policy",
    description: "Evaluate permanent remote/hybrid work policies",
    icon: "👥",
    theme: "hr",
    category: "operational",
    title: "What should our permanent remote work policy be?",
    context: `Current Situation:
- 500 employees across 3 offices
- Currently: flexible hybrid (no mandated days)
- Employee survey: 40% want full remote, 35% hybrid, 25% office
- Attrition: 15% (industry avg 12%)
- Open roles: 50, avg time-to-fill: 45 days

Competitive Landscape:
- 60% of competitors offer full remote options
- Top talent increasingly expects flexibility
- Some teams report collaboration challenges
- New hires never met teammates in person`,
    intent: `Success looks like:
- Attrition reduced to industry average
- Time-to-fill reduced to 30 days
- Employee satisfaction above 80%
- Team collaboration effectiveness maintained
- Clear, fair policy that's easy to administer`,
    options: `Option A: Full flexibility (employee choice)
- Pros: Maximum attraction, employee satisfaction
- Cons: Collaboration challenges, culture drift

Option B: Structured hybrid (3 days office, 2 remote)
- Pros: Predictable, ensures in-person time
- Cons: Loses full-remote talent, mandate resistance

Option C: Team-based decisions (manager discretion)
- Pros: Flexibility, team autonomy
- Cons: Inconsistency, perceived unfairness

Option D: Role-based policy (some roles remote-eligible)
- Pros: Clear criteria, operational needs met
- Cons: Creates two classes of employees`,
    assumptions: `- Productivity is equal or better with remote work
- Technology infrastructure supports remote collaboration
- Managers can effectively lead distributed teams
- Company culture can be maintained virtually
- No significant return-to-office pressure from leadership`,
    risks: `- Policy seen as unfair by some groups
- Key talent leaves over policy
- Collaboration and innovation suffer
- Manager inconsistency creates issues
- Policy needs revision, causes confusion`,
    evidence: `- Exit interviews: 30% cite flexibility as factor
- Remote employees: 10% higher performance ratings
- Glassdoor: Competitors with remote rated 0.5 stars higher
- Team survey: 65% say collaboration "same or better" remote
- Recruiting: 3x more applicants for remote-posted roles`,
    difficulty: "moderate",
    estimatedTime: "35 min",
    tags: ["HR", "remote work", "policy", "talent", "culture", "hybrid"],
  },
];

/**
 * All template categories
 */
export const templateCategories: TemplateCategory[] = [
  {
    id: "technology",
    name: "Technology",
    icon: "💻",
    description: "Software, infrastructure, and digital transformation decisions",
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
    description: "Investment, budgeting, and financial strategy decisions",
    templates: financeTemplates,
  },
  {
    id: "personal",
    name: "Personal & Career",
    icon: "👤",
    description: "Career moves, life decisions, and personal choices",
    templates: personalTemplates,
  },
  {
    id: "legal",
    name: "Legal",
    icon: "⚖️",
    description: "Contract, compliance, and legal strategy decisions",
    templates: legalTemplates,
  },
  {
    id: "education",
    name: "Education",
    icon: "📚",
    description: "Curriculum, academic, and educational policy decisions",
    templates: educationTemplates,
  },
  {
    id: "environment",
    name: "Environment",
    icon: "🌱",
    description: "Sustainability, ESG, and environmental decisions",
    templates: environmentTemplates,
  },
  {
    id: "realestate",
    name: "Real Estate",
    icon: "🏢",
    description: "Property, workspace, and real estate decisions",
    templates: realEstateTemplates,
  },
  {
    id: "startup",
    name: "Startup",
    icon: "🚀",
    description: "Fundraising, scaling, and startup strategy decisions",
    templates: startupTemplates,
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: "📢",
    description: "Channel, campaign, and marketing strategy decisions",
    templates: marketingTemplates,
  },
  {
    id: "hr",
    name: "HR & People",
    icon: "👥",
    description: "Workforce, policy, and people management decisions",
    templates: hrTemplates,
  },
];

/**
 * Get all templates as flat array
 */
export function getAllTemplates(): DecisionTemplate[] {
  return templateCategories.flatMap(cat => cat.templates);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DecisionTemplate | undefined {
  return getAllTemplates().find(t => t.id === id);
}

/**
 * Get templates by theme
 */
export function getTemplatesByTheme(theme: string): DecisionTemplate[] {
  return getAllTemplates().filter(t => t.theme === theme);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: DecisionTemplate["category"]): DecisionTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): DecisionTemplate[] {
  const lower = keyword.toLowerCase();
  return getAllTemplates().filter(t => 
    t.name.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.tags.some(tag => tag.toLowerCase().includes(lower))
  );
}
