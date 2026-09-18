import React from 'react';
import ReactDOM from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App';
import './index.css';

// Initialiser Sentry AVANT le rendu React
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
