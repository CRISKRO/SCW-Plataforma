"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRaffles, Raffle } from '@/services/raffles.services';
import Image from 'next/image';

export default function RafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaffles();
  }, []);

  const fetchRaffles = async () => {
    try {
      const data = await getRaffles();
      // Only show active raffles
      setRaffles(data.filter((r: Raffle) => r.is_active));
    } catch (error) {
      console.error('Error loading raffles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">
            Sorteos y Rifas
          </span> SCW
        </h1>
        <p className="text-zinc-400 text-center max-w-2xl mx-auto mb-12">
          Participa en nuestras rifas exclusivas. Gana máscaras oficiales, campeonatos, mercancía autografiada y más.
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin"></div>
          </div>
        ) : raffles.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/5">
            <p className="text-zinc-500 text-lg">Actualmente no hay rifas disponibles.</p>
            <p className="text-zinc-600 mt-2">Mantente atento a nuestras redes sociales para próximos sorteos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {raffles.map((raffle) => (
              <div key={raffle.id} className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-colors group flex flex-col">
                <div className="relative h-64 w-full bg-zinc-950 overflow-hidden">
                  {raffle.image ? (
                    <Image
                      src={raffle.image}
                      alt={raffle.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-700">Sin Imagen</div>
                  )}
                  <div className="absolute top-4 right-4 bg-red-600 text-white font-bold px-3 py-1 rounded-full text-sm">
                    ${raffle.price} MXN
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                    {raffle.title}
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4 line-clamp-3 flex-1">
                    {raffle.description}
                  </p>
                  
                  <div className="pt-4 border-t border-white/10 mt-auto flex items-center justify-between">
                    <div className="text-sm text-zinc-500">
                      <span className="text-white font-bold">{raffle.total_tickets}</span> Boletos en total
                    </div>
                    <Link
                      href={`/raffles/${raffle.id}`}
                      className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-lg font-bold uppercase tracking-wide transition-colors text-sm"
                    >
                      Participar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
