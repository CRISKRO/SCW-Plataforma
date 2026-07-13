"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ExternalLink, MapPin, Phone, Loader2 } from 'lucide-react';
import { eventsService } from '@/services/events.services';

import PageBackButton from '@/components/PageBackButton';

export default function PatrocinadoresPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const data = await eventsService.getSponsors();
        setSponsors(data.filter((s: any) => s.is_active));
      } catch (error) {
        console.error("Error loading sponsors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-32 pb-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm animate-pulse">Cargando Aliados...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageBackButton />
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/30 border border-red-500/20 text-red-500 text-sm font-bold tracking-widest uppercase mb-6"
          >
            <Shield className="w-4 h-4" />
            Aliados Estratégicos
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-6"
          >
            Nuestros <span className="text-red-600">Patrocinadores</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-zinc-400"
          >
            Conoce a las marcas e instituciones que hacen posible la lucha libre de alto impacto. Gracias a su apoyo, SCW Dojo sigue formando a los campeones del mañana.
          </motion.p>
        </div>

        {/* Sponsors Grid */}
        {sponsors.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 border border-white/5 rounded-2xl">
            <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Próximamente</h3>
            <p className="text-zinc-500">Estamos formando nuevas alianzas estratégicas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 shadow-2xl"
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Logo Container */}
                <div className="aspect-video w-full bg-white flex items-center justify-center p-8 relative overflow-hidden">
                  {sponsor.image ? (
                    <img 
                      src={sponsor.image} 
                      alt={sponsor.name}
                      className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-4xl font-black text-zinc-200 tracking-tighter uppercase">{sponsor.name}</div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 relative z-10">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                    {sponsor.name}
                  </h3>
                  
                  {sponsor.description && (
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
                      {sponsor.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    {sponsor.address && (
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <MapPin className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="truncate">{sponsor.address}</span>
                      </div>
                    )}
                    
                    {sponsor.phone && (
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <Phone className="w-4 h-4 text-red-500" />
                        </div>
                        <span>{sponsor.phone}</span>
                      </div>
                    )}

                    {sponsor.url && (
                      <div className="pt-4 mt-4 border-t border-white/5">
                        <a 
                          href={sponsor.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                        >
                          Visitar Sitio Web
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
