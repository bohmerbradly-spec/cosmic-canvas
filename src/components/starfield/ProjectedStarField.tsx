import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
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
  virtualPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  hyperdriveStretch: number;
  debugColors?: boolean; // Show cyan for 2D, fade to magenta near transition
}

/**
 * Projected Star Field
 * 
 * Stars exist at real 3D world positions, but are PROJECTED onto a fixed
 * 2D skybox sphere. As the virtual camera position changes, stars slide
 * across the skybox with parallax motion (near stars move faster).
 * 
 * When a star's virtual distance gets close enough, it fades out from
 * the skybox (to be replaced by 3D geometry in front of camera).
 */

// Vertex shader - projects 3D world positions onto fixed skybox with parallax
const projectedStarVertexShader = `
  attribute float size;
  attribute vec3 starColor;
  attribute float brightness;
  attribute vec3 worldPosition;
  
  uniform vec3 virtualCameraPos;
  uniform float skyboxRadius;
  uniform float transitionDistance;
  uniform float fullDistance;
  uniform vec3 velocity;
  uniform float hyperdriveStretch;
  uniform bool debugColors;
  
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vStretchFactor;
  varying float vTransitionFactor; // 0 = full 2D, 1 = transitioning to 3D
  
  void main() {
    // Vector from virtual camera position to star's world position
    vec3 toStar = worldPosition - virtualCameraPos;
    float distanceToStar = length(toStar);
    vec3 direction = normalize(toStar);
    
    // Project onto skybox: direction * skyboxRadius (skybox centered at origin)
    vec3 projectedPos = direction * skyboxRadius;
    
    // Calculate opacity: fade OUT as virtual distance decreases
    if (distanceToStar < fullDistance) {
      vOpacity = 0.0;
      vTransitionFactor = 1.0;
    } else if (distanceToStar < transitionDistance) {
      vOpacity = (distanceToStar - fullDistance) / (transitionDistance - fullDistance);
      vTransitionFactor = 1.0 - vOpacity;
    } else {
      vOpacity = 1.0;
      vTransitionFactor = 0.0;
    }
    
    // Debug colors: cyan (2D) -> magenta (transitioning to 3D)
    if (debugColors) {
      vec3 cyan = vec3(0.0, 1.0, 1.0);
      vec3 magenta = vec3(1.0, 0.0, 1.0);
      vColor = mix(cyan, magenta, vTransitionFactor);
    } else {
      vColor = starColor;
    }
    
    vBrightness = brightness * vOpacity;
    
    // Hyperdrive stretch based on velocity alignment
    vStretchFactor = 1.0;
    float velLen = length(velocity);
    if (velLen > 0.1) {
      vec3 velDir = normalize(velocity);
      float alignment = abs(dot(direction, velDir));
      vStretchFactor = 1.0 + alignment * hyperdriveStretch * min(velLen * 0.5, 1.0);
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(projectedPos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * vStretchFactor;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const projectedStarFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  varying float vOpacity;
  varying float vStretchFactor;
  
  void main() {
    if (vOpacity < 0.01) discard;
    
    vec2 center = gl_PointCoord - vec2(0.5);
    
    // Stretch vertically for hyperdrive effect
    center.y /= vStretchFactor;
    
    float dist = length(center);
    
    float core = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.1, dist) * 0.5;
    
    // Streak trail when stretched
    float streak = 0.0;
    if (vStretchFactor > 1.2) {
      streak = smoothstep(0.5, 0.0, abs(center.x) * 4.0) * 
               smoothstep(0.5, 0.0, abs(center.y)) * 0.6;
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
  virtualPosition,
  velocity,
  hyperdriveStretch,
  debugColors = false,
}: ProjectedStarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { geometry, baseBrightness, twinkleData } = useMemo(() => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const worldPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const brightness = new Float32Array(count);
    const twinkle: Array<{ phase: number; speed: number }> = [];
    
    stars.forEach((star, i) => {
      // World positions
      worldPositions[i * 3] = star.position.x;
      worldPositions[i * 3 + 1] = star.position.y;
      worldPositions[i * 3 + 2] = star.position.z;
      
      // Initial projected position (will be updated by shader)
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;
      
      const rgb = hexToRgb(star.color);
      colors[i * 3] = rgb.r;
      colors[i * 3 + 1] = rgb.g;
      colors[i * 3 + 2] = rgb.b;
      
      const visualSize = getStarVisualSize(star);
      sizes[i] = visualSize * starSizeMultiplier * 3;
      
      // Brightness inverse-square with distance
      const distanceFactor = Math.max(0.15, 1 / (1 + star.distance * 0.03));
      brightness[i] = distanceFactor * brightnessMultiplier * Math.sqrt(visualSize);
      
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
    
    return { 
      geometry: geo, 
      baseBrightness: brightness.slice(),
      twinkleData: twinkle,
    };
  }, [stars, starSizeMultiplier, brightnessMultiplier]);
  
  const uniforms = useMemo(() => ({
    virtualCameraPos: { value: new THREE.Vector3() },
    skyboxRadius: { value: skyboxRadius },
    transitionDistance: { value: transitionDistance },
    fullDistance: { value: fullDistance },
    velocity: { value: new THREE.Vector3() },
    hyperdriveStretch: { value: hyperdriveStretch },
    debugColors: { value: debugColors },
  }), [skyboxRadius, transitionDistance, fullDistance, hyperdriveStretch, debugColors]);
  
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.skyboxRadius.value = skyboxRadius;
      materialRef.current.uniforms.transitionDistance.value = transitionDistance;
      materialRef.current.uniforms.fullDistance.value = fullDistance;
      materialRef.current.uniforms.hyperdriveStretch.value = hyperdriveStretch;
      materialRef.current.uniforms.debugColors.value = debugColors;
    }
  }, [skyboxRadius, transitionDistance, fullDistance, hyperdriveStretch, debugColors]);
  
  useFrame((state) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.virtualCameraPos.value.copy(virtualPosition);
    mat.uniforms.velocity.value.copy(velocity);
    
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
