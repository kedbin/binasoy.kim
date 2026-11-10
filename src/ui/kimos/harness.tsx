import { createRoot } from 'react-dom/client';
import { KimOS } from './KimOS';

const q = new URLSearchParams(location.search);
createRoot(document.getElementById('box')!).render(<KimOS mode={q.get('mode') === 'modal' ? 'modal' : 'screen'} onExit={() => console.log('exit')} />);
