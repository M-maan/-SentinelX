export const MONITORING_POLL_INTERVAL_MS = 60_000;

export const monitoringPolling = {
  refetchInterval: (query: { state: { error: unknown } }) => query.state.error ? false : MONITORING_POLL_INTERVAL_MS,
  refetchIntervalInBackground: false,
  retry: false,
} as const;
