/**
 * Web renderer entry point.
 *
 * Mirrors src/renderer.ts but first imports src/web-preload.ts, which
 * populates window.electronAPI using HTTP/Socket.IO calls to the web server
 * instead of Electron's contextBridge / ipcRenderer.
 *
 * This file is used as the Vite entry point for the web build
 * (see vite.web.config.mts and index.web.html).
 */

// Must come first so window.electronAPI is set before React mounts.
import './web-preload';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { MigrationRoot } from './MigrationRoot';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

createRoot(document.getElementById('root')!).render(
  createElement(
    StrictMode,
    null,
    createElement(
      ThemeProvider,
      { theme: createTheme({ palette: { primary: { main: '#2563eb' } } }) },
      createElement(CssBaseline),
      createElement(MigrationRoot),
    ),
  ),
);
