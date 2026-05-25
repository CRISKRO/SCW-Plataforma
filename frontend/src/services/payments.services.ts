import api from './api';

export const paymentService = {
  createOrder: async (data: any) => {
    const response = await api.post('/payments/create-order/', data);
    return response.data;
  },

  verifyPayment: async (data: any) => {
    const response = await api.post('/payments/verify/', data);
    return response.data;
  },

  getMyOrders: async () => {
    const response = await api.get('/payments/my-orders/');
    return response.data;
  }
};
