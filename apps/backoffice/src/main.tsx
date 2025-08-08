import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initializeApi } from './config/api';

// Initialize the shared API client
initializeApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);