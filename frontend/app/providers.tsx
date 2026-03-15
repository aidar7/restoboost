'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "@/app/context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
