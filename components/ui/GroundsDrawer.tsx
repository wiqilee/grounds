// components/ui/GroundsDrawer.tsx
// "grounds" with transparent border, lifts up like toll gate
// API panel (black) appears below with real endpoints + running text animation

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// GROUNDS DRAWER
// ============================================================================

interface GroundsDrawerProps {
  className?: string;
}

export function GroundsDrawer({ className = "" }: GroundsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real API endpoints used in Grounds application
  const apiLogs = [
    { method: "POST", path: "/api/gemini/critic", status: 200 },
    { method: "GET", path: "/api/templates", status: 200 },
    { method: "POST", path: "/api/sentiment", status: 200 },
    { method: "POST", path: "/api/monte-carlo", status: 200 },
    { method: "POST", path: "/api/pdf/generate", status: 200 },
    { method: "POST", path: "/api/compare", status: 200 },
    { method: "POST", path: "/api/deep-reasoner", status: 200 },
  ];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "#4ade80";
      case "POST": return "#22d3ee";
      case "PUT": return "#fbbf24";
      case "DELETE": return "#f87171";
      default: return "#9ca3af";
    }
  };

  return (
    <span 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* The GROUNDS text + transparent border - lifts up on hover */}
      <motion.span
        className="relative inline-block cursor-pointer px-2 py-1"
        style={{
          transformOrigin: "left bottom",
          border: "1.5px solid rgba(52, 211, 153, 0.4)",
          borderRadius: "8px",
        }}
        animate={{
          rotateZ: isOpen ? -50 : 0,
        }}
        transition={{ 
          duration: 0.35, 
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
          Grounds
        </span>
      </motion.span>

      {/* API Panel - Black background, appears below on hover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -5, scaleY: 0.8 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="absolute left-0 top-full mt-1 z-50 origin-top"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Black panel with border */}
            <div 
              className="rounded-lg overflow-hidden font-mono text-[10px]"
              style={{
                background: "#0a0a0a",
                border: "1px solid #333",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                minWidth: "220px",
              }}
            >
              {/* Terminal header */}
              <div 
                className="px-2.5 py-1.5 flex items-center gap-1.5"
                style={{ 
                  background: "#111",
                  borderBottom: "1px solid #222",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#ff5f56]"></span>
                <span className="w-2 h-2 rounded-full bg-[#ffbd2e]"></span>
                <span className="w-2 h-2 rounded-full bg-[#27ca40]"></span>
                <span className="ml-2 text-[9px] text-white/30">engine.ts</span>
              </div>

              {/* API Logs with running animation */}
              <div className="px-2.5 py-2 space-y-0.5">
                {apiLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.06 }}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      style={{ color: "#4ade80" }}
                    >
                      •󠁏
                    </motion.span>
                    <span 
                      className="font-semibold"
                      style={{ color: getMethodColor(log.method), width: "32px" }}
                    >
                      {log.method}
                    </span>
                    <RunningText text={log.path} delay={i * 60 + 150} isVisible={isOpen} />
                    <motion.span 
                      style={{ color: "#22c55e" }} 
                      className="ml-auto tabular-nums"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.06 + 0.4 }}
                    >
                      {log.status}
                    </motion.span>
                  </motion.div>
                ))}
              </div>

              {/* Bottom status */}
              <div 
                className="px-2.5 py-1.5 flex items-center justify-between"
                style={{ 
                  background: "#111",
                  borderTop: "1px solid #222",
                }}
              >
                <span className="flex items-center gap-1.5 text-[9px]" style={{ color: "#4ade80" }}>
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  connected
                </span>
                <span className="text-[9px] text-white/20">
                  7 endpoints
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ============================================================================
// Running/Typewriter Text Component
// ============================================================================

function RunningText({ text, delay = 0, isVisible }: { text: string; delay?: number; isVisible: boolean }) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setDisplayText("");
      setIsTyping(false);
      return;
    }

    setDisplayText("");
    setIsTyping(false);
    
    const startTimer = setTimeout(() => {
      setIsTyping(true);
      let index = 0;
      
      const typeTimer = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typeTimer);
          setIsTyping(false);
        }
      }, 18);
      
      return () => clearInterval(typeTimer);
    }, delay);
    
    return () => clearTimeout(startTimer);
  }, [text, delay, isVisible]);

  return (
    <span style={{ color: "#4ade80" }}>
      {displayText}
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="inline-block w-[1px] h-3 bg-green-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
}