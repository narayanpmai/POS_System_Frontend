'use client';

import { useEffect } from 'react';

export default function InitBootstrap() {
  useEffect(() => {
    // Import bootstrap JS bundle inside browser only
    require('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return null;
}
