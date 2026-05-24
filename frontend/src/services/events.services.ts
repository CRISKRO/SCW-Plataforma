import api from './api';

export const eventsService = {
  getEvents: async () => {
    const response = await api.get('/events/events/');
    return response.data;
  },

  getFighters: async () => {
    const response = await api.get('/events/fighters/');
    return response.data;
  },

  getEventDetails: async (id: number) => {
    const response = await api.get(`/events/events/${id}/`);
    return response.data;
  },

  createEvent: async (data: any) => {
    const response = await api.post('/events/events/', data);
    return response.data;
  },

  updateEvent: async (id: number, data: any) => {
    const response = await api.patch(`/events/events/${id}/`, data);
    return response.data;
  },

  deleteEvent: async (id: number) => {
    const response = await api.delete(`/events/events/${id}/`);
    return response.data;
  },

  getFighterDetails: async (id: number) => {
    const response = await api.get(`/events/fighters/${id}/`);
    return response.data;
  },

  createFighter: async (data: any) => {
    const response = await api.post('/events/fighters/', data);
    return response.data;
  },

  updateFighter: async (id: number, data: any) => {
    const response = await api.patch(`/events/fighters/${id}/`, data);
    return response.data;
  },

  deleteFighter: async (id: number) => {
    const response = await api.delete(`/events/fighters/${id}/`);
    return response.data;
  }
};
