"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { eventsService } from '@/services/events.services';

export default function RosterPage() {
  const [fighters, setFighters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFighters = async () => {
      try {
        const data = await eventsService.getFighters();
        setFighters(data);
      } catch (error) {
        console.error("Error loading roster", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFighters();
  }, []);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight"
          >
            Roster <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">Oficial</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Conoce a los protagonistas de nuestras batallas.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">Cargando luchadores...</div>
          ) : fighters.length === 0 ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">No hay luchadores registrados.</div>
          ) : (
            fighters.map((fighter, i) => (
              <motion.div 
                key={fighter.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden rounded-xl border border-white/5 hover:border-zinc-500 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${fighter.image_url})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="absolute bottom-0 left-0 p-5 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  {fighter.social_network && (
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded inline-block mb-2 bg-zinc-800 text-zinc-300">
                      {fighter.social_network}
                    </span>
                  )}
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                    {fighter.name}
                  </h3>
                  {fighter.weight_kg && fighter.height_cm && (
                    <p className="text-zinc-400 text-xs mt-2 uppercase tracking-widest">
                      {fighter.height_cm} cm | {fighter.weight_kg} kg
                    </p>
                  )}
                  {fighter.signature_move && (
                    <p className="text-zinc-300 text-sm mt-1 truncate">
                      Movimiento: <span className="italic">{fighter.signature_move}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
