import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 48) / 7;

export const CalendarHomeScreen = ({ navigation }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { calendar, getEventsForDate } = useCalendarStore();
  const { outfits } = useOutfitStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart);

  // Create calendar grid (fill with empty days at start if needed)
  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  daysInMonth.forEach((day) => calendarDays.push(day));

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <StyledView style={{ padding: 24, paddingTop: 60 }}>
          <StyledView
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <Typography variant="header" className="text-4xl text-primary">
              Calendar
            </Typography>
            <TouchableOpacity
              onPress={() => navigation.navigate('CalendarEventCreate')}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="add" size={24} color={theme.colors.secondary} />
            </TouchableOpacity>
          </StyledView>

          {/* Month Navigation */}
          <Card className="p-4 mb-6">
            <StyledView
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <TouchableOpacity onPress={goToPreviousMonth} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Typography variant="header" className="text-2xl text-primary">
                {format(currentDate, 'MMMM yyyy')}
              </Typography>
              <TouchableOpacity onPress={goToNextMonth} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </StyledView>
          </Card>

          {/* Calendar Grid */}
          <Card className="p-4 mb-6">
            {/* Day Names */}
            <StyledView style={{ flexDirection: 'row', marginBottom: 8 }}>
              {dayNames.map((day, index) => (
                <View
                  key={index}
                  style={{
                    width: DAY_WIDTH,
                    alignItems: 'center',
                    paddingVertical: 8,
                  }}
                >
                  <Typography className="text-xs font-semibold text-gray-500">{day}</Typography>
                </View>
              ))}
            </StyledView>

            {/* Calendar Days */}
            <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <View key={`empty-${index}`} style={{ width: DAY_WIDTH, height: DAY_WIDTH }} />
                  );
                }

                const dayEvents = getEventsForDate(day.toISOString());
                const isToday = isSameDay(day, new Date());
                const hasEvents = dayEvents.length > 0;

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    onPress={() => navigation.navigate('CalendarDay', { date: day.toISOString() })}
                    style={{
                      width: DAY_WIDTH,
                      height: DAY_WIDTH,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      marginBottom: 4,
                      backgroundColor: isToday ? theme.colors.secondary + '20' : 'transparent',
                      borderWidth: isToday ? 2 : 0,
                      borderColor: theme.colors.secondary,
                    }}
                  >
                    <Typography
                      className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-gray-700'}`}
                    >
                      {format(day, 'd')}
                    </Typography>
                    {hasEvents && (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.colors.accent,
                          marginTop: 2,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </StyledView>
          </Card>

          {/* Upcoming Events */}
          <StyledView style={{ marginBottom: 24 }}>
            <StyledView
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Typography variant="header" className="text-xl text-primary">
                Upcoming Events
              </Typography>
              <TouchableOpacity onPress={() => navigation.navigate('CalendarHistory')}>
                <Typography className="text-sm text-accent font-semibold">View All</Typography>
              </TouchableOpacity>
            </StyledView>

            {calendar.events.length === 0 ? (
              <Card className="p-6">
                <StyledView style={{ alignItems: 'center' }}>
                  <Ionicons
                    name="calendar-outline"
                    size={48}
                    color={theme.colors.textSecondary}
                    style={{ opacity: 0.5, marginBottom: 12 }}
                  />
                  <Typography className="text-gray-500 text-center mb-4">
                    No upcoming events
                  </Typography>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CalendarEventCreate')}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary,
                    }}
                  >
                    <Typography className="text-white font-semibold">
                      Plan Your First Outfit
                    </Typography>
                  </TouchableOpacity>
                </StyledView>
              </Card>
            ) : (
              calendar.events.slice(0, 5).map((event) => (
                <Card
                  key={event.id}
                  className="p-4 mb-3"
                  onPress={() => navigation.navigate('CalendarEventDetail', { eventId: event.id })}
                >
                  <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: theme.colors.accent + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="calendar" size={24} color={theme.colors.accent} />
                    </View>
                    <StyledView style={{ flex: 1 }}>
                      <Typography className="text-primary font-semibold mb-1">
                        {format(new Date(event.date), 'EEE, MMM d')}
                      </Typography>
                      <Typography className="text-gray-500 text-sm">
                        {event.occasion || 'No occasion set'}
                      </Typography>
                    </StyledView>
                    {event.outfitId && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                    )}
                  </StyledView>
                </Card>
              ))
            )}
          </StyledView>

          {/* Quick Actions */}
          <StyledView style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CalendarHistory')}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="time"
                size={24}
                color={theme.colors.secondary}
                style={{ marginBottom: 8 }}
              />
              <Typography className="text-sm font-semibold text-primary">History</Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('CalendarRecurring')}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="repeat"
                size={24}
                color={theme.colors.accent}
                style={{ marginBottom: 8 }}
              />
              <Typography className="text-sm font-semibold text-primary">Recurring</Typography>
            </TouchableOpacity>
          </StyledView>
        </StyledView>
      </ScrollView>
    </Screen>
  );
};
