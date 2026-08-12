"use client";

import React, { useRef } from "react";
import clsx from "clsx";
import { useBuildingLightScroll } from "../hooks/useBuildingLightScroll";

export interface RealEstateAtmosphereProps {
  className?: string;
  mainId?: string;
}

type WindowSpec = { x: number; y: number; w: number; h: number; lit: boolean; delay: number };

function buildWindows(): WindowSpec[] {
  const windows: WindowSpec[] = [];
  const towers: { x: number; y: number; w: number; h: number; cols: number; rows: number; seed: number }[] = [
    { x: 24, y: 38, w: 118, h: 142, cols: 4, rows: 6, seed: 1 },
    { x: 168, y: 22, w: 102, h: 158, cols: 3, rows: 7, seed: 2 },
    { x: 292, y: 48, w: 128, h: 132, cols: 4, rows: 5, seed: 3 },
    { x: 448, y: 12, w: 96, h: 168, cols: 3, rows: 8, seed: 4 },
    { x: 572, y: 52, w: 140, h: 128, cols: 5, rows: 5, seed: 5 },
    { x: 738, y: 28, w: 110, h: 152, cols: 3, rows: 7, seed: 6 },
    { x: 878, y: 56, w: 124, h: 124, cols: 4, rows: 5, seed: 7 },
    { x: 1028, y: 34, w: 108, h: 146, cols: 3, rows: 6, seed: 8 },
  ];

  towers.forEach((tower) => {
    const padX = 10;
    const padY = 12;
    const gapX = (tower.w - padX * 2 - tower.cols * 14) / Math.max(1, tower.cols - 1);
    const gapY = (tower.h - padY * 2 - tower.rows * 11) / Math.max(1, tower.rows - 1);

    for (let row = 0; row < tower.rows; row += 1) {
      for (let col = 0; col < tower.cols; col += 1) {
        const lit = (row + col + tower.seed) % 4 !== 0;
        windows.push({
          x: tower.x + padX + col * (14 + gapX),
          y: tower.y + padY + row * (11 + gapY),
          w: 14,
          h: 11,
          lit,
          delay: (row * 0.7 + col * 0.35 + tower.seed) % 5,
        });
      }
    }
  });

  return windows;
}

const WINDOWS = buildWindows();

/** Fixed skyline with lit windows + scroll-reactive Tyndall beams */
export function RealEstateAtmosphere({ className, mainId = "main-content" }: RealEstateAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBuildingLightScroll(rootRef, mainId);

  return (
    <div
      ref={rootRef}
      className={clsx("ui-re-atmosphere", className)}
      aria-hidden
      data-re-atmosphere
    >
      <div className="ui-re-tyndall" />
      <div className="ui-re-beams" />
      <div className="ui-re-building-scene">
        <svg
          className="ui-re-building-svg"
          viewBox="0 0 1200 200"
          preserveAspectRatio="xMidYMax meet"
          role="presentation"
        >
          <defs>
            <linearGradient id="ui-re-building-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.38" />
            </linearGradient>
            <filter id="ui-re-soften" x="-2%" y="-2%" width="104%" height="104%">
              <feGaussianBlur stdDeviation="0.4" />
            </filter>
          </defs>

          {/* Smooth tower silhouettes — rounded joins, no jagged blocks */}
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M0 200V148h28v18h52V118h44v82h36V132h58v68H0Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M148 200V98h88c6 0 10 4 10 10v92H148Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M278 200V128h132c5 0 9 4 9 9v63H278Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M434 200V72h78c6 0 11 5 11 11v117H434Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M556 200V138h148c5 0 9 4 9 9v53H556Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M724 200V104h96c6 0 10 4 10 10v86H724Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M862 200V142h118c5 0 9 4 9 9v49H862Z"
          />
          <path
            fill="url(#ui-re-building-fill)"
            filter="url(#ui-re-soften)"
            d="M1004 200V112h88c6 0 10 4 10 10v78h-98Z"
          />

          {WINDOWS.map((win, index) => (
            <rect
              key={`${win.x}-${win.y}-${index}`}
              x={win.x}
              y={win.y}
              width={win.w}
              height={win.h}
              rx={1.6}
              className={clsx("ui-re-window", win.lit && "ui-re-window--lit")}
              style={{ animationDelay: `${win.delay}s` }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
