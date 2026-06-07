"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

export default function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-20 md:bottom-10 right-4 md:right-10 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-xl border backdrop-blur-md text-sm font-medium min-w-[250px] ${
              toast.type === "success"
                ? "bg-green-950/80 border-green-500/30 text-green-100"
                : toast.type === "error"
                ? "bg-red-950/80 border-red-500/30 text-red-100"
                : "bg-blue-950/80 border-blue-500/30 text-blue-100"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 text-green-400" />}
            {toast.type === "error" && <XCircle className="w-5 h-5 text-red-400" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
            
            <span className="flex-1">{toast.message}</span>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
