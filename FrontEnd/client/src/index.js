import './index.css';
// Self-hosted variable fonts (no CDN): Playfair display, DM Sans UI, JetBrains mono
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';  // Add this import
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { store } from './Redux/store';
import { ToastProvider } from './Components/ui/Toast';
import { LiquidGlassDefs } from './Components/ui/LiquidGlass';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <ToastProvider>
          <LiquidGlassDefs />
          <App />
        </ToastProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
