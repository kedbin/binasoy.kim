import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';
import { useScene } from '../state/store';

export function Loader() {
  const { active, progress } = useProgress();
  const setLoaded = useScene((s) => s.setLoaded);
  const loaded = useScene((s) => s.loaded);
  useEffect(() => {
    if (!active && progress >= 100) setLoaded(true);
    else if (!active && progress === 0) setLoaded(true);
  }, [active, progress, setLoaded]);
  if (loaded) return null;
  return (
    <div className="loader" role="status">
      <p>Setting up camp… {Math.round(progress)}%</p>
    </div>
  );
}
