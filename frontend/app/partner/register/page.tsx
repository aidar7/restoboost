'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function PartnerRegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    restaurant_name: '',
    restaurant_address: '',
    role: 'restaurant_owner'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^(7|8)\d{10}$/;
    return phoneRegex.test(cleanPhone);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Пароль должен быть минимум 8 символов' };
    }
    if (!/[a-z]/i.test(password)) {
      return { valid: false, message: 'Пароль должен содержать буквы' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Пароль должен содержать цифры' };
    }
    return { valid: true };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setValidationErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Введите полное имя';
    }

    if (!formData.restaurant_name.trim()) {
      errors.restaurant_name = 'Введите название ресторана';
    }

    if (!formData.restaurant_address.trim()) {
      errors.restaurant_address = 'Введите адрес ресторана';
    }

    if (!formData.email.trim()) {
      errors.email = 'Введите email';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Некорректный email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Введите телефон';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = 'Некорректный номер (используйте формат: +7 (999) 999-99-99)';
    }

    if (!formData.password) {
      errors.password = 'Введите пароль';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.message || 'Пароль не соответствует требованиям';
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.full_name,
        formData.phone,
        formData.role
      );
      router.push('/partner/dashboard');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Этот email уже зарегистрирован');
        setValidationErrors(prev => ({
          ...prev,
          email: 'Email уже используется'
        }));
      } else if (err.response?.status === 400) {
        setError('Некорректные данные. Проверьте форму');
      } else if (err.response?.status === 500) {
        setError('Ошибка сервера. Попробуйте позже');
      } else {
        setError(err instanceof Error ? err.message : 'Ошибка регистрации');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏢 Orynbar для партнёров</h1>
          <p className="text-gray-600">Создайте аккаунт ресторана</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Полное имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Иван Иванов"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.full_name && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.full_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="restaurant_name" className="block text-sm font-medium text-gray-700 mb-2">
                Название ресторана <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="restaurant_name"
                name="restaurant_name"
                value={formData.restaurant_name}
                onChange={handleChange}
                placeholder="Мой ресторан"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.restaurant_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.restaurant_name && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.restaurant_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="restaurant_address" className="block text-sm font-medium text-gray-700 mb-2">
                Адрес ресторана <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="restaurant_address"
                name="restaurant_address"
                value={formData.restaurant_address}
                onChange={handleChange}
                placeholder="ул. Пушкина, д. 10"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.restaurant_address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.restaurant_address && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.restaurant_address}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="partner@restaurant.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.email}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">💡 Используйте рабочий email для получения уведомлений</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+7 (999) 999-99-99"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.phone && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.phone}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">💡 Казахский номер в формате: +7 (XXX) XXX-XX-XX</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.password}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">💡 Минимум 8 символов, буквы и цифры</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Подтвердите пароль <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">❌ {validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-6"
            >
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Уже есть аккаунт?{' '}
            <Link href="/partner/login" className="text-green-600 hover:text-green-700 font-semibold">
              Войти
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          Продолжая, вы принимаете наши{' '}
          <Link href="/terms" className="text-green-600 hover:underline">
            условия использования
          </Link>
        </p>
      </div>
    </div>
  );
}
