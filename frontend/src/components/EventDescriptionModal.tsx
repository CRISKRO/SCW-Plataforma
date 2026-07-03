"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';

interface Event {
  id: number;
  title: string;
  description: string;
  banner_url: string;
  date_time: string;
  location: string;
}

interface EventDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export function EventDescriptionModal({ isOpen, onClose, event }: EventDescriptionModalProps) {
  if (!isOpen || !event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>
          
          <div className="relative h-48 sm:h-64 bg-zinc-800 flex-shrink-0">
            <Image 
              src={event.banner_url || '/images/logoring.webp'} 
              alt={event.title} 
              fill 
              className="object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
          
          <div className="p-6 sm:p-8 overflow-y-auto">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-red-500 text-sm font-bold uppercase tracking-widest">
                <Calendar className="w-4 h-4" />
                {new Date(event.date_time).toLocaleDateString()}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white">{event.title}</h2>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
