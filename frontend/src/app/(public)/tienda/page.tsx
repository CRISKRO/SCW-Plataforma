"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import api from '@/services/api';

export default function StorePage() {
  const addItem = useCartStore((state) => state.addItem);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/merch/products/');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      image_url: product.image_url || 'bg-zinc-800',
      size: 'M', // default size for now
    });
  };

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tight"
          >
            Tienda <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">Oficial</span>
          </motion.h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">Viste los colores de la batalla. Productos 100% originales.</p>
        </div>

        {/* Filter / Categories placeholder */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {['Todo', 'Ropa', 'Máscaras', 'Accesorios'].map((cat, i) => (
            <button key={cat} className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${i === 0 ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">Cargando catálogo...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="relative aspect-square bg-zinc-900 overflow-hidden mb-4 rounded-xl border border-white/5">
                  {/* Image Placeholder or Real Image */}
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800 transition-transform duration-700 group-hover:scale-105"></div>
                  )}
                  
                  {/* Overlay Add to cart */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="flex items-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Añadir
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {product.category_name || 'SCW Merch'}
                  </span>
                  <h3 className="text-lg font-bold mt-1 uppercase tracking-tight">{product.name}</h3>
                  <p className="text-zinc-400 mt-1">${product.price} MXN</p>
                </div>
              </motion.div>
            ))}
            
            {products.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 py-12">
                No hay productos disponibles en este momento.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
