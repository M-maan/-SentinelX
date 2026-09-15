# SentinelX Endpoint Agent (M2)

The standard-library Go agent enrolls one endpoint and sends authenticated heartbeat and telemetry payloads. It stores its identity under the platform user config directory (or `SENTINELX_DATA_DIR`).

## Local run

Set `SENTINELX_API_URL`, `SENTINELX_ENROLLMENT_TOKEN` for first enrollment, then run `go run ./cmd/sentinelx-agent -once`. For continuous operation set `SENTINELX_INTERVAL` (for example `60s`). The API never logs or returns the stored credential hash.

Build targets: `GOOS=windows GOARCH=amd64 go build ./cmd/sentinelx-agent` and `GOOS=linux GOARCH=amd64 go build ./cmd/sentinelx-agent`.
