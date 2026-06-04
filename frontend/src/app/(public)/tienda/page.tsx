"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingCart, Eye, Truck } from 'lucide-react';
import api from '@/services/api';

export default function StorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todo');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/merch/products/'),
          api.get('/merch/categories/')
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
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

        {/* Product Grid - ML Style */}
        {loading ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">Cargando catálogo...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product, i) => (
              <Link href={`/tienda/${product.id}`} key={product.id} className="block">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-zinc-900/80 hover:bg-zinc-900 border border-white/5 hover:border-white/20 rounded-lg overflow-hidden group transition-all h-full flex flex-col hover:shadow-2xl hover:shadow-white/5"
                >
                  {/* Image Area - White background like ML to make product pop, even in dark mode */}
                  <div className="relative aspect-square bg-white flex items-center justify-center p-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="text-zinc-300 font-bold uppercase tracking-widest text-xs">Sin Imagen</div>
                    )}
                  </div>

                  {/* ML Style Info Area */}
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-2xl font-medium text-white mb-1">
                      ${parseFloat(product.price).toFixed(2)}
                    </p>
                    
                    <p className="text-xs font-bold text-green-500 mb-3 flex items-center gap-1">
                      Envío gratis
                    </p>

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
