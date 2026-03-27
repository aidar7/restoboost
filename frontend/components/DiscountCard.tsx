// components/DiscountCard.tsx

interface DiscountItem {
  discount: string;
  tag: string;
  title: string;
  subtitle: string;
  gradient: string;
}

// Каждая карточка — своя палитра с oklch.fyi/color-palettes
export const DISCOUNTS: DiscountItem[] = [
  {
    discount: '-50%',
    tag: 'Лучшее предложение',
    title: 'Все рестораны',
    subtitle: 'Кроме акций заведения',
    // Midnight Blue: oklch.fyi/color-palettes/midnight-blue
    gradient: 'linear-gradient(135deg, oklch(0.25 0.08 250) 0%, oklch(0.45 0.15 270) 55%, oklch(0.65 0.12 280) 100%)',
  },
  {
    discount: '-40%',
    tag: 'Популярное',
    title: 'Кофейни и кафе',
    subtitle: 'На всё меню',
    // Sunset Vibes: oklch.fyi/color-palettes/sunset-vibes
    gradient: 'linear-gradient(135deg, oklch(0.3 0.15 25) 0%, oklch(0.6 0.22 40) 55%, oklch(0.85 0.12 55) 100%)',
  },
  {
    discount: '-30%',
    tag: 'Выходные',
    title: 'Бары и пабы',
    subtitle: 'Сб–Вс с 18:00',
    // Berry Burst: oklch.fyi/color-palettes/berry-burst
    gradient: 'linear-gradient(135deg, oklch(0.4 0.18 330) 0%, oklch(0.55 0.23 345) 55%, oklch(0.75 0.15 5) 100%)',
  },
  {
    discount: '-25%',
    tag: 'Обед',
    title: 'Бизнес-ланч',
    subtitle: 'Пн–Пт с 12:00 до 15:00',
    // Forest Fresh: oklch.fyi/color-palettes/forest-fresh
    gradient: 'linear-gradient(135deg, oklch(0.3 0.1 145) 0%, oklch(0.55 0.18 160) 55%, oklch(0.75 0.12 170) 100%)',
  },
  {
    discount: '-20%',
    tag: 'Доставка',
    title: 'Еда на дом',
    subtitle: 'При заказе от 3000 ₸',
    // Ocean Breeze: oklch.fyi/color-palettes/ocean-breeze
    gradient: 'linear-gradient(135deg, oklch(0.4 0.15 220) 0%, oklch(0.65 0.15 240) 55%, oklch(0.85 0.08 250) 100%)',
  },
];

interface DiscountCardProps {
  discount: string;
  title: string;
  subtitle?: string;
  tag?: string;
  gradient: string;
}

export function DiscountCard({ discount, title, subtitle, tag, gradient }: DiscountCardProps) {
  return (
    <div
      className="flex-shrink-0 w-80 h-52 rounded-2xl p-7 text-white relative overflow-hidden flex flex-col justify-end cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]"
      style={{ background: gradient }}
    >
      {/* Фоновые акценты */}
      <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/[0.08] pointer-events-none" />
      <div className="absolute -bottom-10 left-5 w-28 h-28 rounded-full bg-white/[0.06] pointer-events-none" />
      <div
        className="absolute top-0 right-20 w-px h-full bg-white/10 pointer-events-none"
        style={{ transform: 'rotate(15deg)', transformOrigin: 'top' }}
      />

      {/* Бейдж со скидкой */}
      <div className="absolute top-5 right-5 w-16 h-16 rounded-full flex flex-col items-center justify-center bg-white/[0.18] border border-white/30 z-10">
        <span className="font-bold leading-none tracking-tight text-xl">
          {discount}
        </span>
        <span className="text-[9px] font-semibold tracking-widest uppercase opacity-85 mt-0.5">
          СКИДКА
        </span>
      </div>

      {/* Текстовый блок */}
      <div className="relative z-10">
        {tag && (
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase opacity-70 mb-1.5">
            {tag}
          </p>
        )}
        <p className="text-lg font-bold leading-snug mb-1">{title}</p>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
      </div>

      {/* Нижняя полоска */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/25 pointer-events-none" />
    </div>
  );
}

export function DiscountCardRow() {
  return (
    <div className="mb-12 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-4 min-w-max">
        {DISCOUNTS.map((item, index) => (
          <DiscountCard key={index} {...item} />
        ))}
      </div>
    </div>
  );
}