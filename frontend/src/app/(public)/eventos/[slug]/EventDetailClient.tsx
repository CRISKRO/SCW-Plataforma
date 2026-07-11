"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { TicketSelectionModal } from '@/components/TicketSelectionModal';

export default function EventDetailClient({ event }: { event: any }) {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="w-full aspect-[4/3] sm:aspect-video lg:aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden relative shadow-2xl shadow-black/50 border border-white/10"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${event.banner_url})` }}></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-2 text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              <Calendar className="w-5 h-5" />
              {new Date(event.date_time).toLocaleDateString()}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">{event.title}</h1>
            
            <div className="flex items-center gap-2 text-zinc-400 text-lg mb-8">
              <MapPin className="w-5 h-5" />
              {event.location}
            </div>
            
            <p className="text-zinc-300 text-lg whitespace-pre-line leading-relaxed mb-10">
              {event.description}
            </p>

            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="w-full py-5 bg-gradient-to-r from-red-600 to-red-800 text-white font-black uppercase tracking-widest text-lg rounded-xl hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-900/50 transform hover:scale-[1.02] active:scale-95"
            >
              Comprar Boletos Ahora
            </button>
          </motion.div>
        </div>

        {/* Modal */}
        <TicketSelectionModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          eventId={event.id}
          event={event}
        />
      </div>
    </div>
  );
}
