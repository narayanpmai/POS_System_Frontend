import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ModalProvider } from '@/context/ModalContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import InitBootstrap from '@/components/InitBootstrap';

export const metadata: Metadata = {
  title: 'KoseliGhar - स्थानीय उत्पादन, हाम्रो पहिचान',
  description: 'गाउँघरको कोसेली, समृद्ध किसानको अभियान - Modern POS & Inventory Management System',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <ModalProvider>
              <InitBootstrap />
              {children}
            </ModalProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
