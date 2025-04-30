import React from 'react';
import ReactDOM from 'react-dom/client';
import { Sidebar } from '../sidebar/Sidebar';
import { TranslationsProvider } from '../common/translations/Translations';
import '../common/styles/index.css';

export const initializeSidebar = (onClose) => {
  const root = document.getElementById('yt-sidebar-root');
  if (!root) return;
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TranslationsProvider>
        <Sidebar onClose={onClose} />
      </TranslationsProvider>
    </React.StrictMode>
  );
};
