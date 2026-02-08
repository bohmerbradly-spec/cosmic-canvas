import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { AtmosphericSky, AtmosphericSkyConfig, DEFAULT_ATMOSPHERE_CONFIG } from './AtmosphericSky';
import { ProjectedCloudField } from './ProjectedCloudField';
import { Cloud3DLayer } from './Cloud3DLayer';
import { TerrainLayer } from './TerrainLayer';
import { CloudLayerConfig, DEFAULT_CLOUD_CONFIG } from './CloudLayer';
import { VirtualFlightControls } from '@/components/starfield/VirtualFlightControls';
import { ALL_CLOUDS } from '@/lib/cloudData';

export interface AtmosphereSceneConfig {
  // Atmosphere
  atmosphereConfig: AtmosphericSkyConfig;
  
  // Clouds
  cloudsEnabled: boolean;
  cloudConfig: CloudLayerConfig;
  cloudTransitionDistance: number;
  cloudFullDistance: number;
  
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
  cloudConfig: DEFAULT_CLOUD_CONFIG,
  cloudTransitionDistance: 5000,
  cloudFullDistance: 1000,
  terrainEnabled: true,
  flightEnabled: true,
  flightSpeed: 50,
  skyboxRadius: 10000,
};

interface AtmosphereSceneProps {
  config: AtmosphereSceneConfig;
  onVirtualPositionChange?: (position: THREE.Vector3) => void;
}

interface SceneContentProps {
  config: AtmosphereSceneConfig;
  virtualPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  windOffset: THREE.Vector2;
}

function SceneContent({ config, virtualPosition, velocity, windOffset }: SceneContentProps) {
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
      
      {/* Terrain */}
      {config.terrainEnabled && (
        <TerrainLayer
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
          radius={config.skyboxRadius * 0.5}
        />
      )}
      
      {/* 2D Projected Clouds on Skybox */}
      {config.cloudsEnabled && (
        <ProjectedCloudField
          clouds={ALL_CLOUDS}
          skyboxRadius={config.skyboxRadius * 0.8}
          transitionDistance={config.cloudTransitionDistance}
          fullDistance={config.cloudFullDistance}
          virtualPosition={virtualPosition}
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
          windOffset={windOffset}
        />
      )}
      
      {/* 3D Volumetric Clouds (appear when close) */}
      {config.cloudsEnabled && (
        <Cloud3DLayer
          clouds={ALL_CLOUDS}
          virtualPosition={virtualPosition}
          transitionDistance={config.cloudTransitionDistance}
          fullDistance={config.cloudFullDistance}
          sunDirection={sunDirection}
          sunElevation={config.atmosphereConfig.sunElevation}
        />
      )}
    </>
  );
}

export function AtmosphereScene({ config, onVirtualPositionChange }: AtmosphereSceneProps) {
  const [virtualPosition, setVirtualPosition] = useState(new THREE.Vector3(0, 500, 0));
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const windOffsetRef = useRef(new THREE.Vector2(0, 0));
  
  const handleVirtualPositionChange = useCallback((position: THREE.Vector3) => {
    setVirtualPosition(position);
    onVirtualPositionChange?.(position);
    
    // Update wind offset based on time (simulated)
    windOffsetRef.current.x += 0.1;
    windOffsetRef.current.y += 0.05;
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
      dpr={[1, 2]}
    >
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 0]}
        fov={75}
        near={0.1}
        far={config.skyboxRadius * 3}
      />
      
      {/* Virtual Flight Controls */}
      {config.flightEnabled && (
        <VirtualFlightControls
          speed={config.flightSpeed}
          rotationSpeed={0.002}
          enabled={config.flightEnabled}
          onVirtualPositionChange={handleVirtualPositionChange}
          onVelocityChange={handleVelocityChange}
        />
      )}
      
      <Suspense fallback={null}>
        <SceneContent
          config={config}
          virtualPosition={virtualPosition}
          velocity={velocity}
          windOffset={windOffsetRef.current}
        />
      </Suspense>
    </Canvas>
  );
}
