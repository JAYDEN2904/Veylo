jest.mock('../../supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabase: jest.fn(() => null),
}));

jest.mock('./embeddingService', () => ({
  scheduleItemEmbedding: jest.fn(),
}));

import { item } from '../testFixtures';
import {
  onClientItemUpdated,
  onClothingItemCreated,
  onClothingRowCreated,
} from './embeddingLifecycle';
import { scheduleItemEmbedding } from './embeddingService';

const scheduleMock = scheduleItemEmbedding as jest.MockedFunction<typeof scheduleItemEmbedding>;

describe('embedding mutation hooks', () => {
  beforeEach(() => {
    scheduleMock.mockReset();
  });

  it('schedules generation for a new tagged item', () => {
    onClothingItemCreated(item({ id: 't1', category: 'Tops', colors: ['White'] }));
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('does not schedule generation for a scan placeholder', () => {
    onClothingItemCreated(
      item({ id: 't1', category: 'unknown', tags: [], colors: [], subCategory: undefined })
    );
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('schedules after a clothing row is created with attributes', () => {
    onClothingRowCreated({
      id: 't1',
      category: 'Tops',
      sub_category: 't-shirt',
      colors: ['White'],
      tags: ['casual'],
      material: 'cotton',
      pattern: 'solid',
      season: ['summer'],
      gender_affinity: 'unisex',
      occasion_tags: ['casual'],
      image_path: 'u1/a.jpg',
    });
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('does not schedule when only notes change', () => {
    const previous = item({ id: 't1', notes: 'old', brand: 'A' });
    onClientItemUpdated(previous, { ...previous, notes: 'new', brand: 'B' });
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('schedules when a colour used by embeddings changes', () => {
    const previous = item({ id: 't1', colors: ['White'] });
    onClientItemUpdated(previous, { ...previous, colors: ['Navy'] });
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('does not throw when generation scheduling fails', () => {
    scheduleMock.mockImplementation(() => {
      throw new Error('provider down');
    });
    expect(() =>
      onClothingItemCreated(item({ id: 't1', category: 'Tops', colors: ['White'] }))
    ).not.toThrow();
  });
});
