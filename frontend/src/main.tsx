import {StrictMode} from 'react';

// Global Error Handler for Dynamic Imports (Prevents White Screen after new Deploys)
window.addEventListener('error', (e: any) => {
  const isChunkError = e.message?.includes('Failed to fetch dynamically imported module') || 
                       e.target?.src?.includes('/assets/') ||
                       e.target?.tagName === 'SCRIPT';
  if (isChunkError) {
    console.warn('Network or Version error detected. Healing app...');
    window.location.reload();
  }
}, true);
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety check to unregister any leftover service workers from previous PWA conversion
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((unregistered) => {
        if (unregistered) {
          console.log('Service Worker unregistered successfully.');
        }
      });
    }
  }).catch((error) => {
    console.error('Error during Service Worker unregistration:', error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
