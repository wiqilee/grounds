// app/api/conclusion/route.ts
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ConclusionResponse {
  success: boolean;
  summary: string;
  recommendation: string;
  keyTakeaways: string[];
  nextSteps: string[];
  reviewDate: string;
  confidenceStatement: string;
  modelUsed: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ConclusionResponse>> {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({
        success: false,
        summary: "",
        recommendation: "",
        keyTakeaways: [],
        nextSteps: [],
        reviewDate: "",
        confidenceStatement: "",
        modelUsed: "",
        error: "GROQ_API_KEY not configured",
      }, { status: 500 });
    }

    const body = await req.json();
    const { 
      title, 
      context, 
      intent, 
      options, 
      risks, 
      readinessScore, 
      grade, 
      confidence,
      theme 
    } = body;

    const prompt = `You are an executive decision advisor. Generate a comprehensive conclusion for this decision analysis.

# Decision Analysis Summary

**Title:** ${title || "Untitled Decision"}
**Theme:** ${theme || "general"}
**Readiness Score:** ${readinessScore || 0}/100
**Grade:** ${grade || "N/A"}
**Confidence Level:** ${confidence || "medium"}

**Context:**
${context || "No context provided"}

**Intent:**
${intent || "No intent specified"}

**Options:**
${options || "No options listed"}

**Key Risks:**
${risks || "No risks identified"}

---

Generate a conclusion with the following structure. Respond ONLY with valid JSON (no markdown):

{
  "summary": "2-3 sentence executive summary of the decision and its current state",
  "recommendation": "Clear, actionable recommendation (1-2 sentences)",
  "keyTakeaways": [
    "Takeaway 1",
    "Takeaway 2", 
    "Takeaway 3",
    "Takeaway 4",
    "Takeaway 5"
  ],
  "nextSteps": [
    "Immediate action 1",
    "Immediate action 2",
    "Immediate action 3",
    "Immediate action 4"
  ],
  "reviewDate": "Suggested review timeframe (e.g., '2 weeks from decision', '30 days', 'Q2 2025')",
  "confidenceStatement": "Assessment of confidence in this analysis (1 sentence)"
}

Guidelines:
- Be specific and actionable
- Reference the actual readiness score and grade
- Key takeaways should be concrete insights, not generic advice
- Next steps should have clear ownership potential
- Review date should be realistic based on the decision complexity`;

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
            content: "You are an executive decision advisor. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({
        success: false,
        summary: "",
        recommendation: "",
        keyTakeaways: [],
        nextSteps: [],
        reviewDate: "",
        confidenceStatement: "",
        modelUsed: "",
        error: `Groq API error: ${response.status}`,
      }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed;
    try {
      const cleanContent = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse conclusion response:", content);
      return NextResponse.json({
        success: false,
        summary: "",
        recommendation: "",
        keyTakeaways: [],
        nextSteps: [],
        reviewDate: "",
        confidenceStatement: "",
        modelUsed: "Llama 4 Scout",
        error: "Failed to parse AI response",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: parsed.summary || "",
      recommendation: parsed.recommendation || "",
      keyTakeaways: parsed.keyTakeaways || [],
      nextSteps: parsed.nextSteps || [],
      reviewDate: parsed.reviewDate || "2 weeks from now",
      confidenceStatement: parsed.confidenceStatement || "",
      modelUsed: "Llama 4 Scout (Groq)",
    });

  } catch (error) {
    console.error("Conclusion generation error:", error);
    return NextResponse.json({
      success: false,
      summary: "",
      recommendation: "",
      keyTakeaways: [],
      nextSteps: [],
      reviewDate: "",
      confidenceStatement: "",
      modelUsed: "",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
