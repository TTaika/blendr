import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/syne';
import '@fontsource-variable/instrument-sans';
import './theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
