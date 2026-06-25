import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OutfitEvent, OutfitCalendar } from '../types';
import { asyncJsonStorage } from '../lib/zustandStorage';

interface CalendarState {
  calendar: OutfitCalendar;
  isLoading: boolean;

  // Actions
  addEvent: (event: Omit<OutfitEvent, 'id'>) => void;
  updateEvent: (eventId: string, updates: Partial<OutfitEvent>) => void;
  deleteEvent: (eventId: string) => void;
  getEventsForDate: (date: string) => OutfitEvent[];
  getEventsForDateRange: (startDate: string, endDate: string) => OutfitEvent[];
  addOutfitToHistory: (event: OutfitEvent) => void;
  getOutfitHistory: (startDate?: string, endDate?: string) => OutfitEvent[];
  createRecurringEvent: (
    event: Omit<OutfitEvent, 'id'>,
    pattern: 'weekly' | 'biweekly' | 'monthly',
    endDate: string
  ) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      calendar: {
        events: [],
        outfitHistory: [],
      },
      isLoading: false,

      addEvent: (eventData) => {
        const { calendar } = get();
        const newEvent: OutfitEvent = {
          ...eventData,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        set({
          calendar: {
            ...calendar,
            events: [...calendar.events, newEvent].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
          },
        });
      },

      updateEvent: (eventId, updates) => {
        const { calendar } = get();
        set({
          calendar: {
            ...calendar,
            events: calendar.events.map((event) =>
              event.id === eventId ? { ...event, ...updates } : event
            ),
          },
        });
      },

      deleteEvent: (eventId) => {
        const { calendar } = get();
        set({
          calendar: {
            ...calendar,
            events: calendar.events.filter((event) => event.id !== eventId),
          },
        });
      },

      getEventsForDate: (date) => {
        const { calendar } = get();
        const targetDate = new Date(date).toDateString();

        return calendar.events.filter((event) => {
          const eventDate = new Date(event.date).toDateString();
          return eventDate === targetDate;
        });
      },

      getEventsForDateRange: (startDate, endDate) => {
        const { calendar } = get();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return calendar.events.filter((event) => {
          const eventTime = new Date(event.date).getTime();
          return eventTime >= start && eventTime <= end;
        });
      },

      addOutfitToHistory: (event) => {
        const { calendar } = get();

        // Add to history and remove from future events if it exists
        const historyEvent: OutfitEvent = {
          ...event,
          id: event.id || `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        set({
          calendar: {
            events: calendar.events.filter((e) => e.id !== event.id),
            outfitHistory: [...calendar.outfitHistory, historyEvent].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
          },
        });
      },

      getOutfitHistory: (startDate, endDate) => {
        const { calendar } = get();
        let history = calendar.outfitHistory;

        if (startDate || endDate) {
          const start = startDate ? new Date(startDate).getTime() : 0;
          const end = endDate ? new Date(endDate).getTime() : Date.now();

          history = history.filter((event) => {
            const eventTime = new Date(event.date).getTime();
            return eventTime >= start && eventTime <= end;
          });
        }

        return history;
      },

      createRecurringEvent: (eventData, pattern, endDate) => {
        const { addEvent } = get();
        const events: Omit<OutfitEvent, 'id'>[] = [];
        const startDate = new Date(eventData.date);
        const end = new Date(endDate);
        const currentDate = new Date(startDate);

        while (currentDate <= end) {
          events.push({
            ...eventData,
            date: currentDate.toISOString(),
            isRecurring: true,
            recurringPattern: pattern,
          });

          // Increment date based on pattern
          if (pattern === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (pattern === 'biweekly') {
            currentDate.setDate(currentDate.getDate() + 14);
          } else if (pattern === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }

        // Add all events
        events.forEach((event) => {
          addEvent(event);
        });
      },
    }),
    {
      name: 'veylo-calendar-v1',
      version: 1,
      storage: asyncJsonStorage,
      partialize: (state) => ({ calendar: state.calendar }),
    }
  )
);
