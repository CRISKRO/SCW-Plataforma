"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RaffleTicket } from '@/services/raffles.services';

interface RouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RaffleTicket[];
}

export default function RouletteModal({ isOpen, onClose, tickets }: RouletteModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<RaffleTicket | null>(null);
  const [winner, setWinner] = useState<RaffleTicket | null>(null);

  // Filter only sold tickets
  const soldTickets = tickets.filter(t => t.status !== 'AVAILABLE');

  const startRoulette = () => {
    if (soldTickets.length === 0) return;
    
    setSpinning(true);
    setWinner(null);
    setCurrentTicket(null);

    // Winner predetermined but hidden until end of animation
    const randomWinner = soldTickets[Math.floor(Math.random() * soldTickets.length)];
    
    let duration = 3000; // 3 seconds spin
    let startTime = Date.now();
    let speed = 50;
    
    const spin = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed >= duration) {
        setSpinning(false);
        setWinner(randomWinner);
        setCurrentTicket(randomWinner);
        // Trigger confetti
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#dc2626', '#ffffff', '#000000'] // SCW Colors
        });
        return;
      }
      
      // Pick random ticket to show during spin
      const randomVisual = soldTickets[Math.floor(Math.random() * soldTickets.length)];
      setCurrentTicket(randomVisual);
      
      // Decelerate
      const remaining = duration - elapsed;
      if (remaining < 1000) speed = 100;
      if (remaining < 500) speed = 250;
      
      setTimeout(spin, speed);
    };
    
    spin();
  };

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset state if opened again
      setSpinning(false);
      setWinner(null);
      setCurrentTicket(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-thin scrollbar-thumb-zinc-700"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10 bg-zinc-900/50 rounded-full p-1"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="p-8 text-center pt-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
              Sorteo de Ganador
            </h2>
            <p className="text-zinc-400 mb-8">
              {soldTickets.length} boletos participantes
            </p>
            
            {soldTickets.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
                No hay boletos vendidos para realizar el sorteo.
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Roulette Window */}
                <div className="bg-black border-2 border-zinc-800 rounded-2xl w-full max-w-xs aspect-square flex items-center justify-center mb-8 relative overflow-hidden">
                  {currentTicket ? (
                    <motion.div 
                      key={currentTicket.id}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.1 }}
                      className="text-center"
                    >
                      <span className="text-7xl font-black text-white font-mono tracking-tighter">
                        {String(currentTicket.number).padStart(2, '0')}
                      </span>
                    </motion.div>
                  ) : (
                    <div className="text-6xl text-zinc-800 font-black">??</div>
                  )}

                  {/* Gradient Overlays for cylinder effect */}
                  <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                  
                  {/* Selector line */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-b-2 border-red-600/30 h-24 pointer-events-none" />
                </div>
                
                {/* Winner info */}
                <AnimatePresence>
                  {winner && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-800 rounded-xl p-6 w-full text-left border border-red-500/30 mb-8"
                    >
                      <div className="flex items-center gap-3 text-red-500 font-bold mb-4 uppercase tracking-widest text-sm">
                        <Trophy className="w-5 h-5" />
                        ¡Tenemos un Ganador!
                      </div>
                      <div className="space-y-2">
                        <p className="text-zinc-400 text-sm">Comprador:</p>
                        <p className="text-white font-bold text-lg">{winner.buyer_name || 'Sin Nombre'}</p>
                        
                        {winner.contact_email && (
                          <>
                            <p className="text-zinc-400 text-sm mt-3">Correo:</p>
                            <p className="text-white">{winner.contact_email}</p>
                          </>
                        )}
                        
                        {winner.contact_phone && (
                          <>
                            <p className="text-zinc-400 text-sm mt-3">Teléfono:</p>
                            <p className="text-white">{winner.contact_phone}</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Action button */}
                <button
                  onClick={startRoulette}
                  disabled={spinning}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all"
                >
                  {spinning ? 'Sorteando...' : winner ? 'Volver a Sortear' : 'Comenzar Sorteo'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
