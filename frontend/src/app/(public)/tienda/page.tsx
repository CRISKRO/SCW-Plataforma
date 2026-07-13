"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingCart, Eye, Truck, Ticket } from 'lucide-react';
import api from '@/services/api';
import { getRaffles, Raffle } from '@/services/raffles.services';
import Image from 'next/image';
import PageBackButton from '@/components/PageBackButton';

export default function StorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todo');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, rafflesData] = await Promise.all([
          api.get('/merch/products/'),
          api.get('/merch/categories/'),
          getRaffles()
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setRaffles(rafflesData.filter((r: Raffle) => r.is_active));
      } catch (error) {
        console.error("Error fetching shop data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = selectedCategory === 'Todo' 
    ? products 
    : products.filter(p => p.category_name === selectedCategory);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageBackButton />
        
        {/* Header Banner - Mercado Libre Style Structure but Dark Mode */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between shadow-2xl">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-5xl font-black uppercase tracking-tight"
            >
              Tienda <span className="text-red-500">Oficial</span>
            </motion.h1>
            <p className="mt-2 text-zinc-400">Encuentra los mejores productos originales de SCW con envío disponible a todo México.</p>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button 
            onClick={() => setSelectedCategory('Todo')}
            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${selectedCategory === 'Todo' ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}
          >
            Todo
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-5 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${selectedCategory === cat.name ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Raffles Section */}
        {!loading && raffles.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
              <Ticket className="w-8 h-8 text-red-500" />
              Sorteos <span className="text-red-500">Activos</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {raffles.map((raffle) => (
                <div key={raffle.id} className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-colors group flex flex-col hover:shadow-2xl hover:shadow-red-500/10">
                  <div className="relative h-48 w-full bg-zinc-950 overflow-hidden">
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
                    <div className="absolute top-4 right-4 bg-red-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg shadow-red-500/20">
                      ${raffle.price} MXN
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                      {raffle.title}
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4 line-clamp-2 flex-1">
                      {raffle.description}
                    </p>
                    
                    <div className="pt-4 border-t border-white/10 mt-auto flex items-center justify-between">
                      <div className="text-xs text-zinc-500">
                        <span className="text-white font-bold">{raffle.total_tickets}</span> Boletos
                      </div>
                      <Link
                        href={`/raffles/${raffle.id}`}
                        className="bg-white text-black hover:bg-red-500 hover:text-white px-5 py-2 rounded-lg font-bold uppercase tracking-wide transition-colors text-xs"
                      >
                        Participar
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid - ML Style */}
        {loading ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">Cargando catálogo...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product, i) => (
              <Link href={`/tienda/${product.id}`} key={product.id} className="block">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-zinc-900/80 hover:bg-zinc-900 border border-white/5 hover:border-white/20 rounded-lg overflow-hidden group transition-all h-full flex flex-col hover:shadow-2xl hover:shadow-white/5"
                >
                  {/* Image Area - White background like ML to make product pop, even in dark mode */}
                  <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="text-zinc-300 font-bold uppercase tracking-widest text-xs">Sin Imagen</div>
                    )}
                  </div>

                  <div className="p-3 sm:p-5 flex-1 flex flex-col">
                    <p className="text-xl sm:text-2xl font-medium text-white mb-1">
                      ${parseFloat(product.price).toFixed(2)}
                    </p>
                    
                    {product.free_shipping && (
                      <p className="text-[10px] sm:text-xs font-bold text-green-500 mb-2 sm:mb-3 flex items-center gap-1">
                        Envío gratis
                      </p>
                    )}

                    <h3 className="text-sm text-zinc-300 leading-tight group-hover:text-white transition-colors line-clamp-2 mb-2">
                      {product.name}
                    </h3>

                    <div className="mt-auto pt-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                        {product.category_name || 'SCW Merch'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 py-20 border border-white/5 bg-zinc-900/50 rounded-xl">
                <span className="text-lg font-semibold text-zinc-400">No hay publicaciones que coincidan con tu búsqueda.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
