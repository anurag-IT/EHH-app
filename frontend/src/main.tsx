import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for auto-updates
registerSW({ 
  immediate: true,
  onRegistered(r) {
    console.log('SW Registered - version: 1.0.3');
    r?.update(); // Force check on register
  },
  onNeedRefresh() {
    console.log('New content available - reloading...');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
