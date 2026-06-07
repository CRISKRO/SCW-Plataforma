"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

const photos = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1574103130763-71a72d7f957c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    title: "El Choque",
    category: "Acción",
    colSpan: "md:col-span-2",
    rowSpan: "md:row-span-2",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1614051016664-94c34a49629b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Preparación",
    category: "Backstage",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-1",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1629739502759-4d372e9a3028?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Vuelo",
    category: "Aéreo",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-2",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1549449071-70e287012353?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "El Ring",
    category: "Escenario",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-1",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1611110034611-6677cc2c2866?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    title: "Las Cuerdas",
    category: "Detalles",
    colSpan: "md:col-span-2",
    rowSpan: "md:row-span-1",
  },
  {
    id: 6,
    url: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "El Público",
    category: "Atmósfera",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-1",
  },
  {
    id: 7,
    url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "La Gloria",
    category: "Campeonato",
    colSpan: "md:col-span-1",
    rowSpan: "md:row-span-1",
  },
  {
    id: 8,
    url: "https://images.unsplash.com/photo-1522046424367-7b897984cd7d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    title: "Tensión",
    category: "Acción",
    colSpan: "md:col-span-2",
    rowSpan: "md:row-span-2",
  }
];

export default function GaleriaPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight"
          >
            Nuestra <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">Galería</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Las mejores fotografías tomadas en el ring. Capturando la esencia, el dolor y la gloria de SCW.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[250px] gap-4">
          {photos.map((photo, i) => (
            <motion.div 
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedPhoto(photo)}
              className={`group relative overflow-hidden rounded-xl cursor-pointer bg-zinc-900 border border-white/5 hover:border-white/20 transition-all duration-500 ${photo.colSpan} ${photo.rowSpan} min-h-[250px]`}
            >
              <img 
                src={photo.url} 
                alt={photo.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  {photo.category}
                </span>
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
                src={selectedPhoto.url} 
                alt={selectedPhoto.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
              />
              <div className="mt-6 text-center">
                <span className="text-red-500 text-sm font-bold uppercase tracking-widest">
                  {selectedPhoto.category}
                </span>
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
