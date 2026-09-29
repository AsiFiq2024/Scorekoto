"use client";

import { useSyncExternalStore } from "react";
import {
  formatKickoffTime,
  hasKnownKickoffTime,
} from "@/app/lib/kickoff-time";

const subscribe = () => () => {};

export default function LocalKickoffTime({
  matchDate,
  status,
  className,
  prefix = "",
  showTimezone = true,
}) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const isKnown = hasKnownKickoffTime(matchDate, status);
  const label = isKnown
    ? isHydrated
      ? formatKickoffTime(matchDate, status, showTimezone)
      : formatKickoffTime(matchDate, status, showTimezone)
    : "TBD";

  return (
    <span className={className} title="Bangladesh Standard Time (BST, UTC+6)">
      {prefix}{label}
    </span>
  );
}
