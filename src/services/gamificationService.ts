import { ClothingItem, Outfit } from '../types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'wardrobe' | 'outfit' | 'sustainability' | 'streak' | 'milestone';
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0-100
  target: number;
}

export interface StyleStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unlocked: boolean;
}

/**
 * Calculate style streak based on daily app usage/outfit creation
 */
export const calculateStyleStreak = (outfits: Outfit[], lastActiveDate?: string): StyleStreak => {
  // In production, this would track actual daily usage
  // For now, we'll use outfit creation dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let currentStreak = 0;
  let longestStreak = 0;
  const checkDate = new Date(today);

  // Count consecutive days with outfit activity
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasActivity = outfits.some((outfit) => {
      const outfitDate = new Date(outfit.createdAt).toISOString().split('T')[0];
      return outfitDate === dateStr;
    });

    if (hasActivity) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak, 5), // Default to 5 for demo
    lastActiveDate: lastActiveDate || today.toISOString(),
  };
};

/**
 * Get wardrobe milestones
 */
export const getWardrobeMilestones = (items: ClothingItem[], outfits: Outfit[]): Milestone[] => {
  const milestones: Milestone[] = [
    {
      id: 'milestone-1',
      name: 'Getting Started',
      description: 'Scan your first item',
      target: 1,
      current: items.length,
      unlocked: items.length >= 1,
    },
    {
      id: 'milestone-2',
      name: 'Building Collection',
      description: 'Scan 10 items',
      target: 10,
      current: items.length,
      unlocked: items.length >= 10,
    },
    {
      id: 'milestone-3',
      name: 'Wardrobe Builder',
      description: 'Scan 50 items',
      target: 50,
      current: items.length,
      unlocked: items.length >= 50,
    },
    {
      id: 'milestone-4',
      name: 'Fashion Enthusiast',
      description: 'Scan 100 items',
      target: 100,
      current: items.length,
      unlocked: items.length >= 100,
    },
    {
      id: 'milestone-5',
      name: 'First Outfit',
      description: 'Create your first outfit',
      target: 1,
      current: outfits.length,
      unlocked: outfits.length >= 1,
    },
    {
      id: 'milestone-6',
      name: 'Stylist',
      description: 'Create 10 outfits',
      target: 10,
      current: outfits.length,
      unlocked: outfits.length >= 10,
    },
    {
      id: 'milestone-7',
      name: 'Fashion Expert',
      description: 'Create 50 outfits',
      target: 50,
      current: outfits.length,
      unlocked: outfits.length >= 50,
    },
  ];

  return milestones;
};

/**
 * Get style achievements/badges
 */
export const getStyleAchievements = (
  items: ClothingItem[],
  outfits: Outfit[],
  streak: StyleStreak
): Achievement[] => {
  const achievements: Achievement[] = [];

  // Wardrobe achievements
  achievements.push({
    id: 'ach-wardrobe-10',
    name: 'Wardrobe Starter',
    description: 'Add 10 items to your wardrobe',
    icon: 'shirt',
    category: 'wardrobe',
    unlocked: items.length >= 10,
    progress: Math.min(100, (items.length / 10) * 100),
    target: 10,
  });

  achievements.push({
    id: 'ach-wardrobe-50',
    name: 'Wardrobe Master',
    description: 'Add 50 items to your wardrobe',
    icon: 'grid',
    category: 'wardrobe',
    unlocked: items.length >= 50,
    progress: Math.min(100, (items.length / 50) * 100),
    target: 50,
  });

  // Outfit achievements
  achievements.push({
    id: 'ach-outfit-10',
    name: 'Style Explorer',
    description: 'Create 10 different outfits',
    icon: 'flash',
    category: 'outfit',
    unlocked: outfits.length >= 10,
    progress: Math.min(100, (outfits.length / 10) * 100),
    target: 10,
  });

  // Streak achievements
  achievements.push({
    id: 'ach-streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day style streak',
    icon: 'flame',
    category: 'streak',
    unlocked: streak.currentStreak >= 7,
    progress: Math.min(100, (streak.currentStreak / 7) * 100),
    target: 7,
  });

  achievements.push({
    id: 'ach-streak-30',
    name: 'Style Champion',
    description: 'Maintain a 30-day style streak',
    icon: 'trophy',
    category: 'streak',
    unlocked: streak.currentStreak >= 30,
    progress: Math.min(100, (streak.currentStreak / 30) * 100),
    target: 30,
  });

  // Diversity achievement
  const uniqueCategories = new Set(items.map((item) => item.category));
  achievements.push({
    id: 'ach-diversity',
    name: 'Style Diversity',
    description: 'Have items from 5+ different categories',
    icon: 'color-palette',
    category: 'outfit',
    unlocked: uniqueCategories.size >= 5,
    progress: Math.min(100, (uniqueCategories.size / 5) * 100),
    target: 5,
  });

  // Sustainability achievement
  const reusedItems = items.filter((item) => (item.wornCount || 0) > 5);
  achievements.push({
    id: 'ach-sustainability',
    name: 'Sustainable Stylist',
    description: 'Wear items 5+ times each',
    icon: 'leaf',
    category: 'sustainability',
    unlocked: reusedItems.length >= 10,
    progress: Math.min(100, (reusedItems.length / 10) * 100),
    target: 10,
  });

  return achievements;
};

/**
 * Generate weekly style challenge
 */
export interface StyleChallenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'outfit_count' | 'category_diversity' | 'color_exploration' | 'sustainability';
  target: number;
  reward: string;
  progress: number;
  completed: boolean;
}

export const generateWeeklyChallenge = (weekStart: Date = new Date()): StyleChallenge => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const challengeTypes: StyleChallenge['type'][] = [
    'outfit_count',
    'category_diversity',
    'color_exploration',
    'sustainability',
  ];

  const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];

  const challenges: Record<StyleChallenge['type'], Omit<StyleChallenge, 'type'>> = {
    outfit_count: {
      id: 'challenge-1',
      title: 'Style Explorer',
      description: 'Create 5 new outfits this week',
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      target: 5,
      reward: '🎉 Style Explorer Badge',
      progress: 0,
      completed: false,
    },
    category_diversity: {
      id: 'challenge-2',
      title: 'Category Mixer',
      description: 'Style outfits using 4+ different categories',
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      target: 4,
      reward: '🏆 Category Master Badge',
      progress: 0,
      completed: false,
    },
    color_exploration: {
      id: 'challenge-3',
      title: 'Color Adventurer',
      description: 'Try 3 different color combinations',
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      target: 3,
      reward: '🌈 Color Expert Badge',
      progress: 0,
      completed: false,
    },
    sustainability: {
      id: 'challenge-4',
      title: 'Sustainability Champion',
      description: 'Re-wear 10 items this week',
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      target: 10,
      reward: '🌱 Eco Warrior Badge',
      progress: 0,
      completed: false,
    },
  };

  return {
    ...challenges[randomType],
    type: randomType,
  };
};
