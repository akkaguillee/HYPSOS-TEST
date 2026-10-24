import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Sistema de movimiento HYPSOS.
 *
 * Nada de fundidos ni deslizamientos genéricos: cada gesto imita un proceso físico de imprenta y
 * de cámara.
 * - press: las letras salen «prensadas» desde la línea base (escala vertical con rebote y un
 *   ancho que se comprime), como un titular estampado.
 * - stamp: una pieza (la palabra de acento, un sello) cae grande y girada y se asienta con un golpe.
 * - aperture: las fotos se abren desde el centro como un diafragma (ImageReveal, Hero).
 * - scramble: etiquetas técnicas que se decodifican.
 *
 * Duraciones y curvas espejo de los tokens CSS (--dur-*, --ease-*) para lo que sigue en CSS.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase, ScrambleTextPlugin);

/* Curvas propias, dibujadas como en el editor de gráficos de un programa de animación. */
CustomEase.create('hyp.press', 'M0,0 C0.1,0 0.16,1.16 0.38,1.08 0.56,1.01 0.74,0.99 1,1');
CustomEase.create('hyp.stamp', 'M0,0 C0.18,0 0.24,1.26 0.44,1.06 0.58,0.94 0.76,1.01 1,1');

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
  stamp: 'hyp.stamp',
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
 * Sello: la pieza cae desde arriba grande y girada y se asienta con un golpe seco. Solo transform;
 * la pieza se hace visible en el instante del golpe (no antes).
 */
export function stamp(target: Element, vars: { delay?: number; rotation?: number } = {}): gsap.core.Timeline {
  const { delay = 0, rotation = -14 } = vars;
  const tl = gsap.timeline({ delay });
  tl.set(target, { autoAlpha: 1 }, 0).fromTo(
    target,
    { scale: 1.8, rotation: rotation },
    { scale: 1, rotation: 0, duration: 0.6, ease: EASE.stamp, immediateRender: false },
    0,
  );
  return tl;
}

export { CustomEase, gsap, ScrambleTextPlugin, ScrollTrigger, SplitText, useGSAP };
