import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

export const useCurrentCustomerStore = create<CurrentCustomerState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'current-customer-storage',
      partialize: (state) => ({
        currentCustomer: state.currentCustomer,
      }),
    }
  )
);
