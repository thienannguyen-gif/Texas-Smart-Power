// The brand graphic: nine tiles, 3 x 3 (sun, circle, wind turbine / quarter,
// home, bolt / quarter, plug, blank). The landing page shows it large; the
// results header shows the same graphic small. Decorative only.

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SIZES = {
  large: {
    grid: "gap-3",
    tile: "h-24 w-24 lg:h-28 lg:w-28",
    radius: "rounded-2xl",
    icon: "h-10 w-10",
  },
  small: {
    grid: "gap-1.5",
    tile: "h-9 w-9",
    radius: "rounded-lg",
    icon: "h-4 w-4",
  },
};

export function EnergyTiles({
  size = "large",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const tile = s.tile;
  const box = `${tile} grid place-items-center ${s.radius}`;
  const icon = s.icon;
  return (
    <div
      aria-hidden="true"
      data-testid={`energy-tiles-${size}`}
      className={`grid-cols-3 ${s.grid} ${className}`}
    >
      <div className={`${box} bg-gold text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </div>
      <div className={`${tile} rounded-full bg-brand`} />
      <div className={`${box} bg-white text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M12 12v10M12 12 9 3M12 12l8 3M12 12l-7 5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      </div>
      <div className={`${tile} rounded-tl-[100%] bg-[#7fd1b0]`} />
      <div className={`${box} bg-white text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M3 11 12 4l9 7M5 10v10h14V10" />
          <path d="m13 11-3 4h4l-3 4" />
        </svg>
      </div>
      <div className={`${box} bg-brand text-gold`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
      </div>
      <div className={`${tile} rounded-tr-[100%] bg-[#d4a43c]`} />
      <div className={`${box} bg-[#7fd1b0] text-bar`}>
        <svg viewBox="0 0 24 24" className={icon} {...ICON}>
          <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" />
        </svg>
      </div>
      <div className={`${tile} ${s.radius} bg-white/10`} />
    </div>
  );
}
