// Loader illustration: white minivan silhouette under a blinking fairy-light string.
// KEEP IN SYNC with the inline copy in index.html (#boot-loader) so the hand-off is seamless.
export const VAN_SVG = `<svg class="vanart" viewBox="0 0 240 120" aria-hidden="true" focusable="false">
<path class="vanart__string" d="M14 22 Q62 44 120 26 T226 24" fill="none"/>
<g class="vanart__bulbs"><circle cx="30" cy="30" r="3"/><circle cx="52" cy="36" r="3"/><circle cx="76" cy="37" r="3"/><circle cx="100" cy="32" r="3"/><circle cx="124" cy="25" r="3"/><circle cx="148" cy="21" r="3"/><circle cx="172" cy="23" r="3"/><circle cx="196" cy="27" r="3"/><circle cx="216" cy="25" r="3"/></g>
<ellipse cx="120" cy="106" rx="96" ry="5" fill="#0003"/>
<path class="vanart__body" d="M28 96 V70 Q28 58 40 54 L70 46 Q78 44 86 44 H190 Q206 44 210 58 L214 78 V96 Z"/>
<path class="vanart__glass" d="M74 52 Q78 50 86 50 H112 V68 H62 Z M118 50 H150 V68 H118 Z M156 50 H188 Q198 50 201 60 L203 68 H156 Z"/>
<rect class="vanart__trim" x="28" y="84" width="186" height="5" rx="2"/>
<circle class="vanart__tyre" cx="64" cy="96" r="12"/><circle class="vanart__hub" cx="64" cy="96" r="5"/>
<circle class="vanart__tyre" cx="182" cy="96" r="12"/><circle class="vanart__hub" cx="182" cy="96" r="5"/>
<rect x="209" y="62" width="5" height="10" rx="2" fill="#D9682B"/>
</svg>`;

export function VanArt() {
  return <div className="vanart-wrap" dangerouslySetInnerHTML={{ __html: VAN_SVG }} />;
}
