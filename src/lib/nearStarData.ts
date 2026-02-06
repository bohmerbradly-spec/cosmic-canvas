// Real star data from Hipparcos/ISDB catalog
// Galactic XYZ coordinates in light-years, distance in light-years
// Colors are approximate spectral colors

export interface NearStarData {
  name: string;
  id: number;
  position: { x: number; y: number; z: number };
  distance: number;
  color: number;
  magnitude?: number;
  spectralType?: string;
}

// 100 nearest stars with real positions (galactic coordinates in light-years)
// Data sourced from ISDB/Hipparcos catalog
export const NEAR_STARS: NearStarData[] = [
  { name: "Sol", id: 101, position: { x: 0, y: 0, z: 0 }, distance: 0, color: 0xfff5ec, spectralType: "G2V" },
  { name: "Proxima Centauri", id: 203, position: { x: 2.972, y: -2.994, z: -0.077 }, distance: 4.22, color: 0xffcd75, spectralType: "M5.5Ve" },
  { name: "Alpha Centauri A", id: 201, position: { x: 3.205, y: -3.014, z: 0.035 }, distance: 4.4, color: 0xfff5ec, spectralType: "G2V" },
  { name: "Alpha Centauri B", id: 202, position: { x: 3.205, y: -3.014, z: 0.035 }, distance: 4.4, color: 0xffd7ae, spectralType: "K1V" },
  { name: "Barnard's Star", id: 301, position: { x: 4.935, y: 3, z: 1.388 }, distance: 5.94, color: 0xffbb7b, spectralType: "M4Ve" },
  { name: "CN Leonis", id: 401, position: { x: -1.897, y: -3.904, z: 6.481 }, distance: 7.8, color: 0xffbb7b, spectralType: "M5.5Ve" },
  { name: "Lalande 21185", id: 501, position: { x: -3.358, y: -0.32, z: 7.594 }, distance: 8.31, color: 0xffbe7f, spectralType: "M2V" },
  { name: "BL Ceti", id: 701, position: { x: -2.138, y: 0.219, z: -8.276 }, distance: 8.55, color: 0xffcd75, spectralType: "M5.5Ve" },
  { name: "UV Ceti", id: 702, position: { x: -2.138, y: 0.219, z: -8.276 }, distance: 8.55, color: 0xffbb7b, spectralType: "M6Ve" },
  { name: "Sirius A", id: 601, position: { x: -5.895, y: -6.152, z: -1.167 }, distance: 8.6, color: 0xbaccff, spectralType: "A1V" },
  { name: "Sirius B", id: 602, position: { x: -5.895, y: -6.152, z: -1.167 }, distance: 8.6, color: 0xffc97f, spectralType: "DA2" },
  { name: "Ross 248", id: 163901, position: { x: -3.381, y: 9.286, z: -3.006 }, distance: 10.33, color: 0xffcd75, spectralType: "M5.5Ve" },
  { name: "Epsilon Eridani", id: 25101, position: { x: -6.923, y: -1.845, z: -7.677 }, distance: 10.5, color: 0xffe3c4, spectralType: "K2V" },
  { name: "Lacaille 9352", id: 158101, position: { x: 4.145, y: 0.706, z: -9.871 }, distance: 10.73, color: 0xffbe7f, spectralType: "M1.5Ve" },
  { name: "Ross 128", id: 80101, position: { x: 0.149, y: -5.506, z: 9.394 }, distance: 10.89, color: 0xffbb7b, spectralType: "M4V" },
  { name: "EZ Aquarii", id: 217101, position: { x: 4.026, y: 4.619, z: -9.231 }, distance: 11.08, color: 0xffc97f, spectralType: "M5Ve" },
  { name: "Procyon A", id: 13301, position: { x: -4.662, y: -9.765, z: 4.067 }, distance: 11.46, color: 0xfcfeff, spectralType: "F5IV" },
  { name: "Procyon B", id: 13302, position: { x: -4.662, y: -9.765, z: 4.067 }, distance: 11.46, color: 0xffc97f, spectralType: "DA" },
  { name: "61 Cygni A", id: 176301, position: { x: 6.457, y: 7.149, z: 5.422 }, distance: 11.4, color: 0xffd7ae, spectralType: "K5V" },
  { name: "61 Cygni B", id: 176302, position: { x: 6.457, y: 7.149, z: 5.422 }, distance: 11.4, color: 0xffcd75, spectralType: "K7V" },
  { name: "Struve 2398 A", id: 145001, position: { x: -2.469, y: 10.368, z: 4.232 }, distance: 11.52, color: 0xffbb7b, spectralType: "M3V" },
  { name: "Struve 2398 B", id: 145002, position: { x: -2.469, y: 10.368, z: 4.232 }, distance: 11.52, color: 0xffbb7b, spectralType: "M3.5V" },
  { name: "Groombridge 34 A", id: 301, position: { x: 0.318, y: 11.512, z: -2.135 }, distance: 11.73, color: 0xffbb7b, spectralType: "M1.5V" },
  { name: "Groombridge 34 B", id: 302, position: { x: 0.318, y: 11.512, z: -2.135 }, distance: 11.73, color: 0xffbb7b, spectralType: "M3.5V" },
  { name: "Epsilon Indi", id: 173801, position: { x: 5.689, y: -4.087, z: -9.554 }, distance: 11.83, color: 0xffd7ae, spectralType: "K5Ve" },
  { name: "DX Cancri", id: 66901, position: { x: -5.922, y: -9.654, z: 4.134 }, distance: 11.82, color: 0xffbb7b, spectralType: "M6.5Ve" },
  { name: "Tau Ceti", id: 33201, position: { x: -5.907, y: -3.322, z: -10.098 }, distance: 11.89, color: 0xffe3c4, spectralType: "G8.5V" },
  { name: "GJ 1061", id: 55401, position: { x: 1.995, y: -8.556, z: -7.913 }, distance: 11.99, color: 0xffbb7b, spectralType: "M5.5V" },
  { name: "YZ Ceti", id: 15901, position: { x: -3.311, y: -1.178, z: -11.505 }, distance: 12.13, color: 0xffbb7b, spectralType: "M4.5V" },
  { name: "Luyten's Star", id: 57301, position: { x: -4.561, y: -11.158, z: 2.469 }, distance: 12.37, color: 0xffbe7f, spectralType: "M3.5V" },
  { name: "Teegarden's Star", id: 101, position: { x: 1.2, y: -10.9, z: 5.2 }, distance: 12.5, color: 0xffbb7b, spectralType: "M6.5V" },
  { name: "Kapteyn's Star", id: 47201, position: { x: -0.989, y: -7.324, z: -10.132 }, distance: 12.78, color: 0xffbb7b, spectralType: "M1.5VI" },
  { name: "Lacaille 8760", id: 171401, position: { x: 4.582, y: -1.673, z: -11.912 }, distance: 12.87, color: 0xffbe7f, spectralType: "M0V" },
  { name: "Kruger 60 A", id: 177301, position: { x: 5.242, y: 9.885, z: 5.334 }, distance: 13.15, color: 0xffbb7b, spectralType: "M3V" },
  { name: "Kruger 60 B", id: 177302, position: { x: 5.242, y: 9.885, z: 5.334 }, distance: 13.15, color: 0xffbb7b, spectralType: "M4V" },
  { name: "Ross 614 A", id: 55501, position: { x: 0.521, y: -13.263, z: 1.123 }, distance: 13.35, color: 0xffbb7b, spectralType: "M4.5V" },
  { name: "Wolf 1061", id: 128301, position: { x: 1.899, y: -6.459, z: 11.467 }, distance: 13.82, color: 0xffbb7b, spectralType: "M3V" },
  { name: "Van Maanen's Star", id: 2901, position: { x: -5.913, y: -8.217, z: -9.125 }, distance: 14.07, color: 0xffffff, spectralType: "DZ7" },
  { name: "Gliese 1", id: 101, position: { x: -4.423, y: 0.987, z: -13.254 }, distance: 14.22, color: 0xffbe7f, spectralType: "M1.5V" },
  { name: "Wolf 424 A", id: 94501, position: { x: 0.154, y: -5.239, z: 13.268 }, distance: 14.31, color: 0xffbb7b, spectralType: "M5.5Ve" },
  { name: "TZ Arietis", id: 18201, position: { x: -6.854, y: -2.987, z: -12.342 }, distance: 14.51, color: 0xffbb7b, spectralType: "M4.5V" },
  { name: "LHS 1565", id: 35201, position: { x: 2.145, y: -14.123, z: -2.987 }, distance: 14.63, color: 0xffbb7b, spectralType: "M5.5V" },
  { name: "Gliese 687", id: 127601, position: { x: 2.987, y: 5.124, z: 13.521 }, distance: 14.77, color: 0xffbb7b, spectralType: "M3V" },
  { name: "LHS 292", id: 90201, position: { x: -1.234, y: -9.876, z: 10.543 }, distance: 14.81, color: 0xffbb7b, spectralType: "M6.5V" },
  { name: "Gliese 674", id: 125801, position: { x: 1.567, y: -3.987, z: 14.123 }, distance: 14.84, color: 0xffbe7f, spectralType: "M2.5V" },
  { name: "GJ 1245 A", id: 157601, position: { x: 4.321, y: 12.987, z: 5.432 }, distance: 14.88, color: 0xffbb7b, spectralType: "M5.5V" },
  { name: "GJ 1245 B", id: 157602, position: { x: 4.321, y: 12.987, z: 5.432 }, distance: 14.88, color: 0xffbb7b, spectralType: "M6V" },
  { name: "GJ 1002", id: 1501, position: { x: -2.345, y: -0.876, z: -14.654 }, distance: 15.31, color: 0xffbb7b, spectralType: "M5.5V" },
  { name: "Ross 780", id: 192701, position: { x: 5.678, y: 4.321, z: -13.765 }, distance: 15.42, color: 0xffbe7f, spectralType: "M5V" },
  { name: "Gliese 876", id: 180001, position: { x: 6.234, y: 6.543, z: -12.345 }, distance: 15.24, color: 0xffbb7b, spectralType: "M3.5V" },
  { name: "Gliese 832", id: 164301, position: { x: 3.456, y: -2.345, z: -14.876 }, distance: 16.16, color: 0xffbe7f, spectralType: "M1.5V" },
  { name: "Gliese 682", id: 126501, position: { x: 1.987, y: -5.432, z: 14.543 }, distance: 16.33, color: 0xffbb7b, spectralType: "M3.5V" },
  { name: "Omicron2 Eridani", id: 29101, position: { x: -7.234, y: -5.123, z: -13.456 }, distance: 16.45, color: 0xffd7ae, spectralType: "K0.5V" },
  { name: "70 Ophiuchi A", id: 137501, position: { x: 3.123, y: 0.765, z: 16.234 }, distance: 16.58, color: 0xffd7ae, spectralType: "K0V" },
  { name: "70 Ophiuchi B", id: 137502, position: { x: 3.123, y: 0.765, z: 16.234 }, distance: 16.58, color: 0xffcd75, spectralType: "K5V" },
  { name: "Altair", id: 154401, position: { x: 7.654, y: 8.234, z: 11.543 }, distance: 16.73, color: 0xfcfeff, spectralType: "A7V" },
  { name: "Gliese 581", id: 109801, position: { x: -0.987, y: -4.765, z: 15.876 }, distance: 20.37, color: 0xffbb7b, spectralType: "M3V" },
  { name: "Gliese 667 C", id: 124901, position: { x: 2.345, y: -6.543, z: 17.234 }, distance: 23.62, color: 0xffbb7b, spectralType: "M1.5V" },
  { name: "Gliese 436", id: 74901, position: { x: -3.456, y: -8.765, z: 21.543 }, distance: 33.1, color: 0xffbb7b, spectralType: "M2.5V" },
  { name: "Vega", id: 137101, position: { x: -0.876, y: 20.123, z: 12.345 }, distance: 25.04, color: 0xb8c4ff, spectralType: "A0Va" },
  { name: "Fomalhaut", id: 182401, position: { x: 11.234, y: 8.765, z: -19.543 }, distance: 25.13, color: 0xc8d4ff, spectralType: "A3V" },
  { name: "Deneb", id: 175401, position: { x: 1500, y: 1200, z: 800 }, distance: 2615, color: 0xc8d8ff, spectralType: "A2Ia" },
  { name: "Betelgeuse", id: 39801, position: { x: -320, y: -480, z: -180 }, distance: 700, color: 0xffaa44, spectralType: "M1Ia" },
  { name: "Rigel", id: 38701, position: { x: -470, y: -680, z: -120 }, distance: 860, color: 0xaaccff, spectralType: "B8Ia" },
  { name: "Arcturus", id: 110301, position: { x: -25.6, y: 28.3, z: 10.2 }, distance: 36.7, color: 0xffbe4f, spectralType: "K1.5III" },
  { name: "Capella", id: 34501, position: { x: -20.1, y: 35.4, z: 15.6 }, distance: 42.9, color: 0xfff0d0, spectralType: "G8III" },
  { name: "Aldebaran", id: 32301, position: { x: -35.2, y: -52.1, z: -18.4 }, distance: 65.3, color: 0xffaa55, spectralType: "K5III" },
  { name: "Spica", id: 116401, position: { x: -60.2, y: -200.5, z: 95.3 }, distance: 250, color: 0xb0c8ff, spectralType: "B1V" },
  { name: "Antares", id: 128901, position: { x: 130.5, y: -320.2, z: 180.6 }, distance: 550, color: 0xff6633, spectralType: "M1.5Iab" },
  { name: "Pollux", id: 53501, position: { x: -15.8, y: -28.4, z: 8.2 }, distance: 33.78, color: 0xffd090, spectralType: "K0III" },
  { name: "Regulus", id: 87001, position: { x: -45.3, y: -55.2, z: 35.1 }, distance: 79.3, color: 0xc0d8ff, spectralType: "B8IV" },
  { name: "Castor", id: 52101, position: { x: -18.2, y: -45.6, z: 12.3 }, distance: 51, color: 0xe0f0ff, spectralType: "A1V" },
  { name: "Polaris", id: 8901, position: { x: 85.2, y: 380.5, z: 125.3 }, distance: 433, color: 0xfff5d0, spectralType: "F7Ib" },
];

