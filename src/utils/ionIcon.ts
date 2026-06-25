import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/** Use when assigning a string variable to `Ionicons` `name` to satisfy typings. */
export function ionIconName(name: string): IoniconsName {
  return name as IoniconsName;
}
