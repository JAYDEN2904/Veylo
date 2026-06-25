import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, FlatList, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../store/useCalendarStore';
import { format, parseISO } from 'date-fns';

export const CalendarHistoryScreen = ({ navigation }: any) => {
  const { getOutfitHistory } = useCalendarStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  const getHistoryData = () => {
    const now = new Date();
    let startDate: string | undefined;

    if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString();
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = monthAgo.toISOString();
    }

    return getOutfitHistory(startDate);
  };

  const historyData = getHistoryData();

  const groupedHistory = historyData.reduce(
    (acc, event) => {
      const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, typeof historyData>
  );

  const sortedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <StyledView style={{ padding: 24, paddingTop: 60 }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Typography variant="header" className="text-3xl text-primary">
              Outfit History
            </Typography>
          </StyledView>

          {/* Period Filter */}
          <StyledView style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {(['week', 'month', 'all'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setSelectedPeriod(period)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor:
                    selectedPeriod === period ? theme.colors.primary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor:
                    selectedPeriod === period ? theme.colors.primary : theme.colors.border,
                  alignItems: 'center',
                }}
              >
                <Typography
                  style={{
                    color: selectedPeriod === period ? '#FFF' : theme.colors.text,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {period}
                </Typography>
              </TouchableOpacity>
            ))}
          </StyledView>

          {/* History List */}
          {sortedDates.length === 0 ? (
            <Card className="p-6">
              <StyledView style={{ alignItems: 'center' }}>
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={{ opacity: 0.5, marginBottom: 12 }}
                />
                <Typography className="text-gray-500 text-center">No outfit history yet</Typography>
              </StyledView>
            </Card>
          ) : (
            sortedDates.map((dateKey) => (
              <StyledView key={dateKey} style={{ marginBottom: 24 }}>
                <Typography className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                  {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                </Typography>
                {groupedHistory[dateKey].map((event) => (
                  <Card
                    key={event.id}
                    className="p-4 mb-3"
                    onPress={() =>
                      navigation.navigate('CalendarEventDetail', { eventId: event.id })
                    }
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
                        <Ionicons name="shirt" size={24} color={theme.colors.accent} />
                      </View>
                      <StyledView style={{ flex: 1 }}>
                        <Typography className="text-primary font-semibold mb-1">
                          {event.occasion || 'Outfit'}
                        </Typography>
                        {event.notes && (
                          <Typography className="text-gray-500 text-sm" numberOfLines={1}>
                            {event.notes}
                          </Typography>
                        )}
                      </StyledView>
                      {event.outfitId && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                      )}
                    </StyledView>
                  </Card>
                ))}
              </StyledView>
            ))
          )}
        </StyledView>
      </ScrollView>
    </Screen>
  );
};
