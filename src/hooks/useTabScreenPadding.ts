import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabScreenContentPaddingBottom } from '../constants/layout';

/**
 * Content container padding for screens that use FlatList/ScrollView behind the floating tab bar.
 */
export function useTabScreenPadding() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + 12,
    paddingBottom: getTabScreenContentPaddingBottom(insets.bottom),
    paddingHorizontal: 24,
  };
}
