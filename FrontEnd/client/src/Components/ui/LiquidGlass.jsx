import React from 'react';
import { cn } from '../../lib/utils';

/**
 * LiquidGlass — a floating translucent surface.
 *
 * Layering strategy (so it degrades gracefully):
 *   1. Always render a premium frosted base: translucent bg + hairline border +
 *      glass shadow with an inset top highlight. This alone looks good everywhere.
 *   2. In Chromium, ALSO apply the SVG `feDisplacementMap` refraction via
 *      backdrop-filter (gated by @supports in index.css-independent inline style).
 *   3. A top specular sheen sells the "glass edge".
 *
 * The SVG filter itself is injected once by <LiquidGlassDefs/> (mounted in App).
 */
export const LIQUID_FILTER_ID = 'aura-liquid-glass';

export function LiquidGlassDefs() {
  // Static displacement map (feTurbulence). Rendered once, never animated —
  // only consumers animate their own transform/opacity. Chromium-only effect;
  // other engines simply ignore the url() backdrop-filter and keep the frosted base.
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <filter
        id={LIQUID_FILTER_ID}
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="1.4" result="soft" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="soft"
          scale="24"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

const LiquidGlass = React.forwardRef(function LiquidGlass(
  { as: Comp = 'div', className, children, liquid = true, style, ...props },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={cn(
        // frosted base — works in every engine
        'glass-surface relative bg-glass border border-line-strong shadow-glass',
        'backdrop-blur-xl',
        // top specular sheen
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
        'before:bg-gradient-to-b before:from-white/10 before:to-transparent before:to-40%',
        className
      )}
      style={{
        // Chromium refraction; harmlessly ignored elsewhere (frosted base remains).
        ...(liquid
          ? { WebkitBackdropFilter: `url(#${LIQUID_FILTER_ID}) blur(6px) saturate(150%)`, backdropFilter: `url(#${LIQUID_FILTER_ID}) blur(6px) saturate(150%)` }
          : null),
        ...style,
      }}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default LiquidGlass;
