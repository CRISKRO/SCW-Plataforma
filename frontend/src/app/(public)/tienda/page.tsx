"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Eye } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import api from '@/services/api';

export default function StorePage() {
  const addItem = useCartStore((state) => state.addItem);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Todo');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');

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

  const handleOpenProduct = (product: any) => {
    setSelectedProduct(product);
    if (product.sizes_available) {
      const sizes = product.sizes_available.split(',').map((s: string) => s.trim()).filter(Boolean);
      setSelectedSize(sizes.length > 0 ? sizes[0] : '');
    } else {
      setSelectedSize('');
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    addItem({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: parseFloat(selectedProduct.price),
      quantity: 1,
      image_url: selectedProduct.image_url || 'bg-zinc-800',
      size: selectedSize || 'N/A',
    });
    
    // Opcional: mostrar un toast o alerta aquí
    setSelectedProduct(null);
    setSelectedSize('');
  };

  const filteredProducts = selectedCategory === 'Todo' 
    ? products 
    : products.filter(p => p.category_name === selectedCategory);

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12 relative">
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

        {/* Filter Categories */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <button 
            onClick={() => setSelectedCategory('Todo')}
            className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${selectedCategory === 'Todo' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}
          >
            Todo
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${selectedCategory === cat.name ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center text-zinc-500 py-12 animate-pulse">Cargando catálogo...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
                onClick={() => handleOpenProduct(product)}
              >
                <div className="relative aspect-square bg-zinc-900 overflow-hidden mb-4 rounded-xl border border-white/5">
                  {/* Image Placeholder or Real Image */}
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800 transition-transform duration-700 group-hover:scale-105"></div>
                  )}
                  
                  {/* Overlay View Details */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button 
                      className="flex items-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalles
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {product.category_name || 'SCW Merch'}
                  </span>
                  <h3 className="text-lg font-bold mt-1 uppercase tracking-tight">{product.name}</h3>
                  <p className="text-zinc-400 mt-1">${parseFloat(product.price).toFixed(2)} MXN</p>
                </div>
              </motion.div>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 py-12 border border-white/5 bg-zinc-950 rounded-xl">
                <span className="text-sm font-semibold text-zinc-400">No se encontraron productos en esta categoría.</span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Product Image */}
              <div className="w-full md:w-1/2 bg-zinc-900 min-h-[300px] md:min-h-[500px] relative">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-zinc-700 font-bold uppercase tracking-widest">Sin Imagen</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
                <span className="text-xs text-red-500 uppercase tracking-widest font-bold mb-2">
                  {selectedProduct.category_name || 'SCW Merch'}
                </span>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-2xl text-zinc-300 font-medium mb-6">
                  ${parseFloat(selectedProduct.price).toFixed(2)} MXN
                </p>

                {selectedProduct.description && (
                  <div className="mb-8">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Descripción</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Size Selector */}
                {selectedProduct.sizes_available && (
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Selecciona tu talla</h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedProduct.sizes_available.split(',').map((size: string) => {
                        const s = size.trim();
                        if (!s) return null;
                        return (
                          <button
                            key={s}
                            onClick={() => setSelectedSize(s)}
                            className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${
                              selectedSize === s 
                                ? 'bg-white text-black border-white scale-110' 
                                : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-8">
                  <button
                    onClick={handleAddToCart}
                    disabled={selectedProduct.stock === 0}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${
                      selectedProduct.stock === 0
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-lg shadow-red-900/20 hover:scale-[1.02]'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {selectedProduct.stock === 0 ? 'Agotado' : 'Añadir al Carrito'}
                  </button>
                  {selectedProduct.stock > 0 && selectedProduct.stock <= 5 && (
                    <p className="text-center text-xs text-yellow-500 mt-3 font-medium">
                      ¡Quedan pocas unidades disponibles!
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
