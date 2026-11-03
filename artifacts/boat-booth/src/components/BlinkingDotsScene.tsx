import { useEffect, useRef } from "react";

/**
 * Randomly scattered dots, each twinkling in and out of visibility on its
 * own cycle — the generating/loading visual. Replaces the earlier Ulam
 * spiral, which read as one static spread-out field rather than something
 * actively happening; this keeps points fixed in place but makes the
 * "working" feeling come from blinking rather than layout.
 */
export function BlinkingDotsScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color = getComputedStyle(container).color || "#1e293b";
    const dotRadius = 1.2;
    const gap = 2.2; // approx. spacing between points, in CSS pixels — smaller = more dots (~10x the original count)

    type Dot = { x: number; y: number; speed: number; phase: number };
    let dots: Dot[] = [];

    function layoutDots() {
      const cw = container!.clientWidth;
      const ch = container!.clientHeight;
      if (cw === 0 || ch === 0) return;

      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(40, Math.ceil((cw * ch) / (gap * gap)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * cw,
        y: Math.random() * ch,
        speed: 0.6 + Math.random() * 1.4, // cycles per ~10s, varied per dot
        phase: Math.random() * Math.PI * 2,
      }));
    }

    layoutDots();

    let frameId = 0;
    const start = performance.now();

    // At this density (~10x the original), one beginPath+arc+fill per dot
    // per frame is too many draw calls. Bucket dots by rounded opacity and
    // fill each bucket in one path instead — same look, a few dozen fill()
    // calls per frame instead of tens of thousands.
    const OPACITY_BUCKETS = 24;
    const buckets: Dot[][] = Array.from({ length: OPACITY_BUCKETS }, () => []);

    function render(now: number) {
      frameId = requestAnimationFrame(render);
      const cw = container!.clientWidth;
      const ch = container!.clientHeight;
      if (cw === 0 || ch === 0) return;

      ctx!.clearRect(0, 0, cw, ch);
      const t = (now - start) / 1000;

      for (const bucket of buckets) bucket.length = 0;

      for (const dot of dots) {
        // Twinkle: mostly dim, with periodic bright pulses — reads as
        // "blinking," not a smooth breathing glow.
        const wave = Math.sin(t * dot.speed + dot.phase);
        const opacity = Math.max(0, wave) ** 3;
        if (opacity < 0.03) continue;
        const bucketIndex = Math.min(OPACITY_BUCKETS - 1, Math.floor(opacity * OPACITY_BUCKETS));
        buckets[bucketIndex].push(dot);
      }

      ctx!.fillStyle = color;
      for (let i = 0; i < OPACITY_BUCKETS; i++) {
        const bucket = buckets[i];
        if (bucket.length === 0) continue;
        ctx!.globalAlpha = (i + 0.5) / OPACITY_BUCKETS;
        ctx!.beginPath();
        for (const dot of bucket) {
          ctx!.moveTo(dot.x + dotRadius, dot.y);
          ctx!.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
        }
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }
    frameId = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(layoutDots);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 text-foreground/70" />;
}
