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
        className="fixed bottom-6 left-6 z-[999] p-3 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md text-white rounded-full border border-white/10 shadow-xl transition-all group hover:scale-110"
        title="Regresar"
      >
        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
      </motion.button>
    </AnimatePresence>
  );
}
