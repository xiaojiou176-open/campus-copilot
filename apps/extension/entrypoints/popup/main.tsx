import React from 'react';
import ReactDOM from 'react-dom/client';
import { SurfaceShell } from '../../src/surface-shell';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SurfaceShell surface="popup" />
  </React.StrictMode>,
);
