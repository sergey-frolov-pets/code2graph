<template>
  <div class="landing-diagram-bg" aria-hidden="true">
    <svg
      class="landing-diagram-bg__svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <g class="landing-diagram-bg__layer landing-diagram-bg__layer--flow" transform="translate(1040 72)">
        <rect x="0" y="0" width="96" height="44" rx="6" />
        <path d="M48 44 V68" />
        <polygon points="44,64 48,72 52,64" />
        <rect x="0" y="72" width="96" height="44" rx="6" />
        <path d="M48 116 V140" />
        <polygon points="44,136 48,144 52,136" />
        <rect x="0" y="144" width="96" height="44" rx="6" />
      </g>

      <g class="landing-diagram-bg__layer landing-diagram-bg__layer--sequence" transform="translate(72 560)">
        <line x1="24" y1="0" x2="24" y2="160" />
        <line x1="120" y1="0" x2="120" y2="160" />
        <line x1="216" y1="0" x2="216" y2="160" />
        <path d="M24 36 H120" />
        <polygon points="112,32 120,36 112,40" />
        <path d="M120 72 H216" />
        <polygon points="208,68 216,72 208,76" />
        <path d="M216 108 H120" stroke-dasharray="6 4" />
        <polygon points="128,104 120,108 128,112" />
      </g>

      <g class="landing-diagram-bg__layer landing-diagram-bg__layer--graph" transform="translate(920 520)">
        <circle cx="48" cy="48" r="28" />
        <circle cx="168" cy="24" r="22" />
        <circle cx="176" cy="132" r="26" />
        <path d="M74 42 L146 30" />
        <path d="M76 58 L152 112" />
        <path d="M142 132 L74 62" stroke-dasharray="5 4" />
      </g>

      <g class="landing-diagram-bg__layer landing-diagram-bg__layer--class" transform="translate(220 120)">
        <rect x="0" y="0" width="120" height="88" rx="6" />
        <line x1="0" y1="28" x2="120" y2="28" />
        <line x1="0" y1="56" x2="120" y2="56" />
        <rect x="160" y="40" width="104" height="72" rx="6" />
        <line x1="160" y1="64" x2="264" y2="64" />
        <path d="M120 44 H160" />
        <polygon points="152,40 160,44 152,48" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.landing-diagram-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.landing-diagram-bg__svg {
  width: 100%;
  height: 100%;
}

.landing-diagram-bg__layer {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.055;
}

.landing-diagram-bg__layer--flow rect {
  fill: color-mix(in srgb, var(--accent) 4%, transparent);
}

.landing-diagram-bg__layer--class rect {
  fill: color-mix(in srgb, var(--accent) 4%, transparent);
}

@media (max-width: 767px) {
  .landing-diagram-bg__layer {
    opacity: 0.04;
  }
}
</style>
