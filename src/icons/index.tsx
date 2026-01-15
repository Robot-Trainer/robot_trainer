import React from 'react';

export const ChevronRight = (props: any) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

export const CheckCircle = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.3 7.3l-4.99 5a1 1 0 01-1.42 0l-2.5-2.5a1 1 0 111.42-1.42l1.79 1.79L14.88 7.7a1 1 0 111.42 1.42z" />
  </svg>
);

export const Play = (props: any) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M6 4l10 6-10 6V4z" />
  </svg>
);

export const Zap = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
);

export const Home = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
  </svg>
);

export const Activity = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 12h3l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const Cpu = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
  </svg>
);

export const Robot = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         d="M 11,6 V 5 c 0,0 0,-1 1,-1 v 0 c 0,0 1,0 1,1 v 1" id="path17" />
    <path stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="round" fill="none"
         d="M 17,20 H 7 C 5,20 3,19 3,17 V 9 C 3,7 5,6 7,6 h 10 c 2,0 4,1 4,3 v 8 c 0,2 -2,3 -4,3 z"
      id="path8" />
    <circle stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeMiterlimit="round"
         cx="15"
         cy="12"
         id="ellipse8"
      r="1.5" />
    <circle transform="rotate(-73.440702)"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeMiterlimit="round"
         cx="-9"
         cy="12"
         id="ellipse9"
      r="1.5" />
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeMiterlimit="round"
         d="m 2,16 v 0 C 1,16 1,16 1,15 v -4 c 0,-1 0,-1 1,-1 v 0 c 1,0 1,0 1,1 v 4 c 0,1 0,1 -1,1 z"
      id="path11" />
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeMiterlimit="round"
         d="m 22,16 v 0 c 1,0 1,0 1,-1 v -4 c 0,-1 0,-1 -1,-1 v 0 c -1,0 -1,0 -1,1 v 4 c 0,1 0,1 1,1 z"
         id="path12" />
  </svg>
);

export const Layout = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 3h18v18H3V3zm4 4v10h10V7H7z" />
  </svg>
);

export const Plus = (props: any) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
  </svg>
);

export const Settings = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm7.4 3a6.5 6.5 0 01-.1 1l2 1.5-2 3.5-2.1-1a6.4 6.4 0 01-1.2.7L15 20h-6l-.9-3.3c-.4-.2-.8-.5-1.2-.7L4.8 21 2.8 17.5l2-1.5a6.7 6.7 0 010-2l-2-1.5L4.8 8l2.1 1a6.4 6.4 0 011.2-.7L9 4h6l.9 3.3c.4.2.8.5 1.2.7l2.1-1L21.2 11z" />
  </svg>
);

export const Loader = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default {
  Loader,

  ChevronRight,
  CheckCircle,
  Play,
  Zap,
  Home,
  Activity,
  Cpu,
  Layout,
  Plus,
  Settings,
  Robot
};
