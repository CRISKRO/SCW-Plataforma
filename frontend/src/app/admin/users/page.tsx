"use client";

import { useEffect, useState } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import { adminService } from '@/services/admin.services';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <option value="USER">USER</option>
          <option value="STUDENT">STUDENT</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="REPORTER">REPORTER</option>
          <option value="STAFF">STAFF</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
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
    </div>
  );
}
