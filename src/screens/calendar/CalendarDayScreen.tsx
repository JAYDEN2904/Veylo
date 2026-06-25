import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../store/useCalendarStore';
import { format, parseISO } from 'date-fns';

export const CalendarDayScreen = ({ navigation, route }: any) => {
  const { date } = route.params;
  const { getEventsForDate } = useCalendarStore();
  const events = getEventsForDate(date);

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            {format(parseISO(date), 'EEEE, MMMM d')}
          </Typography>
        </StyledView>

        {events.length === 0 ? (
          <Card className="p-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center mb-4">No events planned</Typography>
              <TouchableOpacity
                onPress={() => navigation.navigate('CalendarEventCreate', { date })}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Typography className="text-white font-semibold">Plan Outfit</Typography>
              </TouchableOpacity>
            </StyledView>
          </Card>
        ) : (
          events.map((event) => (
            <Card
              key={event.id}
              className="p-4 mb-3"
              onPress={() => navigation.navigate('CalendarEventDetail', { eventId: event.id })}
            >
              <Typography className="text-primary font-semibold mb-1">
                {event.occasion || 'Outfit'}
              </Typography>
              {event.notes && (
                <Typography className="text-gray-500 text-sm">{event.notes}</Typography>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};
