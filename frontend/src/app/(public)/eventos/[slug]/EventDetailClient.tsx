"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { TicketSelectionModal } from '@/components/TicketSelectionModal';
import { getMediaUrl } from '@/services/api';

export default function EventDetailClient({ event }: { event: any }) {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const eventSlug = event.slug || event.title?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || event.id;
  const isLabru = 
    event?.map_type === 'ARENA_VIP' || 
    event?.location?.toLowerCase().includes('bru') || 
    event?.location?.toLowerCase().includes('labru') ||
    event?.title?.toLowerCase().includes('rebrulucion') ||
    event?.title?.toLowerCase().includes('rebru');

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="w-full relative rounded-3xl overflow-visible"
          >
            {/* Ambient Poster Glow */}
            <div className="absolute -inset-4 blur-3xl rounded-3xl opacity-70 pointer-events-none overflow-hidden">
              <img 
                src={getMediaUrl(event.banner_url)} 
                alt="" 
                className="w-full h-full object-cover blur-3xl scale-125 saturate-200 brightness-110" 
              />
            </div>

            <div className="relative z-10 w-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 flex items-center justify-center">
              <img 
                src={getMediaUrl(event.banner_url)}
                alt={`Póster oficial de ${event.title}`}
                className="w-full h-auto object-contain"
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {new Date(event.date_time).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white bg-red-600/90 px-3 py-1 rounded-full text-xs font-black shadow-md shadow-red-950/40">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.date_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            
            <a 
              href={
                event.location?.toLowerCase().includes('dojo')
                  ? 'https://share.google/zSjJUeXVE9kBjhAzr'
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || '')}`
              }
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-zinc-300 text-lg mb-8 underline underline-offset-4 decoration-zinc-600 hover:text-white hover:decoration-white transition-all"
              title="Abrir en Google Maps"
            >
              <MapPin className="w-5 h-5 shrink-0 text-red-500" />
              <span className="text-blue-400 font-semibold hover:text-blue-300">{event.location}</span>
            </a>
            
            <p className="text-zinc-300 text-lg whitespace-pre-line leading-relaxed mb-10">
              {event.description}
            </p>

            {isLabru ? (
              <Link
                href={`/eventos/${eventSlug}/asientos`}
                className="btn-cartel w-full py-4 md:py-5 text-lg"
              >
                Comprar Boletos Ahora
              </Link>
            ) : (
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="btn-cartel w-full py-4 md:py-5 text-lg"
              >
                Comprar Boletos Ahora
              </button>
            )}
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
