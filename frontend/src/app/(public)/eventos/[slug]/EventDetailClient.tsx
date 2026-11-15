"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
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

  const eventDate = new Date(event.date_time);

  const posterClass = "relative z-10 w-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]";
  const posterImg = (
    <img
      src={getMediaUrl(event.banner_url)}
      alt={`Póster oficial de ${event.title}`}
      className="w-full h-auto object-contain"
    />
  );

  const buyButton = isLabru ? (
    <Link href={`/eventos/${eventSlug}/asientos`} className="btn-cartel w-full py-4 md:py-5 text-base md:text-lg">
      Comprar Boletos Ahora
    </Link>
  ) : (
    <button onClick={() => setIsTicketModalOpen(true)} className="btn-cartel w-full py-4 md:py-5 text-base md:text-lg">
      Comprar Boletos Ahora
    </button>
  );

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mt-4 lg:mt-8">
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

            {isLabru ? (
              <Link href={`/eventos/${eventSlug}/asientos`} className={posterClass} aria-label={`Comprar boletos para ${event.title}`}>
                {posterImg}
              </Link>
            ) : (
              <button type="button" onClick={() => setIsTicketModalOpen(true)} className={posterClass} aria-label={`Comprar boletos para ${event.title}`}>
                {posterImg}
              </button>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-red-500 text-xs font-black uppercase tracking-[0.25em] mb-3">SCW presenta</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.95] mb-6">{event.title}</h1>

            <div className="flex items-stretch gap-4 mb-8">
              <div
                className="bg-red-600 px-6 py-3 flex flex-col items-center justify-center shrink-0"
                style={{ clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}
              >
                <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                  {eventDate.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')} · {eventDate.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
                </span>
                <span className="text-4xl md:text-5xl font-black italic leading-none">{eventDate.getDate()}</span>
                <span className="text-[11px] font-bold tracking-[0.2em] leading-none mt-1 text-white/80">{eventDate.getFullYear()}</span>
              </div>

              <div className="flex flex-col justify-center gap-2 min-w-0">
                <span className="flex items-center gap-2 text-xl md:text-2xl font-black uppercase leading-none">
                  <Clock className="w-5 h-5 shrink-0 text-red-500" />
                  {eventDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                <a
                  href={
                    event.location?.toLowerCase().includes('dojo')
                      ? 'https://share.google/zSjJUeXVE9kBjhAzr'
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white text-base md:text-lg font-semibold underline underline-offset-4 decoration-red-600 hover:text-red-400 transition-colors"
                  title="Abrir en Google Maps"
                >
                  <MapPin className="w-5 h-5 shrink-0 text-red-500" />
                  <span className="truncate">{event.location}</span>
                </a>
              </div>
            </div>

            <div className="mb-8">{buyButton}</div>

            <div className="h-px bg-gradient-to-r from-red-600 via-zinc-800 to-transparent mb-8" />

            {event.description ? (
              <p className="text-zinc-300 text-lg whitespace-pre-line leading-relaxed mb-10">
                {event.description}
              </p>
            ) : null}
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
