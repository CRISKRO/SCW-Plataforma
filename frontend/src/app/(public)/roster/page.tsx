"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { eventsService } from '@/services/events.services';

export default function RosterPage() {
  const [fighters, setFighters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFighter, setSelectedFighter] = useState<any>(null);

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

  const regularFighters = fighters.filter(f => !f.is_student);
  const studentFighters = fighters.filter(f => f.is_student);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight"
          >
            NUESTRO <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">ROSTER</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Conoce a los atletas y personajes que forman parte de SCW.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-24">
          {loading ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">Cargando luchadores...</div>
          ) : regularFighters.length === 0 ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">No hay luchadores registrados en el roster principal.</div>
          ) : (
            regularFighters.map((fighter, i) => (
              <motion.div 
                key={fighter.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedFighter(fighter)}
                className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden rounded-xl border border-white/5 hover:border-zinc-500 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${fighter.image_url})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="absolute bottom-0 left-0 p-5 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  {fighter.social_network && (
                    <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
                      {fighter.social_network}
                    </span>
                  )}
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1 mt-1">
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

        {/* ALUMNOS SECTION */}
        {!loading && (
          <>
            <div className="text-center mb-16 mt-12 border-t border-zinc-800 pt-16">
              <motion.h2 
                initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="text-5xl md:text-7xl font-black uppercase tracking-tight"
              >
                Estudiantes <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">SCW</span>
              </motion.h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">El futuro de SCW. Conoce a los talentos en formación de nuestra escuela.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {studentFighters.length === 0 ? (
                <div className="col-span-4 text-center text-zinc-500 py-12">No hay estudiantes registrados.</div>
              ) : (
                studentFighters.map((fighter, i) => (
                  <motion.div 
                    key={fighter.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedFighter(fighter)}
                    className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden rounded-xl border border-white/5 hover:border-zinc-500 transition-all duration-300 cursor-pointer"
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
          </>
        )}

      </div>

      {/* Modal Lightbox */}
      <AnimatePresence>
        {selectedFighter && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8 overflow-y-auto"
            onClick={() => setSelectedFighter(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors z-[101] bg-black/50 p-2 rounded-full"
              onClick={() => setSelectedFighter(null)}
            >
              <X className="w-8 h-8" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl w-full flex flex-col md:flex-row bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="md:w-1/2 relative min-h-[400px] md:min-h-auto">
                <div 
                  className="absolute inset-0 bg-cover bg-center" 
                  style={{ backgroundImage: `url(${selectedFighter.image_url})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              </div>
              
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                {selectedFighter.social_network && (
                  <span className="text-red-500 text-sm font-bold uppercase tracking-widest mb-2 inline-block">
                    {selectedFighter.social_network}
                  </span>
                )}
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">
                  {selectedFighter.name}
                </h2>
                {selectedFighter.nickname && (
                  <p className="text-xl text-zinc-400 italic mb-6">"{selectedFighter.nickname}"</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
                  {selectedFighter.height_cm && (
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Estatura</p>
                      <p className="text-white text-lg font-medium">{selectedFighter.height_cm} cm</p>
                    </div>
                  )}
                  {selectedFighter.weight_kg && (
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Peso</p>
                      <p className="text-white text-lg font-medium">{selectedFighter.weight_kg} kg</p>
                    </div>
                  )}
                  {selectedFighter.signature_move && (
                    <div className="col-span-2">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Movimiento Especial</p>
                      <p className="text-red-400 text-lg font-bold uppercase">{selectedFighter.signature_move}</p>
                    </div>
                  )}
                </div>

                {selectedFighter.bio && (
                  <div className="mb-6">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Biografía</p>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                      {selectedFighter.bio}
                    </p>
                  </div>
                )}

                {selectedFighter.achievements && (
                  <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Logros</p>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                      {selectedFighter.achievements}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
