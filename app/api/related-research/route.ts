// app/api/related-research/route.ts
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type ResearchType = "research" | "news" | "case_study" | "article";

interface ResearchLink {
  title: string;
  description: string;
  type: ResearchType;
  suggestedSearch: string;
  relevance: string;
}

interface ResearchResponse {
  success: boolean;
  links: ResearchLink[];
  searchSuggestions: string[];
  educationalNote: string;
  modelUsed: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ResearchResponse>> {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({
        success: false,
        links: [],
        searchSuggestions: [],
        educationalNote: "",
        modelUsed: "",
        error: "GROQ_API_KEY not configured",
      }, { status: 500 });
    }

    const body = await req.json();
    const { title, context, theme } = body;

    const themeContext = getThemeContext(theme);

    const prompt = `You are a research advisor helping someone make an informed decision.

# Decision Context

**Title:** ${title || "Untitled Decision"}
**Theme/Domain:** ${theme || "general"} - ${themeContext}

**Background:**
${context || "No context provided"}

---

Suggest relevant research topics and resources to help inform this decision. Respond ONLY with valid JSON (no markdown):

{
  "links": [
    {
      "title": "Research topic or article title",
      "description": "Why this is relevant to the decision (1-2 sentences)",
      "type": "research" | "news" | "case_study" | "article",
      "suggestedSearch": "Google search query to find this",
      "relevance": "high" | "medium"
    }
  ],
  "searchSuggestions": [
    "Search query 1",
    "Search query 2",
    "Search query 3",
    "Search query 4",
    "Search query 5"
  ],
  "educationalNote": "Brief tip on how to evaluate sources for this type of decision"
}

Guidelines:
- Suggest 4-6 research links
- Mix types: include research papers, recent news, case studies, and articles
- Search queries should be specific and likely to return useful results
- Focus on the specific domain/theme
- Include both foundational knowledge and recent developments
- Educational note should help the reader evaluate source quality`;

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
            content: "You are a research advisor. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({
        success: false,
        links: [],
        searchSuggestions: [],
        educationalNote: "",
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
      console.error("Failed to parse research response:", content);
      return NextResponse.json({
        success: false,
        links: [],
        searchSuggestions: [],
        educationalNote: "",
        modelUsed: "Llama 4 Scout",
        error: "Failed to parse AI response",
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      links: parsed.links || [],
      searchSuggestions: parsed.searchSuggestions || [],
      educationalNote: parsed.educationalNote || "",
      modelUsed: "Llama 4 Scout (Groq)",
    });

  } catch (error) {
    console.error("Research suggestion error:", error);
    return NextResponse.json({
      success: false,
      links: [],
      searchSuggestions: [],
      educationalNote: "",
      modelUsed: "",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

function getThemeContext(theme: string): string {
  const contexts: Record<string, string> = {
    general: "General business decisions",
    technology: "Technology and infrastructure decisions",
    healthcare: "Healthcare and medical decisions",
    legal: "Legal and compliance matters",
    finance: "Financial and investment decisions",
    government: "Government and public policy",
    religion: "Religious and ethical considerations",
    education: "Education and academic decisions",
    environment: "Environmental and sustainability",
    media: "Media and entertainment industry",
    transportation: "Transportation and logistics",
  };
  return contexts[theme] || contexts.general;
}
