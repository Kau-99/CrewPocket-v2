"use client";

import { useEffect, useState } from "react";

/** Badge "Offline — changes will sync" e afins (SPEC §7). */
export function useOnlineStatus(): boolean {
  // true inicial evita flash de "offline" durante a hidratação
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
