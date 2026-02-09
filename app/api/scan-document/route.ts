// app/api/scan-document/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT SCAN API - Extracts decision context from Images using Groq Vision
// Uses Groq Llama 4 Scout - Base64 max 4MB, URL max 20MB
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// Theme-specific extraction prompts
const THEME_PROMPTS: Record<string, string> = {
  general: "Extract business decision context",
  technology: "Extract technology/software decision context, focusing on technical specifications, system requirements, and engineering considerations",
  healthcare: "Extract healthcare decision context, focusing on patient safety, medical regulations, and clinical considerations",
  legal: "Extract legal decision context, focusing on compliance, regulations, liability, and legal precedents",
  finance: "Extract financial decision context, focusing on ROI, risk assessment, market conditions, and regulatory compliance",
  politics: "Extract political/governance decision context, focusing on stakeholder interests, public policy, and democratic accountability",
  religion: "Extract religious/ethical decision context, focusing on organizational values, community trust, and ethical transparency",
  education: "Extract educational decision context, focusing on learning outcomes, academic integrity, and student welfare",
  environment: "Extract environmental decision context, focusing on sustainability, regulatory compliance, and ecological impact",
  media: "Extract media/entertainment decision context, focusing on audience preferences, creative considerations, and market dynamics",
  transportation: "Extract transportation decision context, focusing on safety, infrastructure, logistics, and regulatory compliance",
};

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured. Please add it to your .env.local file." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const theme = (formData.get("theme") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    
    if (file.type === "application/pdf") {
      return NextResponse.json(
        { error: "PDF not supported. Please convert to image (PNG/JPG) or take a screenshot." },
        { status: 400 }
      );
    }
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported: ${file.type}. Use PNG, JPG, or WebP.` },
        { status: 400 }
      );
    }

    // ✅ Check file size - Groq base64 limit is 4MB
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 4MB for base64.` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Build extraction prompt - enhanced for decision-relevant points
    const extractionPrompt = `You are an expert decision analyst extracting decision-making context from documents.

Analyze this image THOROUGHLY and extract the following in JSON format:

{
  "detectedTheme": "One of: general, technology, healthcare, legal, finance, politics, religion, education, environment, media, transportation",
  "title": "A clear decision question starting with 'Should we...' or 'How should we...'",
  "context": "DETAILED background (2-4 paragraphs): current situation, history, stakeholders, constraints, market conditions",
  "intent": "Success criteria: specific measurable outcomes, KPIs, timeline for success",
  "options": "Available options (format each as 'Option X: [name] - [description with pros/cons]')",
  "assumptions": "Critical assumptions that MUST be true for success (be specific, not generic)",
  "risks": "Concrete risks with potential impact (format: '[Risk] - [Impact] - [Likelihood: High/Medium/Low]')",
  "evidence": "Specific data points, statistics, quotes, or facts from the document",
  "stakeholders": "Key people/groups affected and their interests",
  "timeline": "Any deadlines, milestones, or time constraints mentioned",
  "financialImpact": "Budget, costs, ROI, or financial considerations",
  "decisionCriteria": "What factors should drive this decision"
}

Theme Detection (pick the MOST relevant):
- technology: software, AI, systems, engineering, IT, coding, apps, digital transformation
- healthcare: medical, patient, clinical, hospital, treatment, health, FDA, pharma
- legal: law, compliance, regulation, contract, liability, court, litigation
- finance: investment, ROI, budget, market, trading, banking, stocks, crypto
- politics: government, policy, election, legislation, public affairs, democracy
- religion: church, faith, spiritual, congregation, ethics, ministry, moral
- education: school, learning, academic, student, curriculum, teaching, university
- environment: sustainability, climate, ecology, green, conservation, carbon, ESG
- media: entertainment, content, audience, broadcasting, publishing, social media
- transportation: logistics, shipping, traffic, infrastructure, transit, autonomous
- general: if none of the above clearly fits

EXTRACTION RULES:
1. Extract ONLY information present or clearly implied in the document
2. Use empty string "" if field has no relevant content
3. Be SPECIFIC - use actual names, numbers, dates from the document
4. For options, always suggest at least 2-3 if the document implies choices
5. For risks, consider both explicit and implicit risks
6. Format lists with line breaks between items
7. Include direct quotes where impactful
8. Note any urgency or time pressure mentioned

Return ONLY valid JSON, no markdown, no explanation, no preamble.`;

    // ✅ Call Groq Vision API - Llama 4 Scout
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Groq API error:", err);
      
      // Better error messages
      const errMsg = err?.error?.message || "";
      if (errMsg.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      if (errMsg.includes("invalid_api_key")) {
        return NextResponse.json(
          { error: "Invalid GROQ_API_KEY. Check your .env.local file." },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: errMsg || "Vision API error. Please try again." },
        { status: response.status }
      );
    }

    const result = await response.json();
    const text = result?.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let extracted: Record<string, string> = {};
    try {
      const cleanJson = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      extracted = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse Groq response:", text);
      return NextResponse.json(
        { error: "Failed to parse document. Try a clearer image with more text." },
        { status: 500 }
      );
    }

    // Validate detected theme
    const validThemes = ["general", "technology", "healthcare", "legal", "finance", "politics", "religion", "education", "environment", "media", "transportation"];
    const detectedTheme = validThemes.includes(extracted.detectedTheme) ? extracted.detectedTheme : "general";

    return NextResponse.json({
      success: true,
      detectedTheme,
      isDraft: true,
      ...extracted,
    });
  } catch (err: any) {
    console.error("Scan document error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
