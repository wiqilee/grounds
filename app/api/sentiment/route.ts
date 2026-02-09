// app/api/sentiment/route.ts
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type SentimentLabel = "positive" | "negative" | "neutral" | "mixed";

interface AspectSentiment {
  aspect: string;
  sentiment: SentimentLabel;
  confidence: number;
  keySignals: string[];
  summary: string;
}

interface SentimentResponse {
  success: boolean;
  aspects: AspectSentiment[];
  overallSentiment: SentimentLabel;
  overallConfidence: number;
  summary: string;
  modelUsed: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<SentimentResponse>> {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({
        success: false,
        aspects: [],
        overallSentiment: "neutral",
        overallConfidence: 0,
        summary: "",
        modelUsed: "",
        error: "GROQ_API_KEY not configured",
      }, { status: 500 });
    }

    const body = await req.json();
    const { title, context, intent, options, assumptions, risks, evidence, outcome } = body;

    // Build the analysis prompt
    const sections = [
      { name: "Context", content: context },
      { name: "Intent", content: intent },
      { name: "Options", content: options },
      { name: "Assumptions", content: assumptions },
      { name: "Risks", content: risks },
      { name: "Evidence", content: evidence },
      { name: "Outcome", content: outcome },
    ].filter(s => s.content && s.content.trim());

    const sectionsText = sections
      .map(s => `### ${s.name}\n${s.content}`)
      .join("\n\n");

    const prompt = `You are an expert sentiment analyst specializing in Aspect-Based Sentiment Analysis (ABSA).

Analyze the following decision document and provide sentiment analysis for each section.

# Decision: ${title || "Untitled Decision"}

${sectionsText}

---

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "aspects": [
    {
      "aspect": "Section Name",
      "sentiment": "positive" | "negative" | "neutral" | "mixed",
      "confidence": 0-100,
      "keySignals": ["word1", "word2", "word3"],
      "summary": "Brief explanation of why this sentiment"
    }
  ],
  "overallSentiment": "positive" | "negative" | "neutral" | "mixed",
  "overallConfidence": 0-100,
  "summary": "Overall sentiment summary in 1-2 sentences"
}

Guidelines:
- Analyze tone, word choice, and framing
- "positive" = optimistic, confident, opportunity-focused
- "negative" = pessimistic, uncertain, risk-heavy
- "neutral" = factual, balanced, objective
- "mixed" = contains both positive and negative elements
- Confidence should reflect how clear the sentiment signals are
- keySignals should be 2-4 actual words/phrases from the text`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analysis expert. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({
        success: false,
        aspects: [],
        overallSentiment: "neutral",
        overallConfidence: 0,
        summary: "",
        modelUsed: "",
        error: `Groq API error: ${response.status}`,
      }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse sentiment response:", content);
      return NextResponse.json({
        success: false,
        aspects: [],
        overallSentiment: "neutral",
        overallConfidence: 0,
        summary: "",
        modelUsed: "Llama 4 Scout",
        error: "Failed to parse AI response",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      aspects: parsed.aspects || [],
      overallSentiment: parsed.overallSentiment || "neutral",
      overallConfidence: parsed.overallConfidence || 70,
      summary: parsed.summary || "",
      modelUsed: "Llama 4 Scout (Groq)",
    });

  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return NextResponse.json({
      success: false,
      aspects: [],
      overallSentiment: "neutral",
      overallConfidence: 0,
      summary: "",
      modelUsed: "",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
