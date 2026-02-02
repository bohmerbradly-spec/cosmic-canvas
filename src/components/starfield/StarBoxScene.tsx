import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { StarField } from './StarField';
import { MilkyWay } from './MilkyWay';
import { SkyBox } from './SkyBox';

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
}

interface StarBoxSceneProps {
  config: StarBoxConfig;
}

function Scene({ config }: StarBoxSceneProps) {
  return (
    <>
      {/* Background sky sphere */}
      <SkyBox
        radius={config.starRadius + 5}
        topColor={config.skyTopColor}
        bottomColor={config.skyBottomColor}
        atmosphereIntensity={config.atmosphereIntensity}
      />
      
      {/* Milky Way band */}
      <MilkyWay
        radius={config.starRadius + 2}
        intensity={config.milkyWayIntensity}
        bandWidth={config.milkyWayBandWidth}
        dustLanes={config.dustLanes}
        coreIntensity={config.milkyWayCoreIntensity}
      />
      
      {/* Star field */}
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
    </>
  );
}

export function StarBoxScene({ config }: StarBoxSceneProps) {
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
        near={0.1}
        far={config.starRadius * 3}
      />
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={config.autoRotate}
        autoRotateSpeed={config.autoRotateSpeed}
        rotateSpeed={0.5}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
      
      <Suspense fallback={null}>
        <Scene config={config} />
      </Suspense>
    </Canvas>
  );
}
