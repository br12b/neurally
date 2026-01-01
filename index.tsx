import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global Error Handler for "White Screen" debugging
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 40px; font-family: monospace; background: #000; color: #fff; height: 100vh;">
        <h1 style="color: #ff5555; font-size: 24px; margin-bottom: 20px;">SYSTEM CRITICAL ERROR</h1>
        <p style="color: #aaa; margin-bottom: 10px;">${message}</p>
        <p style="color: #666; font-size: 12px;">${source} : ${lineno}:${colno}</p>
        <div style="margin-top: 20px; padding: 10px; border: 1px solid #333; background: #111; white-space: pre-wrap;">
          ${error?.stack || 'No stack trace'}
        </div>
      </div>
    `;
  }
};

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Render Error:", e);
}
