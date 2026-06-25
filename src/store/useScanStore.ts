import { create } from 'zustand';
import { ScanState } from '../types';

export const useScanStore = create<ScanState>((set) => ({
  queue: [],
  isProcessing: false,
  addToQueue: (uri) =>
    set((state) => ({
      queue: [
        ...state.queue,
        {
          id: Math.random().toString(),
          localUri: uri,
          status: 'pending',
        },
      ],
    })),
  processQueue: async () => {
    set({ isProcessing: true });
    setTimeout(() => {
      set((state) => ({
        isProcessing: false,
        queue: state.queue.map((item) => ({
          ...item,
          status: 'success',
          confidence: 0.95,
          detectedTags: ['Top', 'Black'],
        })),
      }));
    }, 2000);
  },
  updateScannedItem: (id, data) =>
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, ...data } : item)),
    })),
  clearQueue: () => set({ queue: [] }),
}));
