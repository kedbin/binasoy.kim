// OWNER: Opus. Light-touch post: bloom (fairy lights) + vignette. Disabled on low tier.
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useScene } from '../state/store';

export function Effects() {
  const quality = useScene((s) => s.quality);
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
      <Bloom intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
