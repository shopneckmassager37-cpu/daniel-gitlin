
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { KindeProvider } from "@kinde-oss/kinde-auth-react";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <KindeProvider
      clientId="6eff778fb856409093829dfd20cd8a59"
      domain="https://lumdim.kinde.com"
      redirectUri={window.location.origin}
      logoutUri={window.location.origin}
    >
      <App />
    </KindeProvider>
  </React.StrictMode>
);
