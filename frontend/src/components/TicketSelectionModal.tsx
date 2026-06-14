"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useCartStore } from '@/store/cartStore';

interface EventZone {
  id: number;
  zone_type: string;
  price: number;
}

interface Event {
  id: number;
  title: string;
  banner_url: string;
}

interface TicketSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  event: Event;
}

export function TicketSelectionModal({ isOpen, onClose, eventId, event }: TicketSelectionModalProps) {
  const router = useRouter();
  const { addItem } = useCartStore();
  
  const [zones, setZones] = useState<EventZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      setError('');
      api.get(`/tickets/zones/by_event/?event_id=${eventId}`)
        .then((res) => setZones(res.data))
        .catch((err) => {
          console.error(err);
          setError('Error al cargar opciones del evento.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, eventId]);

  const handleGeneralSelection = () => {
    const generalZone = zones.find(z => z.zone_type === 'GENERAL');
    
    if (!generalZone) {
      setError('El boleto General no está disponible para este evento.');
      return;
    }
    
    addItem({
      id: parseInt(`999${eventId}000`),
      name: `Boleto General: ${event.title}`,
      price: Number(generalZone.price),
      quantity: 1,
      image_url: event.banner_url || '',
      size: 'General',
      event_id: eventId,
      requires_shipping: false
    });
    
    onClose();
    router.push('/carrito');
  };

  const handleSeatSelection = () => {
    onClose();
    router.push(`/eventos/${eventId}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <Ticket size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">Comprar Boletos</h2>
            </div>
            
            <p className="text-zinc-400 mb-6 text-sm">
              Selecciona el tipo de boleto que deseas comprar para <strong>{event.title}</strong>.
            </p>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  onClick={handleGeneralSelection}
                  className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-red-500/50 transition-all group"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">General</h3>
                    <p className="text-sm text-zinc-400">Acceso a zonas generales. Sin asiento numerado.</p>
                  </div>
                  <ChevronRight className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                </button>
                
                <button
                  onClick={handleSeatSelection}
                  className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-red-500/50 transition-all group"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">Primera / Segunda Fila</h3>
                    <p className="text-sm text-zinc-400">Selecciona tu asiento numerado en el mapa.</p>
                  </div>
                  <ChevronRight className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
