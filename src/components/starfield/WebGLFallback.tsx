import { useState, useEffect } from 'react';

export function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

export function WebGLFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-4 text-4xl">🌌</div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          WebGL Not Available
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This 3D starfield requires WebGL, which isn't available in your current browser environment.
        </p>
        <div className="space-y-2 text-left text-xs text-muted-foreground">
          <p><strong>Try:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Opening this page in a new browser tab</li>
            <li>Using Chrome, Firefox, or Edge</li>
            <li>Enabling hardware acceleration in browser settings</li>
            <li>Updating your graphics drivers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
