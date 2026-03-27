'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="py-12 mt-20 text-white"
      style={{ 
        backgroundColor: 'oklch(0.2 0.003 240)'
      }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Для клиентов */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">
              Для клиентов
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/auth/login" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Войти в аккаунт
                </Link>
              </li>
              <li>
                <Link 
                  href="/auth/register" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Зарегистрироваться
                </Link>
              </li>
              <li>
                <Link 
                  href="/my-bookings" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Мои брони
                </Link>
              </li>
              <li>
                <Link 
                  href="/" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Найти ресторан
                </Link>
              </li>
            </ul>
          </div>

          {/* Для партнёров */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">
              Для партнёров
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/partner/login" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Войти в личный кабинет
                </Link>
              </li>
            </ul>
          </div>

          {/* Компания */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">
              Компания
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-400 transition hover:text-white"
                >
                  О нас
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Блог
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className="text-gray-400 transition hover:text-white"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-gray-400 transition hover:text-white"
                >
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">
              Контакты
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:support@orynbar.com" 
                  className="text-gray-400 transition hover:text-white"
                >
                  support@orynbar.com
                </a>
              </li>
              <li className="pt-2">
                <p className="text-sm mb-2 text-gray-500">
                  Следите за нами:
                </p>
                <div className="flex gap-4 text-sm">
                  <a 
                    href="#" 
                    className="text-gray-400 transition hover:text-white"
                  >
                    Facebook
                  </a>
                  <a 
                    href="#" 
                    className="text-gray-400 transition hover:text-white"
                  >
                    Instagram
                  </a>
                  <a 
                    href="#" 
                    className="text-gray-400 transition hover:text-white"
                  >
                    LinkedIn
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 border-t border-white/10" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500">
            © {currentYear} Orynbar. Все права защищены.
          </p>
          <div className="flex gap-6 text-sm">
            <Link 
              href="/privacy" 
              className="text-gray-500 transition hover:text-white"
            >
              Политика конфиденциальности
            </Link>
            <Link 
              href="/cookies" 
              className="text-gray-500 transition hover:text-white"
            >
              Файлы cookie
            </Link>
            <Link 
              href="/accessibility" 
              className="text-gray-500 transition hover:text-white"
            >
              Доступность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
