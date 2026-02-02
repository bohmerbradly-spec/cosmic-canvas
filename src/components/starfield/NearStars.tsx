import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NEAR_STARS, NearStarData, getStarVisualSize, hexToRgb } from '@/lib/nearStarData';

interface NearStarsProps {
  transitionDistance: number; // Distance at which stars start transitioning to 3D
  fullDistance: number; // Distance at which stars are fully 3D
  starScale: number; // Overall scale multiplier
  glowIntensity: number;
  showLabels: boolean;
  visibleStars: NearStarData[];
}

// Shader for 3D stars with glow
const nearStarVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const nearStarFragmentShader = `
  uniform vec3 starColor;
  uniform float glowIntensity;
  uniform float opacity;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel-like glow at edges
    float fresnel = 1.0 - abs(dot(normal, viewDir));
    fresnel = pow(fresnel, 2.0);
    
    // Core brightness
    float core = 1.0 - fresnel * 0.3;
    
    // Combine
    vec3 finalColor = starColor * core + starColor * fresnel * glowIntensity;
    
    gl_FragColor = vec4(finalColor, opacity);
  }
`;

// Glow sprite shader
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
  
  varying vec2 vUv;
  
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    
    // Soft radial gradient
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    
    // Outer halo
    float halo = 1.0 - smoothstep(0.2, 0.5, dist);
    halo = pow(halo, 3.0) * 0.3;
    
    float alpha = (glow + halo) * glowIntensity * opacity;
    
    gl_FragColor = vec4(starColor, alpha);
  }
`;

interface Star3DProps {
  star: NearStarData;
  opacity: number;
  starScale: number;
  glowIntensity: number;
}

function Star3D({ star, opacity, starScale, glowIntensity }: Star3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  
  const rgb = useMemo(() => hexToRgb(star.color), [star.color]);
  const color = useMemo(() => new THREE.Color(rgb.r, rgb.g, rgb.b), [rgb]);
  const size = useMemo(() => getStarVisualSize(star) * starScale, [star, starScale]);
  
  // Create materials
  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: nearStarVertexShader,
      fragmentShader: nearStarFragmentShader,
      uniforms: {
        starColor: { value: color },
        glowIntensity: { value: glowIntensity },
        opacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
    });
  }, [color, glowIntensity, opacity]);
  
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        starColor: { value: color },
        glowIntensity: { value: glowIntensity },
        opacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [color, glowIntensity, opacity]);
  
  // Update uniforms
  useFrame(() => {
    if (starMaterial.uniforms) {
      starMaterial.uniforms.opacity.value = opacity;
      starMaterial.uniforms.glowIntensity.value = glowIntensity;
    }
    if (glowMaterial.uniforms) {
      glowMaterial.uniforms.opacity.value = opacity;
      glowMaterial.uniforms.glowIntensity.value = glowIntensity;
    }
    
    // Billboard the glow sprite
    if (glowRef.current) {
      glowRef.current.lookAt(camera.position);
    }
  });
  
  const position: [number, number, number] = [
    star.position.x,
    star.position.y,
    star.position.z,
  ];
  
  return (
    <group position={position}>
      {/* Core star sphere */}
      <mesh ref={meshRef} material={starMaterial}>
        <sphereGeometry args={[size * 0.1, 16, 16]} />
      </mesh>
      
      {/* Glow plane - billboard */}
      <sprite ref={glowRef as React.Ref<THREE.Sprite>} material={glowMaterial as unknown as THREE.SpriteMaterial} scale={[size * 0.8, size * 0.8, 1]}>
      </sprite>
    </group>
  );
}

export function NearStars({
  transitionDistance,
  fullDistance,
  starScale,
  glowIntensity,
  visibleStars,
}: NearStarsProps) {
  const { camera } = useThree();
  const starsRef = useRef<Map<number, number>>(new Map());
  
  // Calculate visibility/opacity for each star based on distance
  useFrame(() => {
    const cameraPos = camera.position;
    
    visibleStars.forEach((star) => {
      const starPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
      const distance = cameraPos.distanceTo(starPos);
      
      // Calculate opacity based on distance
      let opacity = 0;
      if (distance < fullDistance) {
        opacity = 1;
      } else if (distance < transitionDistance) {
        opacity = 1 - (distance - fullDistance) / (transitionDistance - fullDistance);
      }
      
      starsRef.current.set(star.id, opacity);
    });
  });
  
  return (
    <group>
      {visibleStars.map((star) => {
        // Skip Sol (we're at Sol)
        if (star.distance === 0) return null;
        
        return (
          <NearStarWithOpacity
            key={star.id}
            star={star}
            starScale={starScale}
            glowIntensity={glowIntensity}
            transitionDistance={transitionDistance}
            fullDistance={fullDistance}
          />
        );
      })}
    </group>
  );
}

// Wrapper component that tracks its own opacity
function NearStarWithOpacity({
  star,
  starScale,
  glowIntensity,
  transitionDistance,
  fullDistance,
}: {
  star: NearStarData;
  starScale: number;
  glowIntensity: number;
  transitionDistance: number;
  fullDistance: number;
}) {
  const { camera } = useThree();
  const opacityRef = useRef(0);
  
  useFrame(() => {
    const starPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
    const distance = camera.position.distanceTo(starPos);
    
    if (distance < fullDistance) {
      opacityRef.current = 1;
    } else if (distance < transitionDistance) {
      opacityRef.current = 1 - (distance - fullDistance) / (transitionDistance - fullDistance);
    } else {
      opacityRef.current = 0;
    }
  });
  
  return (
    <Star3D
      star={star}
      opacity={opacityRef.current}
      starScale={starScale}
      glowIntensity={glowIntensity}
    />
  );
}

// Export for use in star masking
export { NEAR_STARS };
