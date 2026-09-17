package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type config struct {
	APIURL, EnrollmentToken, AgentID, AgentToken, Version, DataDir string
	Interval                                                       time.Duration
}
type identity struct{ AgentID, AgentToken string }
type systemInfo struct{ Hostname, OS, OSVersion, Architecture, AgentVersion string }
type telemetry struct {
	Timestamp   string  `json:"timestamp"`
	CPU         float64 `json:"cpuUsagePercent"`
	MemoryTotal int64   `json:"memoryTotalBytes"`
	MemoryUsed  int64   `json:"memoryUsedBytes"`
	MemoryUsage float64 `json:"memoryUsagePercent"`
	DiskTotal   int64   `json:"diskTotalBytes"`
	DiskUsed    int64   `json:"diskUsedBytes"`
	DiskUsage   float64 `json:"diskUsagePercent"`
	Uptime      int64   `json:"uptimeSeconds"`
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
func loadConfig() config {
	interval, _ := time.ParseDuration(env("SENTINELX_INTERVAL", "60s"))
	apiURL := env("SENTINELX_API_URL", "http://localhost:3001/api/v1")
	enrollmentToken := os.Getenv("SENTINELX_ENROLLMENT_TOKEN")
	// The UI download places a short-lived setup file beside the agent executable.
	// Environment variables still take precedence for manually managed installs.
	if exe, err := os.Executable(); err == nil {
		if data, err := os.ReadFile(filepath.Join(filepath.Dir(exe), "setup.json")); err == nil {
			var setup struct {
				APIURL          string `json:"apiUrl"`
				EnrollmentToken string `json:"enrollmentToken"`
			}
			if json.Unmarshal(data, &setup) == nil {
				if os.Getenv("SENTINELX_API_URL") == "" && setup.APIURL != "" {
					apiURL = setup.APIURL
				}
				if enrollmentToken == "" {
					enrollmentToken = setup.EnrollmentToken
				}
			}
		}
	}
	dir := os.Getenv("SENTINELX_DATA_DIR")
	if dir == "" {
		if d, e := os.UserConfigDir(); e == nil {
			dir = filepath.Join(d, "SentinelX")
		}
	}
	return config{APIURL: strings.TrimRight(apiURL, "/"), EnrollmentToken: enrollmentToken, AgentID: os.Getenv("SENTINELX_AGENT_ID"), AgentToken: os.Getenv("SENTINELX_AGENT_TOKEN"), Version: env("SENTINELX_AGENT_VERSION", "0.1.0"), DataDir: dir, Interval: interval}
}
func loadIdentity(c config) (identity, error) {
	if c.AgentID != "" && c.AgentToken != "" {
		return identity{c.AgentID, c.AgentToken}, nil
	}
	if err := os.MkdirAll(c.DataDir, 0700); err != nil {
		return identity{}, err
	}
	p := filepath.Join(c.DataDir, "identity.json")
	if b, e := os.ReadFile(p); e == nil {
		var i identity
		if json.Unmarshal(b, &i) == nil && i.AgentID != "" {
			return i, nil
		}
	}
	raw := make([]byte, 16)
	if _, e := rand.Read(raw); e != nil {
		return identity{}, e
	}
	i := identity{AgentID: hex.EncodeToString(raw)}
	return i, nil
}
func collect(c config, id identity) systemInfo {
	h, _ := os.Hostname()
	return systemInfo{Hostname: h, OS: runtime.GOOS, OSVersion: runtime.Version(), Architecture: runtime.GOARCH, AgentVersion: c.Version}
}
func readProc(path string) string { b, _ := os.ReadFile(path); return string(b) }
func numberFromLine(text, key string) int64 {
	for _, line := range strings.Split(text, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[0] == key {
			v, _ := strconv.ParseInt(fields[1], 10, 64)
			return v
		}
	}
	return 0
}
func collectTelemetry() telemetry {
	t := telemetry{Timestamp: time.Now().UTC().Format(time.RFC3339), CPU: 0, MemoryTotal: 0, MemoryUsed: 0, MemoryUsage: 0, DiskTotal: 0, DiskUsed: 0, DiskUsage: 0, Uptime: 0}
	if runtime.GOOS == "windows" {
		command := "$os=Get-CimInstance Win32_OperatingSystem; $cpu=(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average; $disk=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\"; [pscustomobject]@{Cpu=[double]$cpu;MemoryTotal=[int64]$os.TotalVisibleMemorySize*1024;MemoryFree=[int64]$os.FreePhysicalMemory*1024;DiskTotal=[int64]$disk.Size;DiskFree=[int64]$disk.FreeSpace;Boot=$os.LastBootUpTime.ToString('o')} | ConvertTo-Json -Compress"
		if output, err := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", command).Output(); err == nil {
			var m struct {
				CPU         float64 `json:"Cpu"`
				MemoryTotal int64   `json:"MemoryTotal"`
				MemoryFree  int64   `json:"MemoryFree"`
				DiskTotal   int64   `json:"DiskTotal"`
				DiskFree    int64   `json:"DiskFree"`
				Boot        string  `json:"Boot"`
			}
			if json.Unmarshal(output, &m) == nil {
				t.CPU = m.CPU
				t.MemoryTotal = m.MemoryTotal
				t.MemoryUsed = m.MemoryTotal - m.MemoryFree
				if t.MemoryTotal > 0 {
					t.MemoryUsage = float64(t.MemoryUsed) * 100 / float64(t.MemoryTotal)
				}
				t.DiskTotal = m.DiskTotal
				t.DiskUsed = m.DiskTotal - m.DiskFree
				if t.DiskTotal > 0 {
					t.DiskUsage = float64(t.DiskUsed) * 100 / float64(t.DiskTotal)
				}
				if boot, err := time.Parse(time.RFC3339Nano, m.Boot); err == nil {
					t.Uptime = int64(time.Since(boot).Seconds())
				}
				return t
			}
		}
	}
	if runtime.GOOS == "linux" {
		mem := readProc("/proc/meminfo")
		total := numberFromLine(mem, "MemTotal:") * 1024
		free := numberFromLine(mem, "MemAvailable:") * 1024
		t.MemoryTotal = total
		t.MemoryUsed = total - free
		if total > 0 {
			t.MemoryUsage = float64(t.MemoryUsed) * 100 / float64(total)
		}
		up := strings.Fields(readProc("/proc/uptime"))
		if len(up) > 0 {
			seconds, _ := strconv.ParseFloat(up[0], 64)
			t.Uptime = int64(seconds)
		}
	}
	if out, e := exec.Command("df", "-k", string(filepath.Separator)).Output(); e == nil {
		lines := strings.Split(strings.TrimSpace(string(out)), "\n")
		if len(lines) > 1 {
			f := strings.Fields(lines[len(lines)-1])
			if len(f) >= 5 {
				t.DiskTotal, _ = strconv.ParseInt(f[1], 10, 64)
				t.DiskTotal *= 1024
				t.DiskUsed, _ = strconv.ParseInt(f[2], 10, 64)
				t.DiskUsed *= 1024
				if t.DiskTotal > 0 {
					t.DiskUsage = float64(t.DiskUsed) * 100 / float64(t.DiskTotal)
				}
			}
		}
	}
	return t
}
func post(c config, path string, body any, token string, out any) error {
	b, _ := json.Marshal(body)
	var last error
	for attempt := 0; attempt < 3; attempt++ {
		req, e := http.NewRequest(http.MethodPost, c.APIURL+path, bytes.NewReader(b))
		if e != nil {
			return e
		}
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Agent "+token)
		}
		res, e := (&http.Client{Timeout: 15 * time.Second}).Do(req)
		if e == nil {
			data, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode >= 200 && res.StatusCode < 300 {
				if out != nil {
					return json.Unmarshal(data, out)
				}
				return nil
			}
			last = fmt.Errorf("agent API %s: %s", res.Status, string(data))
		} else {
			last = e
		}
		if attempt < 2 {
			time.Sleep(time.Duration(1<<attempt) * 500 * time.Millisecond)
		}
	}
	return last
}
func run(c config, i *identity) error {
	info := collect(c, *i)
	if i.AgentToken == "" {
		if c.EnrollmentToken == "" {
			return errors.New("SENTINELX_ENROLLMENT_TOKEN is required for first enrollment")
		}
		var result struct{ AgentID, AgentToken string }
		if err := post(c, "/agents/enroll", map[string]any{"agentId": i.AgentID, "hostname": info.Hostname, "operatingSystem": info.OS, "osVersion": info.OSVersion, "architecture": info.Architecture, "agentVersion": info.AgentVersion, "enrollmentToken": c.EnrollmentToken}, "", &result); err != nil {
			return err
		}
		i.AgentID, i.AgentToken = result.AgentID, result.AgentToken
		if err := os.WriteFile(filepath.Join(c.DataDir, "identity.json"), mustJSON(*i), 0600); err != nil {
			return err
		}
		if exe, err := os.Executable(); err == nil {
			_ = os.Remove(filepath.Join(filepath.Dir(exe), "setup.json"))
		}
	}
	if err := post(c, "/agents/heartbeat", map[string]string{"agentVersion": info.AgentVersion}, i.AgentToken, nil); err != nil {
		return err
	}
	return post(c, "/agents/telemetry", collectTelemetry(), i.AgentToken, nil)
}
func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }
func main() {
	once := flag.Bool("once", false, "run one enrollment/heartbeat/telemetry cycle")
	flag.Parse()
	c := loadConfig()
	i, e := loadIdentity(c)
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
	for {
		if e = run(c, &i); e != nil {
			fmt.Fprintln(os.Stderr, e)
			if *once {
				os.Exit(1)
			}
		} else if *once {
			return
		}
		if *once {
			return
		}
		time.Sleep(c.Interval)
	}
}
