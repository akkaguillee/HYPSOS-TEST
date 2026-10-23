import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Sistema de movimiento HYPSOS.
 *
 * Nada de fundidos ni deslizamientos genéricos: cada gesto imita un proceso físico de la calle.
 * - press: las letras salen «prensadas» desde la línea base (escala vertical con rebote y un
 *   ancho que se comprime), como un titular estampado.
 * - spray: imágenes que se pintan con espray (canvas, ver spray.ts).
 * - draw + drip: trazos de graffiti que se dibujan y gotean con gravedad (DrawSVG).
 * - slap: pegatinas que se estampan con un golpe y un pequeño temblor.
 * - scramble: etiquetas técnicas que se decodifican.
 *
 * Duraciones y curvas espejo de los tokens CSS (--dur-*, --ease-*) para lo que sigue en CSS.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin, ScrambleTextPlugin);

/* Curvas propias, dibujadas como en el editor de gráficos de un programa de animación. */
CustomEase.create('hyp.press', 'M0,0 C0.1,0 0.16,1.16 0.38,1.08 0.56,1.01 0.74,0.99 1,1');
CustomEase.create('hyp.slap', 'M0,0 C0.18,0 0.24,1.26 0.44,1.06 0.58,0.94 0.76,1.01 1,1');
CustomEase.create('hyp.drip', 'M0,0 C0.38,0 0.56,0.36 0.68,0.64 0.8,0.9 0.9,1 1,1');
CustomEase.create('hyp.stroke', 'M0,0 C0.3,0 0.36,0.52 0.5,0.7 0.66,0.9 0.78,1 1,1');

export const DURATION = {
  micro: 0.16,
  hover: 0.24,
  enter: 0.56,
  editorial: 0.9,
  campaign: 1.4,
} as const;

export const EASE = {
  out: 'expo.out',
  outSoft: 'power3.out',
  inOut: 'power3.inOut',
  press: 'hyp.press',
  slap: 'hyp.slap',
  drip: 'hyp.drip',
  stroke: 'hyp.stroke',
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Dispositivo con puntero fino (ratón / trackpad). */
export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Letras prensadas: cada carácter nace aplastado contra su línea base y ensanchado, y se
 * «estampa» a su forma con un rebote. Solo transform (sin opacidad): escalaY 0 ya lo oculta.
 */
export function pressIn(chars: Element[], vars: gsap.TweenVars = {}): gsap.core.Tween {
  return gsap.fromTo(
    chars,
    { scaleY: 0, scaleX: 1.7, skewX: -14, transformOrigin: '50% 88%' },
    {
      scaleY: 1,
      scaleX: 1,
      skewX: 0,
      duration: 0.95,
      ease: EASE.press,
      stagger: { each: 0.022, from: 'start' },
      ...vars,
    },
  );
}

/**
 * Pegatina estampada: cae desde «la mano» (grande, girada) y se pega con un golpe seco. Cada una
 * aparece justo en su golpe (no antes). `impact` hace temblar el soporte un instante al aterrizar.
 */
export function slap(
  targets: Element[],
  { delay = 0, stagger = 0.14, impact, scrollTrigger }: { delay?: number; stagger?: number; impact?: Element | null; scrollTrigger?: ScrollTrigger.Vars } = {},
): gsap.core.Timeline {
  const tl = gsap.timeline({ delay, scrollTrigger });
  gsap.set(targets, { autoAlpha: 0 });
  targets.forEach((target, index) => {
    const at = index * stagger;
    tl.set(target, { autoAlpha: 1 }, at).fromTo(
      target,
      { scale: 1.9, rotation: index % 2 ? -18 : 18 },
      { scale: 1, rotation: 0, duration: 0.5, ease: EASE.slap, immediateRender: false },
      at,
    );
    if (impact) {
      tl.fromTo(impact, { x: 0 }, { keyframes: { x: [0, -3, 2.5, -1.5, 0] }, duration: 0.2, ease: 'none', clearProps: 'x', immediateRender: false }, at + 0.16);
    }
  });
  return tl;
}

export { CustomEase, DrawSVGPlugin, gsap, ScrambleTextPlugin, ScrollTrigger, SplitText, useGSAP };
