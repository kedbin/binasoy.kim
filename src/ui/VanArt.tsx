// Animated loader illustration: Pacifica minivan driving past autumn pines under fairy lights.
export const VAN_SVG = `<svg class="vanart" viewBox="0 0 280 132" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="beamGrad" x1="0" y1="0.5" x2="1" y2="0.5">
      <stop offset="0%" stop-color="#FFE49E" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#FFE49E" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="sceneClip"><rect x="10" y="6" width="260" height="118" rx="14"/></clipPath>
  </defs>
  <g clip-path="url(#sceneClip)">
    <!-- Scrolling background autumn trees -->
    <g class="vanart__trees">
      <polygon points="36,104 46,72 56,104" fill="#2F4A3A" opacity="0.55"/>
      <circle cx="92" cy="86" r="14" fill="#D9682B" opacity="0.5"/>
      <rect x="90" y="94" width="3" height="10" fill="#3B2D26" opacity="0.5"/>
      <polygon points="150,104 162,66 174,104" fill="#2F4A3A" opacity="0.5"/>
      <circle cx="222" cy="84" r="15" fill="#E3A63B" opacity="0.5"/>
      <rect x="220" y="94" width="3" height="10" fill="#3B2D26" opacity="0.5"/>
      <polygon points="276,104 286,72 296,104" fill="#2F4A3A" opacity="0.55"/>
      <circle cx="332" cy="86" r="14" fill="#D9682B" opacity="0.5"/>
    </g>
    <!-- Overhead twinkling fairy lights -->
    <path class="vanart__string" d="M18 22 Q82 42 140 24 T262 22" fill="none"/>
    <g class="vanart__bulbs">
      <circle cx="34" cy="28" r="3"/><circle cx="60" cy="34" r="3"/><circle cx="88" cy="34" r="3"/>
      <circle cx="116" cy="29" r="3"/><circle cx="144" cy="23" r="3"/><circle cx="172" cy="20" r="3"/>
      <circle cx="200" cy="22" r="3"/><circle cx="228" cy="25" r="3"/><circle cx="252" cy="23" r="3"/>
    </g>
    <!-- Scrolling road dashes -->
    <line x1="12" y1="106" x2="268" y2="106" stroke="#ffffff26" stroke-width="2" stroke-linecap="round"/>
    <g class="vanart__road">
      <line x1="20" y1="112" x2="48" y2="112"/><line x1="76" y1="112" x2="104" y2="112"/>
      <line x1="132" y1="112" x2="160" y2="112"/><line x1="188" y1="112" x2="216" y2="112"/>
      <line x1="244" y1="112" x2="272" y2="112"/><line x1="300" y1="112" x2="328" y2="112"/>
    </g>
    <!-- Ground shadow -->
    <ellipse cx="136" cy="105" rx="90" ry="4.5" fill="#00000040"/>
    <!-- Bouncing van body + headlight beam -->
    <g class="vanart__chassis">
      <polygon class="vanart__beam" points="228,74 278,60 278,96 228,84" fill="url(#beamGrad)"/>
      <path class="vanart__body" d="M46 95 V69 Q46 57 58 53 L88 45 Q96 43 104 43 H202 Q218 43 222 57 L228 76 V95 Z"/>
      <path class="vanart__glass" d="M90 51 Q94 49 102 49 H126 V67 H78 Z M132 49 H164 V67 H132 Z M170 49 H200 Q210 49 213 59 L215 67 H170 Z"/>
      <rect class="vanart__trim" x="46" y="83" width="182" height="4.5" rx="2"/>
      <!-- Tail light & warm headlight -->
      <rect x="46" y="64" width="4.5" height="12" rx="2" fill="#D94B38"/>
      <rect x="223" y="72" width="5.5" height="8" rx="2.5" fill="#FFF3B8"/>
      <!-- Roof rack -->
      <rect x="86" y="40" width="96" height="2.5" rx="1.2" fill="#CFCBC4"/>
    </g>
    <!-- Spinning rear wheel -->
    <g transform="translate(82 95)">
      <circle class="vanart__tyre" r="12"/><circle class="vanart__hub" r="5.5"/>
      <g class="vanart__spokes"><line x1="-5" y1="0" x2="5" y2="0"/><line x1="0" y1="-5" x2="0" y2="5"/></g>
    </g>
    <!-- Spinning front wheel -->
    <g transform="translate(196 95)">
      <circle class="vanart__tyre" r="12"/><circle class="vanart__hub" r="5.5"/>
      <g class="vanart__spokes"><line x1="-5" y1="0" x2="5" y2="0"/><line x1="0" y1="-5" x2="0" y2="5"/></g>
    </g>
  </g>
</svg>`;

export function VanArt({ onClick, honked }: { onClick?: () => void; honked?: boolean }) {
  return (
    <button
      type="button"
      className={'vanart-wrap' + (honked ? ' is-honk' : '')}
      onClick={onClick}
      aria-label="Honk the minivan horn"
      title="Click to honk!"
      dangerouslySetInnerHTML={{ __html: VAN_SVG }}
    />
  );
}
