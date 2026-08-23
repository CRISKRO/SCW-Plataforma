import api from './api';

export const adminService = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/settings/dashboard-stats/');
    return response.data;
  },

  // Users
  getUsers: async () => {
    const response = await api.get('/auth/users/');
    return response.data;
  },
  updateUserRole: async (id: number, role: string) => {
    const response = await api.patch(`/auth/users/${id}/`, { role });
    return response.data;
  },
  updateUser: async (id: number, data: any) => {
    const response = await api.patch(`/auth/users/${id}/`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/auth/users/${id}/`);
    return response.data;
  },
  
  // Finances / Orders
  getOrders: async () => {
    const response = await api.get('/payments/orders/');
    return response.data;
  },
  updateOrderStatus: async (id: number, status: string) => {
    const response = await api.patch(`/payments/orders/${id}/`, { status });
    return response.data;
  },
  deleteOrder: async (id: number) => {
    const response = await api.delete(`/payments/orders/${id}/`);
    return response.data;
  },
  resendOrderEmail: async (id: number) => {
    const response = await api.post(`/payments/orders/${id}/resend_email/`);
    return response.data;
  },

  // School / Enrollments
  getEnrollments: async () => {
    const response = await api.get('/students/enrollments/');
    return response.data;
  },
  createEnrollment: async (data: any) => {
    const response = await api.post('/students/enrollments/', data);
    return response.data;
  },
  updateEnrollment: async (id: number, data: any) => {
    const response = await api.patch(`/students/enrollments/${id}/`, data);
    return response.data;
  },
  updateEnrollmentStatus: async (id: number, status: string) => {
    const response = await api.patch(`/students/enrollments/${id}/`, { status });
    return response.data;
  },
  registerStudentPayment: async (id: number, amount?: number) => {
    const payload = amount ? { amount } : {};
    const response = await api.post(`/students/enrollments/${id}/register_payment/`, payload);
    return response.data;
  },
  sendStudentPaymentReminder: async (id: number) => {
    const response = await api.post(`/students/enrollments/${id}/send_payment_reminder/`);
    return response.data;
  },
  deleteEnrollment: async (id: number) => {
    const response = await api.delete(`/students/enrollments/${id}/`);
    return response.data;
  },

  // Tickets / Zones
  getZonesByEvent: async (eventId: number) => {
    const response = await api.get(`/tickets/zones/by_event/?event_id=${eventId}`);
    return response.data;
  },
  createZone: async (data: { event: number; zone_type: string; price: string; price_abono?: string | null; rows: number; seats_per_row: number }) => {
    const response = await api.post('/tickets/zones/', data);
    return response.data;
  },
  deleteZone: async (id: number) => {
    const response = await api.delete(`/tickets/zones/${id}/`);
    return response.data;
  },
  updateZone: async (id: number, data: any) => {
    const response = await api.patch(`/tickets/zones/${id}/`, data);
    return response.data;
  },
  updateSeat: async (id: number, data: { is_available: boolean }) => {
    const response = await api.patch(`/tickets/seats/${id}/`, data);
    return response.data;
  },
  generateCourtesyTicket: async (data: { 
    event_id: number, 
    seat_ids?: number[], 
    quantity_general?: number, 
    email: string, 
    name?: string,
    is_courtesy?: boolean,
    payment_method?: string
  }) => {
    const res = await api.post('/payments/courtesy-ticket/', data);
    return res.data;
  },

  // Premium Videos & Plans
  getSubscriptionPlans: async () => {
    const response = await api.get('/premium/plans/');
    return response.data;
  },
  updateSubscriptionPlan: async (id: number, data: any) => {
    const response = await api.patch(`/premium/plans/${id}/`, data);
    return response.data;
  },
  getPremiumVideos: async () => {
    const response = await api.get('/premium/videos/');
    return response.data;
  },
  createPremiumVideo: async (data: any) => {
    const response = await api.post('/premium/videos/', data);
    return response.data;
  },
  updatePremiumVideo: async (id: number, data: any) => {
    const response = await api.patch(`/premium/videos/${id}/`, data);
    return response.data;
  },
  deletePremiumVideo: async (id: number) => {
    const response = await api.delete(`/premium/videos/${id}/`);
    return response.data;
  },
  
  // System Configurations
  getSettings: async () => {
    const response = await api.get(`/settings/?t=${new Date().getTime()}`);
    return response.data;
  },
  updateSettings: async (data: any) => {
    const response = await api.put('/settings/', data);
    return response.data;
  },
}
