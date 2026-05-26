import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app.jsx';

// Register the service worker (offline shell + push). Auto-updates on new deploys.
registerSW({ immediate: true });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
