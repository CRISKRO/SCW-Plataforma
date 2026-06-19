import api from './api';

export interface RaffleTicket {
  id: number;
  number: number;
  status: 'AVAILABLE' | 'SOLD_ONLINE' | 'SOLD_OFFLINE';
  buyer_name?: string;
}

export interface Raffle {
  id: number;
  title: string;
  description: string;
  image?: string | null;
  price: string;
  total_tickets: number;
  is_active: boolean;
  created_at?: string;
  tickets?: RaffleTicket[];
}

export const getRaffles = async () => {
  const response = await api.get('/raffles/');
  return response.data;
};

export const getRaffle = async (id: number) => {
  const response = await api.get(`/raffles/${id}/`);
  return response.data;
};

export const createRaffle = async (data: FormData | Partial<Raffle>) => {
  const response = await api.post('/raffles/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const updateRaffle = async (id: number, data: FormData | Partial<Raffle>) => {
  const response = await api.patch(`/raffles/${id}/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const deleteRaffle = async (id: number) => {
  const response = await api.delete(`/raffles/${id}/`);
  return response.data;
};

export const toggleTicketStatus = async (raffleId: number, ticketId: number, status: string, buyerName: string = '') => {
  const response = await api.post(`/raffles/${raffleId}/toggle_ticket/`, {
    ticket_id: ticketId,
    status,
    buyer_name: buyerName,
  });
  return response.data;
};
