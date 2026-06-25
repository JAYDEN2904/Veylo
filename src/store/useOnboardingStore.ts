import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from '../lib/zustandStorage';
import type { OnboardingQuizAnswers } from '../types';

interface OnboardingState {
  answers: Partial<OnboardingQuizAnswers>;
  setAnswer: <K extends keyof OnboardingQuizAnswers>(
    key: K,
    value: OnboardingQuizAnswers[K]
  ) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      answers: {},

      setAnswer: <K extends keyof OnboardingQuizAnswers>(
        key: K,
        value: OnboardingQuizAnswers[K]
      ) => {
        set((state) => ({
          answers: { ...state.answers, [key]: value },
        }));
      },

      reset: () => set({ answers: {} }),
    }),
    {
      name: 'veylo-onboarding-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({ answers: state.answers }),
    }
  )
);
