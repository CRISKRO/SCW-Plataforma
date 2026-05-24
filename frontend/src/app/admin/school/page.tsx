"use client";

import { useEffect, useState } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import { adminService } from '@/services/admin.services';

export default function AdminSchoolPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = async () => {
    try {
      const data = await adminService.getEnrollments();
      setEnrollments(data);
    } catch (error) {
      console.error("Error loading enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleStatusChange = async (enrollmentId: number, newStatus: string) => {
    if (confirm(`¿Marcar solicitud como ${newStatus === 'APPROVED' ? 'CONFIRMADO' : 'RECHAZADO'}?`)) {
      try {
        await adminService.updateEnrollmentStatus(enrollmentId, newStatus);
        setEnrollments(enrollments.map(e => e.id === enrollmentId ? { ...e, status: newStatus } : e));
      } catch (error) {
        console.error("Error updating status:", error);
        alert("Error al actualizar el estado.");
      }
    }
  };

  const columns = [
    { key: 'id', label: 'Folio' },
    { key: 'name', label: 'Nombre Completo' },
    { key: 'age', label: 'Edad' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'WhatsApp' },
    { 
      key: 'experience', 
      label: 'Nivel',
      render: (val: string) => {
        const map: Record<string, string> = { NONE: 'Sin exp.', BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' };
        return map[val] || val;
      }
    },
    { 
      key: 'created_at', 
      label: 'Registro',
      render: (val: string) => new Date(val).toLocaleDateString('es-MX')
    },
    {
      key: 'documents',
      label: 'Documentos',
      render: (val: any, item: any) => (
        <div className="flex gap-2">
          {item.id_document ? (
            <a href={item.id_document} target="_blank" rel="noreferrer" className="text-xs bg-zinc-800 text-white px-2 py-1 rounded hover:bg-zinc-700 transition-colors">INE</a>
          ) : (
            <span className="text-xs text-zinc-600">No INE</span>
          )}
          {item.medical_certificate ? (
            <a href={item.medical_certificate} target="_blank" rel="noreferrer" className="text-xs bg-zinc-800 text-white px-2 py-1 rounded hover:bg-zinc-700 transition-colors">Médico</a>
          ) : (
            <span className="text-xs text-zinc-600">No Med</span>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Estado',
      render: (val: string, item: any) => {
        if (val === 'APPROVED') return <span className="text-green-500 font-bold text-xs tracking-widest">CONFIRMADO</span>;
        if (val === 'REJECTED') return <span className="text-red-500 font-bold text-xs tracking-widest">RECHAZADO</span>;
        
        return (
          <div className="flex gap-2">
            <button 
              onClick={() => handleStatusChange(item.id, 'APPROVED')} 
              className="px-2 py-1 bg-green-500/20 text-green-500 hover:bg-green-500/40 rounded text-xs font-bold transition-colors"
            >
              CONFIRMAR
            </button>
            <button 
              onClick={() => handleStatusChange(item.id, 'REJECTED')} 
              className="px-2 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded text-xs font-bold transition-colors"
            >
              RECHAZAR
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dojo SCW (Alumnos)</h1>
          <p className="text-zinc-400 mt-2">Gestiona las inscripciones y alumnos de la escuela.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Total Alumnos Registrados</p>
          <p className="text-3xl font-black text-white mt-2">
            {enrollments.length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Solicitudes Pendientes</p>
          <p className="text-3xl font-black text-yellow-500 mt-2">
            {enrollments.filter(e => e.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando alumnos...</div>
      ) : (
        <AdminTable columns={columns} data={enrollments} />
      )}
    </div>
  );
}
