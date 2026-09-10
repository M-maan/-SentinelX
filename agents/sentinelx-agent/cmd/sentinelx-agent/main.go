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
  "path/filepath"
  "runtime"
  "strings"
  "time"
)

type config struct { APIURL, EnrollmentToken, AgentID, AgentToken, Version, DataDir string; Interval time.Duration }
type identity struct { AgentID, AgentToken string }
type systemInfo struct { Hostname, OS, OSVersion, Architecture, AgentVersion string }
type telemetry struct { Timestamp string `json:"timestamp"`; CPU float64 `json:"cpuUsagePercent"`; MemoryTotal int64 `json:"memoryTotalBytes"`; MemoryUsed int64 `json:"memoryUsedBytes"`; MemoryUsage float64 `json:"memoryUsagePercent"`; DiskTotal int64 `json:"diskTotalBytes"`; DiskUsed int64 `json:"diskUsedBytes"`; DiskUsage float64 `json:"diskUsagePercent"`; Uptime int64 `json:"uptimeSeconds"` }
func env(k, fallback string) string { if v:=os.Getenv(k);v!="" { return v }; return fallback }
func loadConfig() config { interval,_:=time.ParseDuration(env("SENTINELX_INTERVAL","60s")); dir:=os.Getenv("SENTINELX_DATA_DIR");if dir=="" { if d,e:=os.UserConfigDir();e==nil {dir=filepath.Join(d,"SentinelX")} }; return config{APIURL:strings.TrimRight(env("SENTINELX_API_URL","http://localhost:3001/api/v1"),"/"),EnrollmentToken:os.Getenv("SENTINELX_ENROLLMENT_TOKEN"),AgentID:os.Getenv("SENTINELX_AGENT_ID"),AgentToken:os.Getenv("SENTINELX_AGENT_TOKEN"),Version:env("SENTINELX_AGENT_VERSION","0.1.0"),DataDir:dir,Interval:interval} }
func loadIdentity(c config) (identity,error) { if c.AgentID!=""&&c.AgentToken!="" {return identity{c.AgentID,c.AgentToken},nil}; if err:=os.MkdirAll(c.DataDir,0700);err!=nil{return identity{},err}; p:=filepath.Join(c.DataDir,"identity.json");if b,e:=os.ReadFile(p);e==nil {var i identity;if json.Unmarshal(b,&i)==nil&&i.AgentID!="" {return i,nil}}; raw:=make([]byte,16);if _,e:=rand.Read(raw);e!=nil{return identity{},e}; i:=identity{AgentID:hex.EncodeToString(raw)};return i,nil }
func collect(c config, id identity) systemInfo { h,_:=os.Hostname();return systemInfo{Hostname:h,OS:runtime.GOOS,OSVersion:runtime.Version(),Architecture:runtime.GOARCH,AgentVersion:c.Version} }
func post(c config,path string, body any, token string, out any) error { b,_:=json.Marshal(body); req,e:=http.NewRequest(http.MethodPost,c.APIURL+path,bytes.NewReader(b));if e!=nil{return e};req.Header.Set("Content-Type","application/json");if token!=""{req.Header.Set("Authorization","Agent "+token)};res,e:=(&http.Client{Timeout:15*time.Second}).Do(req);if e!=nil{return e};defer res.Body.Close();data,_:=io.ReadAll(res.Body);if res.StatusCode<200||res.StatusCode>=300{return fmt.Errorf("agent API %s: %s",res.Status,string(data))};if out!=nil{return json.Unmarshal(data,out)};return nil }
func run(c config, i *identity) error { info:=collect(c,*i);if i.AgentToken=="" {if c.EnrollmentToken=="" {return errors.New("SENTINELX_ENROLLMENT_TOKEN is required for first enrollment")};var result struct{AgentID,AgentToken string};if err:=post(c,"/agents/enroll",map[string]any{"agentId":i.AgentID,"hostname":info.Hostname,"operatingSystem":info.OS,"osVersion":info.OSVersion,"architecture":info.Architecture,"agentVersion":info.AgentVersion,"enrollmentToken":c.EnrollmentToken},"",&result);err!=nil{return err};i.AgentID,i.AgentToken=result.AgentID,result.AgentToken;if err:=os.WriteFile(filepath.Join(c.DataDir,"identity.json"),mustJSON(*i),0600);err!=nil{return err}};if err:=post(c,"/agents/heartbeat",map[string]string{"agentVersion":info.AgentVersion},i.AgentToken,nil);err!=nil{return err};t:=telemetry{Timestamp:time.Now().UTC().Format(time.RFC3339),CPU:0,MemoryTotal:0,MemoryUsed:0,MemoryUsage:0,DiskTotal:0,DiskUsed:0,DiskUsage:0,Uptime:0};return post(c,"/agents/telemetry",t,i.AgentToken,nil) }
func mustJSON(v any) []byte { b,_:=json.Marshal(v);return b }
func main(){once:=flag.Bool("once",false,"run one enrollment/heartbeat/telemetry cycle");flag.Parse();c:=loadConfig();i,e:=loadIdentity(c);if e!=nil{fmt.Fprintln(os.Stderr,e);os.Exit(1)};for {if e=run(c,&i);e!=nil{fmt.Fprintln(os.Stderr,e);if *once{os.Exit(1)}} else if *once {return};if *once{return};time.Sleep(c.Interval)}}
