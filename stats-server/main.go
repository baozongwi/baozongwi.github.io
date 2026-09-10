package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type store struct {
	PV   int64             `json:"pv"`
	UV   int64             `json:"uv"`
	Seen map[string]int64  `json:"seen,omitempty"`
}

type server struct {
	mu       sync.Mutex
	data     store
	path     string
	initPV   int64
	initUV   int64
	allow    map[string]bool
	hits     map[string][]time.Time
	admin    string
}

type hitReq struct {
	UV bool `json:"uv"`
}

type statsResp struct {
	PV int64 `json:"pv"`
	UV int64 `json:"uv"`
}

func main() {
	listen := flag.String("listen", "127.0.0.1:8787", "listen address")
	dataPath := flag.String("data", "./stats.json", "json data file")
	initPV := flag.Int64("init-pv", 207841, "starting pv if data file is missing")
	initUV := flag.Int64("init-uv", 46153, "starting uv if data file is missing")
	flag.Parse()

	s := &server{
		path:   *dataPath,
		initPV: *initPV,
		initUV: *initUV,
		allow: map[string]bool{
			"https://baozongwi.xyz":     true,
			"https://www.baozongwi.xyz": true,
			"http://localhost:1313":     true,
			"http://127.0.0.1:1313":     true,
		},
		hits:  map[string][]time.Time{},
		admin: strings.TrimSpace(os.Getenv("STATS_ADMIN_TOKEN")),
	}
	if err := s.load(); err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.withCORS(s.handleHealth))
	mux.HandleFunc("/stats", s.withCORS(s.handleStats))
	mux.HandleFunc("/hit", s.withCORS(s.handleHit))
	mux.HandleFunc("/admin/set", s.withCORS(s.handleAdminSet))

	log.Printf("flavor-stats listening on %s (pv=%d uv=%d)", *listen, s.data.PV, s.data.UV)
	log.Fatal(http.ListenAndServe(*listen, mux))
}

func (s *server) load() error {
	b, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			s.data = store{PV: s.initPV, UV: s.initUV, Seen: map[string]int64{}}
			return s.saveLocked()
		}
		return err
	}
	if err := json.Unmarshal(b, &s.data); err != nil {
		return err
	}
	if s.data.Seen == nil {
		s.data.Seen = map[string]int64{}
	}
	return nil
}

func (s *server) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil && filepath.Dir(s.path) != "." {
		return err
	}
	tmp := s.path + ".tmp"
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func (s *server) withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if s.allow[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func (s *server) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	s.mu.Lock()
	resp := statsResp{PV: s.data.PV, UV: s.data.UV}
	s.mu.Unlock()
	writeJSON(w, resp)
}

func (s *server) handleHit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	ip := clientIP(r)
	if !s.allowHit(ip) {
		http.Error(w, "rate", http.StatusTooManyRequests)
		return
	}
	var req hitReq
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.PV++
	if req.UV {
		h := hashIP(ip)
		now := time.Now().Unix()
		// same hashed IP only counts as a new visitor once per 30 days
		if ts, ok := s.data.Seen[h]; !ok || now-ts > 30*24*3600 {
			s.data.UV++
			s.data.Seen[h] = now
		}
	}
	if err := s.saveLocked(); err != nil {
		log.Printf("save: %v", err)
		http.Error(w, "save", http.StatusInternalServerError)
		return
	}
	writeJSON(w, statsResp{PV: s.data.PV, UV: s.data.UV})
}

func (s *server) handleAdminSet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if s.admin == "" || r.Header.Get("Authorization") != "Bearer "+s.admin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var req statsResp
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "json", http.StatusBadRequest)
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if req.PV > 0 {
		s.data.PV = req.PV
	}
	if req.UV > 0 {
		s.data.UV = req.UV
	}
	if err := s.saveLocked(); err != nil {
		http.Error(w, "save", http.StatusInternalServerError)
		return
	}
	writeJSON(w, statsResp{PV: s.data.PV, UV: s.data.UV})
}

func (s *server) allowHit(ip string) bool {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	window := now.Add(-time.Minute)
	times := s.hits[ip]
	n := 0
	for _, t := range times {
		if t.After(window) {
			times[n] = t
			n++
		}
	}
	times = times[:n]
	if len(times) >= 60 {
		s.hits[ip] = times
		return false
	}
	s.hits[ip] = append(times, now)
	return true
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func hashIP(ip string) string {
	sum := sha256.Sum256([]byte("flavor-stats|" + ip))
	return hex.EncodeToString(sum[:8])
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}
