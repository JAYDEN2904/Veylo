import { Platform, Share, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

/**
 * Share try-on result image
 */
export const shareTryOnResult = async (imageUri: string, outfitName?: string): Promise<boolean> => {
  try {
    const result = await Share.share({
      message: outfitName
        ? `Check out my outfit: ${outfitName}! Created with Veylo 👗✨`
        : 'Check out my virtual try-on result! Created with Veylo 👗✨',
      url: imageUri,
      title: 'Virtual Try-On Result',
    });

    if (result.action === Share.sharedAction) {
      return true;
    }
    return false;
  } catch (error: any) {
    Alert.alert('Error', 'Failed to share image. Please try again.');
    console.error('Share error:', error);
    return false;
  }
};

/**
 * Save image to device
 */
export const saveImageToDevice = async (imageUri: string): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permission to save images to your gallery.');
      return false;
    }

    const asset = await MediaLibrary.createAssetAsync(imageUri);
    await MediaLibrary.createAlbumAsync('Veylo Try-Ons', asset, false);
    return true;
  } catch (error: any) {
    Alert.alert('Error', 'Failed to save image. Please try again.');
    console.error('Save error:', error);
    return false;
  }
};
