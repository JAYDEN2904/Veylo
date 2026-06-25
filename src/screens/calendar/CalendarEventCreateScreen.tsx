import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, Button, Input, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { format } from 'date-fns';

const OCCASIONS = [
  'Work',
  'Casual',
  'Date Night',
  'Formal',
  'Weekend',
  'Travel',
  'Exercise',
  'Special Event',
];

export const CalendarEventCreateScreen = ({ navigation, route }: any) => {
  const { currentTheme } = useThemeStore();
  const { addEvent, createRecurringEvent } = useCalendarStore();
  const { outfits } = useOutfitStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occasion, setOccasion] = useState('');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | undefined>(
    route.params?.outfitId
  );
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<
    'weekly' | 'biweekly' | 'monthly' | null
  >(null);

  const handleSave = () => {
    if (!selectedOutfitId && !occasion) return;

    const baseEvent = {
      date: selectedDate.toISOString(),
      outfitId: selectedOutfitId,
      occasion: occasion || undefined,
      notes: notes || undefined,
    };

    if (isRecurring && recurringPattern) {
      const endDate = computeRecurringEndDate(selectedDate, recurringPattern);
      createRecurringEvent(baseEvent, recurringPattern, endDate.toISOString());
    } else {
      addEvent({
        ...baseEvent,
        isRecurring: false,
      });
    }
    navigation.goBack();
  };

  return (
    <Screen className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}>
        {/* Header */}
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-3xl text-primary">
            Plan Outfit
          </Typography>
        </StyledView>

        {/* Date Selection */}
        <Card className="p-4 mb-4">
          <Typography className="text-sm font-semibold text-gray-500 mb-3">DATE</Typography>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderRadius: 12,
              backgroundColor: currentTheme.colors.background,
            }}
          >
            <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="calendar"
                size={20}
                color={currentTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <Typography className="text-primary font-semibold">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </Typography>
            </StyledView>
            <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={{ marginTop: 12 }}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <Button
                  title="Done"
                  onPress={() => setShowDatePicker(false)}
                  variant="outline"
                  className="mt-4"
                />
              )}
            </View>
          )}
        </Card>

        {/* Occasion Selection */}
        <Card className="p-4 mb-4">
          <Typography className="text-sm font-semibold text-gray-500 mb-3">OCCASION</Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ}
                onPress={() => setOccasion(occ === occasion ? '' : occ)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    occasion === occ ? currentTheme.colors.primary : currentTheme.colors.background,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor:
                    occasion === occ ? currentTheme.colors.primary : currentTheme.colors.border,
                }}
              >
                <Typography
                  style={{
                    color: occasion === occ ? '#FFF' : currentTheme.colors.text,
                    fontWeight: occasion === occ ? '600' : '400',
                  }}
                >
                  {occ}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* Outfit Selection */}
        <Card className="p-4 mb-4">
          <Typography className="text-sm font-semibold text-gray-500 mb-3">OUTFIT</Typography>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CalendarOutfitSelect', {
                onSelect: (outfitId: string) => setSelectedOutfitId(outfitId),
              })
            }
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: currentTheme.colors.background,
              borderWidth: 1,
              borderColor: currentTheme.colors.border,
              borderStyle: selectedOutfitId ? 'solid' : 'dashed',
            }}
          >
            {selectedOutfitId ? (
              <StyledView
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography className="text-primary font-semibold">Outfit Selected</Typography>
                <TouchableOpacity onPress={() => setSelectedOutfitId(undefined)}>
                  <Ionicons name="close-circle" size={20} color={currentTheme.colors.error} />
                </TouchableOpacity>
              </StyledView>
            ) : (
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="shirt-outline"
                  size={20}
                  color={currentTheme.colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <Typography className="text-gray-500">Select an outfit</Typography>
              </StyledView>
            )}
          </TouchableOpacity>
        </Card>

        {/* Notes */}
        <Card className="p-4 mb-4">
          <Typography className="text-sm font-semibold text-gray-500 mb-3">NOTES</Typography>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes or reminders..."
            multiline
            numberOfLines={4}
            className="bg-background"
          />
        </Card>

        {/* Recurring */}
        <Card className="p-4 mb-6">
          <TouchableOpacity
            onPress={() => setIsRecurring(!isRecurring)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isRecurring ? 16 : 0,
            }}
          >
            <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="repeat"
                size={20}
                color={currentTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <Typography className="text-primary font-semibold">Make Recurring</Typography>
            </StyledView>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isRecurring
                  ? currentTheme.colors.primary
                  : currentTheme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isRecurring && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>

          {isRecurring && (
            <StyledView style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {(['weekly', 'biweekly', 'monthly'] as const).map((pattern) => (
                <TouchableOpacity
                  key={pattern}
                  onPress={() => setRecurringPattern(pattern === recurringPattern ? null : pattern)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      recurringPattern === pattern
                        ? currentTheme.colors.primary
                        : currentTheme.colors.background,
                    borderWidth: 1,
                    borderColor:
                      recurringPattern === pattern
                        ? currentTheme.colors.primary
                        : currentTheme.colors.border,
                  }}
                >
                  <Typography
                    style={{
                      textAlign: 'center',
                      color: recurringPattern === pattern ? '#FFF' : currentTheme.colors.text,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {pattern}
                  </Typography>
                </TouchableOpacity>
              ))}
            </StyledView>
          )}
        </Card>

        {/* Save Button */}
        <Button
          title="Save Event"
          onPress={handleSave}
          className="w-full"
          disabled={!occasion && !selectedOutfitId}
        />
      </ScrollView>
    </Screen>
  );
};

function computeRecurringEndDate(start: Date, pattern: 'weekly' | 'biweekly' | 'monthly'): Date {
  const end = new Date(start);
  switch (pattern) {
    case 'weekly':
    case 'biweekly':
      end.setMonth(end.getMonth() + 3);
      return end;
    case 'monthly':
      end.setMonth(end.getMonth() + 12);
      return end;
  }
}
