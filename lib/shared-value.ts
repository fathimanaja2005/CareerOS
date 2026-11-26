"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A text value shared by every agent tab and remembered in this browser only.
 * Used for the resume and the target role so the student enters them once.
 * Nothing here is sent anywhere: it lives in localStorage and is read back on
 * the next visit. Wrapped in try/catch because storage can be blocked.
 */
const PREFIX = "careeros:";
const EVENT = "careeros:shared-value";

function read(key: string): string {
  try {
    return window.localStorage.getItem(PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

export function useSharedValue(key: string): [string, (value: string) => void] {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(read(key));
    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail;
      if (detail?.key === key) setValue(detail.value);
    }
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        if (next) window.localStorage.setItem(PREFIX + key, next);
        else window.localStorage.removeItem(PREFIX + key);
      } catch {
        // Storage blocked: the value still works for this session.
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value: next } }));
    },
    [key],
  );

  return [value, update];
}
