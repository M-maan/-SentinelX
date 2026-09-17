# SentinelX Endpoint Agent (M2)

The standard-library Go agent enrolls one endpoint and sends authenticated heartbeat and telemetry payloads. It stores its identity under the platform user config directory (or `SENTINELX_DATA_DIR`).

## Local run

Set `SENTINELX_API_URL`, `SENTINELX_ENROLLMENT_TOKEN` for first enrollment, then run `go run ./cmd/sentinelx-agent -once`. For continuous operation set `SENTINELX_INTERVAL` (for example `60s`). The API never logs or returns the stored credential hash.

## Windows setup from the Devices page

The Devices page can download a ZIP containing a compiled Windows agent, a short-lived `setup.json`, and `Start SentinelX Agent.cmd`. Extract all files into the same folder and double-click the launcher. The agent reads `setup.json` on first run, enrolls, stores its long-lived identity in the Windows user config directory, and deletes `setup.json` after successful enrollment. Keep the launcher window open for continuous heartbeat and telemetry. The ZIP contains a 30-minute enrollment secret and should be kept private and deleted after enrollment.

To rebuild the downloadable executable from the repository root when the Go source changes, run `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags=-s -o apps/web/public/downloads/sentinelx-agent.exe ./agents/sentinelx-agent/cmd/sentinelx-agent` from a Go workspace or use a Go 1.22+ container with `agents/sentinelx-agent` as the working directory.

Build targets: `GOOS=windows GOARCH=amd64 go build ./cmd/sentinelx-agent` and `GOOS=linux GOARCH=amd64 go build ./cmd/sentinelx-agent`.
