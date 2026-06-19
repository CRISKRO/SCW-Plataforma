"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Edit, Trash2 } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { adminService } from '@/services/admin.services';

const ROLE_TRANSLATIONS: Record<string, string> = {
  SUPERADMIN: 'Súper Administrador',
  ADMIN: 'Administrador',
  REPORTER: 'Reportero',
  STAFF: 'Staff de Eventos',
  STUDENT: 'Alumno',
  PREMIUM: 'Usuario Premium',
  USER: 'Usuario Regular'
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (confirm(`¿Cambiar rol a ${newRole}?`)) {
      try {
        await adminService.updateUserRole(userId, newRole);
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (error) {
        console.error("Error updating role:", error);
        alert("Error al actualizar el rol.");
      }
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${email}"? Esta acción no se puede deshacer y borrará todos sus datos asociados.`)) {
      try {
        await adminService.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error al eliminar el usuario. Es posible que tenga relaciones que impidan su eliminación directa.");
      }
    }
  };

  const openEdit = (user: any) => {
    setEditingUser({ ...user });
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await adminService.updateUser(editingUser.id, editingUser);
      setUsers(users.map(u => u.id === editingUser.id ? updated : u));
      setShowEditForm(false);
    } catch (error) {
      console.error("Error updating user", error);
      alert("Error al actualizar usuario");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { 
      key: 'name', 
      label: 'Nombre',
      render: (_: any, item: any) => `${item.first_name} ${item.last_name}`
    },
    { key: 'phone_number', label: 'Teléfono' },
    { 
      key: 'role', 
      label: 'Rol Actual',
      render: (val: string, item: any) => (
        <select 
          value={val}
          onChange={(e) => handleRoleChange(item.id, e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-red-500 outline-none"
        >
          {Object.entries(ROLE_TRANSLATIONS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, item: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(item)}
            className="flex items-center gap-1 px-3 py-1 bg-white/10 text-white hover:bg-white/20 rounded border border-white/20 text-xs font-semibold transition"
          >
            <Edit className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            onClick={() => handleDeleteUser(item.id, item.email)}
            className="flex items-center gap-1 px-3 py-1 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded border border-red-600/20 hover:border-red-600 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Usuarios</h1>
          <p className="text-zinc-400 mt-2">Gestiona los permisos y roles de la comunidad SCW.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando usuarios...</div>
      ) : (
        <AdminTable columns={columns} data={users} />
      )}

      <AnimatePresence>
        {showEditForm && editingUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowEditForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 w-full max-w-xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Editar Usuario</h2>
                  <button onClick={() => setShowEditForm(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Nombre</label>
                      <input 
                        type="text" 
                        value={editingUser.first_name || ''} 
                        onChange={e => setEditingUser({...editingUser, first_name: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Apellido</label>
                      <input 
                        type="text" 
                        value={editingUser.last_name || ''} 
                        onChange={e => setEditingUser({...editingUser, last_name: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Email</label>
                    <input 
                      type="email" 
                      required
                      value={editingUser.email || ''} 
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Teléfono</label>
                      <input 
                        type="text" 
                        value={editingUser.phone_number || ''} 
                        onChange={e => setEditingUser({...editingUser, phone_number: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Rol</label>
                      <select 
                        value={editingUser.role || ''} 
                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
                      >
                        {Object.entries(ROLE_TRANSLATIONS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowEditForm(false)} className="flex-1 border border-white/10 text-zinc-400 hover:text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Actualizar Usuario'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
