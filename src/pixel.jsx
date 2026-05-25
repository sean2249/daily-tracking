// pixel.jsx — Pixel-art sprite system: avatar, room, clutter, stamps.
// All sprites built from SVG <rect> at integer coords. crispEdges shape-rendering
// gives a true 16-bit feel. Sprites composed as scenes by stacking <g transform>.

import React from 'react';

// ─────────────────────────────────────────────────────────────
// PixelSprite — render a sprite from string-array data + palette map
// ─────────────────────────────────────────────────────────────
function PixelSprite({ data, palette, scale = 4, style = {}, className = '' }) {
  const h = data.length;
  const w = data[0].length;
  const rects = [];
  for (let y = 0; y < h; y++) {
    const row = data[y];
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (palette[ch]) {
        // run-length: extend right while same char
        let runEnd = x + 1;
        while (runEnd < w && row[runEnd] === ch) runEnd++;
        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={runEnd - x} height={1} fill={palette[ch]} />
        );
        x = runEnd;
      } else {
        x++;
      }
    }
  }
  return (
    <svg
      className={`pixel ${className}`}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      style={style}>
      {rects}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED PALETTE
// ─────────────────────────────────────────────────────────────
const P = {
  // outline
  'k': '#2a1d12',
  'K': '#3d2817',  // softer outline

  // skin
  's': '#f4c2a1',
  'S': '#d99c79',
  'c': '#e88d8a',  // cheek/blush

  // hair (brown by default; swappable)
  'h': '#5c3a1e',
  'H': '#7a4f2a',  // hair highlight
  'b': '#3a2410',  // hair shadow

  // eye/mouth
  'e': '#2a1d12',
  'w': '#ffffff',  // tooth/sparkle

  // shirt
  't': '#5d8aa8',
  'T': '#3e6580',
  'u': '#fbf3df',  // shirt accent stripe

  // pants
  'p': '#4a3a5a',
  'P': '#2e2138',

  // shoes
  'o': '#3a2410',

  // accents
  'r': '#d96f47',  // red/terracotta
  'R': '#a8472a',
  'g': '#6a9c4a',  // green
  'G': '#3a6b2a',
  'y': '#e5a93a',  // gold
  'Y': '#a87a1a',
  'l': '#88c4d9',  // sky blue
  'L': '#4d8aa0',
  'm': '#fbf3df',  // cream/paper
  'M': '#e6d4a8',

  // furniture / room
  'F': '#b87a48',  // floor wood light
  'f': '#8b5a30',  // floor wood dark
  'W': '#f4dca0',  // wall
  'X': '#d9b873',  // wall shade
  'd': '#c95a55',  // bed
  'D': '#9a3e3a',
  'q': '#fbf3df',  // sheet
  'Q': '#e6d4a8',
};

// ─────────────────────────────────────────────────────────────
// AVATAR — composed of head+body sprite + a swappable hair layer
// ─────────────────────────────────────────────────────────────

// Body (24×30) — face, body, arms, legs.
const BODY = [
  "........................", // 0
  "........................", // 1
  "........................", // 2
  "........kkkkkkkk........", // 3 top of head
  ".......kssssssssk.......", // 4
  "......kssssssssssk......", // 5
  ".....kssssssssssssk.....", // 6
  "....ksssssssssssssssk...", // 7
  "....kssssssssssssssssk..", // 8
  "....ksssssssssssssssssk.", // 9
  "....ksssssssssssssssssk.", // 10
  "....ksskkssssssskksssk..", // 11 brow line
  "....ksssssssssssssssk...", // 12
  "....kssekssssssskessk...", // 13 eyes
  "....kssekssssssskessk...", // 14
  "....ksssssssssssssssk...", // 15
  "....ksscsssssssssscssk..", // 16 cheeks
  "....ksssssssksssssssk...", // 17 nose
  "....kssssskeeekssssk....", // 18 mouth
  ".....kssssssssssssk.....", // 19
  "......kssssssssssk......", // 20
  ".......kssssssssk.......", // 21 chin
  "........ksssssssk.......", // 22 neck
  ".......kttttttttk.......", // 23 shoulders
  "......kttttttttttk......", // 24
  ".....kttttuttuttttk.....", // 25
  "....ktttttuttutttttk....", // 26
  "....ktttttuttutttttk....", // 27
  "....kkkkkkkkkkkkkkkk....", // 28
  "........................", // 29
];

// Hair layers — sit ON TOP of head at same coords.
// Tier 0: neat / trimmed
const HAIR_0 = [
  "........................",
  "........................",
  ".........hhhhhh.........",
  "........hhhhhhhh........",
  ".......hhHhhhhhhh.......",
  "......hhHHhhhhhhhh......",
  ".....hhhHhhhhhhhhhh.....",
  "....hhhHhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhhhh....",
  "....hhhhh........hhh....",
  "....hh............hh....",
  "....h..............h....",
];

// Tier 1: slightly shaggy — covers ears, a bit longer at sides
const HAIR_1 = [
  "........................",
  ".........hhhhhh.........",
  "........hhhhhhhh........",
  ".......hhHHhhhhhh.......",
  "......hhHHhhhhhhhh......",
  ".....hhHHhhhhhhhhhh.....",
  "....hhhHhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhhhh....",
  "....hhhhh........hhhh...",
  "...hhhh............hhh..",
  "...hh................h..",
  "...h..................h.",
];

// Tier 2: overgrown — past shoulders, side curtains
const HAIR_2 = [
  ".........hhhhhh.........",
  "........hhhhhhhh........",
  ".......hhHHhhhhhh.......",
  "......hhHHHhhhhhhh......",
  ".....hhHHhhhhhhhhhh.....",
  "....hhhHhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhhhh....",
  "....hhhhhhhhhhhhhhhh....",
  "...hhhhh..........hhh...",
  "..hhhh..............hh..",
  "..hhh................h..",
  "..hh.................h..",
  "..hh.................h..",
  "..hh.................h..",
  "..hh.................h..",
  "..hh.................h..",
  "..hh.................h..",
  "..hhh...............hh..",
  "..hhh...............hh..",
  "...hh...............h...",
];

// Tier 3: wild — chaotic spikes everywhere
const HAIR_3 = [
  "....h....hh....hh...h...",
  "..h.hh..hhhh.h.hh.h.h...",
  "..hhhhhhhhhhhhhhhhhhh...",
  ".hhhhhhHhhhhhhhhhhhhh...",
  "hhhhhhHHHhhhhhhhhhhhhh..",
  "hhhhHHhhhhhhhhhhhhhhh...",
  "hhhhhhhhhhhhhhhhhhhh....",
  "hhhhhhhhhhhhhhhhhhhh....",
  "hhhhhhhhhhhhhhhhhhhh....",
  "hhhh..............hhh...",
  "hhh................hh...",
  "hh..................hh..",
  "h....................h..",
  "h....................h..",
  "hh...................h..",
  "hh..................hh..",
  "hh...h..........h...h...",
  "hhhhhhh........hhhhhh...",
  ".hhhhhh.........hhhhh...",
  "..hhhh............hh....",
];

const HAIRS = [HAIR_0, HAIR_1, HAIR_2, HAIR_3];

// Mouth overlays — replaces mouth row 18 by drawing on top
function MouthOverlay({ mood, palette }) {
  // mouth area is around rows 17-19, cols 9-14
  const drawings = {
    happy: [
      [9,18,1,1,'k'],[14,18,1,1,'k'],
      [10,19,4,1,'k'],
    ],
    smile: [
      [10,18,4,1,'k'],
    ],
    sad: [
      [10,18,4,1,'k'],
      [9,17,1,1,'k'],[14,17,1,1,'k'],
    ],
    sleepy: [
      [10,18,4,1,'k'],
      // eye lines override
      [9,13,1,1,'k'],[10,13,1,1,'k'],[11,13,1,1,'k'],
      [12,13,1,1,'k'],[13,13,1,1,'k'],[14,13,1,1,'k'],
    ],
  };
  const d = drawings[mood] || drawings.happy;
  return (
    <>{d.map(([x,y,w,h,c], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} fill={palette[c]} />
    ))}</>
  );
}

