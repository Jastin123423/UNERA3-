
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// @ts-ignore
const initialData = window.__INITIAL_DATA__;

hydrateRoot(
  rootElement,
  <React.StrictMode>
    <LanguageProvider>
      <App initialData={initialData} />
    </LanguageProvider>
  </React.StrictMode>
);
