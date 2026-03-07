'use client';
import Link from 'next/link';

// Иконки больше не нужны

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    // 1. Отступы между элементами сделаны минимальными (gap-1)
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            // 2. Убран semibold, теперь просто контрастный цвет
            <span className="text-foreground">{item.label}</span>
          )}

          {/* 3. Иконка убрана, вместо нее — простой текстовый слэш в качестве разделителя */}
          {i < items.length - 1 && <span className="mx-1">/</span>}
        </div>
      ))}
    </nav>
  );
}
