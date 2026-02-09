// components/compare/ComparePanel.tsx - AUTO-RESEARCH TOGGLE ADDITION
// ═══════════════════════════════════════════════════════════════════════════════
// Add this toggle to your existing ComparePanel.tsx
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Import the new hook and types at the top of ComparePanel.tsx:
/*
import { useState } from "react";
import { Search, Zap, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
*/

// 2. Add these state variables inside your ComparePanel component:
/*
const [autoResearch, setAutoResearch] = useState(false);
const [researchLoading, setResearchLoading] = useState(false);
const [researchResults, setResearchResults] = useState<any>(null);
*/

// 3. Add this function to perform auto-research:
/*
async function performAutoResearch(title: string, context: string, theme?: string) {
  if (!autoResearch || !title) return;
  
  setResearchLoading(true);
  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: title,
        context: context?.slice(0, 500),
        theme: theme || 'general',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setResearchResults(data);
      onToast?.("🔍 Research completed");
    }
  } catch (error) {
    console.error('Research error:', error);
  } finally {
    setResearchLoading(false);
  }
}
*/

// 4. Add this JSX for the toggle (place near your Compare button):
/*
<div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
  <div className="flex items-center gap-2 flex-1">
    <Search className="w-4 h-4 text-purple-400" />
    <div className="flex flex-col">
      <span className="text-sm font-medium text-white">Auto-Research</span>
      <span className="text-[10px] text-white/50">
        Powered by Gemini Grounding with Google Search
      </span>
    </div>
  </div>
  <Switch
    checked={autoResearch}
    onCheckedChange={setAutoResearch}
    className="data-[state=checked]:bg-purple-500"
  />
  {researchLoading && (
    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
  )}
</div>
*/

// 5. Add this research results display (below the toggle):
/*
{researchResults && (
  <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
    <div className="flex items-center gap-2 mb-2">
      <Zap className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-semibold text-white">Research Insights</span>
    </div>
    <p className="text-xs text-white/70 mb-2">{researchResults.summary}</p>
    {researchResults.keyFindings?.length > 0 && (
      <ul className="text-[10px] text-white/60 space-y-1">
        {researchResults.keyFindings.slice(0, 3).map((finding: string, i: number) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-purple-400">•</span>
            {finding}
          </li>
        ))}
      </ul>
    )}
    {researchResults.sources?.length > 0 && (
      <div className="mt-2 pt-2 border-t border-white/10">
        <span className="text-[9px] text-white/40">
          Sources: {researchResults.sources.length} found • {researchResults.latencyMs}ms
        </span>
      </div>
    )}
  </div>
)}
*/

// 6. Trigger research when Compare button is clicked:
/*
// In your handleCompare or similar function:
async function handleCompare() {
  // ... existing compare logic ...
  
  // Trigger auto-research if enabled
  if (autoResearch) {
    performAutoResearch(title, context, selectedTheme);
  }
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// Full Example Component with Auto-Research
// ═══════════════════════════════════════════════════════════════════════════════

export function AutoResearchToggle({
    enabled,
    onToggle,
    loading,
    results,
    onRunResearch,
  }: {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    loading: boolean;
    results: any;
    onRunResearch?: () => void;
  }) {
    return (
      <div className="space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">Auto-Research</span>
              <span className="text-[10px] text-white/50">
                Gemini Grounding with Google Search
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              enabled ? 'bg-purple-500' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          {loading && (
            <svg className="w-4 h-4 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </div>
  
        {/* Results */}
        {results && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-semibold text-white">Research Insights</span>
              <span className="text-[9px] text-white/40 ml-auto">{results.latencyMs}ms</span>
            </div>
            
            <p className="text-xs text-white/70 mb-2 leading-relaxed">{results.summary}</p>
            
            {results.keyFindings?.length > 0 && (
              <ul className="text-[10px] text-white/60 space-y-1.5 mb-2">
                {results.keyFindings.slice(0, 4).map((finding: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {results.sources?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1 text-[9px] text-white/40">
                  <span>📚 {results.sources.length} sources found</span>
                  {results.sources[0]?.title && (
                    <span className="truncate ml-1">| {results.sources[0].title}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  