// OWNER: Opus O1. Post stack: N8AO contact darkening → bloom (fairy lights/fireflies/sun) → subtle DOF
// (outside view, high only) → AgX tone mapping → vignette. Disabled on low tier (renderer tone-maps instead).
// Intensities follow the damped env (presets.ts → live).
import { EffectComposer, Bloom, Vignette, N8AO, ToneMapping, DepthOfField, SMAA, HueSaturation, BrightnessContrast } from '@react-three/postprocessing';
import { ToneMappingMode, type BloomEffect, type VignetteEffect, type DepthOfFieldEffect, type HueSaturationEffect, type BrightnessContrastEffect } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useScene } from '../state/store';
import { live } from './env/live';

type N8 = { configuration: { intensity: number } };

export function Effects() {
  const quality = useScene((s) => s.quality);
  const view = useScene((s) => s.view);
  const bloom = useRef<BloomEffect>(null);
  const vig = useRef<VignetteEffect>(null);
  const ao = useRef<N8>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const dofK = useRef(0);
  const hs = useRef<HueSaturationEffect>(null);
  const bc = useRef<BrightnessContrastEffect>(null);

  useFrame((_, dt) => {
    if (bloom.current) {
      bloom.current.intensity = live.n.bloom;
      bloom.current.luminanceMaterial.threshold = live.n.bloomThreshold;
    }
    if (vig.current) vig.current.darkness = live.n.vignette;
    if (hs.current) hs.current.saturation = live.n.saturation;
    if (bc.current) bc.current.contrast = live.n.contrast;
    if (ao.current) ao.current.configuration.intensity = AO_BASE[quality] * live.n.ao;
    if (dof.current) {
      dofK.current += ((view === 'outside' ? 1 : 0) - dofK.current) * Math.min(1, dt * 2);
      dof.current.bokehScale = dofK.current * 1.4;
    }
  });

  if (quality === 'low') return null;
  const high = quality === 'high';
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <N8AO
        ref={ao as never}
        aoRadius={0.6}
        distanceFalloff={0.5}
        intensity={AO_BASE[quality]}
        aoSamples={high ? 16 : 8}
        denoiseSamples={high ? 8 : 4}
        denoiseRadius={10}
        halfRes={!high}
        color="#2a1a22"
      />
      <Bloom ref={bloom} intensity={0.5} luminanceThreshold={0.95} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
      {high ? <DepthOfField ref={dof} focusDistance={45} focusRange={420} bokehScale={0} /> : <></>}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation ref={hs} saturation={0.2} />
      <BrightnessContrast ref={bc} contrast={0.1} />
      <Vignette ref={vig} offset={0.3} darkness={0.42} />
      {!high ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

const AO_BASE = { low: 0, mid: 2.2, high: 2.6 } as const;
