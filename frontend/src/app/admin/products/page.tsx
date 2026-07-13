"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Search, 
  Tag, 
  Package, 
  DollarSign, 
  ListOrdered
} from 'lucide-react';
import api from '@/services/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK'>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Form states for product
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodSizes, setProdSizes] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodIsActive, setProdIsActive] = useState(true);
  const [prodFreeShipping, setProdFreeShipping] = useState(false);
  const [prodIsClothing, setProdIsClothing] = useState(false);
  const [prodStockBySize, setProdStockBySize] = useState<Record<string, number>>({});
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeQty, setNewSizeQty] = useState('');
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form states for category
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/merch/products/'),
        api.get('/merch/categories/')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Error loading shop data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdStock('0');
    setProdSizes('S, M, L, XL');
    setProdCategory(categories[0]?.id?.toString() || '');
    setProdIsActive(true);
    setProdFreeShipping(false);
    setProdIsClothing(false);
    setProdStockBySize({});
    setNewSizeName('');
    setNewSizeQty('');
    setProdImageFile(null);
    setProdImagePreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDesc(product.description || '');
    setProdPrice(product.price.toString());
    setProdStock(product.stock.toString());
    setProdSizes(product.sizes_available || '');
    setProdCategory(product.category?.toString() || '');
    setProdIsActive(product.is_active);
    setProdFreeShipping(product.free_shipping || false);
    setProdIsClothing(product.is_clothing || false);
    setProdStockBySize(product.stock_by_size || {});
    setNewSizeName('');
    setNewSizeQty('');
    setProdImageFile(null);
    setProdImagePreview(product.image_url || null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProdImageFile(file);
      setProdImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategory) {
      alert("Por favor completa los campos requeridos (Nombre, Precio y Categoría).");
      return;
    }

    setFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', prodName);
      formData.append('description', prodDesc);
      formData.append('price', parseFloat(prodPrice).toString());
      formData.append('stock', parseInt(prodStock).toString());
      formData.append('sizes_available', prodSizes);
      formData.append('category', prodCategory);
      formData.append('is_active', prodIsActive ? 'true' : 'false');
      formData.append('free_shipping', prodFreeShipping ? 'true' : 'false');
      formData.append('is_clothing', prodIsClothing ? 'true' : 'false');
      formData.append('stock_by_size', JSON.stringify(prodStockBySize));
      
      if (prodImageFile) {
        formData.append('image', prodImageFile);
      }

      if (editingProduct) {
        // Edit
        const res = await api.patch(`/merch/products/${editingProduct.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setProducts(products.map(p => p.id === editingProduct.id ? res.data : p));
        alert("Producto actualizado con éxito.");
      } else {
        // Create
        const res = await api.post('/merch/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setProducts([res.data, ...products]);
        alert("Producto creado con éxito.");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Hubo un error al guardar el producto.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${name}"?\nEsta acción no se puede deshacer.`)) {
      try {
        await api.delete(`/merch/products/${id}/`);
        setProducts(products.filter(p => p.id !== id));
        alert("Producto eliminado.");
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Hubo un error al eliminar el producto.");
      }
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catSlug) {
      alert("Por favor completa Nombre y Slug de la categoría.");
      return;
    }

    setCatLoading(true);
    try {
      const res = await api.post('/merch/categories/', { name: catName, slug: catSlug });
      setCategories([...categories, res.data]);
      alert("Categoría creada con éxito.");
      setCatName('');
      setCatSlug('');
      setIsCatModalOpen(false);
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Hubo un error al crear la categoría. Asegúrate de que el slug sea único.");
    } finally {
      setCatLoading(false);
    }
  };

  // Filter products by search and status
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    const stockCount = p.is_clothing 
      ? Object.values(p.stock_by_size || {}).reduce((a:any, b:any) => a + b, 0) 
      : p.stock;
      
    if (filterStatus === 'ACTIVE') return p.is_active;
    if (filterStatus === 'DRAFT') return !p.is_active;
    if (filterStatus === 'OUT_OF_STOCK') return stockCount === 0;
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader 
        title="Productos de la Tienda"
        subtitle="Administra los artículos de merch oficial de SCW, stock, precios, tallas e imágenes."
        icon={<ShoppingBag className="w-8 h-8 animate-pulse" />}
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex flex-1 justify-center items-center gap-2 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white px-4 py-2.5 text-sm font-semibold rounded-lg transition-all"
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Gestionar Categorías</span>
            <span className="sm:hidden">Categorías</span>
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="flex flex-1 justify-center items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-950/20 active:scale-95 transform whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </AdminPageHeader>

      {/* KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Productos Totales</p>
              <p className="text-3xl font-black text-white mt-1">{products.length}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <Package className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Categorías Activas</p>
              <p className="text-3xl font-black text-red-500 mt-1">{categories.length}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Tag className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sin Stock (Agotados)</p>
              <p className="text-3xl font-black text-yellow-500 mt-1">
                {products.filter(p => p.stock === 0).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <ListOrdered className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="space-y-4">
        
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-950 border border-white/5 p-4 rounded-xl">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto por nombre o categoría..."
              className="w-full bg-zinc-900/50 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all"
            />
          </div>
          
          {/* Filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              Filtrar:
            </span>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                filterStatus === 'ACTIVE'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-green-400/80'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilterStatus('DRAFT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                filterStatus === 'DRAFT'
                  ? 'bg-zinc-800 text-zinc-300 border-white/10'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-300'
              }`}
            >
              Borradores
            </button>
            <button
              onClick={() => setFilterStatus('OUT_OF_STOCK')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                filterStatus === 'OUT_OF_STOCK'
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-yellow-400/80'
              }`}
            >
              Agotados
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm font-medium">Cargando inventario...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-16 text-center text-zinc-500">
            <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No se encontraron productos</p>
            <p className="text-xs text-zinc-600 mt-1">Prueba a escribir otra búsqueda o agrega un nuevo producto.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW (TABLE) */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Imagen</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Producto</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Categoría</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Precio (MXN)</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Stock</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Tallas</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod) => {
                    const stock = prod.is_clothing ? Object.values(prod.stock_by_size || {}).reduce((a:any,b:any)=>a+b, 0) : prod.stock;
                    return (
                      <tr key={prod.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-white block">{prod.name}</span>
                          {prod.description && (
                            <span className="text-zinc-500 text-xs line-clamp-1 max-w-[250px]">{prod.description}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-medium">{prod.category_name || 'Sin Categoría'}</td>
                        <td className="px-6 py-4 font-bold text-white">${parseFloat(prod.price).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            stock === 0 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                              : stock <= 5 
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                              : 'bg-zinc-900 text-zinc-300'
                          }`}>
                            {stock} pzas
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{prod.sizes_available || 'N/A'}</td>
                        <td className="px-6 py-4">
                          {prod.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                              ACTIVO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-500 border border-white/5">
                              BORRADOR
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-all"
                            title="Editar Producto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-2 bg-red-650/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW (CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredProducts.map((prod) => {
                const stock = prod.is_clothing ? Object.values(prod.stock_by_size || {}).reduce((a:any,b:any)=>a+b, 0) : prod.stock;
                return (
                  <div key={prod.id} className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col space-y-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg leading-tight truncate">{prod.name}</h3>
                        <p className="text-red-400 font-black mt-1">${parseFloat(prod.price).toFixed(2)} MXN</p>
                        <p className="text-zinc-500 text-xs mt-1 truncate">{prod.category_name || 'Sin Categoría'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                      <div>
                        <span className="text-zinc-500 text-xs block uppercase tracking-wider mb-0.5">Stock</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          stock === 0 
                            ? 'bg-red-500/10 text-red-500' 
                            : stock <= 5 
                            ? 'bg-yellow-500/10 text-yellow-400' 
                            : 'text-zinc-300'
                        }`}>
                          {stock} pzas
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs block uppercase tracking-wider mb-0.5">Estado</span>
                        <span className={`text-xs font-bold ${prod.is_active ? 'text-green-400' : 'text-zinc-500'}`}>
                          {prod.is_active ? 'ACTIVO' : 'BORRADOR'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="flex items-center justify-center bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ADD/EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            {/* Modal Title */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-zinc-900/50">
              <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                {editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Upload Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Imagen del Producto</label>
                  <div className="relative aspect-square w-full bg-zinc-900 border border-white/10 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 group border-dashed hover:border-red-500/50 transition-all cursor-pointer">
                    {prodImagePreview ? (
                      <>
                        <img src={prodImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs font-bold bg-white text-black px-4 py-2 rounded uppercase tracking-wider">Cambiar Imagen</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-zinc-600 group-hover:text-red-500 transition-colors" />
                        <span className="text-xs text-zinc-500 text-center font-semibold">Subir archivo JPG/PNG</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Nombre del Producto *</label>
                    <input 
                      required 
                      type="text" 
                      value={prodName} 
                      onChange={(e) => setProdName(e.target.value)} 
                      className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-700" 
                      placeholder="Ej: Máscara Oficial SCW"
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Categoría *</label>
                    {categories.length === 0 ? (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                        <p className="font-semibold mb-1">No hay categorías registradas.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            setIsCatModalOpen(true);
                          }}
                          className="text-red-400 hover:text-white underline font-bold transition-colors"
                        >
                          Crear una categoría aquí
                        </button>
                      </div>
                    ) : (
                      <select
                        required
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-all"
                      >
                        <option value="">Selecciona categoría</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Price and Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Precio (MXN) *</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          required 
                          type="number" 
                          step="0.01" 
                          value={prodPrice} 
                          onChange={(e) => setProdPrice(e.target.value)} 
                          className="w-full bg-black border border-white/10 rounded-lg py-3 pl-8 pr-3 text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-700" 
                          placeholder="299.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Stock Inicial *</label>
                      <input 
                        required={!prodIsClothing}
                        disabled={prodIsClothing}
                        type="number" 
                        min="0" 
                        value={prodStock} 
                        onChange={(e) => setProdStock(e.target.value)} 
                        className={`w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-700 ${prodIsClothing ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        placeholder={prodIsClothing ? "Manejado por talla" : "10"}
                      />
                    </div>
                  </div>

                  {/* Sizes */}
                  {prodIsClothing ? (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Inventario por Talla</label>
                      <div className="bg-black border border-white/10 rounded-lg p-4 space-y-4">
                        
                        {/* List of current sizes */}
                        {Object.keys(prodStockBySize).length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(prodStockBySize).map(([size, stock]) => (
                              <div key={size} className="flex flex-col bg-zinc-900 border border-white/5 rounded-lg p-2.5 relative group">
                                <span className="font-bold text-zinc-400 text-xs mb-1.5">Talla <span className="text-white text-sm">{size}</span></span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  value={stock} 
                                  onChange={(e) => setProdStockBySize({...prodStockBySize, [size]: parseInt(e.target.value) || 0})}
                                  className="w-full bg-black border border-white/10 rounded p-2 text-white text-sm focus:outline-none focus:border-red-500/50"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const newStock = {...prodStockBySize};
                                    delete newStock[size];
                                    setProdStockBySize(newStock);
                                  }} 
                                  className="absolute top-1.5 right-1.5 text-zinc-500 hover:text-red-500 p-1 bg-black rounded opacity-0 group-hover:opacity-100 transition-all"
                                  title="Eliminar talla"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-600 italic">No hay tallas agregadas. Agrega una abajo.</p>
                        )}
                        
                        <div className="h-px w-full bg-white/10"></div>

                        {/* Add new size form */}
                        <div className="flex gap-3 items-end">
                          <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Nueva Talla</label>
                            <input 
                              type="text" 
                              value={newSizeName}
                              onChange={(e) => setNewSizeName(e.target.value.toUpperCase())}
                              placeholder="Ej. S, M, L..." 
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-white text-sm uppercase focus:outline-none focus:border-red-500/50" 
                              onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}
                            />
                          </div>
                          <div className="space-y-1.5 w-24 shrink-0">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block">Stock</label>
                            <input 
                              type="number" 
                              min="0"
                              value={newSizeQty}
                              onChange={(e) => setNewSizeQty(e.target.value)}
                              placeholder="0" 
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-red-500/50" 
                              onKeyDown={(e) => { 
                                if(e.key === 'Enter') { 
                                  e.preventDefault(); 
                                  if (newSizeName) {
                                    setProdStockBySize({...prodStockBySize, [newSizeName]: parseInt(newSizeQty) || 0});
                                    setNewSizeName('');
                                    setNewSizeQty('');
                                  }
                                } 
                              }}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              if (newSizeName) {
                                setProdStockBySize({...prodStockBySize, [newSizeName]: parseInt(newSizeQty) || 0});
                                setNewSizeName('');
                                setNewSizeQty('');
                              }
                            }} 
                            className="bg-zinc-800 hover:bg-zinc-700 text-white h-[42px] px-4 rounded-lg text-sm font-bold transition-colors"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Tallas Disponibles</label>
                      <input 
                        type="text" 
                        value={prodSizes} 
                        onChange={(e) => setProdSizes(e.target.value)} 
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-700 font-mono text-sm" 
                        placeholder="S, M, L, XL"
                      />
                      <span className="text-[10px] text-zinc-600 block leading-normal">Separa las tallas por comas o déjalo vacío si no aplica.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Descripción del Producto</label>
                <textarea 
                  rows={3} 
                  value={prodDesc} 
                  onChange={(e) => setProdDesc(e.target.value)} 
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-700 resize-none" 
                  placeholder="Escribe características o detalles del producto..."
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Activo</h4>
                    <p className="text-xs text-zinc-500">Visible en la tienda.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdIsActive(!prodIsActive)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 relative border ${
                      prodIsActive 
                        ? 'bg-red-600 border-red-500' 
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <span className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                      prodIsActive ? 'left-[26px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Free Shipping Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Envío Gratis</h4>
                    <p className="text-xs text-zinc-500">Aplica para todo México.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdFreeShipping(!prodFreeShipping)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 relative border ${
                      prodFreeShipping 
                        ? 'bg-green-600 border-green-500' 
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <span className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                      prodFreeShipping ? 'left-[26px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Is Clothing Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Es Ropa</h4>
                    <p className="text-xs text-zinc-500">Stock por talla</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdIsClothing(!prodIsClothing)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 relative border ${
                      prodIsClothing 
                        ? 'bg-blue-600 border-blue-500' 
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <span className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                      prodIsClothing ? 'left-[26px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white py-3.5 font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black py-3.5 font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Guardar Producto
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Modal Title */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-zinc-900/50">
              <h2 className="text-lg font-bold uppercase tracking-wider text-white">Gestionar Categorías</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Add category form */}
              <form onSubmit={handleSaveCategory} className="space-y-4 bg-zinc-900/50 p-4 border border-white/5 rounded-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-500">Nueva Categoría</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Nombre</label>
                    <input 
                      required
                      type="text" 
                      value={catName} 
                      onChange={(e) => {
                        setCatName(e.target.value);
                        // Auto-generate slug
                        setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }}
                      className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-800" 
                      placeholder="Ej: Máscaras"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Slug único (URL)</label>
                    <input 
                      required
                      type="text" 
                      value={catSlug} 
                      onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="w-full bg-black border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-zinc-800 font-mono" 
                      placeholder="ej: mascaras"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={catLoading}
                    className="w-full bg-white text-black py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {catLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Crear Categoría
                  </button>
                </div>
              </form>

              {/* Categories list */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Categorías Registradas</h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center bg-zinc-900 border border-white/5 px-3.5 py-2.5 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-white block leading-none">{cat.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-1 block">Slug: /{cat.slug}</span>
                      </div>
                      <span className="text-[10px] bg-zinc-800 border border-white/5 text-zinc-400 px-2 py-0.5 rounded font-mono">
                        ID: {cat.id}
                      </span>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-4 italic">No hay categorías registradas.</p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="w-full border border-white/10 hover:bg-white/5 text-zinc-300 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Cerrar Ventana
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
