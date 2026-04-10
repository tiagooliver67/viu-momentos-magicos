import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (!enabled) { setValue(0); return; }
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + diff * eased;
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };

    requestAnimationFrame(tick);
  }, [target, duration, enabled]);

  return value;
}
