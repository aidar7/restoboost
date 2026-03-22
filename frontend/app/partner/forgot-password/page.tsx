'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

export default function PartnerForgotPasswordPage( ) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Email валидация
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
    setSuccess('');
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setValidationError('');

    if (!email.trim()) {
      setValidationError('Введите email');
      setIsSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      setValidationError('Некорректный email');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 404) {
          setError('Email не найден в системе');
        } else if (response.status === 500) {
          setError('Ошибка сервера. Попробуйте позже');
        } else {
          setError(data?.detail || 'Ошибка при отправке письма');
        }
        return;
      }

      setSuccess('✅ Письмо с инструкциями отправлено на ваш email. Проверьте почту (включая папку Спам)');
      setEmail('');
    } catch (err) {
      setError('Ошибка сети. Проверьте интернет соединение');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Восстановление пароля</h1>
          <p className="text-gray-600">Введите ваш email для восстановления доступа</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="partner@restaurant.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                    validationError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationError && (
                  <p className="text-red-500 text-xs mt-1">❌ {validationError}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  💡 Введите email, с которым зарегистрирован ваш аккаунт
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-6"
              >
                {isSubmitting ? 'Отправка...' : 'Отправить письмо'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                Если письмо не пришло, проверьте папку Спам или попробуйте ещё раз через несколько минут.
              </p>
              <button
                onClick={() => {
                  setSuccess('');
                  setEmail('');
                }}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                ← Попробовать ещё раз
              </button>
            </div>
          )}

          <p className="text-center text-gray-600 text-sm mt-6">
            Вспомнили пароль?{' '}
            <Link href="/partner/login" className="text-green-600 hover:text-green-700 font-semibold">
              Вернуться к входу
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-8">
          Если у вас есть вопросы, свяжитесь с{' '}
          <Link href="mailto:support@orynbar.com" className="text-green-600 hover:underline">
            поддержкой
          </Link>
        </p>
      </div>
    </div>
  );
}
