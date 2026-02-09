// lib/analysis/research.ts
// ═══════════════════════════════════════════════════════════════════════════════
// RESEARCH ANALYSIS MODULE
// Processes research results and integrates with decision context
// ═══════════════════════════════════════════════════════════════════════════════

export type ResearchSource = {
    title: string;
    url: string;
    snippet: string;
    relevanceScore?: number;
  };
  
  export type ResearchFinding = {
    finding: string;
    category: "fact" | "statistic" | "opinion" | "trend" | "risk" | "opportunity";
    confidence: "high" | "medium" | "low";
    source?: string;
  };
  
  export type ProcessedResearch = {
    summary: string;
    findings: ResearchFinding[];
    sources: ResearchSource[];
    themes: string[];
    risks: string[];
    opportunities: string[];
    dataPoints: string[];
    suggestedActions: string[];
    researchQuality: {
      score: number;
      sourceCount: number;
      recentSources: number;
      diversityScore: number;
    };
  };
  
  /**
   * Process raw research results into structured decision-relevant insights
   */
  export function processResearchResults(
    rawResults: {
      summary: string;
      keyFindings: string[];
      sources: ResearchSource[];
      relatedQueries: string[];
    },
    decisionContext?: string
  ): ProcessedResearch {
    const findings: ResearchFinding[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];
    const dataPoints: string[] = [];
    const themes: string[] = [];
  
    // Categorize each finding
    for (const finding of rawResults.keyFindings) {
      const lower = finding.toLowerCase();
      const category = categorizeFinding(lower);
      const confidence = assessConfidence(finding);
  
      findings.push({
        finding,
        category,
        confidence,
      });
  
      // Extract specific insights
      if (isRisk(lower)) {
        risks.push(finding);
      }
      if (isOpportunity(lower)) {
        opportunities.push(finding);
      }
      if (hasDataPoint(lower)) {
        dataPoints.push(finding);
      }
    }
  
    // Extract themes from findings and summary
    const allText = `${rawResults.summary} ${rawResults.keyFindings.join(" ")}`;
    themes.push(...extractThemes(allText));
  
    // Generate suggested actions based on findings
    const suggestedActions = generateSuggestedActions(findings, risks, opportunities);
  
    // Calculate research quality score
    const researchQuality = calculateResearchQuality(rawResults.sources, findings);
  
    return {
      summary: rawResults.summary,
      findings,
      sources: rawResults.sources,
      themes: [...new Set(themes)].slice(0, 5),
      risks: risks.slice(0, 5),
      opportunities: opportunities.slice(0, 5),
      dataPoints: dataPoints.slice(0, 5),
      suggestedActions,
      researchQuality,
    };
  }
  
  /**
   * Categorize a finding into predefined categories
   */
  function categorizeFinding(text: string): ResearchFinding["category"] {
    if (/\d+%|\d+\s*(million|billion|thousand)|\$\d+/i.test(text)) {
      return "statistic";
    }
    if (/trend|growing|increasing|declining|emerging/i.test(text)) {
      return "trend";
    }
    if (/risk|threat|danger|challenge|concern/i.test(text)) {
      return "risk";
    }
    if (/opportunity|potential|benefit|advantage/i.test(text)) {
      return "opportunity";
    }
    if (/according to|research shows|studies indicate|experts say/i.test(text)) {
      return "fact";
    }
    return "opinion";
  }
  
  /**
   * Assess confidence level of a finding
   */
  function assessConfidence(text: string): ResearchFinding["confidence"] {
    const lower = text.toLowerCase();
    
    // High confidence indicators
    if (/confirmed|proven|established|according to .+ research|data shows/i.test(lower)) {
      return "high";
    }
    
    // Low confidence indicators
    if (/may|might|could|possibly|potentially|uncertain|unclear/i.test(lower)) {
      return "low";
    }
    
    return "medium";
  }
  
  /**
   * Check if finding indicates a risk
   */
  function isRisk(text: string): boolean {
    return /risk|threat|danger|challenge|concern|problem|issue|warning|caution|decline|decrease|loss|fail/i.test(text);
  }
  
  /**
   * Check if finding indicates an opportunity
   */
  function isOpportunity(text: string): boolean {
    return /opportunity|potential|benefit|advantage|growth|increase|gain|improve|success|win/i.test(text);
  }
  
  /**
   * Check if finding contains a data point
   */
  function hasDataPoint(text: string): boolean {
    return /\d+%|\d+\s*(million|billion|thousand|k|m|b)|\$\d+|\d{4}/i.test(text);
  }
  
  /**
   * Extract themes from text
   */
  function extractThemes(text: string): string[] {
    const themes: string[] = [];
    const lower = text.toLowerCase();
  
    const themePatterns: Record<string, RegExp> = {
      "Technology": /technology|tech|ai|automation|digital|software|hardware|cloud/i,
      "Finance": /finance|investment|market|stock|revenue|profit|cost|budget/i,
      "Healthcare": /health|medical|patient|clinical|treatment|hospital/i,
      "Regulation": /regulation|compliance|law|legal|policy|government/i,
      "Security": /security|privacy|cyber|data protection|breach/i,
      "Sustainability": /sustainability|environment|climate|green|carbon/i,
      "Market Trends": /market|industry|sector|competition|competitor/i,
      "Innovation": /innovation|research|development|breakthrough|emerging/i,
    };
  
    for (const [theme, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(lower)) {
        themes.push(theme);
      }
    }
  
    return themes;
  }
  
  /**
   * Generate suggested actions based on research findings
   */
  function generateSuggestedActions(
    findings: ResearchFinding[],
    risks: string[],
    opportunities: string[]
  ): string[] {
    const actions: string[] = [];
  
    // Actions based on risks
    if (risks.length > 0) {
      actions.push(`Review and mitigate ${risks.length} identified risk(s) before proceeding`);
      if (risks.length >= 3) {
        actions.push("Develop contingency plans for high-impact risks");
      }
    }
  
    // Actions based on opportunities
    if (opportunities.length > 0) {
      actions.push(`Evaluate ${opportunities.length} potential opportunity/opportunities for strategic advantage`);
    }
  
    // Actions based on data points
    const dataFindings = findings.filter(f => f.category === "statistic");
    if (dataFindings.length > 0) {
      actions.push("Validate key statistics with primary sources");
    }
  
    // Actions based on trends
    const trendFindings = findings.filter(f => f.category === "trend");
    if (trendFindings.length > 0) {
      actions.push("Monitor identified trends for ongoing relevance");
    }
  
    // General actions
    if (findings.some(f => f.confidence === "low")) {
      actions.push("Conduct additional research to validate uncertain findings");
    }
  
    return actions.slice(0, 5);
  }
  
  /**
   * Calculate research quality metrics
   */
  function calculateResearchQuality(
    sources: ResearchSource[],
    findings: ResearchFinding[]
  ): ProcessedResearch["researchQuality"] {
    const sourceCount = sources.length;
    
    // Check for recent sources (2024-2025 in URL or title)
    const recentSources = sources.filter(s => 
      /2024|2025/i.test(s.title) || /2024|2025/i.test(s.url)
    ).length;
  
    // Calculate diversity based on unique domains
    const domains = new Set(sources.map(s => {
      try {
        return new URL(s.url).hostname;
      } catch {
        return s.url;
      }
    }));
    const diversityScore = Math.min(100, (domains.size / Math.max(1, sourceCount)) * 100);
  
    // Calculate overall score
    const findingQuality = findings.filter(f => f.confidence !== "low").length / Math.max(1, findings.length);
    const sourceQuality = Math.min(1, sourceCount / 5);
    const recencyBonus = recentSources / Math.max(1, sourceCount);
  
    const score = Math.round(
      (findingQuality * 40) + 
      (sourceQuality * 30) + 
      (diversityScore * 0.2) + 
      (recencyBonus * 10)
    );
  
    return {
      score: Math.min(100, score),
      sourceCount,
      recentSources,
      diversityScore: Math.round(diversityScore),
    };
  }
  
  /**
   * Merge research insights with existing decision context
   */
  export function enrichDecisionContext(
    existingContext: string,
    research: ProcessedResearch
  ): string {
    const enrichments: string[] = [];
  
    if (research.dataPoints.length > 0) {
      enrichments.push(`\n\n📊 Research Data Points:\n${research.dataPoints.map(d => `• ${d}`).join("\n")}`);
    }
  
    if (research.risks.length > 0) {
      enrichments.push(`\n\n⚠️ Research-Identified Risks:\n${research.risks.map(r => `• ${r}`).join("\n")}`);
    }
  
    if (research.opportunities.length > 0) {
      enrichments.push(`\n\n💡 Research-Identified Opportunities:\n${research.opportunities.map(o => `• ${o}`).join("\n")}`);
    }
  
    return existingContext + enrichments.join("");
  }
  
  /**
   * Generate research queries based on decision input
   */
  export function generateResearchQueries(input: {
    title?: string;
    context?: string;
    options?: string[];
    theme?: string;
  }): string[] {
    const queries: string[] = [];
    const { title, context, options, theme } = input;
  
    // Primary query from title
    if (title) {
      queries.push(`${title} best practices 2025`);
      queries.push(`${title} risks and challenges`);
    }
  
    // Theme-specific queries
    const themeQueries: Record<string, string[]> = {
      technology: ["technology adoption trends 2025", "digital transformation challenges"],
      healthcare: ["healthcare regulations 2025", "medical decision-making best practices"],
      finance: ["financial risk assessment 2025", "investment decision frameworks"],
      legal: ["legal compliance requirements 2025", "regulatory changes impact"],
      education: ["education technology trends 2025", "academic policy decisions"],
    };
  
    if (theme && themeQueries[theme]) {
      queries.push(...themeQueries[theme]);
    }
  
    // Option-specific queries
    if (options && options.length > 0) {
      const firstOption = options[0];
      if (firstOption.length > 10) {
        queries.push(`${firstOption.slice(0, 50)} case studies`);
      }
    }
  
    // Extract key terms from context
    if (context) {
      const keyTerms = extractKeyTerms(context);
      if (keyTerms.length > 0) {
        queries.push(`${keyTerms.slice(0, 3).join(" ")} industry analysis 2025`);
      }
    }
  
    return [...new Set(queries)].slice(0, 5);
  }
  
  /**
   * Extract key terms from text for query generation
   */
  function extractKeyTerms(text: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
      "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "must", "shall", "can", "this", "that", "these",
      "those", "it", "its", "they", "them", "their", "we", "our", "you", "your",
    ]);
  
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
  
    // Count word frequency
    const freq: Record<string, number> = {};
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }
  
    // Sort by frequency and return top terms
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  