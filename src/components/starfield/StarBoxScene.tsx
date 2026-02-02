import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useCallback } from 'react';
import * as THREE from 'three';
import { StarField } from './StarField';
import { MilkyWay } from './MilkyWay';
import { SkyBox } from './SkyBox';
import { NearStars } from './NearStars';
import { FlightControls } from './FlightControls';
import { NEAR_STARS } from '@/lib/nearStarData';

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
}

interface StarBoxSceneProps {
  config: StarBoxConfig;
}

interface SceneProps {
  config: StarBoxConfig;
  cameraPosition: THREE.Vector3;
}

function Scene({ config, cameraPosition }: SceneProps) {
  return (
    <>
      {/* Background sky sphere - follows camera */}
      <group position={cameraPosition}>
        <SkyBox
          radius={config.starRadius + 5}
          topColor={config.skyTopColor}
          bottomColor={config.skyBottomColor}
          atmosphereIntensity={config.atmosphereIntensity}
        />
        
        {/* Milky Way band - on skybox */}
        <MilkyWay
          radius={config.starRadius + 2}
          intensity={config.milkyWayIntensity}
          bandWidth={config.milkyWayBandWidth}
          dustLanes={config.dustLanes}
          coreIntensity={config.milkyWayCoreIntensity}
        />
        
        {/* Background star field - on skybox */}
        <StarField
          starCount={config.starCount}
          radius={config.starRadius}
          galacticConcentration={config.galacticConcentration}
          colorVariation={config.colorVariation}
          twinkleIntensity={config.twinkleIntensity}
          twinkleSpeed={config.twinkleSpeed}
          starSizeMultiplier={config.starSizeMultiplier}
          brightnessMultiplier={config.brightnessMultiplier}
        />
      </group>
      
      {/* Near stars in 3D space (don't follow camera) */}
      {config.showNearStars && (
        <NearStars
          visibleStars={NEAR_STARS}
          transitionDistance={config.transitionDistance}
          fullDistance={config.fullDistance}
          starScale={config.nearStarScale}
          glowIntensity={config.nearStarGlow}
          showLabels={false}
        />
      )}
    </>
  );
}

export function StarBoxScene({ config }: StarBoxSceneProps) {
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3(0, 0, 0));
  
  const handlePositionChange = useCallback((position: THREE.Vector3) => {
    setCameraPosition(position.clone());
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
        position={[0, 0, 0.1]} 
        fov={75}
        near={0.001}
        far={config.starRadius * 3}
      />
      
      {/* Flight controls - click canvas to enable mouse look */}
      {config.flightEnabled && (
        <FlightControls
          speed={config.flightSpeed}
          rotationSpeed={0.002}
          enabled={config.flightEnabled}
          onPositionChange={handlePositionChange}
        />
      )}
      
      <Suspense fallback={null}>
        <Scene config={config} cameraPosition={cameraPosition} />
      </Suspense>
    </Canvas>
  );
}
