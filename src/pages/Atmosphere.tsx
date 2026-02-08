import { Leva } from 'leva';
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { AtmosphereScene } from '@/components/atmosphere/AtmosphereScene';
import { useAtmosphereSceneControls } from '@/components/atmosphere/AtmosphereSceneControls';
import { useWebGLSupport, WebGLFallback } from '@/components/starfield/WebGLFallback';

const Atmosphere = () => {
  const controls = useAtmosphereSceneControls();
  const [showHelp, setShowHelp] = useState(true);
  const [virtualPosition, setVirtualPosition] = useState(new THREE.Vector3(0, 1000, 0));
  const webglSupported = useWebGLSupport();
  
  // Hide help after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHelp(false), 8000);
    return () => clearTimeout(timer);
  }, []);
  
  if (webglSupported === false) {
    return (
      <div className="h-screen w-screen">
        <WebGLFallback />
      </div>
    );
  }
  
  if (webglSupported === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Control Panel */}
      <Leva 
        collapsed={false}
        oneLineLabels={false}
        flat={false}
        theme={{
          colors: {
            elevation1: 'hsl(230, 20%, 8%)',
            elevation2: 'hsl(230, 20%, 10%)',
            elevation3: 'hsl(230, 15%, 15%)',
            accent1: 'hsl(30, 80%, 55%)',
            accent2: 'hsl(30, 80%, 60%)',
            accent3: 'hsl(30, 80%, 65%)',
            highlight1: 'hsl(210, 20%, 95%)',
            highlight2: 'hsl(210, 10%, 80%)',
            highlight3: 'hsl(210, 10%, 60%)',
            vivid1: 'hsl(40, 60%, 55%)',
            folderWidgetColor: 'hsl(30, 80%, 60%)',
            folderTextColor: 'hsl(210, 20%, 95%)',
            toolTipBackground: 'hsl(230, 20%, 12%)',
            toolTipText: 'hsl(210, 20%, 95%)',
          },
          radii: {
            xs: '2px',
            sm: '4px',
            lg: '8px',
          },
          space: {
            sm: '6px',
            md: '12px',
            rowGap: '8px',
            colGap: '8px',
          },
          fonts: {
            mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            sans: 'system-ui, -apple-system, sans-serif',
          },
          fontSizes: {
            root: '12px',
            toolTip: '11px',
          },
          sizes: {
            rootWidth: '320px',
            controlWidth: '180px',
            numberInputMinWidth: '56px',
            scrubberWidth: '10px',
            scrubberHeight: '18px',
            rowHeight: '28px',
            folderTitleHeight: '28px',
            checkboxSize: '18px',
            joystickWidth: '120px',
            joystickHeight: '120px',
            colorPickerWidth: '180px',
            colorPickerHeight: '120px',
            imagePreviewWidth: '120px',
            imagePreviewHeight: '90px',
            monitorHeight: '60px',
            titleBarHeight: '40px',
          },
          borderWidths: {
            root: '1px',
            input: '1px',
            focus: '2px',
            hover: '1px',
            active: '1px',
            folder: '1px',
          },
          fontWeights: {
            label: 'normal',
            folder: '500',
            button: '500',
          },
        }}
      />
      
      {/* Flight Controls Help */}
      {controls.flightEnabled && showHelp && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="rounded-lg bg-card/90 px-6 py-4 backdrop-blur-sm border border-border animate-pulse">
            <p className="text-sm text-primary font-medium text-center">
              Click to enable mouse look • WASD to fly • Space/Shift for up/down • Q to boost • H for hyperdrive
            </p>
          </div>
        </div>
      )}
      
      {/* Info Overlay */}
      <div className="absolute bottom-6 left-6 z-10 max-w-md">
        <div className="rounded-lg bg-card/80 p-4 backdrop-blur-sm border border-border">
          <h1 className="text-lg font-semibold text-foreground mb-1">
            HyperReal Atmospheric System
          </h1>
          <p className="text-sm text-muted-foreground">
            Physically-based volumetric clouds with raymarched self-shadowing, 
            god rays, and Rayleigh/Mie scattering sky. Terrain parallax with cloud shadows.
          </p>
          <div className="mt-3 text-xs text-muted-foreground font-mono">
            <p>Altitude: {Math.round(virtualPosition.y)}m | XZ: ({Math.round(virtualPosition.x)}, {Math.round(virtualPosition.z)})</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="absolute top-6 left-6 z-10">
        <a 
          href="/" 
          className="rounded-lg bg-card/80 px-4 py-2 backdrop-blur-sm border border-border text-sm text-primary hover:bg-card/90 transition-colors"
        >
          ← Back to Stars
        </a>
      </div>
      
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <AtmosphereScene 
          config={controls} 
          onVirtualPositionChange={setVirtualPosition}
        />
      </div>
    </div>
  );
};

export default Atmosphere;
