import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { setupAuthStateListener } from './store/auth';

// Setup auth state listener to receive auth changes from background
setupAuthStateListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
