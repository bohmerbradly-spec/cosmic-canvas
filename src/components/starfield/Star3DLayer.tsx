import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NearStarData, hexToRgb, getStarVisualSize } from '@/lib/nearStarData';

interface Star3DLayerProps {
  stars: NearStarData[];
  virtualPosition: THREE.Vector3;
  transitionDistance: number;
  fullDistance: number;
  starScale: number;
  glowIntensity: number;
  debugColors?: boolean; // Show magenta for 3D stars
}

/**
 * 3D Star Layer
 * 
 * When stars get close enough (based on virtual position), they transition
 * from the 2D skybox projection into 3D geometry that appears in front
 * of the fixed camera. The 3D star is positioned based on the RELATIVE
 * position between virtual camera and star world position.
 */

const star3DVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const star3DFragmentShader = `
  uniform vec3 starColor;
  uniform float glowIntensity;
  uniform float opacity;
  uniform bool debugColors;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnel = 1.0 - abs(dot(normal, viewDir));
    fresnel = pow(fresnel, 2.0);
    
    float core = 1.0 - fresnel * 0.3;
    
    // Debug: magenta for 3D stars
    vec3 color = debugColors ? vec3(1.0, 0.0, 1.0) : starColor;
    vec3 finalColor = color * core + color * fresnel * glowIntensity;
    
    gl_FragColor = vec4(finalColor, opacity);
  }
`;

const glowVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  uniform vec3 starColor;
  uniform float glowIntensity;
  uniform float opacity;
  uniform bool debugColors;
  
  varying vec2 vUv;
  
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    
    float halo = 1.0 - smoothstep(0.2, 0.5, dist);
    halo = pow(halo, 3.0) * 0.3;
    
    float alpha = (glow + halo) * glowIntensity * opacity;
    
    // Debug: magenta for 3D stars
    vec3 color = debugColors ? vec3(1.0, 0.0, 1.0) : starColor;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface SingleStar3DProps {
  star: NearStarData;
  virtualPosition: THREE.Vector3;
  transitionDistance: number;
  fullDistance: number;
  starScale: number;
  glowIntensity: number;
  debugColors: boolean;
}

function SingleStar3D({ 
  star, 
  virtualPosition,
  transitionDistance, 
  fullDistance, 
  starScale, 
  glowIntensity,
  debugColors,
}: SingleStar3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  const rgb = useMemo(() => hexToRgb(star.color), [star.color]);
  const color = useMemo(() => new THREE.Color(rgb.r, rgb.g, rgb.b), [rgb]);
  const size = useMemo(() => getStarVisualSize(star) * starScale, [star, starScale]);
  
  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: star3DVertexShader,
      fragmentShader: star3DFragmentShader,
      uniforms: {
        starColor: { value: color },
        glowIntensity: { value: glowIntensity },
        opacity: { value: 0 },
        debugColors: { value: debugColors },
      },
      transparent: true,
      depthWrite: false,
    });
  }, [color, glowIntensity, debugColors]);
  
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        starColor: { value: color },
        glowIntensity: { value: glowIntensity },
        opacity: { value: 0 },
        debugColors: { value: debugColors },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [color, glowIntensity, debugColors]);
  
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Star's world position
    const starWorldPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
    
    // Relative position = star world pos - virtual camera pos
    // This is where the star appears relative to our fixed camera at origin
    const relativePos = starWorldPos.clone().sub(virtualPosition);
    const distance = relativePos.length();
    
    // Position the 3D star at the relative position
    groupRef.current.position.copy(relativePos);
    
    // Calculate opacity: fade IN as we get close
    let opacity = 0;
    if (distance < fullDistance) {
      opacity = 1;
    } else if (distance < transitionDistance) {
      opacity = 1 - (distance - fullDistance) / (transitionDistance - fullDistance);
    }
    
    starMaterial.uniforms.opacity.value = opacity;
    starMaterial.uniforms.glowIntensity.value = glowIntensity;
    starMaterial.uniforms.debugColors.value = debugColors;
    glowMaterial.uniforms.opacity.value = opacity;
    glowMaterial.uniforms.glowIntensity.value = glowIntensity;
    glowMaterial.uniforms.debugColors.value = debugColors;
    
    // Billboard the glow toward camera (which is at origin)
    if (glowRef.current) {
      glowRef.current.lookAt(camera.position);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh material={starMaterial}>
        <sphereGeometry args={[size * 0.15, 16, 16]} />
      </mesh>
      <mesh ref={glowRef} material={glowMaterial}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

export function Star3DLayer({
  stars,
  virtualPosition,
  transitionDistance,
  fullDistance,
  starScale,
  glowIntensity,
  debugColors = false,
}: Star3DLayerProps) {
  // Filter out Sol (we start there)
  const visibleStars = useMemo(() => 
    stars.filter(star => star.distance > 0),
    [stars]
  );
  
  return (
    <group>
      {visibleStars.map((star, index) => (
        <SingleStar3D
          key={`${star.name}-${index}`}
          star={star}
          virtualPosition={virtualPosition}
          transitionDistance={transitionDistance}
          fullDistance={fullDistance}
          starScale={starScale}
          glowIntensity={glowIntensity}
          debugColors={debugColors}
        />
      ))}
    </group>
  );
}
