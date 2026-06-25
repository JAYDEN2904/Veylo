import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { Screen, Typography, Card, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useOutfitStore } from '../../store/useOutfitStore';

export const CalendarOutfitSelectScreen = ({ navigation, route }: any) => {
  const { onSelect } = route.params;
  const { outfits } = useOutfitStore();

  const handleSelect = (outfitId: string) => {
    onSelect(outfitId);
    navigation.goBack();
  };

  return (
    <Screen className="bg-background">
      <FlatList
        data={outfits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
        ListHeaderComponent={() => (
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Typography variant="header" className="text-3xl text-primary">
              Select Outfit
            </Typography>
          </StyledView>
        )}
        renderItem={({ item }) => (
          <Card className="p-4 mb-3" onPress={() => handleSelect(item.id)}>
            <Typography className="text-primary font-semibold mb-1">
              {item.occasion || 'Outfit'}
            </Typography>
            <Typography className="text-gray-500 text-sm">
              {item.items?.length || 0} pieces
            </Typography>
          </Card>
        )}
        ListEmptyComponent={() => (
          <Card className="p-6">
            <StyledView style={{ alignItems: 'center' }}>
              <Ionicons
                name="shirt-outline"
                size={48}
                color={theme.colors.textSecondary}
                style={{ opacity: 0.5, marginBottom: 12 }}
              />
              <Typography className="text-gray-500 text-center">No outfits available</Typography>
            </StyledView>
          </Card>
        )}
      />
    </Screen>
  );
};
