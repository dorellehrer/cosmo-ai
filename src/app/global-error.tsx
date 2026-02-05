'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div 
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div 
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(to bottom right, #ef4444, #f97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                fontSize: '48px',
              }}
            >
              💥
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
              Critical Error
            </h1>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>
              Something unexpected happened. We&apos;re on it!
            </p>
            
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(to right, #8B5CF6, #D946EF)',
                borderRadius: '9999px',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
