"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Realistic Lightning bolt graphic */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center mix-blend-screen"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 1, 0.2, 0.9, 0],
        }}
        transition={{ duration: 1.2, times: [0, 0.05, 0.1, 0.2, 1], ease: "easeOut" }}
      >
        <svg viewBox="0 0 500 1000" className="w-full h-full object-cover opacity-90" preserveAspectRatio="xMidYMid slice">
          {/* Main trunk outer glow */}
          <path
            d="M250 0 L270 80 L230 160 L300 280 L210 400 L280 550 L200 700 L250 850 L220 1000"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="blur-[8px]"
          />
          {/* Main trunk inner glow */}
          <path
            d="M250 0 L270 80 L230 160 L300 280 L210 400 L280 550 L200 700 L250 850 L220 1000"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="blur-[3px]"
          />
          {/* Main trunk core */}
          <path
            d="M250 0 L270 80 L230 160 L300 280 L210 400 L280 550 L200 700 L250 850 L220 1000"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Branches outer glow */}
          <g stroke="rgba(255,255,255,0.4)" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" className="blur-[4px]">
            <path d="M270 80 L320 130 L310 190 L360 250" />
            <path d="M230 160 L180 200 L190 250" />
            <path d="M300 280 L350 310 L330 360" />
            <path d="M210 400 L150 450 L170 520 L110 580" />
            <path d="M280 550 L340 600 L320 680 L380 750" />
            <path d="M200 700 L140 760 L160 830 L100 900" />
          </g>

          {/* Branches core */}
          <g stroke="#ffffff" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            <path d="M270 80 L320 130 L310 190 L360 250" />
            <path d="M230 160 L180 200 L190 250" />
            <path d="M300 280 L350 310 L330 360" />
            <path d="M210 400 L150 450 L170 520 L110 580" />
            <path d="M280 550 L340 600 L320 680 L380 750" />
            <path d="M200 700 L140 760 L160 830 L100 900" />
          </g>
        </svg>
      </motion.div>

      {/* Page content wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </>
  );
}
