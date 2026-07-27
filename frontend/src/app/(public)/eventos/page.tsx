"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { eventsService } from '@/services/events.services';

import PageBackButton from '@/components/PageBackButton';

const generateSlug = (title: string) => {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export default function EventosPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventsService.getEvents();
        const published = (Array.isArray(data) ? data : []).filter((e: any) => e.status !== 'DRAFT');
        setEvents(published);
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
        <PageBackButton />
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase"
          >
            Cartelera <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700">Oficial</span>
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
                className="group flex flex-col bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 hover:border-zinc-500 transition-all hover:shadow-2xl hover:shadow-white/10"
              >
                <Link href={`/eventos/${generateSlug(event.title)}`} className="w-full block relative bg-zinc-800 overflow-hidden">
                  <img 
                    src={event.banner_url}
                    alt={`Póster oficial de ${event.title}`}
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Modal removido de aquí ya que ahora cada evento tiene su propia página */}
      </div>
    </div>
  );
}
