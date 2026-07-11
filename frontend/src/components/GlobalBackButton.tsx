"use client";

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Ocultar en la página principal para no tener un botón de regresar que no hace nada útil
  if (pathname === '/') return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onClick={() => router.back()}
        className="fixed top-[88px] left-6 z-[999] text-white/60 hover:text-white transition-all group hover:scale-110"
        title="Regresar"
      >
        <ArrowLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform drop-shadow-lg" />
      </motion.button>
    </AnimatePresence>
  );
}
