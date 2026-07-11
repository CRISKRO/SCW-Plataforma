"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';
import { TicketSelectionModal } from '@/components/TicketSelectionModal';

export default function EventosPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventsService.getEvents();
        setEvents(data);
      } catch (error) {
        console.error("Error loading events", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight"
          >
            Cartelera <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">Oficial</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">La historia se escribe en el ring. Asegura tu lugar en nuestros próximos eventos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading ? (
            <div className="col-span-2 text-center text-zinc-500 py-12">Cargando cartelera...</div>
          ) : events.length === 0 ? (
            <div className="col-span-2 text-center text-zinc-500 py-12">Aún no hay eventos programados.</div>
          ) : (
            events.map((event, i) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col md:flex-row bg-zinc-900/50 rounded-2xl overflow-hidden border border-white/5 hover:border-zinc-500 transition-colors"
              >
                <div 
                  className="md:w-2/5 h-64 md:h-auto bg-zinc-800 relative overflow-hidden cursor-pointer"
                  onClick={() => { setSelectedEvent(event); setIsTicketModalOpen(true); }}
                >
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${event.banner_url})` }}></div>
                </div>
                
                <div className="md:w-3/5 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.date_time).toLocaleDateString()}
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight mb-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <p 
                      className="text-zinc-300 text-sm whitespace-pre-line"
                    >
                      {event.description}
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={() => { setSelectedEvent(event); setIsTicketModalOpen(true); }}
                      className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-sm rounded hover:bg-zinc-200 transition-colors"
                    >
                      Comprar Boletos
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {selectedEvent && (
          <TicketSelectionModal
            isOpen={isTicketModalOpen}
            onClose={() => setIsTicketModalOpen(false)}
            eventId={selectedEvent.id}
            event={selectedEvent}
          />
        )}
      </div>
    </div>
  );
}
