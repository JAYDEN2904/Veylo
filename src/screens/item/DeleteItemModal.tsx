import React from 'react';
import { Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Typography, Button, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface DeleteItemModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

export const DeleteItemModal = ({
  visible,
  onClose,
  onConfirm,
  itemName,
}: DeleteItemModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.springify().damping(15)}
              exiting={SlideOutDown.duration(200)}
              style={{
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                padding: 24,
                paddingBottom: 40,
              }}
            >
              {/* Icon */}
              <StyledView style={{ alignItems: 'center', marginBottom: 24 }}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="trash" size={40} color="#FFF" />
                </LinearGradient>
                <Typography variant="header" className="text-2xl text-primary mb-2">
                  Delete Item?
                </Typography>
                <Typography className="text-gray-500 text-center text-base leading-6">
                  {itemName
                    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
                    : 'Are you sure you want to delete this item? This action cannot be undone.'}
                </Typography>
              </StyledView>

              {/* Buttons */}
              <StyledView style={{ gap: 12 }}>
                <Button
                  title="Delete"
                  onPress={handleConfirm}
                  variant="primary"
                  className="bg-red-500"
                />
                <Button title="Cancel" onPress={onClose} variant="outline" />
              </StyledView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
