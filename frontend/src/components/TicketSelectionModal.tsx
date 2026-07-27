"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, ChevronRight, Loader2, Minus, Plus, Calendar, MapPin, Clock } from 'lucide-react';
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
  banner_url?: string;
  date_time?: string;
  date?: string;
  location?: string;
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
  const [step, setStep] = useState<'selection' | 'general_quantity'>('selection');
  const [quantity, setQuantity] = useState(1);
  
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
      setStep('selection');
      setQuantity(1);
    }
  }, [isOpen, eventId]);

  const handleGeneralSelection = () => {
    const generalZone = zones.find(z => z.zone_type === 'GENERAL');
    
    if (!generalZone) {
      setError('El boleto General no está disponible para este evento.');
      return;
    }
    
    setStep('general_quantity');
  };

  const confirmGeneralSelection = () => {
    const generalZone = zones.find(z => z.zone_type === 'GENERAL');
    if (!generalZone) return;
    
    addItem({
      id: parseInt(`999${eventId}000`),
      name: `Boleto General: ${event.title}`,
      price: Number(generalZone.price),
      quantity: quantity,
      image_url: event.banner_url || '',
      size: 'General',
      event_id: eventId,
      requires_shipping: false
    });
    
    onClose();
    router.push('/carrito');
  };

  const handleSeatSelection = () => {
    const genSlug = event.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    onClose();
    router.push(`/eventos/${genSlug}/asientos`);
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
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <Ticket size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">Comprar Boletos</h2>
                <p className="text-xs text-zinc-400 font-medium">{event.title}</p>
              </div>
            </div>

            {/* Fecha, Hora Exacta y Ubicación */}
            {((event.date_time || event.date || event.location)) && (
              <div className="bg-zinc-800/80 border border-zinc-700/60 p-3 rounded-xl mb-4 space-y-1.5 text-xs shadow-inner">
                {(event.date_time || event.date) && (
                  <div className="flex items-center justify-between gap-2 text-zinc-200 font-semibold">
                    <span className="flex items-center gap-1.5 capitalize">
                      <Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      {new Date(event.date_time || event.date || '').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-white bg-red-600/90 px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 shadow-sm">
                      <Clock className="w-3 h-3 text-white" />
                      {new Date(event.date_time || event.date || '').toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1.5 text-zinc-400 font-medium pt-1 border-t border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            )}
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : step === 'general_quantity' ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-zinc-700 bg-zinc-800/50">
                  <h3 className="text-lg font-semibold text-white mb-1">Boletos Generales</h3>
                  <p className="text-sm text-zinc-400 mb-4">¿Cuántos boletos deseas comprar?</p>
                  
                  <div className="flex items-center justify-center gap-6 py-4">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 rounded-full border border-zinc-600 flex items-center justify-center hover:bg-zinc-700 transition-colors text-white"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="text-3xl font-black text-white w-12 text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="w-12 h-12 rounded-full border border-zinc-600 flex items-center justify-center hover:bg-zinc-700 transition-colors text-white"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('selection')}
                    className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 font-bold uppercase tracking-widest text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={confirmGeneralSelection}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold uppercase tracking-widest text-white transition-colors"
                  >
                    Agregar
                  </button>
                </div>
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
                    {zones.find(z => z.zone_type === 'GENERAL') && (
                      <p className="text-red-400 font-bold mt-2">${Number(zones.find(z => z.zone_type === 'GENERAL')?.price).toFixed(2)} MXN</p>
                    )}
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
                    {(() => {
                      const numberedZones = zones.filter(z => z.zone_type !== 'GENERAL');
                      if (numberedZones.length === 0) return null;
                      
                      return (
                        <p className="text-red-400 font-bold mt-2">
                          ${Number(numberedZones[0].price).toFixed(2)} MXN
                        </p>
                      );
                    })()}
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
