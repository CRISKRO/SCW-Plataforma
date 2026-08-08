import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/api';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  size?: string;
  seat_id?: number;
  event_id?: number;
  valid_for_day?: string;
  raffle_ticket_id?: number;
  requires_shipping?: boolean;
  session_id?: string;
}

export interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: number, size?: string) => void;
  updateQuantity: (id: number, quantity: number, size?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  getDiscountAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      addItem: (newItem) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === newItem.id && item.size === newItem.size && item.valid_for_day === newItem.valid_for_day
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === newItem.id && item.size === newItem.size && item.valid_for_day === newItem.valid_for_day
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              ),
            };
          }

          return { items: [...state.items, newItem] };
        });
      },
      removeItem: (id, size) => {
        const itemToRemove = get().items.find((item) => item.id === id && item.size === size);
        if (itemToRemove?.seat_id && itemToRemove?.session_id) {
          api.post('/tickets/seats/unlock_seats/', {
            seat_ids: [itemToRemove.seat_id],
            session_id: itemToRemove.session_id
          }).catch(err => console.error("Failed to unlock seat:", err));
        }

        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.size === size)
          ),
        }));
      },
      updateQuantity: (id, quantity, size) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.size === size
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        }));
      },
      clearCart: () => {
        const itemsToUnlock = get().items.filter(item => item.seat_id && item.session_id);
        
        if (itemsToUnlock.length > 0) {
          // Agrupar por session_id si hubiera varios, aunque normalmente es uno solo
          const sessionMap = new Map<string, number[]>();
          itemsToUnlock.forEach(item => {
            if (!sessionMap.has(item.session_id!)) sessionMap.set(item.session_id!, []);
            sessionMap.get(item.session_id!)!.push(item.seat_id!);
          });
          
          sessionMap.forEach((seatIds, sessionId) => {
            api.post('/tickets/seats/unlock_seats/', {
              seat_ids: seatIds,
              session_id: sessionId
            }).catch(err => console.error("Failed to unlock seats on clearCart:", err));
          });
        }
        
        set({ items: [], appliedCoupon: null });
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + Number(item.price) * item.quantity,
          0
        );
      },
      applyCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },
      removeCoupon: () => {
        set({ appliedCoupon: null });
      },
      getDiscountAmount: () => {
        const coupon = get().appliedCoupon;
        if (!coupon) return 0;
        const subtotal = get().getTotalPrice();
        if (coupon.discount_type === 'PERCENTAGE') {
          return Math.min((subtotal * coupon.discount_value) / 100, subtotal);
        }
        return Math.min(coupon.discount_value, subtotal);
      },
    }),
    {
      name: 'arena-cart-storage',
    }
  )
);
