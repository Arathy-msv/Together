import type { ReactNode } from 'react'
import { COVERS } from '../data/covers.ts'
import type { FlowerKind } from '../lib/types.ts'

function Sky({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F8E7B8" />
      <stop offset="45%" stopColor="#F7D7A2" />
      <stop offset="100%" stopColor="#B9DDF6" />
    </linearGradient>
  )
}

function Tree({ x, y, scale = 1 }: { x: number | string; y: number | string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-7" y="20" width="14" height="36" rx="4" fill="#8A5434" />
      <circle cx="0" cy="8" r="28" fill="#2C7A3A" />
      <circle cx="-18" cy="16" r="18" fill="#3C9148" />
      <circle cx="18" cy="18" r="16" fill="#226532" />
      <circle cx="2" cy="-6" r="14" fill="#67A84A" />
    </g>
  )
}

function Flower({ x, y, petal, center = '#F6C445' }: { x: number | string; y: number | string; petal: string; center?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-1.5" y="0" width="3" height="16" fill="#3E8F45" />
      <circle cx="0" cy="0" r="4" fill={center} />
      <circle cx="-6" cy="1" r="4" fill={petal} />
      <circle cx="6" cy="1" r="4" fill={petal} />
      <circle cx="0" cy="-6" r="4" fill={petal} />
      <circle cx="0" cy="0" r="2.4" fill="#E7A317" />
    </g>
  )
}

function Bush({ x, y }: { x: number | string; y: number | string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="10" rx="46" ry="16" fill="#2F7A3E" />
      <ellipse cx="-20" cy="4" rx="24" ry="14" fill="#3E9148" />
      <ellipse cx="18" cy="2" rx="26" ry="15" fill="#26733A" />
      <Flower x="-18" y="-2" petal="#F48FB1" />
      <Flower x="4" y="-8" petal="#FF8A65" />
      <Flower x="22" y="0" petal="#F6C445" />
    </g>
  )
}

export function CoverArt({ id, label }: { id: string; label?: string }) {
  const cover = COVERS.find((item) => item.id === id) ?? COVERS[0]
  return (
    <svg className="cover-svg" viewBox="0 0 640 420" role="img" aria-label={label ?? cover.alt} preserveAspectRatio="xMidYMid slice">
      <Scene id={cover.id} />
    </svg>
  )
}

function Scene({ id }: { id: string }) {
  switch (id) {
    case 'books':
      return <BooksScene />
    case 'readers':
      return <ReadersScene />
    case 'garden':
      return <GardenScene />
    case 'winter':
      return <WinterScene />
    case 'nook':
      return <NookScene />
    default:
      return <LibraryScene />
  }
}

function Ground() {
  return (
    <>
      <path d="M0 300c80 20 140-10 220 8 70 16 120-20 190-6 50 10 90 24 230 8v110H0Z" fill="#8FBF63" />
      <path d="M0 330c120 18 180-8 280 10 90 16 140-8 220 6 40 6 80 16 140 8v66H0Z" fill="#6FA84E" />
    </>
  )
}

function LibraryScene() {
  return (
    <>
      <defs>
        <Sky id="sky-library" />
      </defs>
      <rect width="640" height="420" fill="url(#sky-library)" />
      <circle cx="540" cy="78" r="36" fill="#F6C445" />
      <Tree x="86" y="168" scale={1.35} />
      <Tree x="560" y="150" scale={1.15} />
      <Ground />
      <g transform="translate(168 148)">
        <rect x="20" y="70" width="270" height="130" rx="6" fill="#F6E2B8" />
        <path d="M10 78 155 18l155 60Z" fill="#E07A4E" />
        <rect x="118" y="128" width="70" height="72" rx="4" fill="#8D5A3C" />
        <rect x="46" y="108" width="48" height="40" rx="3" fill="#8ECAE6" />
        <rect x="214" y="108" width="48" height="40" rx="3" fill="#8ECAE6" />
        <path d="M118 128h70" stroke="#F3C34A" strokeWidth="4" />
        <text x="153" y="58" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="18" fontWeight="800">
          LIBRARY
        </text>
      </g>
      <g transform="translate(430 210)">
        <rect x="0" y="0" width="78" height="58" rx="4" fill="#C9864A" />
        <text x="39" y="22" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="9" fontWeight="800">
          A BRIGHTER
        </text>
        <text x="39" y="36" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="9" fontWeight="800">
          TOMORROW
        </text>
        <text x="39" y="50" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="9" fontWeight="800">
          THROUGH BOOKS
        </text>
      </g>
      <Bush x="150" y="300" />
      <Bush x="470" y="312" />
      <Flower x="250" y="340" petal="#F48FB1" />
      <Flower x="300" y="348" petal="#CE93D8" />
      <Flower x="360" y="336" petal="#F6C445" />
    </>
  )
}

