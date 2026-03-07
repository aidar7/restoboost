export type BadgeType = 'new' | 'festival' | 'popular' | 'hot' | 'premium';

export interface BadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  new: {
    label: 'Новый',
    bgColor: 'bg-gray-600',
    textColor: 'text-white',
  },
  festival: {
    label: 'Фестиваль',
    bgColor: 'bg-orange-600',
    textColor: 'text-white',
  },
  popular: {
    label: 'Популярно',
    bgColor: 'bg-green-600',
    textColor: 'text-white',
  },
  hot: {
    label: 'Горячее',
    bgColor: 'bg-red-600',
    textColor: 'text-white',
  },
  premium: {
    label: 'Премиум',
    bgColor: 'bg-purple-600',
    textColor: 'text-white',
  },
};

export function getBadgeConfig(type: BadgeType): BadgeConfig {
  return BADGE_CONFIGS[type];
}
