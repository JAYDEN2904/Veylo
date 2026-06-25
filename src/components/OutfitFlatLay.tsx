import React from 'react';
import { Dimensions, View } from 'react-native';
import { ClothingTile } from './ClothingTile';
import type { ClothingItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OutfitFlatLayProps {
  items: ClothingItem[];
  width?: number;
  /** Visual scale; 1 = hero (default), <1 = smaller card layouts. */
  scale?: number;
}

/**
 * Hero flat-lay grid for an outfit. Renders items in a 2-column staggered
 * layout using the canonical ClothingTile so wardrobe and outfit grids
 * stay consistent.
 */
export const OutfitFlatLay: React.FC<OutfitFlatLayProps> = ({ items, width, scale = 1 }) => {
  const total = items.length;
  if (total === 0) return null;

  const containerWidth = width ?? SCREEN_WIDTH - 48;
  const gap = 12 * scale;
  const columns = total <= 2 ? total : 2;
  const tileWidth = (containerWidth - gap * (columns - 1)) / columns;
  const tileHeight = total <= 2 ? tileWidth * 1.4 : tileWidth * 1.25;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        width: containerWidth,
        gap,
      }}
    >
      {items.map((item, index) => {
        const isFirstInRow = index % columns === 0;
        return (
          <View
            key={item.id ?? index}
            style={{
              width: tileWidth,
              marginTop: !isFirstInRow && index >= columns ? gap : 0,
            }}
          >
            <ClothingTile item={item} height={tileHeight} showOverlay />
          </View>
        );
      })}
    </View>
  );
};
