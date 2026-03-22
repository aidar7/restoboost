'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function AuthHeader() {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <button 
          onClick={() => router.push('/')}
          className="text-2xl font-bold text-orange-600 hover:text-orange-700 transition cursor-pointer"
        >
          Orynbar
        </button>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-orange-600 transition">
            РУ
          </button>
          <span className="text-gray-300">|</span>
          <button className="px-3 py-1 text-sm font-medium text-gray-500 hover:text-orange-600 transition">
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
