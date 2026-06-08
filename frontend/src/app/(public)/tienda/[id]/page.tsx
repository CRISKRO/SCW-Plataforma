"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ShieldCheck, Trophy, Truck, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';
import Image from 'next/image';
import api from '@/services/api';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;

  const addItem = useCartStore((state) => state.addItem);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/merch/products/${productId}/`);
        setProduct(res.data);
        
        if (res.data.sizes_available) {
          const sizes = res.data.sizes_available.split(',').map((s: string) => s.trim()).filter(Boolean);
          setSelectedSize(sizes.length > 0 ? sizes[0] : '');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      image_url: product.image_url || 'bg-zinc-800',
      size: selectedSize || 'N/A',
      requires_shipping: !product.free_shipping,
    });
    
    useToastStore.getState().addToast('¡Agregado al carrito!', 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Assuming there's a cart or checkout page.
    // router.push('/carrito'); 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="w-10 h-10 border-t-2 border-[#3483fa] rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center text-white">
        <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
        <Link href="/tienda" className="text-[#3483fa] hover:underline">Volver a la tienda</Link>
      </div>
    );
  }

  const sizes = product.sizes_available 
    ? product.sizes_available.split(',').map((s: string) => s.trim()).filter(Boolean) 
    : [];

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ML Style Breadcrumb & Back */}
        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-6">
          <Link href="/tienda" className="flex items-center gap-1 hover:text-[#3483fa] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al listado
          </Link>
          <span>|</span>
          <Link href="/tienda" className="hover:text-[#3483fa] transition-colors">Tienda Oficial</Link>
          <span>{'>'}</span>
          <span className="text-zinc-300">{product.category_name || 'SCW Merch'}</span>
        </div>

        {/* Main Product Container - ML Layout */}
        <div className="bg-zinc-950 border border-white/10 rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT COLUMN: Gallery & Description */}
          <div className="w-full md:w-[65%] flex flex-col">
            
            {/* Image Area */}
            <div className="relative w-full aspect-square md:aspect-[4/3] bg-white flex items-center justify-center border-b md:border-b-0 md:border-r border-white/5 overflow-hidden">
              {product.image_url ? (
                <Image 
                  src={product.image_url} 
                  alt={product.name} 
                  fill
                  className="object-cover md:object-contain mix-blend-multiply p-0 md:p-8"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="text-zinc-400 font-bold uppercase tracking-widest text-lg">Sin Imagen</div>
              )}
            </div>

            {/* Description (Visible on Desktop here, on Mobile below) */}
            <div className="hidden md:block p-10 border-r border-white/5">
              <h2 className="text-2xl font-normal mb-6 text-white border-b border-white/10 pb-4">Descripción</h2>
              <p className="text-zinc-400 leading-relaxed text-[17px] whitespace-pre-wrap">
                {product.description || 'Sin descripción disponible para este producto.'}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Buy Actions */}
          <div className="w-full md:w-[35%] p-6 md:p-8 flex flex-col">
            
            <div className="text-sm text-zinc-400 mb-2 flex justify-between items-center">
              <span>Nuevo  |  +100 vendidos</span>
            </div>

            <h1 className="text-xl md:text-2xl font-semibold text-white leading-tight mb-4">
              {product.name}
            </h1>

            <div className="mb-6">
              <span className="text-4xl font-light text-white tracking-tight">
                ${parseFloat(product.price).toFixed(2)}
              </span>
            </div>

            {product.free_shipping && (
              <div className="mb-6">
                <p className="text-green-500 font-semibold flex items-center gap-2 mb-1">
                  <Truck className="w-5 h-5" /> Envío Gratis
                </p>
                <p className="text-zinc-400 text-sm pl-7">
                  Disponible para todo México.
                </p>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-8">
                <p className="text-sm font-semibold mb-3">Talla: <span className="font-normal text-zinc-300">{selectedSize}</span></p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 min-w-[3rem] px-4 rounded-md border font-medium text-sm transition-all ${
                        selectedSize === size 
                          ? 'border-[#3483fa] text-[#3483fa] bg-[#3483fa]/10 ring-1 ring-[#3483fa]' 
                          : 'border-white/20 text-zinc-300 hover:border-white/50 hover:bg-zinc-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-sm font-semibold mb-2">Stock disponible</p>
              {product.stock > 0 ? (
                <p className="text-sm text-zinc-300">Cantidad: <span className="font-semibold text-white">1 unidad</span> <span className="text-zinc-500">({product.stock} disponibles)</span></p>
              ) : (
                <p className="text-sm font-semibold text-red-500">Agotado temporalmente</p>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full py-4 rounded-md font-semibold text-base transition-colors ${
                  product.stock === 0
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                    : 'bg-[#4189e6]/10 hover:bg-[#4189e6]/20 text-[#3483fa]'
                }`}
              >
                Agregar al carrito
              </button>
            </div>

            {/* Guarantees ML Style */}
            <div className="mt-8 space-y-4 pt-6 border-t border-white/10">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-zinc-400 shrink-0" />
                <p className="text-sm text-zinc-400 leading-snug">
                  <span className="text-[#3483fa]">Compra Protegida</span>, recibe el producto que esperabas o te devolvemos tu dinero.
                </p>
            </div>
            </div>

          </div>
        </div>

        {/* Mobile Description */}
        <div className="md:hidden mt-6 bg-zinc-950 border border-white/10 rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-normal mb-4 text-white border-b border-white/10 pb-3">Descripción</h2>
          <p className="text-zinc-400 leading-relaxed text-[15px] whitespace-pre-wrap">
            {product.description || 'Sin descripción disponible para este producto.'}
          </p>
        </div>

      </div>
    </div>
  );
}
