import { useEffect, useState } from 'react';

export function useCountdown(expiresAt: string | null | undefined) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!expiresAt) {
      setSeconds(0);
      return;
    }
    const expiryMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiryMs)) {
      setSeconds(0);
      return;
    }
    const calc = () => {
      setSeconds(Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000)));
    };
    calc();
    const timer = setInterval(calc, 250);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return { seconds, formatted };
}
