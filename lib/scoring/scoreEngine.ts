/* lib/scoring/scoreEngine.ts
   Rust WASM bridge (dev-friendly, TypeScript-safe).
   - Avoids TS "Cannot find module" by not using a static import.
   - Uses runtime dynamic import with a predictable path.
*/

export type ScoreDiagnostics = {
    score: number;
    must_repair: boolean;
    finish_reason_hint: string;
  
    missing_headers: string[];
    empty_sections: string[];
    duplicate_headers: string[];
  
    next_actions_count: number;
    next_actions_ok: boolean;
  
    truncation_suspected: boolean;
    notes: string[];
  };
  
  type WasmModule = {
    score_report?: (input: string) => any;
  };
  
  const FALLBACK: ScoreDiagnostics = {
    score: 0,
    must_repair: true,
    finish_reason_hint: "WASM_NOT_READY",
    missing_headers: [],
    empty_sections: [],
    duplicate_headers: [],
    next_actions_count: 0,
    next_actions_ok: false,
    truncation_suspected: true,
    notes: ["score_engine WASM is not available yet (pkg not built or not found)."],
  };
  
  // IMPORTANT: This must match your repo path.
  // This is a runtime import path (string), not a TS module import.
  const WASM_ENTRY_RELATIVE_PATH = "../../rust/score_engine/pkg/score_engine.js";
  
  let cachedLoad: Promise<WasmModule | null> | null = null;
  
  async function loadWasm(): Promise<WasmModule | null> {
    if (cachedLoad) return cachedLoad;
  
    cachedLoad = (async () => {
      try {
        // Dynamic import by string path:
        // - avoids TS module resolution error before pkg exists
        // - works once pkg is built
        const mod = (await import(
          /* webpackIgnore: true */ WASM_ENTRY_RELATIVE_PATH
        )) as WasmModule;
  
        return mod && typeof mod === "object" ? mod : null;
      } catch {
        return null;
      }
    })();
  
    return cachedLoad;
  }
  
  function normalizeOutput(x: any): ScoreDiagnostics | null {
    if (!x || typeof x !== "object") return null;
  
    const score = Number(x.score);
    const mustRepair = Boolean(x.must_repair);
  
    if (!Number.isFinite(score)) return null;
  
    return {
      score,
      must_repair: mustRepair,
      finish_reason_hint: String(x.finish_reason_hint ?? "OK"),
      missing_headers: Array.isArray(x.missing_headers) ? x.missing_headers.map(String) : [],
      empty_sections: Array.isArray(x.empty_sections) ? x.empty_sections.map(String) : [],
      duplicate_headers: Array.isArray(x.duplicate_headers) ? x.duplicate_headers.map(String) : [],
      next_actions_count: Number.isFinite(Number(x.next_actions_count)) ? Number(x.next_actions_count) : 0,
      next_actions_ok: Boolean(x.next_actions_ok),
      truncation_suspected: Boolean(x.truncation_suspected),
      notes: Array.isArray(x.notes) ? x.notes.map(String) : [],
    };
  }
  
  export async function scoreWithRust(text: string): Promise<ScoreDiagnostics> {
    const mod = await loadWasm();
  
    if (!mod?.score_report || typeof mod.score_report !== "function") {
      return FALLBACK;
    }
  
    try {
      const out = mod.score_report(String(text));
      const norm = normalizeOutput(out);
      return norm ?? FALLBACK;
    } catch {
      return FALLBACK;
    }
  }
  