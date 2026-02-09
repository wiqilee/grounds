// app/api/pdf/route.ts
import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: up to 60s, Hobby: 10s

type Body = {
  html?: string;
  filename?: string;
  timeoutMs?: number;
  retry?: number;
};

function safeFilename(x: string | undefined) {
  const base = (x ?? "report")
    .toLowerCase()
    .replaceAll(/[^a-z0-9-_]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return base || "report";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
}

function shortHtmlPreview(html: string) {
  const s = html.replace(/\s+/g, " ").trim();
  return s.length > 240 ? s.slice(0, 240) + "…" : s;
}

export async function POST(req: Request) {
  let body: Body | null = null;

  // parse JSON
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", hint: "Send: { html: string, filename?: string }" },
      { status: 400 }
    );
  }

  const html = body?.html;
  if (!html || typeof html !== "string" || html.trim().length < 20) {
    return NextResponse.json(
      { error: "Missing 'html' in request body.", hint: "Expected HTML string (min length ~20)." },
      { status: 400 }
    );
  }

  const filename = safeFilename(body?.filename);
  const timeoutMs = clamp(Number(body?.timeoutMs ?? 45_000), 8_000, 120_000);
  const retry = clamp(Number(body?.retry ?? 1), 0, 2);

  const debugMeta = { filename, htmlChars: html.length, timeoutMs, retry };

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retry; attempt++) {
    let browser: Browser | null = null;

    try {
      // Get chromium executable path for serverless environment
      const executablePath = await chromium.executablePath();

      browser = await withTimeout(
        puppeteer.launch({
          args: chromium.args,
          defaultViewport: { width: 1200, height: 800 },
          executablePath,
          headless: true,
        }),
        timeoutMs,
        "browser launch timeout"
      );

      const page = await withTimeout(browser.newPage(), timeoutMs, "newPage timeout");

      // Set content with timeout
      await withTimeout(
        page.setContent(html, { waitUntil: "domcontentloaded" }),
        timeoutMs,
        "setContent timeout"
      );

      // Wait for network idle (best-effort)
      try {
        await withTimeout(
          page.waitForNetworkIdle({ idleTime: 500, timeout: 4_000 }),
          6_000,
          "networkidle grace timeout"
        );
      } catch {
        // ignore - continue anyway
      }

      // Wait for fonts (best-effort)
      try {
        await withTimeout(
          page.evaluate(async () => {
            // @ts-ignore
            if (document?.fonts?.ready) {
              // @ts-ignore
              await document.fonts.ready;
            }
          }),
          6_000,
          "fonts timeout"
        );
      } catch {
        // ignore - continue anyway
      }

      const footerTemplate = `
        <div style="
          width: 100%;
          font-size: 10px;
          color: rgba(20, 20, 20, 0.75);
          padding: 0 18mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="white-space: nowrap;">
            Built by <span style="font-weight:600;">Wiqi Lee</span> ✨
          </div>
          <div style="white-space: nowrap;">
            Page <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        </div>
      `;

      const headerTemplate = `
        <div style="width:100%; font-size:10px; color:transparent; padding: 0 18mm;">
          .
        </div>
      `;

      const pdf = await withTimeout(
        page.pdf({
          format: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate,
          margin: {
            top: "12mm",
            right: "12mm",
            bottom: "18mm",
            left: "12mm",
          },
          preferCSSPageSize: true,
        }),
        timeoutMs,
        "pdf render timeout"
      );

      // Close browser (best-effort)
      try {
        await withTimeout(browser.close(), 8_000, "browser close timeout");
      } catch {
        // ignore
      }

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const pdfBytes = new Uint8Array(pdf);

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}.pdf"`,
          "Cache-Control": "no-store",
          "X-Grounds-PDF-Attempt": String(attempt + 1),
        },
      });
    } catch (e: unknown) {
      lastErr = e;

      if (browser) {
        try {
          await withTimeout(browser.close(), 8_000, "browser close timeout");
        } catch {
          // ignore
        }
      }

      if (attempt < retry) continue;
    }
  }

  const msg = String((lastErr as Error)?.message ?? lastErr ?? "Unknown error");

  const isTimeout = /timeout/i.test(msg);
  const isOOM = /out of memory|oom|memory/i.test(msg);
  const isNav = /navigation|net::|network/i.test(msg);

  const hint = isTimeout
    ? "PDF render took too long. Try again, or reduce embedded assets (images/fonts), or simplify the HTML."
    : isOOM
    ? "Server ran out of memory during PDF render. Try reducing heavy images/gradients or splitting the report."
    : isNav
    ? "Network/asset loading issue. Inline critical assets or avoid external calls in the HTML."
    : "Try again. If it persists, simplify HTML or remove external assets.";

  return NextResponse.json(
    {
      error: "PDF export failed.",
      detail: msg,
      hint,
      meta: debugMeta,
      htmlPreview: shortHtmlPreview(html),
    },
    { status: isTimeout ? 504 : 500 }
  );
}
