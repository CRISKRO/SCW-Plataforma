import api from './api';

export const galleryService = {
  getImages: async () => {
    const response = await api.get('/gallery/images/');
    return response.data;
  },

  createImage: async (formData: FormData) => {
    const response = await api.post('/gallery/images/', formData);
    return response.data;
  },

  updateImage: async (id: number, formData: FormData) => {
    const response = await api.patch(`/gallery/images/${id}/`, formData);
    return response.data;
  },

  deleteImage: async (id: number) => {
    const response = await api.delete(`/gallery/images/${id}/`);
    return response.data;
  }
};
