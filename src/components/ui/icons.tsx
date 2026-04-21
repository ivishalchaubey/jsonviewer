const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconCopy = () => (
  <svg {...iconProps}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconFormat = () => (
  <svg {...iconProps}>
    <path d="M3 6h18M3 12h12M3 18h18" />
  </svg>
);

export const IconMinify = () => (
  <svg {...iconProps}>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);

export const IconUpload = () => (
  <svg {...iconProps}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

export const IconTrash = () => (
  <svg {...iconProps}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const IconSearch = () => (
  <svg {...iconProps}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const IconArrowUp = () => (
  <svg {...iconProps}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const IconArrowDown = () => (
  <svg {...iconProps}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

export const IconInfo = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const IconClose = () => (
  <svg {...iconProps}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconSun = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const IconMoon = () => (
  <svg {...iconProps}>
    <path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79Z" />
  </svg>
);

export const IconViewer = () => (
  <svg {...iconProps}>
    <path d="M3 5h6M3 9h6M3 13h4M14 5h7M14 9h7M14 13h5M14 17h7" />
    <circle cx="10" cy="17" r="1.5" />
  </svg>
);

export const IconDiff = () => (
  <svg {...iconProps}>
    <path d="M8 3v12l-3-3M16 21V9l3 3" />
    <path d="M5 12l3 3M19 12l-3-3" />
  </svg>
);

export const IconTree = () => (
  <svg {...iconProps}>
    <path d="M5 4h4M5 12h4M5 20h4M11 4v16M11 8h4M11 16h4M17 4v8M17 16v4" />
  </svg>
);

export const IconCode = () => (
  <svg {...iconProps}>
    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16" />
  </svg>
);

export const IconFontMinus = () => (
  <svg {...iconProps}>
    <path d="M4 17l5-12 5 12M6 13h6M16 15h5" />
  </svg>
);

export const IconFontPlus = () => (
  <svg {...iconProps}>
    <path d="M4 17l5-12 5 12M6 13h6M18.5 10v8M14.5 14h8" />
  </svg>
);

export const IconFontReset = () => (
  <svg {...iconProps}>
    <path d="M4 17l5-12 5 12M6 13h6M18 7v6h-6M18 13a5 5 0 1 1-1.5-3.5" />
  </svg>
);