function BooksScene() {
  const books = [
    { y: 250, w: 280, h: 46, fill: '#2F6B4F', label: 'BELONG' },
    { y: 204, w: 250, h: 46, fill: '#E07A4E', label: 'GROW' },
    { y: 158, w: 220, h: 46, fill: '#3D7EA6', label: 'LEARN' },
    { y: 112, w: 190, h: 46, fill: '#F0B429', label: 'READ' },
  ]
  return (
    <>
      <defs>
        <Sky id="sky-books" />
      </defs>
      <rect width="640" height="420" fill="url(#sky-books)" />
      <circle cx="100" cy="80" r="28" fill="#F6C445" />
      <Ground />
      <Bush x="90" y="300" />
      <Bush x="540" y="305" />
      {books.map((book) => (
        <g key={book.label}>
          <rect x={(640 - book.w) / 2} y={book.y} width={book.w} height={book.h} rx="8" fill={book.fill} />
          <text
            x="320"
            y={book.y + 30}
            textAnchor="middle"
            fill="#FFF8EC"
            fontFamily="Nunito, sans-serif"
            fontSize="20"
            fontWeight="800"
          >
            {book.label}
          </text>
        </g>
      ))}
    </>
  )
}

function Person({
  x,
  y,
  shirt,
  hair,
  scale = 1,
}: {
  x: number | string
  y: number | string
  shirt: string
  hair: string
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="52" rx="18" ry="6" fill="rgba(22,53,44,.15)" />
      <path d="M-16 16h32l-6 32h-20z" fill={shirt} />
      <circle cx="0" cy="4" r="12" fill="#F4C7A8" />
      <path d="M-12 2c1-14 23-14 24 0-2 6-8 8-12 8s-10-2-12-8z" fill={hair} />
    </g>
  )
}

function ReadersScene() {
  return (
    <>
      <defs>
        <Sky id="sky-readers" />
      </defs>
      <rect width="640" height="420" fill="url(#sky-readers)" />
      <circle cx="520" cy="70" r="34" fill="#F6C445" />
      <Tree x="120" y="150" scale={1.5} />
      <Tree x="540" y="170" scale={1.1} />
      <Ground />
      <rect x="210" y="250" width="230" height="18" rx="6" fill="#C9864A" />
      <Person x="250" y="196" shirt="#3D7EA6" hair="#3B2A22" />
      <Person x="320" y="190" shirt="#F0B429" hair="#1B1B1B" scale={1.05} />
      <Person x="390" y="198" shirt="#E07A4E" hair="#6B3F2A" />
      <rect x="286" y="236" width="28" height="18" rx="2" fill="#F7F1E4" />
      <rect x="348" y="240" width="26" height="16" rx="2" fill="#F7F1E4" />
      <Bush x="80" y="318" />
      <Flower x="470" y="330" petal="#F48FB1" />
      <Flower x="510" y="342" petal="#CE93D8" />
    </>
  )
}

function GardenScene() {
  return (
    <>
      <defs>
        <Sky id="sky-garden" />
      </defs>
      <rect width="640" height="420" fill="url(#sky-garden)" />
      <circle cx="90" cy="74" r="32" fill="#F6C445" />
      <path d="M0 250c80-40 160-20 240-50 90-34 150-10 240 10 70 16 110 8 160-10v220H0Z" fill="#7EBF5A" />
      <path d="M0 300c100 10 180-20 300 0 80 14 160-10 340 8v112H0Z" fill="#67A84A" />
      <ellipse cx="250" cy="318" rx="90" ry="26" fill="#6B4128" />
      <Person x="250" y="210" shirt="#F4EFE4" hair="#2A211C" scale={1.15} />
      <ellipse cx="292" cy="214" rx="22" ry="8" fill="#E7C07A" />
      <rect x="430" y="176" width="16" height="70" fill="#8A5434" />
      <rect x="392" y="150" width="92" height="64" rx="6" fill="#C9864A" />
      <text x="438" y="176" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="11" fontWeight="800">
        Grow
      </text>
      <text x="438" y="192" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="11" fontWeight="800">
        Brighter
      </text>
      <text x="438" y="208" textAnchor="middle" fill="#FFF8E8" fontFamily="Nunito, sans-serif" fontSize="11" fontWeight="800">
        Together
      </text>
      <Flower x="150" y="300" petal="#F6C445" />
      <Flower x="190" y="286" petal="#F48FB1" />
      <Flower x="360" y="292" petal="#FF8A65" />
      <Flower x="520" y="310" petal="#F6C445" />
      <Flower x="560" y="292" petal="#CE93D8" />
    </>
  )
}

