import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AtmosphericSky, AtmosphericSkyConfig, DEFAULT_ATMOSPHERE_CONFIG } from './AtmosphericSky';
import { VolumetricClouds, VolumetricCloudConfig, DEFAULT_VOLUMETRIC_CLOUD_CONFIG } from './VolumetricClouds';
import { GodRays } from './GodRays';
import { ParallaxTerrain } from './ParallaxTerrain';
import { VirtualFlightControls } from '@/components/starfield/VirtualFlightControls';

export interface AtmosphereSceneConfig {
  // Atmosphere
  atmosphereConfig: AtmosphericSkyConfig;
  
  // Clouds
  cloudsEnabled: boolean;
  cloudConfig: VolumetricCloudConfig;
  
  // Effects
  godRaysEnabled: boolean;
  godRaysIntensity: number;
  cloudShadowDensity: number;
  
  // Terrain
  terrainEnabled: boolean;
  
  // Flight
  flightEnabled: boolean;
  flightSpeed: number;
  
  // Scene
  skyboxRadius: number;
}

export const DEFAULT_ATMOSPHERE_SCENE_CONFIG: AtmosphereSceneConfig = {
  atmosphereConfig: DEFAULT_ATMOSPHERE_CONFIG,
  cloudsEnabled: true,
  cloudConfig: DEFAULT_VOLUMETRIC_CLOUD_CONFIG,
  godRaysEnabled: true,
  godRaysIntensity: 1.0,
  cloudShadowDensity: 0.5,
  terrainEnabled: true,
  flightEnabled: true,
  flightSpeed: 100,
  skyboxRadius: 10000,
};

interface AtmosphereSceneProps {
  config: AtmosphereSceneConfig;
  onVirtualPositionChange?: (position: THREE.Vector3) => void;
}

interface SceneContentProps {
  config: AtmosphereSceneConfig;
  virtualPosition: THREE.Vector3;
}

function SceneContent({ config, virtualPosition }: SceneContentProps) {
  // Compute sun direction from atmosphere config
  const sunDirection = new THREE.Vector3(
    Math.cos(config.atmosphereConfig.sunElevation) * Math.sin(config.atmosphereConfig.sunAzimuth),
    Math.sin(config.atmosphereConfig.sunElevation),
    Math.cos(config.atmosphereConfig.sunElevation) * Math.cos(config.atmosphereConfig.sunAzimuth)
  ).normalize();
  
  return (
    <>
      {/* Atmospheric Sky with Rayleigh/Mie scattering */}
      <AtmosphericSky
        config={config.atmosphereConfig}
        radius={config.skyboxRadius}
      />
      
      {/* Volumetric Raymarched Clouds */}
      {config.cloudsEnabled && (
        <VolumetricClouds
          config={config.cloudConfig}
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
          virtualPosition={virtualPosition}
          radius={config.skyboxRadius * 0.95}
        />
      )}
      
      {/* God Rays / Crepuscular Rays */}
      {config.godRaysEnabled && (
        <GodRays
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
          radius={config.skyboxRadius * 0.9}
          intensity={config.godRaysIntensity}
        />
      )}
      
      {/* Parallax Terrain with Cloud Shadows */}
      {config.terrainEnabled && (
        <ParallaxTerrain
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
          virtualPosition={virtualPosition}
          radius={config.skyboxRadius * 0.5}
          cloudShadowDensity={config.cloudShadowDensity}
        />
      )}
    </>
  );
}

export function AtmosphereScene({ config, onVirtualPositionChange }: AtmosphereSceneProps) {
  // Start at altitude for good cloud view
  const [virtualPosition, setVirtualPosition] = useState(new THREE.Vector3(0, 1000, 0));
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  
  const handleVirtualPositionChange = useCallback((position: THREE.Vector3) => {
    setVirtualPosition(position);
    onVirtualPositionChange?.(position);
  }, [onVirtualPositionChange]);
  
  const handleVelocityChange = useCallback((vel: THREE.Vector3) => {
    setVelocity(vel);
  }, []);
  
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 1.5]}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 0]}
        fov={75}
        near={0.1}
        far={config.skyboxRadius * 3}
      />
      
      {/* Virtual Flight Controls - same as starfield */}
      {config.flightEnabled && (
        <VirtualFlightControls
          speed={config.flightSpeed}
          rotationSpeed={0.002}
          enabled={config.flightEnabled}
          onVirtualPositionChange={handleVirtualPositionChange}
          onVelocityChange={handleVelocityChange}
          hyperdriveMultiplier={20}
        />
      )}
      
      <Suspense fallback={null}>
        <SceneContent
          config={config}
          virtualPosition={virtualPosition}
        />
      </Suspense>
    </Canvas>
  );
}
