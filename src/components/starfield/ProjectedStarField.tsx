import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NearStarData, hexToRgb, getStarVisualSize } from '@/lib/nearStarData';

interface ProjectedStarFieldProps {
  stars: NearStarData[];
  skyboxRadius: number;
  transitionDistance: number;
  fullDistance: number;
  starSizeMultiplier: number;
  brightnessMultiplier: number;
  twinkleIntensity: number;
  twinkleSpeed: number;
  velocity: THREE.Vector3;
  hyperdrive: boolean;
  hyperdriveStretch: number;
}

// Shader for projected stars with parallax and hyperdrive stretch
const projectedStarVertexShader = `
  attribute float size;
  attribute vec3 starColor;
  attribute float brightness;
  attribute float starDistance;
  attribute vec3 worldPosition;
  
  uniform vec3 cameraWorldPos;
  uniform float skyboxRadius;
  uniform float transitionDistance;
  uniform float fullDistance;
  uniform vec3 velocity;
  uniform float hyperdrive;
  uniform float hyperdriveStretch;
  
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying vec2 vStretch;
  
  void main() {
    vColor = starColor;
    
    // Direction from camera to star's world position
    vec3 toStar = worldPosition - cameraWorldPos;
    float distanceToStar = length(toStar);
    vec3 direction = normalize(toStar);
    
    // Project onto skybox sphere (always at skyboxRadius from camera)
    vec3 projectedPos = cameraWorldPos + direction * skyboxRadius;
    
    // Calculate opacity: fade OUT as we get close (star becomes 3D)
    float fadeStart = transitionDistance;
    float fadeEnd = fullDistance;
    
    if (distanceToStar < fadeEnd) {
      vOpacity = 0.0; // Fully 3D, hide from skybox
    } else if (distanceToStar < fadeStart) {
      vOpacity = (distanceToStar - fadeEnd) / (fadeStart - fadeEnd);
    } else {
      vOpacity = 1.0; // Fully on skybox
    }
    
    vBrightness = brightness * vOpacity;
    
    // Hyperdrive stretch calculation
    vStretch = vec2(1.0, 1.0);
    if (hyperdrive > 0.5 && length(velocity) > 0.01) {
      vec3 velDir = normalize(velocity);
      float alignment = dot(direction, velDir);
      
      // Stars in direction of travel stretch more
      float stretchFactor = 1.0 + abs(alignment) * hyperdriveStretch;
      vStretch = vec2(1.0, stretchFactor);
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(projectedPos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * vStretch.y;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const projectedStarFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying vec2 vStretch;
  
  void main() {
    if (vOpacity < 0.01) discard;
    
    vec2 center = gl_PointCoord - vec2(0.5);
    
    // Apply stretch for hyperdrive effect
    center.y /= vStretch.y;
    
    float dist = length(center);
    
    // Core and glow
    float core = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.1, dist) * 0.5;
    
    // Streak effect when stretched
    float streak = 0.0;
    if (vStretch.y > 1.1) {
      streak = smoothstep(0.5, 0.0, abs(center.x) * 4.0) * 
               smoothstep(0.5, 0.0, abs(center.y) * 0.5) * 0.8;
    }
    
    float alpha = (core + glow + streak) * vBrightness;
    
    vec3 glowColor = mix(vColor, vec3(0.9, 0.95, 1.0), dist * 0.3);
    vec3 finalColor = mix(glowColor, vColor, core);
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(finalColor * vBrightness * 1.5, alpha * vOpacity);
  }
`;

export function ProjectedStarField({
  stars,
  skyboxRadius,
  transitionDistance,
  fullDistance,
  starSizeMultiplier,
  brightnessMultiplier,
  twinkleIntensity,
  twinkleSpeed,
  velocity,
  hyperdrive,
  hyperdriveStretch,
}: ProjectedStarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();
  
  // Create geometry with star data
  const { geometry, baseBrightness, twinkleData } = useMemo(() => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const worldPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightness = new Float32Array(count);
    const distances = new Float32Array(count);
    const twinkle: Array<{ phase: number; speed: number }> = [];
    
    stars.forEach((star, i) => {
      // Initial positions (will be updated each frame)
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;
      
      // World positions (fixed)
      worldPositions[i * 3] = star.position.x;
      worldPositions[i * 3 + 1] = star.position.y;
      worldPositions[i * 3 + 2] = star.position.z;
      
      const rgb = hexToRgb(star.color);
      colors[i * 3] = rgb.r;
      colors[i * 3 + 1] = rgb.g;
      colors[i * 3 + 2] = rgb.b;
      
      const visualSize = getStarVisualSize(star);
      sizes[i] = visualSize * starSizeMultiplier * 2;
      
      // Brightness based on distance (inverse square, with minimum)
      const distanceFactor = Math.max(0.1, 1 / (1 + star.distance * 0.05));
      brightness[i] = distanceFactor * brightnessMultiplier * (visualSize * 0.5);
      
      distances[i] = star.distance;
      
      twinkle.push({
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('worldPosition', new THREE.BufferAttribute(worldPositions, 3));
    geo.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
    geo.setAttribute('starDistance', new THREE.BufferAttribute(distances, 1));
    
    return { 
      geometry: geo, 
      baseBrightness: brightness.slice(),
      twinkleData: twinkle,
    };
  }, [stars, starSizeMultiplier, brightnessMultiplier]);
  
  // Update shader uniforms and animate
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.cameraWorldPos.value.copy(camera.position);
    mat.uniforms.velocity.value.copy(velocity);
    mat.uniforms.hyperdrive.value = hyperdrive ? 1.0 : 0.0;
    
    // Twinkling
    if (twinkleIntensity > 0) {
      const brightness = geometry.getAttribute('brightness') as THREE.BufferAttribute;
      const time = state.clock.elapsedTime * twinkleSpeed;
      
      stars.forEach((_, i) => {
        const { phase, speed } = twinkleData[i];
        const scintillation = 1 + Math.sin(time * speed + phase) * 
                              Math.sin(time * speed * 0.7 + phase * 1.3) * 
                              twinkleIntensity * 0.5;
        brightness.array[i] = baseBrightness[i] * scintillation;
      });
      
      brightness.needsUpdate = true;
    }
  });
  
  // Create uniforms
  const uniforms = useMemo(() => ({
    cameraWorldPos: { value: new THREE.Vector3() },
    skyboxRadius: { value: skyboxRadius },
    transitionDistance: { value: transitionDistance },
    fullDistance: { value: fullDistance },
    velocity: { value: new THREE.Vector3() },
    hyperdrive: { value: 0.0 },
    hyperdriveStretch: { value: hyperdriveStretch },
  }), [skyboxRadius, transitionDistance, fullDistance, hyperdriveStretch]);
  
  // Update uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.skyboxRadius.value = skyboxRadius;
      materialRef.current.uniforms.transitionDistance.value = transitionDistance;
      materialRef.current.uniforms.fullDistance.value = fullDistance;
      materialRef.current.uniforms.hyperdriveStretch.value = hyperdriveStretch;
    }
  }, [skyboxRadius, transitionDistance, fullDistance, hyperdriveStretch]);
  
  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={projectedStarVertexShader}
        fragmentShader={projectedStarFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
