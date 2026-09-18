package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const (
	gbMaxName     = 24
	gbMaxText     = 500
	gbMaxKeep     = 500
	gbMaxThread   = 40
	gbMinInterval = 2 * time.Minute
	gbMaxPerDay   = 8
)

type gbMsg struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Website string    `json:"website,omitempty"`
	Text    string    `json:"text"`
	Time    int64     `json:"time"`
	Replies []gbReply `json:"replies,omitempty"`
	Reply   *gbReply  `json:"reply,omitempty"` // old single-reply field, migrated on load
}

type gbReply struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Text  string `json:"text"`
	Time  int64  `json:"time"`
	Owner bool   `json:"owner,omitempty"`
}

type gbPrivMsg struct {
	ID      string `json:"id"`
	Parent  string `json:"parent,omitempty"`
	Name    string `json:"name"`
	Website string `json:"website,omitempty"`
	Email   string `json:"email,omitempty"`
	Text    string `json:"text"`
	Time    int64  `json:"time"`
	Whisper bool   `json:"whisper,omitempty"`
}

type gbStore struct {
	Messages []gbMsg `json:"messages"`
}

type gbPrivStore struct {
	Messages []gbPrivMsg `json:"messages"`
}

type gbReq struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Text    string `json:"text"`
	Company string `json:"company"`
	Whisper bool   `json:"whisper"`
}

type gbListResp struct {
	Messages []gbMsg `json:"messages"`
}

func (s *server) loadGB() error {
	b, err := os.ReadFile(s.gbPath)
	if err != nil {
		if os.IsNotExist(err) {
			s.gb = gbStore{Messages: []gbMsg{}}
			return nil
		}
		return err
	}
	if err := json.Unmarshal(b, &s.gb); err != nil {
		return err
	}
	if s.gb.Messages == nil {
		s.gb.Messages = []gbMsg{}
	}
	changed := false
	for i := range s.gb.Messages {
		if s.gb.Messages[i].Reply != nil {
			normalizeMsg(&s.gb.Messages[i])
			changed = true
		}
	}
	if changed {
		_ = s.saveGBLocked()
	}
	return nil
}

func normalizeMsg(m *gbMsg) {
	if m.Reply == nil {
		return
	}
	r := *m.Reply
	if r.Name == "baozongwi" {
		r.Owner = true
	}
	if r.ID == "" {
		r.ID = newGBID()
	}
	m.Replies = append([]gbReply{r}, m.Replies...)
	m.Reply = nil
}

func (s *server) saveGBLocked() error {
	return atomicJSON(s.gbPath, s.gb)
}

func (s *server) loadGBPriv() error {
	b, err := os.ReadFile(s.gbPrivPath)
	if err != nil {
		if os.IsNotExist(err) {
			s.gbPriv = gbPrivStore{Messages: []gbPrivMsg{}}
			return nil
		}
		return err
	}
	if err := json.Unmarshal(b, &s.gbPriv); err != nil {
		return err
	}
	if s.gbPriv.Messages == nil {
		s.gbPriv.Messages = []gbPrivMsg{}
	}
	return nil
}

func (s *server) saveGBPrivLocked() error {
	return atomicJSON(s.gbPrivPath, s.gbPriv)
}

func atomicJSON(path string, v interface{}) error {
	tmp := path + ".tmp"
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *server) handleGuestbook(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleGuestbookList(w, r)
	case http.MethodPost:
		s.handleGuestbookPost(w, r)
	default:
		http.Error(w, "method", http.StatusMethodNotAllowed)
	}
}

func (s *server) handleGuestbookList(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	msgs := make([]gbMsg, len(s.gb.Messages))
	for i, m := range s.gb.Messages {
		msgs[i] = m
		if len(m.Replies) > 0 {
			rp := make([]gbReply, len(m.Replies))
			copy(rp, m.Replies)
			msgs[i].Replies = rp
		}
		msgs[i].Reply = nil
		msgs[i].Website = ""
	}
	s.mu.Unlock()
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	writeJSON(w, gbListResp{Messages: msgs})
}

