import * as THREE from 'three';

// Stellar classification based on temperature (Kelvin)
// O: 30,000-50,000K (blue)
// B: 10,000-30,000K (blue-white)
// A: 7,500-10,000K (white)
// F: 6,000-7,500K (yellow-white)
// G: 5,200-6,000K (yellow - like our Sun)
// K: 3,700-5,200K (orange)
// M: 2,400-3,700K (red)

export interface StarData {
  position: THREE.Vector3;
  color: THREE.Color;
  brightness: number;
  size: number;
  spectralClass: string;
  twinklePhase: number;
  twinkleSpeed: number;
}

// Stellar classification colors (RGB approximations of blackbody radiation)
export const SPECTRAL_COLORS = {
  O: new THREE.Color(0.6, 0.7, 1.0),    // Blue
  B: new THREE.Color(0.7, 0.8, 1.0),    // Blue-white
  A: new THREE.Color(0.9, 0.92, 1.0),   // White
  F: new THREE.Color(1.0, 0.98, 0.9),   // Yellow-white
  G: new THREE.Color(1.0, 0.95, 0.7),   // Yellow
  K: new THREE.Color(1.0, 0.8, 0.5),    // Orange
  M: new THREE.Color(1.0, 0.6, 0.4),    // Red
};

// Star distribution by spectral class (realistic proportions)
// M stars are most common, O stars are extremely rare
export const SPECTRAL_DISTRIBUTION = {
  O: 0.00003,
  B: 0.0013,
  A: 0.006,
  F: 0.03,
  G: 0.076,
  K: 0.121,
  M: 0.7645,
};

// Generate random spectral class based on realistic distribution
export function getRandomSpectralClass(): string {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [spectralClass, probability] of Object.entries(SPECTRAL_DISTRIBUTION)) {
    cumulative += probability;
    if (rand < cumulative) {
      return spectralClass;
    }
  }
  return 'M'; // Default to most common
}

// Get color with subtle variation within spectral class
export function getStarColor(spectralClass: string, variation: number = 0.1): THREE.Color {
  const baseColor = SPECTRAL_COLORS[spectralClass as keyof typeof SPECTRAL_COLORS] || SPECTRAL_COLORS.G;
  const color = baseColor.clone();
  
  // Add subtle random variation
  color.r += (Math.random() - 0.5) * variation;
  color.g += (Math.random() - 0.5) * variation;
  color.b += (Math.random() - 0.5) * variation;
  
  // Clamp values
  color.r = Math.max(0, Math.min(1, color.r));
  color.g = Math.max(0, Math.min(1, color.g));
  color.b = Math.max(0, Math.min(1, color.b));
  
  return color;
}

// Brightness distribution (apparent magnitude simulation)
// Most stars are dim, few are bright
export function getRandomBrightness(spectralClass: string): number {
  // Brighter classes tend to be more luminous
  const baseLuminosity: Record<string, number> = {
    O: 0.9,
    B: 0.75,
    A: 0.6,
    F: 0.5,
    G: 0.4,
    K: 0.3,
    M: 0.2,
  };
  
  const base = baseLuminosity[spectralClass] || 0.3;
  // Power law distribution - most stars are dim
  const brightness = base * Math.pow(Math.random(), 2);
  return Math.max(0.05, brightness);
}

// Generate star position on a sphere with optional galactic concentration
export function generateStarPosition(
  radius: number,
  galacticConcentration: number = 0.3
): THREE.Vector3 {
  // Spherical coordinates with optional galactic plane concentration
  const theta = Math.random() * Math.PI * 2; // Longitude
  
  // Latitude - can be concentrated toward galactic plane (equator)
  let phi: number;
  if (Math.random() < galacticConcentration) {
    // Concentrate toward galactic plane (phi ≈ π/2)
    phi = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
  } else {
    // Uniform distribution
    phi = Math.acos(2 * Math.random() - 1);
  }
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// Generate a complete star dataset
export function generateStarField(
  count: number,
  radius: number,
  options: {
    galacticConcentration?: number;
    colorVariation?: number;
    includeBrightStars?: boolean;
  } = {}
): StarData[] {
  const {
    galacticConcentration = 0.3,
    colorVariation = 0.1,
    includeBrightStars = true,
  } = options;

  const stars: StarData[] = [];
  
  for (let i = 0; i < count; i++) {
    const spectralClass = getRandomSpectralClass();
    const position = generateStarPosition(radius, galacticConcentration);
    const color = getStarColor(spectralClass, colorVariation);
    let brightness = getRandomBrightness(spectralClass);
    
    // Occasionally add very bright stars
    if (includeBrightStars && Math.random() < 0.001) {
      brightness = 0.8 + Math.random() * 0.2;
    }
    
    // Size correlates somewhat with brightness
    const size = 0.5 + brightness * 1.5 + Math.random() * 0.5;
    
    stars.push({
      position,
      color,
      brightness,
      size,
      spectralClass,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 2,
    });
  }
  
  return stars;
}

// Milky Way band intensity at a given position
export function getMilkyWayIntensity(position: THREE.Vector3): number {
  // Galactic plane is at y ≈ 0
  const normalizedY = position.y / position.length();
  const planeDistance = Math.abs(normalizedY);
  
  // Gaussian falloff from galactic plane
  const bandWidth = 0.15;
  const intensity = Math.exp(-(planeDistance * planeDistance) / (2 * bandWidth * bandWidth));
  
  // Add some variation along the band
  const angle = Math.atan2(position.z, position.x);
  const variation = 0.3 + 0.7 * Math.pow(Math.sin(angle * 2 + 0.5) * 0.5 + 0.5, 2);
  
  return intensity * variation;
}

// Scintillation (twinkling) effect
export function calculateScintillation(
  phase: number,
  speed: number,
  time: number,
  intensity: number = 0.2
): number {
  // Multiple frequency components for realistic twinkling
  const t = time * speed;
  const flicker = 
    Math.sin(t + phase) * 0.3 +
    Math.sin(t * 1.7 + phase * 0.7) * 0.2 +
    Math.sin(t * 2.3 + phase * 1.3) * 0.15 +
    Math.sin(t * 3.1 + phase * 2.1) * 0.1;
  
  return 1 + flicker * intensity;
}
