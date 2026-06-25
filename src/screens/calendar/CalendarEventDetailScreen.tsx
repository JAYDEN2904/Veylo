import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Typography, Card, StyledView, Button } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../store/useCalendarStore';
import { format, parseISO } from 'date-fns';

export const CalendarEventDetailScreen = ({ navigation, route }: any) => {
  const { eventId } = route.params;
  const { calendar, deleteEvent } = useCalendarStore();
  const event = [...calendar.events, ...calendar.outfitHistory].find((e) => e.id === eventId);

  if (!event) {
    return (
      <Screen className="bg-background justify-center items-center p-6">
        <Typography className="text-gray-500">Event not found</Typography>
        <Button title="Go Back" onPress={() => navigation.goBack()} className="mt-4" />
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            Event Details
          </Typography>
        </StyledView>

        <Card className="p-4 mb-4">
          <Typography className="text-sm font-semibold text-gray-500 mb-3">DATE</Typography>
          <Typography className="text-primary font-semibold text-lg">
            {format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Card>

        {event.occasion && (
          <Card className="p-4 mb-4">
            <Typography className="text-sm font-semibold text-gray-500 mb-3">OCCASION</Typography>
            <Typography className="text-primary font-semibold text-lg">{event.occasion}</Typography>
          </Card>
        )}

        {event.notes && (
          <Card className="p-4 mb-4">
            <Typography className="text-sm font-semibold text-gray-500 mb-3">NOTES</Typography>
            <Typography className="text-primary">{event.notes}</Typography>
          </Card>
        )}

        {event.outfitId && (
          <Card className="p-4 mb-4">
            <Typography className="text-sm font-semibold text-gray-500 mb-3">OUTFIT</Typography>
            <TouchableOpacity
              onPress={() => navigation.navigate('OutfitResult', { outfitId: event.outfitId })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography className="text-primary font-semibold">View Outfit</Typography>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>
        )}

        <Button
          title="Delete Event"
          onPress={() => {
            deleteEvent(eventId);
            navigation.goBack();
          }}
          variant="outline"
          className="w-full"
        />
      </ScrollView>
    </Screen>
  );
};
