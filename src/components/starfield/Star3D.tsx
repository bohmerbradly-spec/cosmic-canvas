import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NearStarData, hexToRgb, getStarVisualSize } from '@/lib/nearStarData';

interface Star3DProps {
  star: NearStarData;
  transitionDistance: number;
  fullDistance: number;
  starScale: number;
  glowIntensity: number;
}

// Shader for 3D star core
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
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnel = 1.0 - abs(dot(normal, viewDir));
    fresnel = pow(fresnel, 2.0);
    
    float core = 1.0 - fresnel * 0.3;
    vec3 finalColor = starColor * core + starColor * fresnel * glowIntensity;
    
    gl_FragColor = vec4(finalColor, opacity);
  }
`;

// Glow billboard shader
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
    
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);
    
    float halo = 1.0 - smoothstep(0.2, 0.5, dist);
    halo = pow(halo, 3.0) * 0.3;
    
    float alpha = (glow + halo) * glowIntensity * opacity;
    
    gl_FragColor = vec4(starColor, alpha);
  }
`;

export function Star3D({ 
  star, 
  transitionDistance, 
  fullDistance, 
  starScale, 
  glowIntensity 
}: Star3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const opacityRef = useRef(0);
  
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
      },
      transparent: true,
      depthWrite: false,
    });
  }, [color, glowIntensity]);
  
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        starColor: { value: color },
        glowIntensity: { value: glowIntensity },
        opacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [color, glowIntensity]);
  
  useFrame(() => {
    const starPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
    const distance = camera.position.distanceTo(starPos);
    
    // Calculate opacity: fade IN as we get close (inverse of 2D projection)
    let opacity = 0;
    if (distance < fullDistance) {
      opacity = 1;
    } else if (distance < transitionDistance) {
      opacity = 1 - (distance - fullDistance) / (transitionDistance - fullDistance);
    }
    
    opacityRef.current = opacity;
    
    // Update materials
    starMaterial.uniforms.opacity.value = opacity;
    starMaterial.uniforms.glowIntensity.value = glowIntensity;
    glowMaterial.uniforms.opacity.value = opacity;
    glowMaterial.uniforms.glowIntensity.value = glowIntensity;
    
    // Billboard the glow
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
      {/* Core sphere */}
      <mesh ref={meshRef} material={starMaterial}>
        <sphereGeometry args={[size * 0.1, 16, 16]} />
      </mesh>
      
      {/* Glow billboard */}
      <mesh ref={glowRef} material={glowMaterial}>
        <planeGeometry args={[size * 0.8, size * 0.8]} />
      </mesh>
    </group>
  );
}
