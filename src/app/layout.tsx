'use strict';

import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import InitBootstrap from '@/components/InitBootstrap';

export const metadata: Metadata = {
  title: 'KoseliGhar',
  description: 'Modern, fast, and responsive Point of Sale system.',
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
          <InitBootstrap />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
