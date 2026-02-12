import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

/**
 * Custom hook for tracking analytics events.
 * Usage:
 *   const { trackEvent } = useAnalytics();
 *   trackEvent("button_click", { buttonName: "Learn More", page: "Tools" });
 */
export function useAnalytics() {
  const trackMutation = trpc.analytics.track.useMutation();

  const trackEvent = useCallback(
    (eventType: string, eventData?: Record<string, unknown>) => {
      trackMutation.mutate({
        eventType,
        eventData: eventData ? JSON.stringify(eventData) : undefined,
      });
    },
    [trackMutation]
  );

  return { trackEvent, isTracking: trackMutation.isPending };
}
