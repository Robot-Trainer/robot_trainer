import React from 'react';

export const ChevronRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

export const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.3 7.3l-4.99 5a1 1 0 01-1.42 0l-2.5-2.5a1 1 0 111.42-1.42l1.79 1.79L14.88 7.7a1 1 0 111.42 1.42z" />
  </svg>
);

export const Play = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M6 4l10 6-10 6V4z" />
  </svg>
);

export const Zap = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
);

export const Home = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
  </svg>
);

export const Activity = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 12h3l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const Advanced = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 640 640"
    {...props}
  >
    //Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License
    - https://fontawesome.com/license (Commercial License) Copyright 2026
    Fonticons, Inc.
    <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z" />
  </svg>
);

export const Cpu = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
  </svg>
);

export const Robot = (props: React.SVGProps<SVGSVGElement>) => (
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

export const Layout = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 3h18v18H3V3zm4 4v10h10V7H7z" />
  </svg>
);

export const Plus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
  </svg>
);

export const Settings = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm7.4 3a6.5 6.5 0 01-.1 1l2 1.5-2 3.5-2.1-1a6.4 6.4 0 01-1.2.7L15 20h-6l-.9-3.3c-.4-.2-.8-.5-1.2-.7L4.8 21 2.8 17.5l2-1.5a6.7 6.7 0 010-2l-2-1.5L4.8 8l2.1 1a6.4 6.4 0 011.2-.7L9 4h6l.9 3.3c.4.2.8.5 1.2.7l2.1-1L21.2 11z" />
  </svg>
);

export const Loader = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
export const Pause = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
);
export const Stop = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M6 6h12v12H6z" /></svg>
);
export const RefreshCw = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
export const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);
export const Circle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><circle cx="12" cy="12" r="8" /></svg>
);

export const ExternalLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
export const RobotConfiguration = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Robot Head Outline placed slightly to the left */}
    <path d="M14 6H7C5 6 3 7 3 9v8c0 2 2 3 4 3h10c2 0 4-1 4-3V13" />
    {/* Robot Eyes */}
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    {/* Integrated Settings Gear in the top right cranium area */}
    <path d="M19.5 10.1l-1.2-.7c-.3-.2-.6-.5-.7-.9l.6-1.3c.2-.4.1-1-.3-1.3l-1.4-.7c-.4-.2-1-.1-1.3.3l-.6 1.3c-.3.1-.7.1-1 0l-.6-1.3c-.2-.4-.8-.5-1.3-.3l-1.4.7c-.4.2-.5.8-.3 1.3l.6 1.3c-.2.3-.5.6-.9.7l-1.2.7c-.4.2-.6.8-.4 1.2l.7 1.4c.2.4.8.6 1.2.4l1.3-.6c.3.2.6.5.7.9l-.6 1.3c-.2.4-.1 1 .3 1.3l1.4.7c.2.1.4.1.6.1.3 0 .5-.1.7-.4l.6-1.3c.3-.1.7-.1 1 0l.6 1.3c.2.4.8.5 1.3.3l1.4-.7c.4-.2.5-.8.3-1.3l-.6-1.3c.2-.3.5-.6.9-.7l1.2-.7c.4-.2.6-.8.4-1.2l-.7-1.4c-.2-.4-.8-.6-1.2-.4z" />
    <circle cx="15.5" cy="10.5" r="1.5" />
  </svg>
);

export const Pencil = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

export const Camera = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);
export const Dataset = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    {/* Solid central square representing the model/compute unit.
        Uses fill="currentColor" inherited from the svg tag. */}
    <rect x="8" y="8" width="8" height="8" rx="1.5" />

    {/* Cyclical arrow representing the training process/iterations.
        Uses stroke="currentColor" and fill="none" to create contrast
        with the solid center, ensuring legibility at small sizes.
        This mixed style is similar to the 'RobotConfiguration' example. */}
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 3" />
      <path d="M21 3v4h-4" />
    </g>
  </svg>
);

export default {
  Loader,
  Pencil,
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
  Robot,
  Camera,
  Dataset,
  Pause,
  Stop,
  RefreshCw,
  XCircle,
  Circle,
  ExternalLink,
  RobotConfiguration
};
