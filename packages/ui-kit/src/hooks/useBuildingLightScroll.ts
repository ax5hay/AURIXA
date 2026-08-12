"use client";

import { useEffect, type RefObject } from "react";

/** Horizontal beam anchors (% from left) aligned with building columns */
export const BEAM_ANCHORS = [14, 31, 48, 66, 83] as const;

function nearestBeamIndex(xPercent: number): number {
  let best = 0;
  let bestDist = Infinity;
  BEAM_ANCHORS.forEach((anchor, index) => {
    const dist = Math.abs(anchor - xPercent);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}

function applyBeamState(root: HTMLElement, activeIndex: number, strength: number) {
  const clamped = Math.min(1, Math.max(0, strength));
  root.style.setProperty("--re-beam-intensity", clamped.toFixed(3));
  root.style.setProperty("--re-active-beam", String(activeIndex));
  BEAM_ANCHORS.forEach((x, index) => {
    const isActive = index === activeIndex;
    const opacity = isActive ? 0.55 + clamped * 0.45 : 0.08 + clamped * 0.12;
    root.style.setProperty(`--re-beam-${index}-x`, `${x}%`);
    root.style.setProperty(`--re-beam-${index}-opacity`, opacity.toFixed(3));
  });
}

/**
 * Scroll-reactive window lighting: as foreground sections pass the skyline zone,
 * nearby beams brighten smoothly (Tyndall-style haze follows via CSS).
 */
export function useBuildingLightScroll(rootRef: RefObject<HTMLElement | null>, mainId = "main-content") {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      applyBeamState(root, 2, 0.45);
      return;
    }

    let raf = 0;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const updateFromSections = () => {
      const main = document.getElementById(mainId);
      if (!main) return;

      const viewportH = window.innerHeight;
      const buildingZoneTop = viewportH * 0.58;
      let bestStrength = 0.15;
      let bestX: number = BEAM_ANCHORS[2];

      main.querySelectorAll(":scope > *").forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < buildingZoneTop || rect.top > viewportH) return;

        const overlap =
          Math.min(rect.bottom, viewportH) - Math.max(rect.top, buildingZoneTop);
        if (overlap <= 0) return;

        const strength = Math.min(1, overlap / (viewportH * 0.22));
        const centerX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;

        if (strength >= bestStrength) {
          bestStrength = strength;
          bestX = centerX;
        }
      });

      const scrollBoost = Math.min(0.35, Math.abs(scrollVelocity) * 0.002);
      applyBeamState(root, nearestBeamIndex(bestX), bestStrength + scrollBoost);
    };

    const onScroll = () => {
      scrollVelocity = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateFromSections();
      });
    };

    applyBeamState(root, 2, 0.35);
    updateFromSections();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const main = document.getElementById(mainId);
    const observer =
      main &&
      new MutationObserver(() => {
        onScroll();
      });
    if (main && observer) {
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer?.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [rootRef, mainId]);
}
