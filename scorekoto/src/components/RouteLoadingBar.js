"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ROUTE_PROGRESS_START_EVENT } from "@/app/lib/route-progress";

const MINIMUM_VISIBLE_TIME = 180;
const WATCHDOG_TIME = 12000;

function clearTimer(timerRef) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [phase, setPhase] = useState("idle");
  const [cycle, setCycle] = useState(0);
  const activeRef = useRef(false);
  const mountedRef = useRef(false);
  const startedAtRef = useRef(0);
  const completionTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const watchdogTimerRef = useRef(null);

  const finishNavigation = useCallback(() => {
    if (!activeRef.current) return;

    clearTimer(completionTimerRef);
    clearTimer(hideTimerRef);
    clearTimer(watchdogTimerRef);

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MINIMUM_VISIBLE_TIME - elapsed);

    completionTimerRef.current = window.setTimeout(() => {
      setPhase("completing");
      hideTimerRef.current = window.setTimeout(() => {
        activeRef.current = false;
        setPhase("idle");
      }, 260);
    }, remaining);
  }, []);

  const beginNavigation = useCallback(() => {
    if (activeRef.current) return;

    clearTimer(completionTimerRef);
    clearTimer(hideTimerRef);
    clearTimer(watchdogTimerRef);

    activeRef.current = true;
    startedAtRef.current = performance.now();
    setCycle((currentCycle) => currentCycle + 1);
    setPhase("loading");
    watchdogTimerRef.current = window.setTimeout(finishNavigation, WATCHDOG_TIME);
  }, [finishNavigation]);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const destinationRoute = `${destination.pathname}${destination.search}`;
      const currentRoute = `${current.pathname}${current.search}`;

      if (destination.origin === current.origin && destinationRoute !== currentRoute) {
        beginNavigation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", beginNavigation);
    window.addEventListener(ROUTE_PROGRESS_START_EVENT, beginNavigation);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", beginNavigation);
      window.removeEventListener(ROUTE_PROGRESS_START_EVENT, beginNavigation);
      clearTimer(completionTimerRef);
      clearTimer(hideTimerRef);
      clearTimer(watchdogTimerRef);
    };
  }, [beginNavigation]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const routeCompletionTimer = window.setTimeout(finishNavigation, 0);
    return () => window.clearTimeout(routeCompletionTimer);
  }, [routeKey, finishNavigation]);

  return (
    <div
      className="route-loading-bar"
      data-phase={phase}
      aria-hidden="true"
    >
      <span key={cycle} />
    </div>
  );
}
