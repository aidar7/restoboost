'use client';

import Link from 'next/link';
import { Mail, Phone, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Для клиентов */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">👤 Для клиентов</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/auth/login" className="hover:text-orange-500 transition">
                  Войти в аккаунт
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-orange-500 transition">
                  Зарегистрироваться
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="hover:text-orange-500 transition">
                  Мои брони
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-orange-500 transition">
                  Найти ресторан
                </Link>
              </li>
            </ul>
          </div>

          {/* Для партнёров */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">🏢 Для партнёров</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/partner/login" className="hover:text-green-500 transition">
                  Войти в личный кабинет
                </Link>
              </li>
              <li>
                <Link href="/partner/register" className="hover:text-green-500 transition">
                  Зарегистрировать ресторан
                </Link>
              </li>
              <li>
                <Link href="/partner/dashboard" className="hover:text-green-500 transition">
                  Дашборд партнёра
                </Link>
              </li>
              <li>
                <a href="mailto:partners@orynbar.com" className="hover:text-green-500 transition">
                  Связаться с нами
                </a>
              </li>
            </ul>
          </div>

          {/* Компания */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">ℹ️ Компания</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-blue-500 transition">
                  О нас
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-blue-500 transition">
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-blue-500 transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-500 transition">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">📞 Контакты</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Mail size={18} className="text-orange-500" />
                <a href="mailto:support@orynbar.com" className="hover:text-orange-500 transition">
                  support@orynbar.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-orange-500" />
                <a href="tel:+77001234567" className="hover:text-orange-500 transition">
                  +7 (700) 123-45-67
                </a>
              </li>
              
              {/* Social Media */}
              <li className="pt-2">
                <p className="text-sm text-gray-400 mb-2">Следите за нами:</p>
                <div className="flex gap-3">
                  <a href="#" className="hover:text-orange-500 transition">
                    <Facebook size={20} />
                  </a>
                  <a href="#" className="hover:text-orange-500 transition">
                    <Instagram size={20} />
                  </a>
                  <a href="#" className="hover:text-orange-500 transition">
                    <Linkedin size={20} />
                  </a>
                  <a href="#" className="hover:text-orange-500 transition">
                    <Twitter size={20} />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400 mb-4 md:mb-0">
            © {currentYear} Orynbar. Все права защищены.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-orange-500 transition">
              Политика конфиденциальности
            </Link>
            <Link href="/cookies" className="hover:text-orange-500 transition">
              Файлы cookie
            </Link>
            <Link href="/accessibility" className="hover:text-orange-500 transition">
              Доступность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}