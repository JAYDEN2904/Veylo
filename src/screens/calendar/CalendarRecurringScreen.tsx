import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../store/useCalendarStore';

export const CalendarRecurringScreen = ({ navigation }: any) => {
  const { calendar } = useCalendarStore();
  const recurringEvents = calendar.events.filter((e) => e.isRecurring);

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            Recurring Outfits
          </Typography>
        </StyledView>

        {recurringEvents.length === 0 ? (
          <Card className="p-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="repeat-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center mb-4">
                No recurring outfits
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
                  Create Recurring Outfit
                </Typography>
              </TouchableOpacity>
            </StyledView>
          </Card>
        ) : (
          recurringEvents.map((event) => (
            <Card
              key={event.id}
              className="p-4 mb-3"
              onPress={() => navigation.navigate('CalendarEventDetail', { eventId: event.id })}
            >
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="repeat"
                  size={24}
                  color={theme.colors.accent}
                  style={{ marginRight: 12 }}
                />
                <StyledView style={{ flex: 1 }}>
                  <Typography className="text-primary font-semibold mb-1">
                    {event.occasion || 'Recurring Outfit'}
                  </Typography>
                  <Typography className="text-gray-500 text-sm">
                    {event.recurringPattern && `Every ${event.recurringPattern}`}
                  </Typography>
                </StyledView>
              </StyledView>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};