function WinterScene() {
  return (
    <>
      <rect width="640" height="420" fill="#D7E7F5" />
      <circle cx="520" cy="80" r="30" fill="#FFF6D8" />
      <path d="M0 280c90 16 150-20 250-4 90 14 140-24 230-6 50 8 90 20 160 8v142H0Z" fill="#F7FBFF" />
      <path d="M40 250 90 190h70l40 60Z" fill="#E7EEF6" />
      <rect x="70" y="250" width="100" height="70" fill="#F4E7D4" />
      <rect x="96" y="270" width="28" height="28" fill="#F6C445" />
      <g transform="translate(230 210)">
        <rect width="150" height="110" rx="10" fill="#C96B4A" />
        <rect x="12" y="16" width="126" height="78" rx="6" fill="#F8E2C8" />
        <text x="75" y="48" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="13" fontWeight="800">
          WARMER
        </text>
        <text x="75" y="68" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="13" fontWeight="800">
          WINTERS
        </text>
      </g>
      <path d="M430 230c20-40 50-40 70 0 10 20-8 36-35 36s-45-16-35-36z" fill="#E07A4E" />
      <path d="M500 214c18-36 48-36 64 0 8 18-10 34-32 34s-40-16-32-34z" fill="#3D7EA6" />
      <circle cx="120" cy="70" r="3" fill="white" />
      <circle cx="180" cy="110" r="2.5" fill="white" />
      <circle cx="300" cy="60" r="3" fill="white" />
      <circle cx="360" cy="120" r="2" fill="white" />
      <circle cx="80" cy="140" r="2" fill="white" />
    </>
  )
}

function NookScene() {
  return (
    <>
      <rect width="640" height="420" fill="#F6E7C8" />
      <rect x="40" y="40" width="250" height="250" rx="8" fill="#8ECAE6" />
      <path d="M40 170h250" stroke="#F7F1E4" strokeWidth="10" />
      <path d="M165 40v250" stroke="#F7F1E4" strokeWidth="10" />
      <rect x="330" y="70" width="250" height="280" rx="8" fill="#6B3F2A" />
      {[0, 1, 2, 3, 4].map((row) => (
        <g key={row} transform={`translate(350 ${100 + row * 46})`}>
          <rect width="28" height="36" fill="#E07A4E" />
          <rect x="32" width="24" height="36" fill="#F0B429" />
          <rect x="60" width="30" height="36" fill="#2F6B4F" />
          <rect x="94" width="22" height="36" fill="#3D7EA6" />
          <rect x="120" width="28" height="36" fill="#C96B4A" />
          <rect x="152" width="26" height="36" fill="#67A84A" />
        </g>
      ))}
      <ellipse cx="150" cy="340" rx="70" ry="18" fill="#67A84A" />
      <Flower x="120" y="318" petal="#F48FB1" />
      <Flower x="170" y="310" petal="#F6C445" />
    </>
  )
}

export function HeroScene() {
  return (
    <svg className="hero-svg" viewBox="0 0 720 520" role="img" aria-label="Neighbours gardening and reading together outside a community school">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE7A8" />
          <stop offset="55%" stopColor="#F7D59A" />
          <stop offset="100%" stopColor="#C5E4F8" />
        </linearGradient>
      </defs>
      <rect width="720" height="520" rx="28" fill="url(#hero-sky)" />
      <circle cx="610" cy="70" r="36" fill="#F6C445" />
      <Tree x="70" y="150" scale={1.4} />
      <Tree x="640" y="120" scale={1.2} />
      <path d="M0 300c90-30 170-10 250 10 90 22 140-30 240-10 70 14 120 20 230 0v220H0Z" fill="#8FCB62" />
      <path d="M0 360c120 20 200-16 320 8 100 20 180-10 400 16v136H0Z" fill="#6AAA49" />
      <g transform="translate(300 168)">
        <rect x="16" y="62" width="210" height="120" fill="#F4DEBA" />
        <path d="M0 70 120 16l124 54Z" fill="#E07A4E" />
        <rect x="40" y="96" width="42" height="34" fill="#8ECAE6" />
        <rect x="150" y="96" width="42" height="34" fill="#8ECAE6" />
        <rect x="96" y="112" width="40" height="70" fill="#8D5A3C" />
        <path d="M250 40v-28" stroke="#8A5434" strokeWidth="4" />
        <path d="M250 18h22l-6 10h6l-22 18z" fill="#E15A48" />
      </g>
      <rect x="470" y="250" width="120" height="70" rx="6" fill="#F7F1E4" stroke="#1B4A3C" strokeWidth="3" />
      <text x="530" y="278" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="12" fontWeight="800">
        A STRONGER
      </text>
      <text x="530" y="296" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="12" fontWeight="800">
        BRIGHTER
      </text>
      <text x="530" y="312" textAnchor="middle" fill="#1B4A3C" fontFamily="Nunito, sans-serif" fontSize="11" fontWeight="800">
        COMMUNITY
      </text>
      <Person x="180" y="300" shirt="#2F6B4F" hair="#2A211C" />
      <Person x="240" y="292" shirt="#F0B429" hair="#6B3F2A" scale={0.9} />
      <Person x="400" y="300" shirt="#3D7EA6" hair="#1B1B1B" />
      <Person x="560" y="310" shirt="#E07A4E" hair="#3B2A22" scale={0.92} />
      <ellipse cx="250" cy="390" rx="70" ry="16" fill="#6B4128" />
      <Flower x="140" y="400" petal="#F48FB1" />
      <Flower x="200" y="418" petal="#F6C445" />
      <Flower x="330" y="410" petal="#FF8A65" />
      <Flower x="480" y="400" petal="#CE93D8" />
      <Flower x="620" y="390" petal="#F6C445" />
    </svg>
  )
}

