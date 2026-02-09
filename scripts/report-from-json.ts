import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { analyzeDecision } from "../lib/analysis/index";
import { toReportHTML } from "../lib/report/html";

type Args = { inFile: string; outFile: string; pdf: boolean };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : null;
  };
  const inFile = get("--in") ?? "";
  const outFile = get("--out") ?? "";
  const pdf = argv.includes("--pdf");
  if (!inFile || !outFile) {
    console.error("Usage: tsx scripts/report-from-json.ts --in <input.json> --out <output.html> [--pdf]");
    process.exit(1);
  }
  return { inFile, outFile, pdf };
}

async function maybePDF(htmlPath: string) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const html = fs.readFileSync(htmlPath, "utf-8");
    await page.setContent(html, { waitUntil: "load" });
    const pdfPath = htmlPath.replace(/\.html$/i, ".pdf");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
    });
    await browser.close();
    console.log("PDF written:", pdfPath);
  } catch (e) {
    console.warn("PDF export skipped. Install Playwright to enable it.");
    console.warn(String(e));
  }
}

async function main() {
  const args = parseArgs();
  const raw = fs.readFileSync(args.inFile, "utf-8");
  const input = JSON.parse(raw);

  const decision = input?.title ? input : (input?.events?.[0] ?? null);
  if (!decision) {
    console.error("Input format not recognized. Provide a DecisionInput JSON or a ledger with events[0].");
    process.exit(1);
  }

  const normalized = {
    title: decision.title ?? "Untitled",
    context: decision.context ?? "",
    intent: decision.intent ?? "",
    options: decision.options ?? [],
    assumptions: decision.assumptions ?? [],
    risks: decision.risks ?? [],
    evidence: decision.evidence ?? [],
    confidence: decision.confidence ?? "medium",
    createdAtISO: decision.createdAtISO ?? new Date().toISOString(),
    outcome: decision.outcome,
  };

  const analysis = analyzeDecision(normalized as any);
  const html = toReportHTML(normalized as any, analysis);

  const outDir = path.dirname(args.outFile);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(args.outFile, html, "utf-8");
  console.log("HTML written:", args.outFile);

  if (args.pdf) await maybePDF(args.outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
