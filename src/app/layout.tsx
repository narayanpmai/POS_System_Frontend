import React from 'react';
import type { Metadata } from 'next';
import { LanguageProvider } from '@/context/LanguageContext';
import { ModalProvider } from '@/context/ModalContext';
import { CustomAlertProvider } from '@/context/CustomAlertContext';
import ReduxProvider from '@/redux/ReduxProvider';
import AppInitializer from '@/components/AppInitializer';
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
        <ReduxProvider>
          <AppInitializer>
            <LanguageProvider>
              <ModalProvider>
                <CustomAlertProvider>
                  <InitBootstrap />
                  {children}
                </CustomAlertProvider>
              </ModalProvider>
            </LanguageProvider>
          </AppInitializer>
        </ReduxProvider>
      </body>
    </html>
  );
}
