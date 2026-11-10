import type { View } from '../state/store';

/** The places in (and around) the van. Shared by the dock, the 3D markers, keyboard shortcuts and announcements. */
export interface Place { view: View; label: string; marker: string; icon: string; key: string; announce: string }

export const PLACES: Place[] = [
  { view: 'laptop', label: 'Work', marker: 'Laptop · my work', icon: '💻', key: '1', announce: 'Opened the laptop. KimOS is on screen.' },
  { view: 'wall', label: 'Photos', marker: 'Photos', icon: '📷', key: '2', announce: 'Looking at the photo wall.' },
  { view: 'stickers', label: 'Certs', marker: 'Certs', icon: '🏅', key: '3', announce: 'Looking at the certification stickers.' },
  { view: 'clipboard', label: 'Résumé', marker: 'Résumé', icon: '📋', key: '4', announce: 'Picked up the résumé clipboard.' },
  { view: 'outside', label: 'Outside', marker: 'Look outside', icon: '🌅', key: '5', announce: 'Looking out at the lake.' },
  { view: 'van', label: 'The van', marker: 'Look back at the van', icon: '🚐', key: '6', announce: 'Standing on the grass, looking back into the van. Drag or use the arrow keys to walk around it.' },
];

export const placeOf = (v: View) => PLACES.find((p) => p.view === v);
