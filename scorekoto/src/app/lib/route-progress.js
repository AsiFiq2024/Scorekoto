export const ROUTE_PROGRESS_START_EVENT = "scorekoto:route-progress-start";

export function startRouteProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ROUTE_PROGRESS_START_EVENT));
  }
}
