// lib/analysis/core.ts
// ═══════════════════════════════════════════════════════════════════════════════
// CORE ANALYSIS MODULE
// Main entry point for decision analysis pipeline
// ═══════════════════════════════════════════════════════════════════════════════
import type { AnalysisBundle, DecisionInput } from "./types";
import { computeReadiness } from "./readiness";
import { computeHalfLife } from "./halfLife";
import { computeBlindSpots } from "./blindSpots";
import { computePerspectives } from "./perspective";

/**
 * Document context analysis result
 */
export type DocumentContextAnalysis = {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  keyTerms: string[];
  topicDensity: Record<string, number>;
  readabilityScore: number; // 0-100
  completenessScore: number; // 0-100
  suggestions: string[];
};

/**
 * Analyze document context for quality and completeness
 */
export function analyzeDocumentContext(input: DecisionInput): DocumentContextAnalysis {
  const allText = [
    input.context || "",
    input.intent || "",
    input.options?.join(" ") || "",
    input.assumptions?.join(" ") || "",
    input.risks?.join(" ") || "",
    input.evidence?.join(" ") || "",
  ].join(" ");

  // Basic text metrics
  const words = allText.split(/\s+/).filter(w => w.length > 0);
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

  // Extract key terms (excluding common words)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "this", "that", "these",
    "those", "it", "its", "they", "them", "their", "we", "our", "you", "your",
    "i", "me", "my", "he", "she", "him", "her", "his", "if", "then", "else",
  ]);

  const termFreq: Record<string, number> = {};
  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length > 3 && !stopWords.has(clean)) {
      termFreq[clean] = (termFreq[clean] || 0) + 1;
    }
  }

  const keyTerms = Object.entries(termFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);

  // Topic density analysis
  const topics: Record<string, RegExp> = {
    risk: /risk|danger|threat|concern|problem|issue|challenge/gi,
    opportunity: /opportunity|benefit|advantage|potential|gain|growth/gi,
    financial: /cost|budget|revenue|profit|investment|roi|dollar|\$|money/gi,
    technical: /technology|system|software|hardware|data|ai|automation/gi,
    timeline: /deadline|timeline|schedule|date|time|when|urgent|asap/gi,
    stakeholder: /stakeholder|team|customer|client|user|employee|partner/gi,
  };

  const topicDensity: Record<string, number> = {};
  for (const [topic, pattern] of Object.entries(topics)) {
    const matches = allText.match(pattern) || [];
    topicDensity[topic] = Math.round((matches.length / Math.max(1, wordCount)) * 100);
  }

  // Readability score (simplified Flesch-Kincaid)
  const syllableCount = words.reduce((sum, word) => {
    return sum + countSyllables(word);
  }, 0);
  const avgSyllables = wordCount > 0 ? syllableCount / wordCount : 0;
  const readabilityScore = Math.max(0, Math.min(100, 
    Math.round(206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllables)) / 2
  ));

  // Completeness score
  const completenessFactors = [
    (input.context?.length || 0) > 50 ? 20 : (input.context?.length || 0) > 10 ? 10 : 0,
    (input.intent?.length || 0) > 30 ? 20 : (input.intent?.length || 0) > 10 ? 10 : 0,
    (input.options?.length || 0) >= 2 ? 20 : (input.options?.length || 0) >= 1 ? 10 : 0,
    (input.assumptions?.length || 0) >= 2 ? 15 : (input.assumptions?.length || 0) >= 1 ? 7 : 0,
    (input.risks?.length || 0) >= 2 ? 15 : (input.risks?.length || 0) >= 1 ? 7 : 0,
    (input.evidence?.length || 0) >= 1 ? 10 : 0,
  ];
  const completenessScore = completenessFactors.reduce((a, b) => a + b, 0);

  // Generate suggestions
  const suggestions: string[] = [];
  if (!input.context || input.context.length < 50) {
    suggestions.push("Add more context to describe the situation and background");
  }
  if (!input.intent || input.intent.length < 30) {
    suggestions.push("Clarify your intent - what does success look like?");
  }
  if (!input.options || input.options.length < 2) {
    suggestions.push("Add at least 2 options to compare");
  }
  if (!input.assumptions || input.assumptions.length < 2) {
    suggestions.push("List key assumptions that need to be true");
  }
  if (!input.risks || input.risks.length < 2) {
    suggestions.push("Identify potential risks and downsides");
  }
  if (!input.evidence || input.evidence.length < 1) {
    suggestions.push("Add supporting evidence or data points");
  }
  if (topicDensity.financial < 1 && topicDensity.timeline < 1) {
    suggestions.push("Consider adding financial or timeline constraints");
  }
  if (topicDensity.stakeholder < 1) {
    suggestions.push("Mention key stakeholders who will be affected");
  }

  return {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    keyTerms,
    topicDensity,
    readabilityScore,
    completenessScore,
    suggestions: suggestions.slice(0, 5),
  };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length <= 3) return 1;
  
  const vowels = clean.match(/[aeiouy]+/g);
  if (!vowels) return 1;
  
  let count = vowels.length;
  // Subtract silent e
  if (clean.endsWith("e")) count--;
  // Subtract double vowels
  count -= (clean.match(/[aeiou]{2}/g) || []).length;
  
  return Math.max(1, count);
}

/**
 * Main analysis function
 */
export function analyzeDecision(input: DecisionInput): AnalysisBundle {
  const readiness = computeReadiness(input);

  // readiness.breakdown is now part of readiness output (Step 1 readiness.ts)
  // so UI can directly show:
  // - why score is 95/100
  // - what is missing to reach 100
  return {
    readiness,
    halfLife: computeHalfLife(input),
    blindSpots: computeBlindSpots(input),
    perspectives: computePerspectives(input),
    meta: {
      version: "0.1.0",
      generatedAtISO: new Date().toISOString(),
    },
  };
}

/**
 * Extended analysis with document context
 */
export function analyzeDecisionExtended(input: DecisionInput): AnalysisBundle & { 
  documentContext: DocumentContextAnalysis 
} {
  const baseAnalysis = analyzeDecision(input);
  const documentContext = analyzeDocumentContext(input);

  return {
    ...baseAnalysis,
    documentContext,
  };
}
