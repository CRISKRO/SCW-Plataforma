"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Lightning flash effect */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[100] bg-white mix-blend-screen"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0, 0.8, 0] }}
        transition={{ duration: 0.5, times: [0, 0.1, 0.15, 1], ease: "easeOut" }}
      />
      
      {/* Lightning bolt graphic */}
      <motion.div
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] text-cyan-400"
        initial={{ opacity: 1, scale: 2, rotate: -15 }}
        animate={{ 
          opacity: [1, 0, 1, 0], 
          scale: [2, 2.2, 2, 2.5],
          filter: [
            "brightness(2) blur(0px) drop-shadow(0 0 20px rgba(34,211,238,1))", 
            "brightness(1) blur(4px) drop-shadow(0 0 10px rgba(34,211,238,0.5))", 
            "brightness(2) blur(0px) drop-shadow(0 0 30px rgba(34,211,238,1))", 
            "brightness(1) blur(10px) drop-shadow(0 0 0px rgba(34,211,238,0))"
          ]
        }}
        transition={{ duration: 0.5, times: [0, 0.1, 0.2, 1], ease: "easeOut" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-64 h-64"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </motion.div>

      {/* Page content wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </>
  );
}
