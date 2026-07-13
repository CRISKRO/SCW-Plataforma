"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';
import { galleryService } from '@/services/gallery.services';

import PageBackButton from '@/components/PageBackButton';

export default function GaleriaPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const data = await galleryService.getImages();
        setPhotos(data);
      } catch (error) {
        console.error("Error fetching gallery images", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageBackButton />
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase"
          >
            Nuestra <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700">Galería</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Las mejores fotografías tomadas en el ring. Capturando la esencia, el dolor y la gloria de SCW.</p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-xl font-bold uppercase tracking-widest animate-pulse">
            Cargando Galería...
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 bg-zinc-900/30 rounded-2xl border border-white/5">
            <p className="text-xl font-bold uppercase tracking-widest">Próximamente</p>
            <p className="mt-2 text-sm">Aún no hay fotografías en la galería.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[250px] gap-4">
            {photos.map((photo, i) => (
              <motion.div 
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedPhoto(photo)}
                className={`group relative overflow-hidden rounded-xl cursor-pointer bg-zinc-900 border border-white/5 hover:border-white/20 transition-all duration-500 ${photo.col_span} ${photo.row_span} min-h-[250px]`}
              >
                <img 
                  src={photo.image} 
                  alt={photo.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                
                <div className="absolute inset-0 p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {photo.category && (
                    <span className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                      {photo.category}
                    </span>
                  )}
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none opacity-90 group-hover:opacity-100">
                    {photo.title}
                  </h3>
                </div>

                <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-50 group-hover:scale-100">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>

      {/* Modal / Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors z-[101] bg-black/50 p-2 rounded-full"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-8 h-8" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto.image} 
                alt={selectedPhoto.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
              />
              <div className="mt-6 text-center">
                {selectedPhoto.category && (
                  <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
                    {selectedPhoto.category}
                  </span>
                )}
                <h2 className="text-3xl font-black uppercase tracking-tighter mt-1">
                  {selectedPhoto.title}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