function Avatar({ hairTier = 0, mood = 'happy', scale = 4, bob = false, style = {} }) {
  const safeTier = Math.max(0, Math.min(3, hairTier|0));
  return (
    <div
      style={{
        display: 'inline-block',
        animation: bob ? 'bob 1.6s ease-in-out infinite' : 'none',
        ...style,
      }}>
      <svg
        className="pixel"
        width={24 * scale}
        height={30 * scale}
        viewBox="0 0 24 30">
        {/* body+face */}
        {BODY.flatMap((row, y) =>
          row.split('').map((ch, x) =>
            P[ch] ? <rect key={`b-${x}-${y}`} x={x} y={y} width={1} height={1} fill={P[ch]} /> : null
          )
        )}
        {/* hair on top */}
        {HAIRS[safeTier].flatMap((row, y) =>
          row.split('').map((ch, x) =>
            P[ch] ? <rect key={`h-${x}-${y}`} x={x} y={y} width={1} height={1} fill={P[ch]} /> : null
          )
        )}
        {/* mouth/mood overlay */}
        <MouthOverlay mood={mood} palette={P} />
      </svg>
    </div>
  );
}

// Compact avatar bust (just head) for badges
function AvatarBust({ hairTier = 0, scale = 3, mood = 'happy' }) {
  return (
    <div style={{ display: 'inline-block', overflow: 'hidden', width: 24*scale, height: 22*scale }}>
      <Avatar hairTier={hairTier} mood={mood} scale={scale} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOM — composed of background + furniture + clutter overlays
// Canvas: 96 wide × 64 tall (will be scaled up).
// ─────────────────────────────────────────────────────────────

function rectGroup(rects) {
  return rects.map(([x,y,w,h,fill], i) => (
    <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
  ));
}

// background: wall + floor
function RoomBackground() {
  return (
    <>
      {/* wall */}
      <rect x={0} y={0} width={96} height={42} fill={P.W} />
      {/* wall shade band along bottom */}
      <rect x={0} y={40} width={96} height={2} fill={P.X} />
      {/* floor */}
      <rect x={0} y={42} width={96} height={22} fill={P.F} />
      {/* floor planks (thin shadow lines) */}
      <rect x={0} y={48} width={96} height={1} fill={P.f} />
      <rect x={0} y={55} width={96} height={1} fill={P.f} />
      <rect x={0} y={62} width={96} height={1} fill={P.f} />
      {/* wall trim */}
      <rect x={0} y={42} width={96} height={1} fill={P.k} />
    </>
  );
}

// Window — top-left wall
function RoomWindow() {
  return rectGroup([
    // frame
    [10, 6, 24, 22, P.k],
    [11, 7, 22, 20, '#8b5a30'],
    // glass / sky
    [12, 8, 9, 8, P.l],
    [22, 8, 9, 8, P.l],
    [12, 17, 9, 8, '#7ab5cc'],
    [22, 17, 9, 8, '#7ab5cc'],
    // cross mullion
    [21, 8, 1, 17, '#8b5a30'],
    [12, 16, 19, 1, '#8b5a30'],
    // sun (top-right pane)
    [27, 9, 3, 3, P.y],
    [26, 10, 1, 1, P.y],
    [30, 10, 1, 1, P.y],
    // sill
    [9, 28, 26, 1, P.k],
    [9, 29, 26, 1, '#8b5a30'],
  ]);
}

// Bed — middle to right wall
function RoomBed() {
  return rectGroup([
    // headboard
    [55, 22, 4, 20, P.k],
    [56, 23, 2, 19, '#8b5a30'],
    // bed frame
    [55, 36, 36, 6, P.k],
    [56, 37, 34, 4, '#8b5a30'],
    // mattress (red blanket)
    [59, 30, 32, 7, P.k],
    [60, 31, 30, 5, P.d],
    [60, 32, 30, 1, P.D],
    // pillow
    [60, 26, 10, 5, P.k],
    [61, 27, 8, 3, P.q],
    [61, 27, 8, 1, P.Q],
    // blanket fold
    [76, 31, 14, 1, P.D],
    [76, 32, 1, 4, P.D],
  ]);
}

// Plant — bottom left
function RoomPlant() {
  return rectGroup([
    // pot
    [4, 50, 12, 1, P.k],
    [5, 51, 10, 6, P.R],
    [5, 51, 10, 1, P.r],
    [4, 57, 12, 1, P.k],
    // leaves
    [7, 40, 6, 3, P.G],
    [5, 42, 10, 5, P.g],
    [4, 44, 12, 4, P.G],
    [6, 47, 8, 3, P.g],
    // leaf highlights
    [7, 43, 2, 1, '#86b863'],
    [11, 45, 2, 1, '#86b863'],
  ]);
}

// Rug — center floor
function RoomRug() {
  return rectGroup([
    [22, 56, 40, 1, P.k],
    [22, 57, 40, 5, P.r],
    [22, 62, 40, 1, P.k],
    // stripes
    [25, 58, 34, 1, P.R],
    [25, 60, 34, 1, P.R],
    [22, 57, 1, 5, P.R],
    [61, 57, 1, 5, P.R],
  ]);
}

// Lamp — on side table near bed
function RoomLamp() {
  return rectGroup([
    // table
    [42, 36, 12, 6, P.k],
    [43, 37, 10, 4, '#8b5a30'],
    // lamp base
    [46, 32, 4, 4, P.k],
    [47, 33, 2, 2, '#8b5a30'],
    // lamp stand
    [47, 28, 2, 4, P.k],
    // shade
    [44, 22, 8, 6, P.k],
    [45, 23, 6, 4, P.y],
    [45, 23, 6, 1, '#f4d35e'],
    // glow
    [43, 27, 10, 1, 'rgba(255,220,140,0.25)'],
  ]);
}

// Picture frame on wall
function RoomPicture() {
  return rectGroup([
    [70, 8, 18, 12, P.k],
    [71, 9, 16, 10, P.m],
    [73, 11, 12, 6, P.l],
    [73, 11, 12, 1, P.L],
    // little mountain
    [76, 14, 3, 3, P.G],
    [79, 13, 4, 4, P.g],
    [82, 15, 3, 2, P.G],
    [73, 17, 12, 1, '#a8d8e8'],
  ]);
}

// Clutter overlays — these appear when room is messy.
// Each has a "tier" threshold: appears when messTier >= n.
const CLUTTER = [
  // tier 1 — minor (dust bunny, sock)
  { tier: 1, draw: () => rectGroup([
    // sock on floor
    [18, 50, 6, 2, '#88a0c0'],
    [18, 49, 2, 3, '#88a0c0'],
    [19, 49, 1, 1, '#6a82a0'],
  ]) },
  { tier: 1, draw: () => rectGroup([
    // dust bunny
    [78, 60, 3, 1, '#9a8870'],
    [77, 61, 5, 1, '#9a8870'],
  ]) },
  // tier 2 — moderate (cup, paper, more clothes)
  { tier: 2, draw: () => rectGroup([
    // mug on floor
    [38, 49, 4, 4, P.k],
    [39, 50, 2, 2, P.r],
    [42, 50, 1, 2, P.k],  // handle
    [39, 49, 2, 1, P.R],
  ]) },
  { tier: 2, draw: () => rectGroup([
    // crumpled paper
    [65, 53, 4, 3, '#fbf3df'],
    [65, 53, 1, 1, '#e6d4a8'],
    [68, 54, 1, 1, '#e6d4a8'],
    [66, 55, 2, 1, '#e6d4a8'],
  ]) },
  // tier 3 — bad (banana peel, books, pizza box)
  { tier: 3, draw: () => rectGroup([
    // pizza box
    [24, 45, 12, 6, P.k],
    [25, 46, 10, 4, '#d9b873'],
    [25, 46, 10, 1, '#e6d4a8'],
    [27, 48, 6, 1, '#c95a32'],
  ]) },
  { tier: 3, draw: () => rectGroup([
    // banana peel
    [70, 47, 5, 1, P.y],
    [69, 48, 6, 1, P.y],
    [69, 49, 1, 1, P.y],
    [74, 49, 1, 1, P.y],
  ]) },
  { tier: 3, draw: () => rectGroup([
    // books stack
    [50, 51, 8, 2, P.r],
    [51, 49, 7, 2, P.l],
    [52, 47, 6, 2, P.g],
  ]) },
];

// Sparkles when spotless
function CleanSparkles() {
  const sp = [
    [20, 14],[80, 22],[55, 50],[15, 35],[88, 8],[40, 18],
  ];
  return (
    <>
      {sp.map(([x,y], i) => (
        <g key={i} transform={`translate(${x},${y})`}
           style={{ animation: `sparkle 2.8s ease-in-out ${i*0.4}s infinite` }}>
          <rect x={-1} y={0} width={3} height={1} fill="#fff" />
          <rect x={0}  y={-1} width={1} height={3} fill="#fff" />
        </g>
      ))}
    </>
  );
}

// Room composite. messTier 0-3 (0=spotless). standCharacter: place avatar inside.
function Room({
  messTier = 0,
  hairTier = 0,
  mood = 'happy',
  scale = 4,
  bobChar = true,
  showCharacter = true,
}) {
  const visibleClutter = CLUTTER.filter(c => c.tier <= messTier);
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        imageRendering: 'pixelated',
      }}>
      <svg
        className="pixel"
        width={96 * scale}
        height={64 * scale}
        viewBox="0 0 96 64"
        style={{ display: 'block' }}>
        <RoomBackground />
        <RoomPicture />
        <RoomWindow />
        <RoomLamp />
        <RoomBed />
        <RoomPlant />
        <RoomRug />
        {visibleClutter.map((c, i) => <g key={i}>{c.draw()}</g>)}
        {messTier === 0 && <CleanSparkles />}
      </svg>
      {/* Character placed on rug, in front of room */}
      {showCharacter && (
        <div style={{
          position: 'absolute',
          left: `${30 * scale}px`,
          top: `${22 * scale}px`,
          animation: bobChar ? 'bob 2.2s ease-in-out infinite' : 'none',
        }}>
          <Avatar hairTier={hairTier} mood={mood} scale={scale * 0.9} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECKBOX — chunky pixel checkbox with stamp animation
// ─────────────────────────────────────────────────────────────
function PixelCheck({ checked, color = '#d96f47', size = 36, onClick, label, animate = false }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: size,
        height: size,
        position: 'relative',
        background: checked ? color : '#fbf3df',
        border: '3px solid #2a1d12',
        boxShadow: checked ? `2px 2px 0 #2a1d12` : `3px 3px 0 #2a1d12`,
        transform: checked ? 'translate(1px, 1px)' : 'translate(0,0)',
        cursor: 'pointer',
        padding: 0,
      }}>
      {checked && (
        <svg
          className="pixel"
          viewBox="0 0 12 12"
          width={size - 6} height={size - 6}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            animation: animate ? 'pop-in 0.32s cubic-bezier(.5,1.6,.5,1)' : 'none',
          }}>
          {/* check mark with dark shadow + white top */}
          <rect x={2} y={5} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={3} y={6} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={4} y={7} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={5} y={6} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={6} y={5} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={7} y={4} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={8} y={3} width={2} height={2} fill="#2a1d12" opacity="0.4" />
          <rect x={1} y={4} width={2} height={2} fill="#fff" />
          <rect x={2} y={5} width={2} height={2} fill="#fff" />
          <rect x={3} y={6} width={2} height={2} fill="#fff" />
          <rect x={4} y={5} width={2} height={2} fill="#fff" />
          <rect x={5} y={4} width={2} height={2} fill="#fff" />
          <rect x={6} y={3} width={2} height={2} fill="#fff" />
          <rect x={7} y={2} width={2} height={2} fill="#fff" />
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR STAMP — emoji stamp for habit completion calendar
// ─────────────────────────────────────────────────────────────
function StampPolaroid({ emoji, label, dateLabel, rotate = 0, color = '#fbf3df', stampColor = '#d96f47' }) {
  return (
    <div style={{
      width: 92, padding: '8px 8px 28px',
      background: color,
      border: '3px solid #2a1d12',
      boxShadow: `3px 3px 0 #2a1d12`,
      position: 'relative',
      transform: `rotate(${rotate}deg)`,
      display: 'inline-block',
    }}>
      <div style={{
        width: 76, height: 76,
        background: '#f5e9c8',
        border: '2px solid #c9b683',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* stamp ring */}
        <div style={{
          width: 56, height: 56,
          border: `4px solid ${stampColor}`,
          opacity: 0.8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, lineHeight: 1,
          fontFamily: 'var(--font-display)',
          color: stampColor,
          transform: 'rotate(-8deg)',
        }}>
          {emoji}
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 6, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: 10, color: '#5d4632',
        letterSpacing: '0.04em',
      }}>{dateLabel}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONFETTI — pixel-style confetti overlay
// ─────────────────────────────────────────────────────────────
function ConfettiPiece({ left, delay, color, size = 8 }) {
  return (
    <div style={{
      position: 'absolute',
      top: -20,
      left,
      width: size, height: size,
      background: color,
      animation: `confetti-fall 2.4s ${delay}s linear forwards`,
    }} />
  );
}

function Confetti({ show }) {
  if (!show) return null;
  const colors = ['#d96f47','#e5a93a','#6a9c4a','#88c4d9','#d97a8f','#9989c5'];
  const pieces = [];
  for (let i = 0; i < 60; i++) {
    pieces.push({
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 1.2,
      color: colors[i % colors.length],
      size: 6 + Math.floor(Math.random() * 6),
    });
  }
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden',
      zIndex: 100,
    }}>
      {pieces.map((p, i) => <ConfettiPiece key={i} {...p} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HEART/COIN/STAR — small pixel HUD icons
// ─────────────────────────────────────────────────────────────
function PixCoin({ size = 16 }) {
  return (
    <svg className="pixel" width={size} height={size} viewBox="0 0 8 8">
      <rect x={2} y={0} width={4} height={1} fill="#2a1d12"/>
      <rect x={1} y={1} width={6} height={1} fill="#2a1d12"/>
      <rect x={0} y={2} width={1} height={4} fill="#2a1d12"/>
      <rect x={7} y={2} width={1} height={4} fill="#2a1d12"/>
      <rect x={1} y={6} width={6} height={1} fill="#2a1d12"/>
      <rect x={2} y={7} width={4} height={1} fill="#2a1d12"/>
      <rect x={1} y={2} width={6} height={4} fill="#e5a93a"/>
      <rect x={1} y={1} width={6} height={1} fill="#f4d35e"/>
      <rect x={3} y={2} width={1} height={4} fill="#a87a1a"/>
      <rect x={2} y={3} width={1} height={2} fill="#f4d35e"/>
    </svg>
  );
}

function PixHeart({ size = 16, color = '#d96f47' }) {
  return (
    <svg className="pixel" width={size} height={size} viewBox="0 0 8 8">
      <rect x={1} y={1} width={2} height={1} fill="#2a1d12"/>
      <rect x={5} y={1} width={2} height={1} fill="#2a1d12"/>
      <rect x={0} y={2} width={1} height={2} fill="#2a1d12"/>
      <rect x={3} y={2} width={2} height={1} fill="#2a1d12"/>
      <rect x={7} y={2} width={1} height={2} fill="#2a1d12"/>
      <rect x={1} y={4} width={1} height={1} fill="#2a1d12"/>
      <rect x={6} y={4} width={1} height={1} fill="#2a1d12"/>
      <rect x={2} y={5} width={1} height={1} fill="#2a1d12"/>
      <rect x={5} y={5} width={1} height={1} fill="#2a1d12"/>
      <rect x={3} y={6} width={2} height={1} fill="#2a1d12"/>
      <rect x={1} y={2} width={2} height={2} fill={color}/>
      <rect x={5} y={2} width={2} height={2} fill={color}/>
      <rect x={3} y={3} width={2} height={1} fill={color}/>
      <rect x={2} y={4} width={4} height={1} fill={color}/>
      <rect x={3} y={5} width={2} height={1} fill={color}/>
      <rect x={2} y={2} width={1} height={1} fill="#fff" opacity="0.5"/>
    </svg>
  );
}

function PixStar({ size = 16, color = '#e5a93a' }) {
  return (
    <svg className="pixel" width={size} height={size} viewBox="0 0 8 8">
      <rect x={3} y={0} width={2} height={1} fill="#2a1d12"/>
      <rect x={2} y={1} width={4} height={1} fill="#2a1d12"/>
      <rect x={0} y={2} width={8} height={1} fill="#2a1d12"/>
      <rect x={1} y={3} width={6} height={1} fill={color}/>
      <rect x={2} y={4} width={4} height={1} fill={color}/>
      <rect x={1} y={5} width={2} height={1} fill={color}/>
      <rect x={5} y={5} width={2} height={1} fill={color}/>
      <rect x={0} y={6} width={2} height={1} fill={color}/>
      <rect x={6} y={6} width={2} height={1} fill={color}/>
      <rect x={1} y={3} width={6} height={1} fill={color}/>
      <rect x={3} y={1} width={2} height={1} fill={color}/>
      <rect x={3} y={2} width={2} height={1} fill="#fff" opacity="0.4"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// XP BAR — chunky pixel progress bar
// ─────────────────────────────────────────────────────────────
function XPBar({ value, max, height = 12, color = '#6a9c4a', label }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height,
        background: '#fbf3df',
        border: '2px solid #2a1d12',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '2px 2px 0 #2a1d12',
      }}>
        <div style={{
          height: '100%',
          width: `${pct * 100}%`,
          background: color,
          transition: 'width 0.6s cubic-bezier(.5,1.5,.5,1)',
          position: 'relative',
        }}>
          {/* shine */}
          <div style={{
            position: 'absolute', top: 1, left: 0, right: 0, height: 2,
            background: 'rgba(255,255,255,0.4)',
          }} />
        </div>
      </div>
      {label && (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 9, marginTop: 3, color: '#5d4632',
          letterSpacing: '0.04em',
        }}>{label}</div>
      )}
    </div>
  );
}

export {
  PixelSprite, Avatar, AvatarBust, Room,
  PixelCheck, StampPolaroid, Confetti,
  PixCoin, PixHeart, PixStar, XPBar,
};