export function FlowerGlyph({ kind, size = 72 }: { kind: FlowerKind; size?: number }) {
  const palette =
    kind === 'sunflower'
      ? { petal: '#F6C445', center: '#E39B12' }
      : kind === 'marigold'
        ? { petal: '#F08A2C', center: '#C45C12' }
        : { petal: '#8E6CC9', center: '#F2E6FF' }
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="34" r="10" fill={palette.petal} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="40"
          cy="16"
          rx="7"
          ry="12"
          fill={palette.petal}
          transform={`rotate(${angle} 40 34)`}
        />
      ))}
      <circle cx="40" cy="34" r="7" fill={palette.center} />
      <rect x="37" y="42" width="6" height="24" rx="3" fill="#3E8F45" />
      <ellipse cx="28" cy="56" rx="10" ry="5" fill="#67A84A" transform="rotate(-30 28 56)" />
      <ellipse cx="54" cy="58" rx="10" ry="5" fill="#2F7A3A" transform="rotate(30 54 58)" />
    </svg>
  )
}

export function ScenicBand() {
  return (
    <svg className="scenic-band" viewBox="0 0 1200 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 90c80-40 140-20 220 0 90 22 120-30 210-10 80 18 140 8 210-16 70-24 120-10 180 8 70 20 140 10 200-8 40-12 80-8 180 10v106H0Z" fill="#7EBF5A" />
      <path d="M0 120c140 10 180-24 300 0 110 22 160-16 280 6 90 16 160-8 260 10 80 14 140 4 360-6v50H0Z" fill="#67A84A" />
      <g transform="translate(80 70)">
        <rect x="30" y="30" width="90" height="40" fill="#F4DEBA" />
        <path d="M20 34 75 8l60 26Z" fill="#E07A4E" />
        <path d="M118 18v-16" stroke="#8A5434" strokeWidth="3" />
        <path d="M118 6h12l-4 6 8 0-16 12z" fill="#E15A48" />
      </g>
      <circle cx="980" cy="48" r="22" fill="#F6C445" />
      <Tree x="240" y="40" scale={0.7} />
      <Tree x="760" y="36" scale={0.8} />
      <Flower x="420" y="130" petal="#F48FB1" />
      <Flower x="470" y="142" petal="#F6C445" />
      <Flower x="640" y="136" petal="#FF8A65" />
    </svg>
  )
}

export function LeafMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28c0-7 5-11 10-13.5C24.5 21 20.5 25 16 28Z" fill="#8FCB6A" />
      <path d="M16 28c0-7-5-11-10-13.5C7.5 21 11.5 25 16 28Z" fill="#D6E86A" />
      <path d="M16 28V7" stroke="#F3C34A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  const paths: Record<string, ReactNode> = {
    heart: <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />,
    game: (
      <>
        <rect x="3" y="8" width="18" height="10" rx="4" />
        <path d="M8 13h4M10 11v4M16 12h.01M18 15h.01" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="10" width="18" height="10" rx="1.5" />
        <path d="M3 14h18M12 10v10M12 10c-2-4-6-3-5 0M12 10c2-4 6-3 5 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" />
        <circle cx="10" cy="8" r="3" />
        <path d="M20 20v-1a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
      </>
    ),
    check: <path d="M5 12.5 9.2 17 19 7" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    back: <path d="M19 12H5M11 6l-6 6 6 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 8h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15v-3M12 15V8M16 15v-5" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </>
    ),
    home: (
      <>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M7 10.5V19h10v-8.5" />
      </>
    ),
  }
  return <svg {...common}>{paths[name] ?? paths.info}</svg>
}
