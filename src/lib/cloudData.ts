import * as THREE from 'three';

/**
 * Cloud Cell Data - Procedural cloud volumes in the sky
 * These clouds exist at world positions and transition from 2D skybox
 * projections to 3D volumetric geometry when approached.
 */
export interface CloudCellData {
  id: string;
  position: THREE.Vector3; // World position (x, y=altitude, z)
  size: THREE.Vector3;     // Width, height, depth
  density: number;         // 0-1 cloud density
  type: 'cumulus' | 'stratus' | 'cirrus' | 'cumulonimbus';
  seed: number;            // For procedural generation
}

// Cloud layer altitudes (in world units)
export const CLOUD_ALTITUDES = {
  cirrus: 8000,      // High wispy clouds
  cumulus: 2000,     // Puffy fair-weather clouds
  stratus: 1500,     // Flat layered clouds
  cumulonimbus: 3000 // Storm clouds (tall)
};

// Generate procedural cloud field
export function generateCloudField(
  count: number = 50,
  spreadRadius: number = 10000,
  baseAltitude: number = 2000
): CloudCellData[] {
  const clouds: CloudCellData[] = [];
  
  // Golden ratio for even distribution
  const phi = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < count; i++) {
    // Distribute clouds using sunflower pattern
    const theta = 2 * Math.PI * i / phi;
    const r = spreadRadius * Math.sqrt(i / count);
    
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    
    // Vary altitude slightly
    const altitudeVariation = (Math.random() - 0.5) * 500;
    const y = baseAltitude + altitudeVariation;
    
    // Random cloud type weighted towards cumulus
    const typeRand = Math.random();
    let type: CloudCellData['type'] = 'cumulus';
    if (typeRand > 0.9) type = 'cirrus';
    else if (typeRand > 0.7) type = 'stratus';
    else if (typeRand > 0.95) type = 'cumulonimbus';
    
    // Size based on type
    const baseSize = 200 + Math.random() * 400;
    let size: THREE.Vector3;
    switch (type) {
      case 'cirrus':
        size = new THREE.Vector3(baseSize * 3, baseSize * 0.2, baseSize * 0.5);
        break;
      case 'stratus':
        size = new THREE.Vector3(baseSize * 2, baseSize * 0.3, baseSize * 2);
        break;
      case 'cumulonimbus':
        size = new THREE.Vector3(baseSize, baseSize * 3, baseSize);
        break;
      default: // cumulus
        size = new THREE.Vector3(baseSize, baseSize * 0.6, baseSize);
    }
    
    clouds.push({
      id: `cloud-${i}`,
      position: new THREE.Vector3(x, y, z),
      size,
      density: 0.5 + Math.random() * 0.5,
      type,
      seed: Math.random() * 10000,
    });
  }
  
  return clouds;
}

// Default cloud field
export const ALL_CLOUDS = generateCloudField(80, 15000, 2000);

// Get color based on cloud type and lighting
export function getCloudColor(type: CloudCellData['type'], sunElevation: number): THREE.Color {
  const baseColors = {
    cumulus: new THREE.Color(0xffffff),
    stratus: new THREE.Color(0xdddddd),
    cirrus: new THREE.Color(0xffeedd),
    cumulonimbus: new THREE.Color(0x888899),
  };
  
  const color = baseColors[type].clone();
  
  // Sunset tinting
  if (sunElevation < 0.3) {
    const t = sunElevation / 0.3;
    const sunsetColor = new THREE.Color(0xffaa66);
    color.lerp(sunsetColor, 1 - t);
  }
  
  return color;
}
