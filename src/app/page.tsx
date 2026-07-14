import React from 'react';
import Link from 'next/link';

export default function RootHomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Kosheli Ghar</h1>
      <p>This is a multi-tenant platform.</p>
      <p>Please access your store via your specific subdomain (e.g., <strong>shop1.localhost:3000</strong>).</p>
      
      <div style={{ marginTop: '2rem' }}>
        <p>Are you a tenant? Use your subdomain to log in.</p>
      </div>
    </div>
  );
}
