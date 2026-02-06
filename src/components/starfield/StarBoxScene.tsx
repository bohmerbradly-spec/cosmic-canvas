import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MilkyWay } from './MilkyWay';
import { SkyBox } from './SkyBox';
import { VirtualFlightControls } from './VirtualFlightControls';
import { ProjectedStarField } from './ProjectedStarField';
import { Star3DLayer } from './Star3DLayer';
import { ALL_STARS } from '@/lib/nearStarData';

export interface StarBoxConfig {
  // Star field settings
  starCount: number;
  starRadius: number;
  galacticConcentration: number;
  colorVariation: number;
  twinkleIntensity: number;
  twinkleSpeed: number;
  starSizeMultiplier: number;
  brightnessMultiplier: number;
  
  // Milky Way settings
  milkyWayIntensity: number;
  milkyWayBandWidth: number;
  milkyWayCoreIntensity: number;
  dustLanes: boolean;
  
  // Sky settings
  skyTopColor: string;
  skyBottomColor: string;
  atmosphereIntensity: number;
  
  // Camera settings
  autoRotate: boolean;
  autoRotateSpeed: number;
  
  // Near star settings
  nearStarScale: number;
  nearStarGlow: number;
  transitionDistance: number;
  fullDistance: number;
  showNearStars: boolean;
  
  // Flight settings
  flightEnabled: boolean;
  flightSpeed: number;
  
  // Hyperdrive settings
  hyperdriveStretch: number;
  
  // Debug settings
  debugColors: boolean;
}

interface StarBoxSceneProps {
  config: StarBoxConfig;
  onVirtualPositionChange?: (position: THREE.Vector3) => void;
}

interface SceneProps {
  config: StarBoxConfig;
  virtualPosition: THREE.Vector3;
  velocity: THREE.Vector3;
}

function Scene({ config, virtualPosition, velocity }: SceneProps) {
  return (
    <>
      {/* 
        Fixed skybox at origin - never moves.
        Camera is also at origin - only rotates.
      */}
      <SkyBox
        radius={config.starRadius + 5}
        topColor={config.skyTopColor}
        bottomColor={config.skyBottomColor}
        atmosphereIntensity={config.atmosphereIntensity}
      />
      
      {/* Milky Way on fixed skybox */}
      <MilkyWay
        radius={config.starRadius + 2}
        intensity={config.milkyWayIntensity}
        bandWidth={config.milkyWayBandWidth}
        dustLanes={config.dustLanes}
        coreIntensity={config.milkyWayCoreIntensity}
      />
      
      {/* 
        Projected 2D Stars on skybox.
        Stars have real 3D world positions but are projected onto
        the fixed skybox based on virtualPosition. They slide across
        the skybox with parallax as you "fly".
      */}
      {config.showNearStars && (
        <ProjectedStarField
          stars={ALL_STARS}
          skyboxRadius={config.starRadius}
          transitionDistance={config.transitionDistance}
          fullDistance={config.fullDistance}
          starSizeMultiplier={config.starSizeMultiplier}
          brightnessMultiplier={config.brightnessMultiplier}
          twinkleIntensity={config.twinkleIntensity}
          twinkleSpeed={config.twinkleSpeed}
          virtualPosition={virtualPosition}
          velocity={velocity}
          hyperdriveStretch={config.hyperdriveStretch}
          debugColors={config.debugColors}
        />
      )}
      
      {/* 
        3D Stars in space.
        When a star's virtual distance is close enough, 3D geometry
        appears at the relative position (starWorldPos - virtualPos).
        This creates the illusion of flying past real 3D stars.
      */}
      {config.showNearStars && (
        <Star3DLayer
          stars={ALL_STARS}
          virtualPosition={virtualPosition}
          transitionDistance={config.transitionDistance}
          fullDistance={config.fullDistance}
          starScale={config.nearStarScale}
          glowIntensity={config.nearStarGlow}
          debugColors={config.debugColors}
        />
      )}
    </>
  );
}

export function StarBoxScene({ config, onVirtualPositionChange }: StarBoxSceneProps) {
  const [virtualPosition, setVirtualPosition] = useState(new THREE.Vector3(0, 0, 0));
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
      dpr={[1, 2]}
    >
      <PerspectiveCamera 
        makeDefault 
        position={[0, 0, 0]} 
        fov={75}
        near={0.001}
        far={config.starRadius * 3}
      />
      
      {/* 
        Virtual Flight Controls:
        - Camera stays at origin, only rotates
        - WASD updates a virtual position in space
        - Virtual position is used for star parallax calculations
        - Press H for hyperdrive
      */}
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
        <Scene 
          config={config} 
          virtualPosition={virtualPosition}
          velocity={velocity}
        />
      </Suspense>
    </Canvas>
  );
}
