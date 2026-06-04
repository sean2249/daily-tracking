// icons.jsx — minimalist linear SVG icon set (no emoji, stroke 2, geometric).
// All icons accept {size, sw, style} and inherit currentColor by default.
import React from 'react';

function Svg({ size = 22, vb = 24, sw = 2, children, fill = 'none', style }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill}
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true">
      {children}
    </svg>
  );
}

// chart / calendar toggle (top-right)
export const ChartIcon = (p) => (
  <Svg {...p}><path d="M4 19V5" /><path d="M4 19h16" />
    <rect x="7.5" y="11" width="3" height="5" /><rect x="13.5" y="7" width="3" height="9" /></Svg>
);

// habit group header — a sprouting leaf / growth
export const HabitIcon = (p) => (
  <Svg {...p}><path d="M12 21v-7" />
    <path d="M12 14c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z" />
    <path d="M12 13c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5Z" /></Svg>
);

// principle group header — a shield ("held the line")
export const PrincipleIcon = (p) => (
  <Svg {...p}><path d="M12 3l7 3v5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9V6l7-3Z" />
    <path d="M9 12l2 2 4-4" /></Svg>
);

export const AddIcon = (p) => (<Svg {...p} sw={p.sw || 2.3}><path d="M12 5v14M5 12h14" /></Svg>);

export const ArchiveIcon = (p) => (
  <Svg {...p}><rect x="4" y="5" width="16" height="4" rx="1" />
    <path d="M5.5 9v9a1 1 0 001 1h11a1 1 0 001-1V9" /><path d="M10 13h4" /></Svg>
);

export const DeleteIcon = (p) => (
  <Svg {...p}><path d="M5 7h14" /><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
    <path d="M7 7l1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" /><path d="M10 11v6M14 11v6" /></Svg>
);

export const CheckIcon = (p) => (<Svg {...p} sw={p.sw || 3}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>);

export const MoreIcon = (p) => (
  <Svg {...p} fill="currentColor" sw={0}><circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></Svg>
);

export const BackIcon = (p) => (<Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>);

export const ChevronIcon = (p) => (<Svg {...p} sw={p.sw || 2.2}><path d="M9 6l6 6-6 6" /></Svg>);

export const EditIcon = (p) => (
  <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></Svg>
);

export const RestoreIcon = (p) => (
  <Svg {...p}><path d="M5 12a7 7 0 107-7 7 7 0 00-5 2.1L5 9" /><path d="M5 4v5h5" /></Svg>
);

// per-item streak mark — a minimal spark (not a fire emoji)
export const StreakIcon = (p) => (
  <Svg {...p} sw={p.sw || 1.8}><path d="M12 3c1.5 3 4 4.2 4 7.5A4 4 0 018 11c0-1.4.6-2.3 1.3-3 .2 1 .9 1.6 1.7 1.6 0-2.4-.5-4.6 1-7.1Z" /></Svg>
);

// full-combo banner mark — concentric target / all-clear
export const ComboIcon = (p) => (
  <Svg {...p} sw={p.sw || 2}><circle cx="12" cy="12" r="8" /><path d="M9 12l2 2 4-4.5" /></Svg>
);

// perfect-day mark — a four-point sparkle for a 100% (all-checked) day
export const SparkIcon = (p) => (
  <Svg {...p} fill="currentColor" sw={0}>
    <path d="M12 2.5c.4 3.6 1.4 6.6 2.9 8.1S18.4 12.1 21.5 12.5c-3.1.4-6.1 1.4-7.6 2.9S12.4 20.4 12 23.5c-.4-3.1-1.4-6.6-2.9-8.1S5.6 12.9 2.5 12.5c3.1-.4 6.1-1.4 7.6-2.9S11.6 6.1 12 2.5Z" />
  </Svg>
);

// error / connection-problem mark — alert triangle
export const AlertIcon = (p) => (
  <Svg {...p}><path d="M12 4.5l8.5 14.5H3.5L12 4.5Z" /><path d="M12 10v4" /><path d="M12 17.2v.1" /></Svg>
);

// not-found / missing-item mark — magnifier
export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></Svg>
);

// empty-state illustration (larger, geometric calendar)
export function EmptyArt({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="14" y="20" width="68" height="58" rx="10" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 34h68" stroke="currentColor" strokeWidth="2.2" />
      <path d="M30 14v10M66 14v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="26" y="46" width="9" height="9" rx="2.5" fill="currentColor" opacity=".22" />
      <rect x="43.5" y="46" width="9" height="9" rx="2.5" fill="currentColor" opacity=".5" />
      <rect x="61" y="46" width="9" height="9" rx="2.5" fill="currentColor" opacity=".22" />
      <path d="M44 64.5l3.2 3.2 6-6.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
