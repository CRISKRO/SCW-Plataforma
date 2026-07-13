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
    <main className="min-h-screen bg-black pt-32 pb-20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <PageBackButton />
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-6"
          >
            Nuestros <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700">Patrocinadores</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-zinc-400 font-light leading-relaxed"
          >
            Conoce a las marcas e instituciones que hacen posible la lucha libre de alto impacto. Gracias a su apoyo, SCW sigue formando a los campeones del mañana.
          </motion.p>
        </div>

        {/* Sponsors Grid */}
        {sponsors.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 border border-white/5 rounded-3xl backdrop-blur-sm">
            <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Próximamente</h3>
            <p className="text-zinc-500">Estamos formando nuevas alianzas estratégicas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                className="group relative bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden hover:border-red-500/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.1)] flex flex-col"
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Logo Container */}
                <div className="aspect-[4/3] w-full flex items-center justify-center p-8 relative overflow-hidden bg-black/40 border-b border-white/5">
                  {sponsor.image ? (
                    <div className="relative w-full h-full bg-white rounded-2xl p-6 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-700">
                      <img 
                        src={sponsor.image} 
                        alt={sponsor.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-2xl p-6 flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-700">
                      <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 tracking-tighter uppercase text-center leading-tight drop-shadow-lg">
                        {sponsor.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-8 relative z-10 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-red-400 transition-colors">
                    {sponsor.name}
                  </h3>
                  
                  {sponsor.description && (
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1 font-light">
                      {sponsor.description}
                    </p>
                  )}

                  <div className="space-y-4 mt-auto">
                    {sponsor.address && (
                      <div className="flex items-start gap-3 text-sm text-zinc-300">
                        <div className="p-2 bg-red-950/50 rounded-lg flex-shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="leading-relaxed">{sponsor.address}</span>
                      </div>
                    )}
                    
                    {sponsor.phone && (
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <div className="p-2 bg-red-950/50 rounded-lg flex-shrink-0">
                          <Phone className="w-4 h-4 text-red-500" />
                        </div>
                        <span>{sponsor.phone}</span>
                      </div>
                    )}

                    {sponsor.url && (
                      <div className="pt-6 mt-4 border-t border-white/5">
                        <a 
                          href={sponsor.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                          Visitar Sitio
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
