export type BadgeType = 'new' | 'festival' | 'popular' | 'hot' | 'premium';

export interface BadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  new: {
    label: 'Новый',
    bgColor: 'bg-foreground',
    textColor: 'text-background',
  },
  festival: {
    label: 'Фестиваль',
    bgColor: 'bg-warning',
    textColor: 'text-white',
  },
  popular: {
    label: 'Популярно',
    bgColor: 'bg-success',
    textColor: 'text-white',
  },
  hot: {
    label: 'Горячее',
    bgColor: 'bg-error',
    textColor: 'text-white',
  },
  premium: {
    label: 'Премиум',
    bgColor: 'bg-primary',
    textColor: 'text-white',
  },
};

export function getBadgeConfig(type: BadgeType): BadgeConfig {
  return BADGE_CONFIGS[type];
}
