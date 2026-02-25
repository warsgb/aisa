import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Customer, CustomerProfile } from '../types';

interface CurrentCustomerState {
  // State
  currentCustomer: Customer | null;
  customerProfile: CustomerProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentCustomer: (customer: Customer | null) => void;
  setCustomerProfile: (profile: CustomerProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCustomer: () => void;
  clearPersistentStorage: () => void;
}

export const useCurrentCustomerStore = create<CurrentCustomerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentCustomer: null,
      customerProfile: null,
      isLoading: false,
      error: null,

      // Actions
      setCurrentCustomer: (customer) =>
        set({
          currentCustomer: customer,
          customerProfile: null, // Reset profile when customer changes
          error: null,
        }),

      setCustomerProfile: (profile) =>
        set({
          customerProfile: profile,
        }),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      setError: (error) =>
        set({
          error,
        }),

      clearCustomer: () =>
        set({
          currentCustomer: null,
          customerProfile: null,
          error: null,
        }),

      clearPersistentStorage: () => {
        // Clear the state
        set({
          currentCustomer: null,
          customerProfile: null,
          error: null,
        });
        // Clear the localStorage directly
        localStorage.removeItem('current-customer-storage');
      },
    }),
    {
      name: 'current-customer-storage',
      partialize: (state) => ({
        currentCustomer: state.currentCustomer,
      }),
    }
  )
);
