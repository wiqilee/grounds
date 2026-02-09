// components/TemplatePicker.tsx
// Template picker with 11 theme categories, recommendations, and gallery browsing

"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Search, Clock, Tag, ChevronRight, X, Sparkles, Layers, Zap, 
  Info, Lightbulb, CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  templateCategories, 
  getAllTemplates,
  searchTemplates,
  getTemplateCount,
  getTemplatesByTheme,
  getCategoryForTheme,
  type DecisionTemplate,
  type TemplateCategory 
} from "@/lib/templates";

type TemplatePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: DecisionTemplate) => void;
  onQuickUse?: () => void;
  currentTheme?: string;
  currentThemeLabel?: string;
  currentThemeEmoji?: string;
};

export function TemplatePicker({ 
  isOpen, 
  onClose, 
  onSelect, 
  onQuickUse, 
  currentTheme,
  currentThemeLabel,
  currentThemeEmoji,
}: TemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-select current theme when modal opens
  useEffect(() => {
    if (isOpen && currentTheme) {
      // Check if currentTheme matches a category
      const matchingCategory = templateCategories.find(c => c.id === currentTheme);
      if (matchingCategory) {
        setSelectedCategory(currentTheme);
      }
    }
  }, [isOpen, currentTheme]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedCategory(null);
      setShowRecommendations(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRecommendations) {
          setShowRecommendations(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, showRecommendations]);

  const filteredTemplates = useMemo(() => {
    let templates = getAllTemplates();
    
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    } else if (selectedCategory) {
      const category = templateCategories.find(c => c.id === selectedCategory);
      templates = category?.templates || [];
    }
    
    return templates;
  }, [searchQuery, selectedCategory]);

  const totalTemplateCount = useMemo(() => getTemplateCount(), []);

  const themeMatchingTemplates = useMemo(() => {
    if (!currentTheme) return [];
    return getTemplatesByTheme(currentTheme);
  }, [currentTheme]);

  // Get category info for current theme
  const currentThemeCategory = useMemo(() => {
    if (!currentTheme) return null;
    return getCategoryForTheme(currentTheme);
  }, [currentTheme]);

  // Get first template matching current theme for quick start
  const quickStartTemplate = useMemo(() => {
    if (!currentTheme) return null;
    const templates = getTemplatesByTheme(currentTheme);
    return templates.find(t => t.theme === currentTheme) || templates[0] || null;
  }, [currentTheme]);

  // Get recommendations for selected template
  const selectedTemplateForRecommendations = useMemo(() => {
    if (!showRecommendations) return null;
    return getAllTemplates().find(t => t.id === showRecommendations) || null;
  }, [showRecommendations]);

  const handleSelect = useCallback((template: DecisionTemplate) => {
    onSelect(template);
    onClose();
  }, [onSelect, onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  const getDifficultyColor = (difficulty: DecisionTemplate["difficulty"]) => {
    switch (difficulty) {
      case "simple": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "moderate": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "complex": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    }
  };

  const getCategoryColor = (category: DecisionTemplate["category"]) => {
    switch (category) {
      case "strategic": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "operational": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "tactical": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
      case "personal": return "text-pink-400 bg-pink-400/10 border-pink-400/20";
    }
  };

  if (!isOpen) return null;

  const themeDisplay = currentThemeEmoji && currentThemeLabel 
    ? `${currentThemeEmoji} ${currentThemeLabel}` 
    : currentThemeCategory 
      ? `${currentThemeCategory.icon} ${currentThemeCategory.name}`
      : currentTheme || 'General';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !showRecommendations) {
            onClose();
          }
        }}
      >
        {/* Recommendations Modal - Overlays on top */}
        <AnimatePresence>
          {showRecommendations && selectedTemplateForRecommendations && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowRecommendations(null);
                }
              }}
            >
              <div 
                className="w-full max-w-lg bg-[#0d1117] border border-emerald-500/30 rounded-2xl shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                      <Lightbulb className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Recommendations</h3>
                      <p className="text-xs text-white/50">{selectedTemplateForRecommendations.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRecommendations(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                  {selectedTemplateForRecommendations.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ borderColor: "rgba(16, 185, 129, 0.4)" }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-emerald-500/40 transition-colors cursor-default"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white/80">{rec}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handleSelect(selectedTemplateForRecommendations);
                      setShowRecommendations(null);
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white overflow-hidden"
                  >
                    Use This Template
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRecommendations(null)}
                    className="border-white/20 text-white/70 hover:bg-white/10 overflow-hidden"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`relative w-full max-w-4xl max-h-[90vh] bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col ${showRecommendations ? 'opacity-40 pointer-events-none' : ''}`}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 bg-[#0d1117]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                  <Layers className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Decision Templates</h2>
                  <p className="text-xs text-white/50">
                    Quick-start your analysis with pre-built frameworks
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                      {totalTemplateCount} templates
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
                placeholder="Search templates by name, description, or tags..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            {/* Quick Start Section */}
            {quickStartTemplate && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">Quick Start</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px]">
                        {currentTheme || 'general'}
                      </span>
                    </div>
                    <p className="text-sm text-white/60">
                      Load a ready-to-use example based on your selected theme: <strong className="text-white">{themeDisplay}</strong>. 
                      This will fill all input fields with a relevant case study.
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-white/40">
                      <Info className="w-3 h-3" />
                      <span>
                        <strong className="text-white/60">Quick Start</strong> instantly loads a pre-filled example for your current theme ({currentTheme || 'general'}). 
                        <strong className="text-emerald-400 cursor-pointer hover:underline ml-1" onClick={() => setSelectedCategory(null)}>
                          Browse Gallery
                        </strong> below to explore all {totalTemplateCount} templates across {templateCategories.length} categories and choose any template you like. 
                        <span className="text-amber-400">({themeMatchingTemplates.length} templates match your theme)</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowRecommendations(quickStartTemplate.id)}
                      className="px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 transition-colors text-sm font-medium flex items-center gap-1.5 overflow-hidden"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Tips
                    </button>
                    <Button
                      onClick={() => handleSelect(quickStartTemplate)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white overflow-hidden"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Category Pills - 11 Themes */}
            <div 
              className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
              onWheel={handleWheel}
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedCategory
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                All Templates ({totalTemplateCount})
              </button>
              {templateCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery("");
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : cat.id === currentTheme
                        ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                  <span className="text-[10px] opacity-60">({cat.templates.length})</span>
                </button>
              ))}
            </div>

            {/* Theme-Specific Recommendations - Shows when category selected */}
            <AnimatePresence>
              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400/70" />
                        <span className="text-xs text-amber-400/80">
                          Found <strong className="text-amber-400">{templateCategories.find(c => c.id === selectedCategory)?.templates.length || 0}</strong> cases for {templateCategories.find(c => c.id === selectedCategory)?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content - Scrollable */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0
            }}
            onWheel={handleWheel}
            onTouchMove={handleTouchMove}
          >
            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onMouseEnter={() => setHoveredTemplate(template.id)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                  className="group relative"
                >
                  <div className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm mb-1 truncate group-hover:text-emerald-400 transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-xs text-white/50 line-clamp-2 mb-3">
                          {template.description}
                        </p>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getDifficultyColor(template.difficulty)}`}>
                            {template.difficulty}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white/40 bg-white/5 border border-white/10 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedTime}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>

                    {/* Actions on hover */}
                    <AnimatePresence>
                      {hoveredTemplate === template.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10 overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                              <Tag className="w-3 h-3 text-white/30" />
                              {template.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-white/40 px-1.5 py-0.5 bg-white/5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowRecommendations(template.id);
                                }}
                                className="px-2.5 py-1.5 rounded text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                              >
                                <Lightbulb className="w-3 h-3" />
                                Tips
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(template);
                                }}
                                className="px-2.5 py-1.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                Use
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/50 text-sm">No templates found</p>
                <p className="text-white/30 text-xs mt-1">Try a different search term or category</p>
              </div>
            )}

            <div className="h-8" />
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 bg-[#0d1117]/95 backdrop-blur-md border-t border-white/10 px-6 py-3 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">
                {filteredTemplates.length === totalTemplateCount 
                  ? `${totalTemplateCount} templates available`
                  : `${filteredTemplates.length} of ${totalTemplateCount} templates shown`
                }
              </p>
              <p className="text-xs text-white/40">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">Esc</kbd> to close
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TemplateButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="gap-2 text-white/70 border border-white/20 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5"
    >
      <Layers className="w-4 h-4" />
      Use Template
    </Button>
  );
}