func (s *server) handleGuestbookPost(w http.ResponseWriter, r *http.Request) {
	var req gbReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "json")
		return
	}
	if strings.TrimSpace(req.Company) != "" {
		writeJSON(w, map[string]bool{"ok": true})
		return
	}
	name, ok := sanitizeName(req.Name)
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "name")
		return
	}
	text, ok := sanitizeText(req.Text)
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "text")
		return
	}
	email, ok := sanitizeEmail(req.Email)
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "email")
		return
	}
	if req.Whisper && email == "" {
		writeJSONError(w, http.StatusBadRequest, "email")
		return
	}
	if !s.allowGuestbook(clientIP(r)) {
		writeJSONError(w, http.StatusTooManyRequests, "rate")
		return
	}
	now := time.Now()
	msg := gbMsg{
		ID:   newGBID(),
		Name: name,
		Text: text,
		Time: now.Unix(),
	}
	priv := gbPrivMsg{
		ID:      msg.ID,
		Name:    name,
		Email:   email,
		Text:    text,
		Time:    msg.Time,
		Whisper: req.Whisper,
	}
	s.mu.Lock()
	if !req.Whisper {
		s.gb.Messages = append(s.gb.Messages, msg)
		if extra := len(s.gb.Messages) - gbMaxKeep; extra > 0 {
			s.gb.Messages = append([]gbMsg(nil), s.gb.Messages[extra:]...)
		}
		if err := s.saveGBLocked(); err != nil {
			s.mu.Unlock()
			log.Printf("guestbook save: %v", err)
			writeJSONError(w, http.StatusInternalServerError, "save")
			return
		}
	}
	s.gbPriv.Messages = append(s.gbPriv.Messages, priv)
	if extra := len(s.gbPriv.Messages) - gbMaxKeep; extra > 0 {
		s.gbPriv.Messages = append([]gbPrivMsg(nil), s.gbPriv.Messages[extra:]...)
	}
	if err := s.saveGBPrivLocked(); err != nil {
		s.mu.Unlock()
		log.Printf("guestbook private save: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "save")
		return
	}
	s.mu.Unlock()

	s.notifyGB(gbMail{
		Name:    name,
		Email:   email,
		Text:    text,
		Whisper: req.Whisper,
		Time:    now,
	})

	if req.Whisper {
		writeJSON(w, map[string]interface{}{"ok": true, "whisper": true, "id": msg.ID})
		return
	}
	writeJSON(w, msg)
}

func (s *server) adminOK(r *http.Request) bool {
	if s.admin == "" {
		return false
	}
	got := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer"))
	got = strings.TrimSpace(got)
	if len(got) != len(s.admin) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(got), []byte(s.admin)) == 1
}

