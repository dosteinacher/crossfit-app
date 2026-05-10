'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

/**
 * Live clock that ticks every second on the /wod TV display.
 * Constant pixel changes prevent the TV screensaver from triggering,
 * regardless of whether Wake Lock is supported by the browser.
 */
export default function WodClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="text-right tabular-nums">
      <p className="text-3xl font-bold text-pure-white">{format(now, 'h:mm:ss a')}</p>
      <p className="text-sm text-gray-400 mt-1">{format(now, 'EEEE, MMMM d, yyyy')}</p>
    </div>
  );
}
