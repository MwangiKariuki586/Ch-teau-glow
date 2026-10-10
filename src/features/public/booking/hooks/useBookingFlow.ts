"use client";

import { useState, useCallback } from 'react';

export interface Service {
  id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
}

export interface Specialist {
  id: string;
  name: string;
  title: string;
  branch_id: string;
  image_url: string | null;
}

export interface BookingFlowState {
  selectedService?: Service;
  availableBranches?: Branch[];
  selectedBranch?: Branch;
  availableSpecialists?: Specialist[];
  selectedSpecialist?: Specialist;
  currentStep: number;
  isLoading: boolean;
  error?: string;
}

export interface BookingFlowActions {
  setSelectedService: (service: Service) => void;
  setAvailableBranches: (branches: Branch[]) => void;
  setSelectedBranch: (branch: Branch) => void;
  setAvailableSpecialists: (specialists: Specialist[]) => void;
  setSelectedSpecialist: (specialist: Specialist) => void;
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  reset: () => void;
}

const initialState: BookingFlowState = {
  currentStep: 1,
  isLoading: false,
};

export function useBookingFlow(): BookingFlowState & BookingFlowActions {
  const [state, setState] = useState<BookingFlowState>(initialState);

  const setSelectedService = useCallback((service: Service) => {
    setState(prev => ({
      ...prev,
      selectedService: service,
      availableBranches: undefined,
      selectedBranch: undefined,
      availableSpecialists: undefined,
      selectedSpecialist: undefined,
      currentStep: 1,
      error: undefined,
    }));
  }, []);

  const setAvailableBranches = useCallback((branches: Branch[]) => {
    setState(prev => ({
      ...prev,
      availableBranches: branches,
      selectedBranch: prev.selectedBranch
        ? branches.find((branch) => branch.id === prev.selectedBranch?.id) ?? undefined
        : undefined,
      availableSpecialists:
        prev.selectedBranch &&
        branches.some((branch) => branch.id === prev.selectedBranch?.id)
          ? prev.availableSpecialists
          : undefined,
      selectedSpecialist:
        prev.selectedBranch &&
        branches.some((branch) => branch.id === prev.selectedBranch?.id)
          ? prev.selectedSpecialist
          : undefined,
    }));
  }, []);

  const setSelectedBranch = useCallback((branch: Branch) => {
    setState(prev => ({
      ...prev,
      selectedBranch: branch,
      availableSpecialists: undefined,
      selectedSpecialist: undefined,
    }));
  }, []);

  const setAvailableSpecialists = useCallback((specialists: Specialist[]) => {
    setState(prev => ({
      ...prev,
      availableSpecialists: specialists,
      selectedSpecialist: prev.selectedSpecialist
        ? specialists.find((specialist) => specialist.id === prev.selectedSpecialist?.id) ?? undefined
        : undefined,
    }));
  }, []);

  const setSelectedSpecialist = useCallback((specialist: Specialist) => {
    setState(prev => ({
      ...prev,
      selectedSpecialist: specialist,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(4, prev.currentStep + 1),
      error: undefined,
    }));
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      error: undefined,
    }));
  }, []);

  const setStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(1, Math.min(4, step)),
      error: undefined,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const setError = useCallback((error?: string) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setSelectedService,
    setAvailableBranches,
    setSelectedBranch,
    setAvailableSpecialists,
    setSelectedSpecialist,
    nextStep,
    previousStep,
    setStep,
    setLoading,
    setError,
    reset,
  };
}
