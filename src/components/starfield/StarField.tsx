import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateStarField, calculateScintillation } from '@/lib/starUtils';

interface StarFieldProps {
  starCount: number;
  radius: number;
  galacticConcentration: number;
  colorVariation: number;
  twinkleIntensity: number;
  twinkleSpeed: number;
  starSizeMultiplier: number;
  brightnessMultiplier: number;
}

// Custom shader for stars with glow effect
const starVertexShader = `
  attribute float size;
  attribute vec3 starColor;
  attribute float brightness;
  
  varying vec3 vColor;
  varying float vBrightness;
  
  void main() {
    vColor = starColor;
    vBrightness = brightness;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  
  void main() {
    // Distance from center of point
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Core and glow
    float core = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.1, dist) * 0.5;
    
    // Airy disk approximation for bright stars
    float airy = 0.0;
    if (vBrightness > 0.5) {
      float ring1 = smoothstep(0.35, 0.3, dist) - smoothstep(0.3, 0.25, dist);
      float ring2 = smoothstep(0.45, 0.4, dist) - smoothstep(0.4, 0.35, dist);
      airy = (ring1 * 0.2 + ring2 * 0.1) * (vBrightness - 0.5) * 2.0;
    }
    
    float alpha = (core + glow + airy) * vBrightness;
    
    // Slight color shift for glow (cooler at edges)
    vec3 glowColor = mix(vColor, vec3(0.8, 0.85, 1.0), dist * 0.3);
    vec3 finalColor = mix(glowColor, vColor, core);
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(finalColor * vBrightness * 1.5, alpha);
  }
`;

export function StarField({
  starCount,
  radius,
  galacticConcentration,
  colorVariation,
  twinkleIntensity,
  twinkleSpeed,
  starSizeMultiplier,
  brightnessMultiplier,
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Generate star data
  const starData = useMemo(() => {
    return generateStarField(starCount, radius, {
      galacticConcentration,
      colorVariation,
      includeBrightStars: true,
    });
  }, [starCount, radius, galacticConcentration, colorVariation]);
  
  // Create geometry with attributes
  const { geometry, baseBrightness } = useMemo(() => {
    const positions = new Float32Array(starData.length * 3);
    const colors = new Float32Array(starData.length * 3);
    const sizes = new Float32Array(starData.length);
    const brightness = new Float32Array(starData.length);
    
    starData.forEach((star, i) => {
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;
      
      colors[i * 3] = star.color.r;
      colors[i * 3 + 1] = star.color.g;
      colors[i * 3 + 2] = star.color.b;
      
      sizes[i] = star.size * starSizeMultiplier;
      brightness[i] = star.brightness * brightnessMultiplier;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
    
    return { geometry: geo, baseBrightness: brightness.slice() };
  }, [starData, starSizeMultiplier, brightnessMultiplier]);
  
  // Update sizes when multiplier changes
  useEffect(() => {
    if (geometry) {
      const sizes = geometry.getAttribute('size') as THREE.BufferAttribute;
      starData.forEach((star, i) => {
        sizes.array[i] = star.size * starSizeMultiplier;
      });
      sizes.needsUpdate = true;
    }
  }, [starSizeMultiplier, geometry, starData]);
  
  // Animate twinkling
  useFrame((state) => {
    if (!geometry || twinkleIntensity === 0) return;
    
    const brightness = geometry.getAttribute('brightness') as THREE.BufferAttribute;
    const time = state.clock.elapsedTime * twinkleSpeed;
    
    starData.forEach((star, i) => {
      const scintillation = calculateScintillation(
        star.twinklePhase,
        star.twinkleSpeed,
        time,
        twinkleIntensity
      );
      brightness.array[i] = baseBrightness[i] * scintillation;
    });
    
    brightness.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
