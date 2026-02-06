import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NearStarData, hexToRgb, getStarVisualSize } from '@/lib/nearStarData';

interface Star3DLayerProps {
  stars: NearStarData[];
  virtualPosition: THREE.Vector3;
  transitionDistance: number;
  fullDistance: number;
  starScale: number;
  glowIntensity: number;
  debugColors?: boolean;
}

/**
 * 3D Star Layer - FIXED APPROACH
 * 
 * Key insight: We DON'T place 3D stars at their real world distance.
 * Instead, we place them at a FIXED render distance from the camera
 * and scale their SIZE to match their angular appearance.
 * 
 * As virtualPosition approaches a star:
 * 1. The star's direction on the skybox stays the same
 * 2. The 3D star fades in at a fixed distance from camera
 * 3. The size GROWS as we get closer (simulating approach)
 * 
 * The 3D star is positioned along the direction vector at a fixed
 * render distance (e.g., 10 units), but scaled based on virtual distance.
 */

const RENDER_DISTANCE = 10; // Fixed distance from camera for 3D stars

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

export function Star3DLayer({
  stars,
  virtualPosition,
  transitionDistance,
  fullDistance,
  starScale,
  glowIntensity,
  debugColors = false,
}: Star3DLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Pre-create all star meshes with instancing for performance
  const starMeshes = useMemo(() => {
    return stars
      .filter(star => star.distance > 0) // Exclude Sol
      .map(star => {
        const rgb = hexToRgb(star.color);
        const color = new THREE.Color(rgb.r, rgb.g, rgb.b);
        const baseSize = getStarVisualSize(star);
        
        return {
          star,
          color,
          baseSize,
          // Pre-create materials
          starMaterial: new THREE.ShaderMaterial({
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
          }),
          glowMaterial: new THREE.ShaderMaterial({
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
          }),
          // Refs for the meshes
          groupRef: { current: null as THREE.Group | null },
          sphereRef: { current: null as THREE.Mesh | null },
          glowRef: { current: null as THREE.Mesh | null },
        };
      });
  }, [stars, glowIntensity, debugColors]);

  useFrame(({ camera }) => {
    starMeshes.forEach(({ star, baseSize, starMaterial, glowMaterial, groupRef: starGroupRef, sphereRef, glowRef }) => {
      if (!starGroupRef.current) return;
      
      // Star's world position
      const starWorldPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
      
      // Vector from virtual camera to star
      const toStar = starWorldPos.clone().sub(virtualPosition);
      const virtualDistance = toStar.length();
      const direction = toStar.normalize();
      
      // Calculate opacity: fade IN as we get close
      let opacity = 0;
      if (virtualDistance < fullDistance) {
        opacity = 1;
      } else if (virtualDistance < transitionDistance) {
        opacity = 1 - (virtualDistance - fullDistance) / (transitionDistance - fullDistance);
      }
      
      // Position the 3D star at FIXED render distance, in the direction of the star
      // This keeps it visible and at consistent distance from camera
      starGroupRef.current.position.copy(direction.multiplyScalar(RENDER_DISTANCE));
      
      // Scale based on virtual distance - closer = bigger
      // At fullDistance, size should match the 2D projection
      // As we get closer, it grows (inverse relationship)
      const distanceScale = Math.max(0.1, fullDistance / Math.max(0.1, virtualDistance));
      const finalSize = baseSize * starScale * distanceScale;
      
      // Update sphere scale
      if (sphereRef.current) {
        const sphereRadius = finalSize * 0.3;
        sphereRef.current.scale.setScalar(sphereRadius);
      }
      
      // Update glow scale and make it face camera
      if (glowRef.current) {
        glowRef.current.scale.setScalar(finalSize * 2);
        glowRef.current.lookAt(camera.position);
      }
      
      // Update materials
      starMaterial.uniforms.opacity.value = opacity;
      starMaterial.uniforms.glowIntensity.value = glowIntensity;
      starMaterial.uniforms.debugColors.value = debugColors;
      glowMaterial.uniforms.opacity.value = opacity;
      glowMaterial.uniforms.glowIntensity.value = glowIntensity;
      glowMaterial.uniforms.debugColors.value = debugColors;
    });
  });

  return (
    <group ref={groupRef}>
      {starMeshes.map(({ star, starMaterial, glowMaterial, groupRef: starGroupRef, sphereRef, glowRef }, index) => (
        <group 
          key={`${star.name}-${index}`} 
          ref={(el) => { starGroupRef.current = el; }}
        >
          <mesh 
            ref={(el) => { sphereRef.current = el; }}
            material={starMaterial}
          >
            <sphereGeometry args={[1, 16, 16]} />
          </mesh>
          <mesh 
            ref={(el) => { glowRef.current = el; }}
            material={glowMaterial}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
