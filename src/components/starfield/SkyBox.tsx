import { useMemo } from 'react';
import * as THREE from 'three';

interface SkyBoxProps {
  radius: number;
  topColor: string;
  bottomColor: string;
  atmosphereIntensity: number;
}

const skyboxVertexShader = `
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyboxFragmentShader = `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform float uAtmosphereIntensity;
  
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 normalized = normalize(vWorldPosition);
    
    // Vertical gradient
    float t = normalized.y * 0.5 + 0.5;
    t = pow(t, 0.8); // Adjust curve
    
    vec3 color = mix(uBottomColor, uTopColor, t);
    
    // Subtle atmospheric glow at horizon
    float horizonGlow = 1.0 - abs(normalized.y);
    horizonGlow = pow(horizonGlow, 4.0) * uAtmosphereIntensity;
    
    vec3 glowColor = vec3(0.1, 0.15, 0.25);
    color = mix(color, glowColor, horizonGlow);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function SkyBox({
  radius,
  topColor,
  bottomColor,
  atmosphereIntensity,
}: SkyBoxProps) {
  const uniforms = useMemo(() => ({
    uTopColor: { value: new THREE.Color(topColor) },
    uBottomColor: { value: new THREE.Color(bottomColor) },
    uAtmosphereIntensity: { value: atmosphereIntensity },
  }), [topColor, bottomColor, atmosphereIntensity]);
  
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={skyboxVertexShader}
        fragmentShader={skyboxFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
