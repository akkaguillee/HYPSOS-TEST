/**
 * Filtros SVG compartidos de la capa de graffiti (se montan una vez en el Layout).
 *
 * `#hyp-spray`: convierte un trazo limpio en pintura de espray —borde rugoso (turbulencia +
 * desplazamiento), bruma alrededor (desenfoque a media opacidad) y gotitas sueltas (ruido fino
 * umbralizado dentro de un halo ancho)—. Las cifras están en unidades del SVG que lo usa.
 */
export function SprayDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="hyp-spray" x="-15%" y="-30%" width="130%" height="170%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="4" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feGaussianBlur in="rough" stdDeviation="3" result="halo" />
          <feComponentTransfer in="halo" result="mist">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="wide" />
          <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="1" seed="9" result="fine" />
          <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 14 -8.4" result="dots" />
          <feComposite in="wide" in2="dots" operator="in" result="speckle" />
          <feMerge>
            <feMergeNode in="speckle" />
            <feMergeNode in="mist" />
            <feMergeNode in="rough" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