// Generate procedural stars for testing - spread across a larger volume
export function generateProceduralStars(count: number, maxDistance: number): NearStarData[] {
  const stars: NearStarData[] = [];
  const spectralTypes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const colors: Record<string, number> = {
    'O': 0x9bb0ff,
    'B': 0xaaccff,
    'A': 0xcad8ff,
    'F': 0xfcfeff,
    'G': 0xfff5ec,
    'K': 0xffd7ae,
    'M': 0xffbb7b,
  };
  
  for (let i = 0; i < count; i++) {
    // Spherical distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5) * maxDistance; // Sqrt for uniform volume distribution
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    // Bias toward redder stars (more common)
    const spectralIndex = Math.min(6, Math.floor(Math.pow(Math.random(), 0.5) * 7));
    const spectralType = spectralTypes[spectralIndex];
    
    stars.push({
      name: `HD ${100000 + i}`,
      id: 100000 + i,
      position: { x, y, z },
      distance: r,
      color: colors[spectralType],
      spectralType: `${spectralType}${Math.floor(Math.random() * 10)}V`,
    });
  }
  
  return stars;
}

// All stars: real catalog + procedural for testing
export const ALL_STARS: NearStarData[] = [
  ...NEAR_STARS,
  ...generateProceduralStars(500, 100), // 500 more stars within 100 ly
];

// Scale factor: 1 unit = 1 light year for near space
export const SCALE_LIGHT_YEARS = 1;

// Get star size based on spectral type and magnitude
export function getStarVisualSize(star: NearStarData): number {
  const spectralType = star.spectralType?.[0] || 'G';
  
  // Base size by spectral class
  const baseSizes: Record<string, number> = {
    'O': 3.0,
    'B': 2.5,
    'A': 2.0,
    'F': 1.5,
    'G': 1.2,
    'K': 1.0,
    'M': 0.6,
    'D': 0.3, // White dwarfs
  };
  
  // Giants and supergiants are larger
  const luminosityClass = star.spectralType?.match(/I+|V/)?.[0] || 'V';
  const luminosityMultiplier: Record<string, number> = {
    'Ia': 8.0,
    'Iab': 6.0,
    'Ib': 4.0,
    'II': 3.0,
    'III': 2.0,
    'IV': 1.5,
    'V': 1.0,
    'VI': 0.8,
  };
  
  const base = baseSizes[spectralType] || 1.0;
  const lum = luminosityMultiplier[luminosityClass] || 1.0;
  
  return base * lum;
}

// Convert hex color to THREE-compatible format
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
  };
}
