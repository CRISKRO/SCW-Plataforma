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
  },

  getChronicles: async () => {
    const response = await api.get('/events/chronicles/');
    return response.data;
  },

  getChronicleDetails: async (id: number) => {
    const response = await api.get(`/events/chronicles/${id}/`);
    return response.data;
  },

  createChronicle: async (data: any) => {
    const response = await api.post('/events/chronicles/', data);
    return response.data;
  },

  updateChronicle: async (id: number, data: any) => {
    const response = await api.patch(`/events/chronicles/${id}/`, data);
    return response.data;
  },

  deleteChronicle: async (id: number) => {
    const response = await api.delete(`/events/chronicles/${id}/`);
    return response.data;
  },

  getSponsors: async () => {
    const response = await api.get('/events/sponsors/');
    return response.data;
  },

  getSponsorDetails: async (id: number) => {
    const response = await api.get(`/events/sponsors/${id}/`);
    return response.data;
  },

  createSponsor: async (data: any) => {
    const response = await api.post('/events/sponsors/', data);
    return response.data;
  },

  updateSponsor: async (id: number, data: any) => {
    const response = await api.patch(`/events/sponsors/${id}/`, data);
    return response.data;
  },

  deleteSponsor: async (id: number) => {
    const response = await api.delete(`/events/sponsors/${id}/`);
    return response.data;
  }
};
