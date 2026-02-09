// app/api/research/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI RESEARCH API - Web Search Integration with Grounding
// Uses Google Gemini's Grounding with Google Search for real-time research
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

export type ResearchResult = {
  success: boolean;
  query: string;
  summary: string;
  keyFindings: string[];
  sources: {
    title: string;
    url: string;
    snippet: string;
  }[];
  relatedQueries: string[];
  groundingMetadata?: {
    searchEntryPoint?: { renderedContent?: string };
    groundingChunks?: Array<{
      web?: { uri?: string; title?: string };
    }>;
    groundingSupports?: Array<{
      segment?: { text?: string };
      groundingChunkIndices?: number[];
    }>;
    webSearchQueries?: string[];
  };
  modelUsed: string;
  latencyMs: number;
};

export type ResearchRequest = {
  query: string;
  context?: string;
  theme?: string;
  maxResults?: number;
};

/**
 * Gemini model with Google Search grounding
 */
async function searchWithGemini(
  query: string,
  context?: string,
  theme?: string
): Promise<ResearchResult> {
  const start = Date.now();
  
  // Gemini 3 models for Google Hackathon (with fallbacks)
  const models = [
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  // Build the research prompt
  const systemPrompt = `You are a research assistant helping with decision-making analysis.
Your task is to research the given query and provide actionable insights.

Theme context: ${theme || "general"}
${context ? `Decision context: ${context}` : ""}

Provide your response in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of key findings",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4", "Finding 5"],
  "relatedQueries": ["Related query 1", "Related query 2", "Related query 3"]
}

Rules:
- Focus on recent, reliable information (2024-2025)
- Prioritize actionable insights for decision-making
- Include statistics and data points when available
- Be specific and avoid generic statements
- Return ONLY valid JSON, no markdown or explanation`;

  const userPrompt = `Research this topic for decision-making purposes: "${query}"`;

  let lastError: Error | null = null;
  
  for (const model of models) {
    try {
      console.log(`[Research API] Trying model: ${model}`);
      
      // Call Gemini API with Google Search grounding
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
            // Enable Google Search grounding
            tools: [
              {
                googleSearch: {},
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error(`[Research API] Model ${model} failed:`, err);
        lastError = new Error(err?.error?.message || `Gemini API error: ${response.status}`);
        continue; // Try next model
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const groundingMetadata = result?.candidates?.[0]?.groundingMetadata;

      // Check if we got a valid response
      if (!text && !groundingMetadata) {
        console.error(`[Research API] Model ${model} returned empty response`);
        lastError = new Error("Empty response from model");
        continue;
      }

      // Parse the JSON response
      let parsed: { summary: string; keyFindings: string[]; relatedQueries: string[] };
      try {
        const cleanJson = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(cleanJson);
      } catch {
        // Fallback if JSON parsing fails
        parsed = {
          summary: text.slice(0, 500) || "Research completed",
          keyFindings: text ? ["Research completed - see summary for details"] : [],
          relatedQueries: [],
        };
      }

      // Extract sources from grounding metadata
      const sources: { title: string; url: string; snippet: string }[] = [];
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            // Find relevant snippet from groundingSupports
            let snippet = "";
            if (groundingMetadata.groundingSupports) {
              const support = groundingMetadata.groundingSupports.find(
                (s: any) => s.groundingChunkIndices?.includes(groundingMetadata.groundingChunks!.indexOf(chunk))
              );
              snippet = support?.segment?.text || "";
            }
            sources.push({
              title: chunk.web.title,
              url: chunk.web.uri,
              snippet: snippet.slice(0, 200),
            });
          }
        }
      }

      console.log(`[Research API] Success with model: ${model}, latency: ${Date.now() - start}ms`);

      return {
        success: true,
        query,
        summary: parsed.summary || "Research completed",
        keyFindings: parsed.keyFindings || [],
        sources: sources.slice(0, 5),
        relatedQueries: parsed.relatedQueries || groundingMetadata?.webSearchQueries || [],
        groundingMetadata,
        modelUsed: model,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      console.error(`[Research API] Model ${model} exception:`, error.message);
      lastError = error;
      continue; // Try next model
    }
  }

  // All models failed
  console.error("[Research API] All models failed, last error:", lastError?.message);
  return {
    success: false,
    query,
    summary: lastError?.message || "Research failed - all models unavailable",
    keyFindings: [],
    sources: [],
    relatedQueries: [],
    modelUsed: "none",
    latencyMs: Date.now() - start,
  };
}

/**
 * POST /api/research
 * Performs web research using Gemini with Google Search grounding
 */
export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_API_KEY) {
      console.error("[Research API] GOOGLE_API_KEY not configured");
      // Return success:false instead of 500 error to prevent crash
      return NextResponse.json({
        success: false,
        query: "",
        summary: "Research unavailable - API key not configured. Please add GOOGLE_API_KEY to environment variables.",
        keyFindings: [],
        sources: [],
        relatedQueries: [],
        modelUsed: "none",
        latencyMs: 0,
      });
    }

    const body = await req.json();
    const { query, context, theme } = body as ResearchRequest;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query must be at least 3 characters" },
        { status: 400 }
      );
    }

    const result = await searchWithGemini(query.trim(), context, theme);

    // Always return 200 with success flag - let client handle failures gracefully
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Research API] Unhandled error:", error);
    // Return graceful failure instead of 500
    return NextResponse.json({
      success: false,
      query: "",
      summary: error.message || "Research failed due to unexpected error",
      keyFindings: [],
      sources: [],
      relatedQueries: [],
      modelUsed: "none",
      latencyMs: 0,
    });
  }
}

/**
 * GET /api/research?q=query
 * Quick research endpoint for simple queries
 */
export async function GET(req: NextRequest) {
  try {
    if (!GOOGLE_API_KEY) {
      console.error("[Research API] GOOGLE_API_KEY not configured");
      return NextResponse.json({
        success: false,
        query: "",
        summary: "Research unavailable - API key not configured",
        keyFindings: [],
        sources: [],
        relatedQueries: [],
        modelUsed: "none",
        latencyMs: 0,
      });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const theme = searchParams.get("theme") || "general";

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query parameter 'q' must be at least 3 characters" },
        { status: 400 }
      );
    }

    const result = await searchWithGemini(query.trim(), undefined, theme);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Research API] Unhandled error:", error);
    return NextResponse.json({
      success: false,
      query: "",
      summary: error.message || "Research failed",
      keyFindings: [],
      sources: [],
      relatedQueries: [],
      modelUsed: "none",
      latencyMs: 0,
    });
  }
}
