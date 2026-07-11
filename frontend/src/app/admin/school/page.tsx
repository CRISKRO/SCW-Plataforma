"use client";

import { useEffect, useState } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import { adminService } from '@/services/admin.services';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  MessageSquare, 
  Search, 
  Filter, 
  Loader2, 
  UserCheck, 
  AlertCircle,
  TrendingUp,
  Inbox,
  XCircle
} from 'lucide-react';

export default function AdminSchoolPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'payments'>('payments');
  
  // Search and Filter states for monthly fees
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'EXPIRING' | 'UNPAID'>('ALL');
  
  // Action loaders
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    experience: 'NONE',
    status: 'APPROVED',
    payment_due_date: '',
    last_payment_date: '',
    outstanding_balance: '0'
  });

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
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

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      age: '',
      experience: 'NONE',
      status: 'APPROVED',
      payment_due_date: '',
      last_payment_date: '',
      outstanding_balance: '0'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: any) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      age: student.age || '',
      experience: student.experience || 'NONE',
      status: student.status || 'APPROVED',
      payment_due_date: student.payment_due_date || '',
      last_payment_date: student.last_payment_date || '',
      outstanding_balance: student.outstanding_balance || '0'
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData };
      if (!payload.payment_due_date) delete payload.payment_due_date;
      if (!payload.last_payment_date) delete payload.last_payment_date;
      if (editingStudent && !payload.password) delete payload.password;
      
      if (editingStudent) {
        const response = await adminService.updateEnrollment(editingStudent.id, payload);
        setEnrollments(enrollments.map(en => en.id === editingStudent.id ? response : en));
        alert('Alumno actualizado correctamente.');
      } else {
        const response = await adminService.createEnrollment(payload);
        setEnrollments([response, ...enrollments]);
        alert('Alumno registrado correctamente.');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving student:", error);
      alert(error?.response?.data?.error || "Error al guardar el alumno.");
    }
  };

  const handleStatusChange = async (enrollmentId: number, newStatus: string) => {
    if (confirm(`¿Marcar solicitud como ${newStatus === 'APPROVED' ? 'CONFIRMADO' : 'RECHAZADO'}?`)) {
      try {
        await adminService.updateEnrollmentStatus(enrollmentId, newStatus);
        setEnrollments(enrollments.map(e => e.id === enrollmentId ? { ...e, status: newStatus } : e));
        alert(`Solicitud de ingreso ${newStatus === 'APPROVED' ? 'aprobada' : 'rechazada'} con éxito.`);
        
        if (newStatus === 'APPROVED') {
          // Intentar enviar WhatsApp directo de bienvenida desde el navegador
          try {
            const student = enrollments.find(e => e.id === enrollmentId);
            if (student) {
              const experienceStr = student.experience === 'BEGINNER' ? 'Principiante' : student.experience === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado';
              const message = 
                `🎉 *¡SCW DOJO — Felicitaciones, has sido Admitido!* 🥊\n\n` +
                `Hola *${student.user.first_name}*,\n\n` +
                `Nos complace informarte que tu solicitud de inscripción a SCW DOJO ha sido **APROBADA** por la administración. ¡Ya eres parte oficial del equipo! 🥊⚡\n\n` +
                `📍 *Nivel de Experiencia:* ${experienceStr}\n\n` +
                `Te esperamos en tu primera sesión de entrenamiento. ¡Prepárate para darlo todo en el ring! ⚡🥊\n\n` +
                `Si tienes alguna duda sobre los horarios, uniformes o mensualidades, no dudes en escribirnos por este medio.`;

              await fetch('https://scw-whatsapp.onrender.com/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: student.phone, message: message })
              });
            }
          } catch (localErr) {
            console.error("Error al enviar WhatsApp de bienvenida directo:", localErr);
          }
        }
      } catch (error) {
        console.error("Error updating status:", error);
        alert("Error al actualizar el estado de la solicitud.");
      }
    }
  };

  const handleRegisterPayment = async (studentId: number, studentName: string) => {
    if (confirm(`¿Registrar pago mensual para el alumno "${studentName}"?\nSe actualizará su vencimiento (+30 días) y se enviará una confirmación automática por WhatsApp.`)) {
      try {
        setActionLoading(prev => ({ ...prev, [studentId]: true }));
        const response = await adminService.registerStudentPayment(studentId);
        
        // Update local state with new student data
        setEnrollments(enrollments.map(e => e.id === studentId ? { 
          ...e, 
          payment_status: response.data.payment_status,
          last_payment_date: response.data.last_payment_date,
          payment_due_date: response.data.payment_due_date
        } : e));

        let whatsappSentSuccessfully = response.whatsapp_sent;

        // Eliminado: Bloque de fallback a Render directo desde el navegador

        if (whatsappSentSuccessfully) {
          alert(`✅ Pago registrado con éxito.\n📲 Se envió la confirmación de pago por WhatsApp a ${studentName}.`);
        } else {
          alert(`⚠️ Pago registrado con éxito en el sistema.\n❌ Sin embargo, el mensaje por WhatsApp no pudo enviarse vía Meta. Asegúrate de que las credenciales de Facebook estén configuradas en Administración.`);
        }
      } catch (error: any) {
        console.error("Error registering payment:", error);
        alert(error?.response?.data?.error || "Error al registrar el pago mensual.");
      } finally {
        setActionLoading(prev => ({ ...prev, [studentId]: false }));
      }
    }
  };

  const handleSendReminder = async (studentId: number, studentName: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [studentId]: true }));
      const response = await adminService.sendStudentPaymentReminder(studentId);
      
      let whatsappSentSuccessfully = response.whatsapp_sent;

      // Eliminado: Bloque de fallback a Render directo desde el navegador para el recordatorio

      if (whatsappSentSuccessfully) {
        alert(`📲 Recordatorio enviado con éxito por WhatsApp a ${studentName}.`);
      } else {
        const errorDetail = response.message || "Asegúrate de que las credenciales de Facebook estén configuradas en la Administración.";
        alert(`❌ No se pudo enviar el recordatorio por WhatsApp.\nDetalle: ${errorDetail}`);
      }
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      alert(error?.response?.data?.error || "Error al enviar el recordatorio.");
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: number, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la inscripción/alumno "${name}"?\nEsta acción no se puede deshacer y borrará todo su historial.`)) {
      try {
        await adminService.deleteEnrollment(enrollmentId);
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
      } catch (error) {
        console.error("Error deleting enrollment:", error);
        alert("Error al eliminar la inscripción/alumno.");
      }
    }
  };

  // Lists configurations
  const activeStudents = enrollments.filter(e => e.status === 'APPROVED');
  const pendingRequests = enrollments.filter(e => e.status === 'PENDING');
  const rejectedRequests = enrollments.filter(e => e.status === 'REJECTED');

  // Filter & Search logic for Payments Tab
  const filteredStudents = activeStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.phone.includes(searchQuery);
    
    if (paymentFilter === 'ALL') return matchesSearch;
    return matchesSearch && student.payment_status === paymentFilter;
  });

  // Table Columns for tab 1 (Dojo Admission Requests)
  const requestColumns = [
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
            <a href={item.id_document} target="_blank" rel="noreferrer" className="text-xs bg-zinc-800 text-white px-2.5 py-1 rounded-md hover:bg-zinc-700 transition-colors">INE</a>
          ) : (
            <span className="text-xs text-zinc-600">No INE</span>
          )}
          {item.medical_certificate ? (
            <a href={item.medical_certificate} target="_blank" rel="noreferrer" className="text-xs bg-zinc-800 text-white px-2.5 py-1 rounded-md hover:bg-zinc-700 transition-colors">Médico</a>
          ) : (
            <span className="text-xs text-zinc-600">No Med</span>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Estado de Admisión',
      render: (val: string, item: any) => {
        if (val === 'APPROVED') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">CONFIRMADO</span>;
        if (val === 'REJECTED') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">RECHAZADO</span>;
        
        return (
          <div className="flex gap-2">
            <button 
              onClick={() => handleStatusChange(item.id, 'APPROVED')} 
              className="px-2.5 py-1.5 bg-green-500 text-black hover:bg-green-400 rounded-lg text-xs font-bold transition-all transform active:scale-95"
            >
              ADMITIR
            </button>
            <button 
              onClick={() => handleStatusChange(item.id, 'REJECTED')} 
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all transform active:scale-95"
            >
              RECHAZAR
            </button>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, item: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEditModal(item)}
            className="px-2.5 py-1.5 bg-zinc-800 text-blue-400 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all border border-blue-500/20 hover:border-blue-500"
            title="Editar"
          >
            Editar
          </button>
          <button
            onClick={() => handleDeleteEnrollment(item.id, item.name)}
            className="px-2.5 py-1.5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-600/20 hover:border-red-600"
            title="Eliminar solicitud permanentemente"
          >
            Eliminar
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
            SCW DOJO (Alumnos)
          </h1>
          <p className="text-zinc-400 mt-2 text-base">
            Gestiona inscripciones, mensualidades escolares y notificaciones a WhatsApp de la escuela de lucha.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1.5 bg-zinc-900 border border-white/5 rounded-xl p-1 flex-wrap">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg shadow-green-900/20 mr-2"
          >
            <UserCheck className="w-4 h-4" />
            Registrar Alumno
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-950/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Control de Mensualidades
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-950/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Solicitudes de Admisión ({pendingRequests.length})
          </button>
        </div>
      </div>

      {/* KPI summaries depending on the active tab */}
      {activeTab === 'payments' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="glass-panel p-5 relative overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Alumnos Activos</p>
                <p className="text-3xl font-black text-white mt-1.5">{activeStudents.length}</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <Users className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span>Confirmados en Factory</span>
            </div>
          </div>

          <div className="glass-panel p-5 relative overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Al Corriente (Pagados)</p>
                <p className="text-3xl font-black text-green-500 mt-1.5">
                  {activeStudents.filter(s => s.payment_status === 'PAID').length}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              <span className="font-semibold text-green-500">{((activeStudents.filter(s => s.payment_status === 'PAID').length / (activeStudents.length || 1)) * 100).toFixed(0)}%</span> del total de alumnos
            </div>
          </div>

          <div className="glass-panel p-5 relative overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Próximos a Vencer</p>
                <p className="text-3xl font-black text-yellow-500 mt-1.5">
                  {activeStudents.filter(s => s.payment_status === 'EXPIRING').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Expira en 5 días o menos
            </div>
          </div>

          <div className="glass-panel p-5 relative overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Deudores (Vencido)</p>
                <p className="text-3xl font-black text-red-500 mt-1.5">
                  {activeStudents.filter(s => s.payment_status === 'UNPAID').length}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Requieren recordatorio urgente
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <div className="glass-panel p-4 md:p-5 border border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Solicitudes Factory</p>
                <p className="text-3xl font-black text-white mt-1">{enrollments.length}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <Inbox className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 border border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pendientes de Admisión</p>
                <p className="text-3xl font-black text-yellow-500 mt-1">{pendingRequests.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 border border-white/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Admisiones Rechazadas</p>
                <p className="text-3xl font-black text-zinc-500 mt-1">{rejectedRequests.length}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded-xl">
                <XCircle className="w-5 h-5 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content view */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-sm font-medium tracking-wide">Cargando datos de SCW DOJO...</p>
        </div>
      ) : activeTab === 'payments' ? (
        <div className="space-y-4">
          {/* Controls Bar for Monthly Fees */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-950 border border-white/5 p-4 rounded-xl">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre o WhatsApp..."
                className="w-full bg-zinc-900/50 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all"
              />
            </div>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Filtrar:
              </span>
              <button
                onClick={() => setPaymentFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  paymentFilter === 'ALL'
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPaymentFilter('PAID')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  paymentFilter === 'PAID'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-green-400/80'
                }`}
              >
                Pagados
              </button>
              <button
                onClick={() => setPaymentFilter('EXPIRING')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  paymentFilter === 'EXPIRING'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-yellow-400/80'
                }`}
              >
                Por Vencer
              </button>
              <button
                onClick={() => setPaymentFilter('UNPAID')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  paymentFilter === 'UNPAID'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-red-400/80'
                }`}
              >
                Debe
              </button>
            </div>
          </div>

          {/* Table of Monthly Payments */}
          {filteredStudents.length === 0 ? (
            <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-12 text-center text-zinc-500">
              <Inbox className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No se encontraron alumnos con los criterios seleccionados</p>
              <p className="text-xs text-zinc-600 mt-1">Prueba a escribir otra búsqueda o cambia de filtro.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (TABLE) */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Folio</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Nombre Completo</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Teléfono / WhatsApp</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Último Pago</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Vencimiento Mensual</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Estado Pago</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const isLoading = actionLoading[student.id] || false;
                    
                    return (
                      <tr 
                        key={student.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-all duration-200"
                      >
                        <td className="px-6 py-4 font-mono text-zinc-500">#{student.id}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-white block">{student.name}</span>
                          <span className="text-zinc-500 text-xs">Email: {student.email}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-400">{student.phone}</td>
                        <td className="px-6 py-4">
                          {student.last_payment_date ? (
                            <span className="text-zinc-300 font-medium bg-zinc-900 border border-white/5 px-2 py-1 rounded text-xs">
                              {new Date(student.last_payment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Ningún pago</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.payment_due_date ? (
                            <span className={`font-semibold px-2 py-1 rounded text-xs ${
                              student.payment_status === 'UNPAID' 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : student.payment_status === 'EXPIRING'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                              {new Date(student.payment_due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">No configurado</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.payment_status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                              AL CORRIENTE
                            </span>
                          )}
                          {student.payment_status === 'EXPIRING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                              POR VENCER
                            </span>
                          )}
                          {student.payment_status === 'UNPAID' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                              DEBE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2.5 whitespace-nowrap">
                          {isLoading ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 py-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                              Procesando...
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRegisterPayment(student.id, student.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-black hover:bg-green-400 font-bold rounded-lg text-xs transition-all transform active:scale-95 shadow-md shadow-green-950/10"
                                title="Registrar pago del alumno y enviar confirmación por WhatsApp"
                              >
                                Registrar Pago
                              </button>
                              
                              <button
                                onClick={() => handleSendReminder(student.id, student.name)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 font-bold rounded-lg text-xs transition-all transform active:scale-95 ${
                                  student.payment_status === 'UNPAID'
                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                }`}
                                title="Enviar recordatorio de pago a su WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Recordatorio
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(student)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-blue-400 font-bold rounded-lg text-xs transition-all transform active:scale-95 border border-blue-500/20 hover:border-blue-500"
                                title="Editar alumno"
                              >
                                Editar
                              </button>
                              
                              <button
                                onClick={() => handleDeleteEnrollment(student.id, student.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-600/20 hover:border-red-600"
                                title="Eliminar alumno permanentemente"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW (CARDS) */}
            <div className="lg:hidden flex flex-col gap-4">
              {filteredStudents.map((student) => {
                const isLoading = actionLoading[student.id] || false;
                
                return (
                  <div key={student.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-4 shadow-lg relative overflow-hidden">
                    
                    {/* Status indicator line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      student.payment_status === 'UNPAID' ? 'bg-red-500' :
                      student.payment_status === 'EXPIRING' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />

                    <div className="flex justify-between items-start ml-2">
                      <div>
                        <div className="text-xs text-zinc-500 font-mono mb-1">Folio #{student.id}</div>
                        <h3 className="font-bold text-white text-base">{student.name}</h3>
                        <p className="text-zinc-400 text-xs mt-0.5">{student.phone}</p>
                      </div>
                      
                      <div>
                        {student.payment_status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            AL CORRIENTE
                          </span>
                        )}
                        {student.payment_status === 'EXPIRING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            POR VENCER
                          </span>
                        )}
                        {student.payment_status === 'UNPAID' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            DEBE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 ml-2 bg-black/20 rounded-lg p-3 border border-white/5">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Último Pago</p>
                        <p className="text-xs text-zinc-300 font-medium">
                          {student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Vence el</p>
                        <p className="text-xs text-zinc-300 font-medium">
                          {student.payment_due_date ? new Date(student.payment_due_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="ml-2 grid grid-cols-2 gap-2 mt-2">
                      {isLoading ? (
                        <div className="col-span-2 flex justify-center items-center py-2 text-xs text-zinc-500">
                          <Loader2 className="w-4 h-4 animate-spin text-red-500 mr-2" />
                          Procesando...
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRegisterPayment(student.id, student.name)}
                            className="flex justify-center items-center py-2.5 bg-green-500 text-black hover:bg-green-400 font-bold rounded-lg text-xs transition-all"
                          >
                            Pagar
                          </button>
                          <button
                            onClick={() => handleSendReminder(student.id, student.name)}
                            className={`flex justify-center items-center gap-1 py-2.5 font-bold rounded-lg text-xs transition-all ${
                              student.payment_status === 'UNPAID'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Avisar
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(student)}
                            className="flex justify-center items-center py-2 bg-zinc-800 text-blue-400 font-bold rounded-lg text-xs border border-blue-500/20"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteEnrollment(student.id, student.name)}
                            className="flex justify-center items-center py-2 bg-red-600/10 text-red-500 font-bold rounded-lg text-xs border border-red-600/20"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      ) : (
        /* Solicitudes de Ingreso Tab */
        enrollments.length === 0 ? (
          <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-12 text-center text-zinc-500">
            <Inbox className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No hay ninguna solicitud registrada</p>
            <p className="text-xs text-zinc-600 mt-1">Los aspirantes a SCW DOJO que se registren en la web pública saldrán aquí.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <AdminTable columns={requestColumns} data={enrollments} />
            </div>
            
            {/* MOBILE VIEW (REQUEST CARDS) */}
            <div className="lg:hidden flex flex-col gap-4">
              {enrollments.map((req) => (
                <div key={req.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-4 shadow-lg relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    req.status === 'PENDING' ? 'bg-yellow-400' :
                    req.status === 'APPROVED' ? 'bg-green-400' : 'bg-red-500'
                  }`} />

                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="text-xs text-zinc-500 font-mono mb-1">Folio #{req.id}</div>
                      <h3 className="font-bold text-white text-base">{req.name}</h3>
                      <p className="text-zinc-400 text-xs mt-0.5">{req.phone}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${
                        req.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        req.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {req.status === 'PENDING' ? 'PENDIENTE' : req.status === 'APPROVED' ? 'APROBADO' : 'RECHAZADO'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-2 bg-black/20 rounded-lg p-3 border border-white/5">
                    <div className="col-span-2 mb-1">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Email</p>
                      <p className="text-xs text-zinc-300 font-medium break-all">{req.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Edad</p>
                      <p className="text-xs text-zinc-300 font-medium">{req.age} años</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Experiencia</p>
                      <p className="text-xs text-zinc-300 font-medium truncate">
                        {req.experience === 'NONE' ? 'Ninguna' :
                         req.experience === 'BEGINNER' ? 'Principiante' :
                         req.experience === 'INTERMEDIATE' ? 'Intermedio' :
                         req.experience === 'ADVANCED' ? 'Avanzado' : req.experience}
                      </p>
                    </div>
                  </div>

                  <div className="ml-2 grid grid-cols-2 gap-2 mt-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                          className="flex justify-center items-center py-2.5 bg-green-500 text-black hover:bg-green-400 font-bold rounded-lg text-xs transition-all"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'RECHAZADA')}
                          className="flex justify-center items-center py-2.5 bg-red-600/10 text-red-500 font-bold rounded-lg text-xs border border-red-600/20"
                        >
                          Rechazar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(req)}
                          className="flex justify-center items-center py-2 bg-zinc-800 text-blue-400 font-bold rounded-lg text-xs border border-blue-500/20"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteEnrollment(req.id, req.name)}
                          className="flex justify-center items-center py-2 bg-red-600/10 text-red-500 font-bold rounded-lg text-xs border border-red-600/20"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* ADD/EDIT STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-white/10 p-6 rounded-2xl w-full max-w-2xl my-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold uppercase tracking-widest">{editingStudent ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Nombre Completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Correo Electrónico</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Contraseña</label>
                  <input type="password" required={!editingStudent} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" placeholder={editingStudent ? "Dejar en blanco para no cambiar" : ""} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">WhatsApp / Teléfono</label>
                  <input type="text" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Edad</label>
                  <input type="number" required value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Nivel de Experiencia</label>
                  <select value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500">
                    <option value="NONE">Ninguna</option>
                    <option value="BEGINNER">Principiante</option>
                    <option value="INTERMEDIATE">Intermedio</option>
                    <option value="ADVANCED">Avanzado / Profesional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Estado de Admisión</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500">
                    <option value="PENDING">Pendiente</option>
                    <option value="APPROVED">Confirmado (Activo)</option>
                    <option value="REJECTED">Rechazado</option>
                  </select>
                </div>
              </div>
              
              <hr className="border-white/5 my-4" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Mensualidades y Saldos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Vencimiento Mensual</label>
                  <input type="date" value={formData.payment_due_date} onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Último Pago</label>
                  <input type="date" value={formData.last_payment_date} onChange={(e) => setFormData({...formData, last_payment_date: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Saldo Pendiente (Debe)</label>
                  <input type="number" step="0.01" value={formData.outstanding_balance} onChange={(e) => setFormData({...formData, outstanding_balance: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-zinc-800 text-white hover:bg-zinc-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20">
                  {editingStudent ? 'Guardar Cambios' : 'Registrar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
