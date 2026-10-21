import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Sistema de movimiento HYPSOS.
 * Duraciones y curvas espejo de los tokens CSS (--dur-*, --ease-*), para que
 * CSS y GSAP compartan el mismo ritmo.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

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
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Dispositivo con puntero fino (ratón / trackpad). */
export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