func (s *server) handleGuestbookAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if !s.adminOK(r) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *server) handleGuestbookReply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Text    string `json:"text"`
		Company string `json:"company"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&req); err != nil || strings.TrimSpace(req.ID) == "" {
		writeJSONError(w, http.StatusBadRequest, "json")
		return
	}
	if strings.TrimSpace(req.Company) != "" {
		writeJSON(w, map[string]bool{"ok": true})
		return
	}
	isOwner := s.adminOK(r)
	text, ok := sanitizeText(req.Text)
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "text")
		return
	}
	name := "baozongwi"
	email := ""
	if !isOwner {
		name, ok = sanitizeName(req.Name)
		if !ok {
			writeJSONError(w, http.StatusBadRequest, "name")
			return
		}
		email, ok = sanitizeEmail(req.Email)
		if !ok {
			writeJSONError(w, http.StatusBadRequest, "email")
			return
		}
		if !s.allowGuestbook(clientIP(r)) {
			writeJSONError(w, http.StatusTooManyRequests, "rate")
			return
		}
	}
	now := time.Now()
	item := gbReply{
		ID:    newGBID(),
		Name:  name,
		Text:  text,
		Time:  now.Unix(),
		Owner: isOwner,
	}

	s.mu.Lock()
	idx := -1
	for i := range s.gb.Messages {
		if s.gb.Messages[i].ID == req.ID {
			idx = i
			break
		}
	}
	if idx < 0 {
		s.mu.Unlock()
		writeJSONError(w, http.StatusNotFound, "missing")
		return
	}
	normalizeMsg(&s.gb.Messages[idx])
	if len(s.gb.Messages[idx].Replies) >= gbMaxThread {
		s.mu.Unlock()
		writeJSONError(w, http.StatusBadRequest, "full")
		return
	}
	s.gb.Messages[idx].Replies = append(s.gb.Messages[idx].Replies, item)
	orig := s.gb.Messages[idx]
	if n := len(orig.Replies); n > 0 {
		rp := make([]gbReply, n)
		copy(rp, orig.Replies)
		orig.Replies = rp
	}
	if email != "" {
		s.gbPriv.Messages = append(s.gbPriv.Messages, gbPrivMsg{
			ID:     item.ID,
			Parent: orig.ID,
			Name:   name,
			Email:  email,
			Text:   text,
			Time:   item.Time,
		})
		if extra := len(s.gbPriv.Messages) - gbMaxKeep; extra > 0 {
			s.gbPriv.Messages = append([]gbPrivMsg(nil), s.gbPriv.Messages[extra:]...)
		}
		if err := s.saveGBPrivLocked(); err != nil {
			s.mu.Unlock()
			writeJSONError(w, http.StatusInternalServerError, "save")
			return
		}
	}
	visitorEmail := threadEmail(s.gbPriv.Messages, orig.ID)
	if err := s.saveGBLocked(); err != nil {
		s.mu.Unlock()
		writeJSONError(w, http.StatusInternalServerError, "save")
		return
	}
	s.mu.Unlock()

	if isOwner && visitorEmail != "" {
		s.notifyGB(gbMail{
			Name:     orig.Name,
			Text:     text,
			Original: orig.Text,
			Time:     now,
			To:       visitorEmail,
			Reply:    true,
		})
	}
	if !isOwner {
		s.notifyGB(gbMail{
			Name:    name,
			Email:   email,
			Text:    text,
			Whisper: false,
			Time:    now,
		})
	}

	writeJSON(w, orig)
}

func threadEmail(priv []gbPrivMsg, parentID string) string {
	email := ""
	for _, p := range priv {
		if p.Email == "" {
			continue
		}
		if p.ID == parentID || p.Parent == parentID {
			email = p.Email
		}
	}
	return email
}

func (s *server) handleGuestbookDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method", http.StatusMethodNotAllowed)
		return
	}
	if !s.adminOK(r) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil || strings.TrimSpace(req.ID) == "" {
		writeJSONError(w, http.StatusBadRequest, "json")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]gbMsg, 0, len(s.gb.Messages))
	removed := false
	for _, m := range s.gb.Messages {
		if m.ID == req.ID {
			removed = true
			continue
		}
		out = append(out, m)
	}
	if !removed {
		writeJSONError(w, http.StatusNotFound, "missing")
		return
	}
	s.gb.Messages = out
	priv := s.gbPriv.Messages[:0]
	for _, p := range s.gbPriv.Messages {
		if p.ID == req.ID || p.Parent == req.ID {
			continue
		}
		priv = append(priv, p)
	}
	s.gbPriv.Messages = append([]gbPrivMsg(nil), priv...)
	if err := s.saveGBLocked(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "save")
		return
	}
	if err := s.saveGBPrivLocked(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "save")
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *server) allowGuestbook(ip string) bool {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	day := now.Add(-24 * time.Hour)
	times := s.gbHits[ip]
	n := 0
	for _, t := range times {
		if t.After(day) {
			times[n] = t
			n++
		}
	}
	times = times[:n]
	if len(times) >= gbMaxPerDay {
		s.gbHits[ip] = times
		return false
	}
	if len(times) > 0 && now.Sub(times[len(times)-1]) < gbMinInterval {
		s.gbHits[ip] = times
		return false
	}
	s.gbHits[ip] = append(times, now)
	return true
}

func sanitizeName(s string) (string, bool) {
	s = collapseSpace(s)
	if s == "" || utf8.RuneCountInString(s) > gbMaxName {
		return "", false
	}
	if strings.ContainsAny(s, "<>") {
		return "", false
	}
	return s, true
}

func sanitizeText(s string) (string, bool) {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = strings.TrimSpace(s)
	if s == "" || utf8.RuneCountInString(s) > gbMaxText {
		return "", false
	}
	if strings.ContainsAny(s, "<>") {
		return "", false
	}
	return s, true
}

func collapseSpace(s string) string {
	var b strings.Builder
	prevSpace := false
	for _, r := range strings.TrimSpace(s) {
		if unicode.IsSpace(r) {
			if !prevSpace {
				b.WriteByte(' ')
				prevSpace = true
			}
			continue
		}
		if r < 32 {
			continue
		}
		prevSpace = false
		b.WriteRune(r)
	}
	return b.String()
}

func newGBID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format("150405.000")))
	}
	return hex.EncodeToString(b[:])
}

func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
