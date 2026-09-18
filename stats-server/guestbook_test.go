package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestServer(t *testing.T) *server {
	t.Helper()
	dir := t.TempDir()
	return &server{
		path:       filepath.Join(dir, "stats.json"),
		gbPath:     filepath.Join(dir, "guestbook.json"),
		gbPrivPath: filepath.Join(dir, "guestbook-private.json"),
		allow: map[string]bool{
			"https://baozongwi.xyz": true,
			"http://localhost:1313": true,
		},
		hits:     map[string][]time.Time{},
		gbHits:   map[string][]time.Time{},
		gb:       gbStore{Messages: []gbMsg{}},
		gbPriv:   gbPrivStore{Messages: []gbPrivMsg{}},
		admin:    "test-token",
		mailSync: true,
	}
}

func gbClient(t *testing.T, s *server) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/guestbook", s.withCORS(s.handleGuestbook))
	mux.HandleFunc("/guestbook/delete", s.withCORS(s.handleGuestbookDelete))
	mux.HandleFunc("/guestbook/reply", s.withCORS(s.handleGuestbookReply))
	mux.HandleFunc("/guestbook/auth", s.withCORS(s.handleGuestbookAuth))
	return httptest.NewServer(mux)
}

func postJSON(t *testing.T, url, origin, body string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func readBody(t *testing.T, res *http.Response) string {
	t.Helper()
	defer res.Body.Close()
	b, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestGuestbookListEmpty(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res, err := http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("status %d %s", res.StatusCode, body)
	}
	if !strings.Contains(body, `"messages"`) {
		t.Fatalf("body %s", body)
	}
}

func TestGuestbookPostAndList(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "https://baozongwi.xyz", `{"name":"infernity","text":"来玩"}`)
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("post status %d %s", res.StatusCode, body)
	}
	if res.Header.Get("Access-Control-Allow-Origin") != "https://baozongwi.xyz" {
		t.Fatalf("cors %q", res.Header.Get("Access-Control-Allow-Origin"))
	}
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}
	if msg.ID == "" || msg.Name != "infernity" || msg.Text != "来玩" {
		t.Fatalf("msg %+v", msg)
	}
	if msg.Website != "" {
		t.Fatalf("website should be empty %q", msg.Website)
	}

	res, err := http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	var list gbListResp
	if err := json.Unmarshal([]byte(body), &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Messages) != 1 || list.Messages[0].Name != "infernity" {
		t.Fatalf("list %+v", list)
	}
}

func TestGuestbookRejects(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	cases := []struct {
		body string
		code int
	}{
		{`{"name":"","text":"hi"}`, 400},
		{`{"name":"a","text":""}`, 400},
		{`{"name":"<script>","text":"hi"}`, 400},
		{`{"name":"a","text":"<img>"}`, 400},
	}
	for _, c := range cases {
		res := postJSON(t, ts.URL+"/guestbook", "", c.body)
		body := readBody(t, res)
		if res.StatusCode != c.code {
			t.Fatalf("%s -> %d %s", c.body, res.StatusCode, body)
		}
		s.gbHits = map[string][]time.Time{}
	}
}

func TestGuestbookHoneypot(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"bot","text":"spam","company":"http://spam"}`)
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("status %d %s", res.StatusCode, body)
	}
	if len(s.gb.Messages) != 0 {
		t.Fatalf("stored %+v", s.gb.Messages)
	}
}

func TestGuestbookRateLimit(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"one"}`)
	_ = readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("first %d", res.StatusCode)
	}
	res = postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"two"}`)
	body := readBody(t, res)
	if res.StatusCode != 429 {
		t.Fatalf("second %d %s", res.StatusCode, body)
	}
}

func TestGuestbookDelete(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"bye"}`)
	body := readBody(t, res)
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}

	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook/delete", strings.NewReader(`{"id":"`+msg.ID+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("delete %d %s", res.StatusCode, body)
	}
	if len(s.gb.Messages) != 0 {
		t.Fatalf("still %+v", s.gb.Messages)
	}
}

func TestGuestbookWhisperNotPublic(t *testing.T) {
	s := newTestServer(t)
	var mails []gbMail
	s.mailer = func(m gbMail) error {
		mails = append(mails, m)
		return nil
	}
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"secret","email":"a@example.com","whisper":true}`)
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("status %d %s", res.StatusCode, body)
	}
	if !strings.Contains(body, `"whisper":true`) {
		t.Fatalf("body %s", body)
	}
	if len(s.gb.Messages) != 0 {
		t.Fatalf("leaked public %+v", s.gb.Messages)
	}
	if len(s.gbPriv.Messages) != 1 || !s.gbPriv.Messages[0].Whisper || s.gbPriv.Messages[0].Email != "a@example.com" {
		t.Fatalf("private %+v", s.gbPriv.Messages)
	}
	res, err := http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	if strings.Contains(body, "secret") || strings.Contains(body, "a@example.com") {
		t.Fatalf("public list leaked %s", body)
	}
	if len(mails) != 1 || !mails[0].Whisper || mails[0].Email != "a@example.com" {
		t.Fatalf("mail %+v", mails)
	}
}

func TestGuestbookWhisperRequiresEmail(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"secret","whisper":true}`)
	body := readBody(t, res)
	if res.StatusCode != 400 {
		t.Fatalf("status %d %s", res.StatusCode, body)
	}
	if len(s.gb.Messages) != 0 || len(s.gbPriv.Messages) != 0 {
		t.Fatalf("stored public=%+v priv=%+v", s.gb.Messages, s.gbPriv.Messages)
	}
}

func TestGuestbookEmailNotInPublicJSON(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"hello","email":"hideme@example.com"}`)
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("status %d %s", res.StatusCode, body)
	}
	if strings.Contains(body, "hideme@example.com") {
		t.Fatalf("post leaked email %s", body)
	}
	res, err := http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	if strings.Contains(body, "hideme@example.com") {
		t.Fatalf("list leaked email %s", body)
	}
	if len(s.gb.Messages) != 1 {
		t.Fatalf("public %+v", s.gb.Messages)
	}
}

func TestGuestbookReply(t *testing.T) {
	s := newTestServer(t)
	var mails []gbMail
	s.mailer = func(m gbMail) error {
		mails = append(mails, m)
		return nil
	}
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"hello","email":"a@example.com"}`)
	body := readBody(t, res)
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}
	mails = nil

	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook/reply", strings.NewReader(`{"id":"`+msg.ID+`","text":"收到"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = readBody(t, res)
	if res.StatusCode != 400 {
		t.Fatalf("visitor reply without name %d", res.StatusCode)
	}

	req, _ = http.NewRequest(http.MethodPost, ts.URL+"/guestbook/reply", strings.NewReader(`{"id":"`+msg.ID+`","text":"收到"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("reply %d %s", res.StatusCode, body)
	}
	res, err = http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	if strings.Contains(body, "a@example.com") {
		t.Fatalf("leaked email %s", body)
	}
	var list gbListResp
	if err := json.Unmarshal([]byte(body), &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Messages) != 1 || len(list.Messages[0].Replies) != 1 || list.Messages[0].Replies[0].Text != "收到" {
		t.Fatalf("list %+v", list)
	}
	if list.Messages[0].Replies[0].Name != "baozongwi" || !list.Messages[0].Replies[0].Owner {
		t.Fatalf("name %+v", list.Messages[0].Replies[0])
	}
	if len(mails) != 1 || !mails[0].Reply || mails[0].To != "a@example.com" || mails[0].Text != "收到" {
		t.Fatalf("mail %+v", mails)
	}
}

func TestGuestbookReplyNoEmailNoMail(t *testing.T) {
	s := newTestServer(t)
	var mails []gbMail
	s.mailer = func(m gbMail) error {
		mails = append(mails, m)
		return nil
	}
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"hello"}`)
	body := readBody(t, res)
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}
	mails = nil
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook/reply", strings.NewReader(`{"id":"`+msg.ID+`","text":"墙上见"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("status %d", res.StatusCode)
	}
	if len(mails) != 0 {
		t.Fatalf("should not mail %+v", mails)
	}
}

func TestGuestbookThreadRounds(t *testing.T) {
	s := newTestServer(t)
	var mails []gbMail
	s.mailer = func(m gbMail) error {
		mails = append(mails, m)
		return nil
	}
	ts := gbClient(t, s)
	defer ts.Close()

	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"A","text":"第一轮","email":"a@example.com"}`)
	body := readBody(t, res)
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}
	id := msg.ID
	mails = nil

	postOwner := func(text string) {
		t.Helper()
		req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook/reply", strings.NewReader(`{"id":"`+id+`","text":"`+text+`"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer test-token")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw := readBody(t, res)
		if res.StatusCode != 200 {
			t.Fatalf("owner %s -> %d %s", text, res.StatusCode, raw)
		}
	}
	postA := func(text string) {
		t.Helper()
		s.gbHits = map[string][]time.Time{}
		res := postJSON(t, ts.URL+"/guestbook/reply", "", `{"id":"`+id+`","name":"A","text":"`+text+`","email":"a@example.com"}`)
		raw := readBody(t, res)
		if res.StatusCode != 200 {
			t.Fatalf("A %s -> %d %s", text, res.StatusCode, raw)
		}
	}

	postOwner("第二轮站主")
	postA("第三轮A又回")
	postOwner("第四轮站主再回")

	res, err := http.Get(ts.URL + "/guestbook")
	if err != nil {
		t.Fatal(err)
	}
	body = readBody(t, res)
	var list gbListResp
	if err := json.Unmarshal([]byte(body), &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Messages) != 1 {
		t.Fatalf("msgs %d", len(list.Messages))
	}
	rs := list.Messages[0].Replies
	if len(rs) != 3 {
		t.Fatalf("replies %d %+v", len(rs), rs)
	}
	if !rs[0].Owner || rs[0].Text != "第二轮站主" {
		t.Fatalf("r0 %+v", rs[0])
	}
	if rs[1].Owner || rs[1].Name != "A" || rs[1].Text != "第三轮A又回" {
		t.Fatalf("r1 %+v", rs[1])
	}
	if !rs[2].Owner || rs[2].Text != "第四轮站主再回" {
		t.Fatalf("r2 %+v", rs[2])
	}
	if strings.Contains(body, "a@example.com") {
		t.Fatalf("leaked email")
	}
	ownerMails := 0
	followMails := 0
	for _, m := range mails {
		if m.Reply {
			ownerMails++
			if m.To != "a@example.com" {
				t.Fatalf("owner mail to %q", m.To)
			}
		} else {
			followMails++
		}
	}
	if ownerMails != 2 || followMails != 1 {
		t.Fatalf("mails owner=%d follow=%d %+v", ownerMails, followMails, mails)
	}
}

func TestGuestbookInvalidPostDoesNotEatRate(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()
	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"","text":"hi"}`)
	_ = readBody(t, res)
	if res.StatusCode != 400 {
		t.Fatalf("invalid %d", res.StatusCode)
	}
	res = postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"hi"}`)
	body := readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("valid after invalid %d %s", res.StatusCode, body)
	}
}

func TestGuestbookRateUsesLastForwardedIP(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()
	post := func(xff string) int {
		req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook", strings.NewReader(`{"name":"a","text":"hi"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Forwarded-For", xff)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		_ = readBody(t, res)
		return res.StatusCode
	}
	if st := post("1.1.1.1, 9.9.9.9"); st != 200 {
		t.Fatalf("first %d", st)
	}
	if st := post("2.2.2.2, 9.9.9.9"); st != 429 {
		t.Fatalf("same last hop should 429, got %d", st)
	}
}

func TestGuestbookDeleteClearsPrivate(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()
	res := postJSON(t, ts.URL+"/guestbook", "", `{"name":"a","text":"hello","email":"a@example.com"}`)
	body := readBody(t, res)
	var msg gbMsg
	if err := json.Unmarshal([]byte(body), &msg); err != nil {
		t.Fatal(err)
	}
	if len(s.gbPriv.Messages) != 1 {
		t.Fatalf("priv %d", len(s.gbPriv.Messages))
	}
	req, _ := http.NewRequest(http.MethodPost, ts.URL+"/guestbook/delete", strings.NewReader(`{"id":"`+msg.ID+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = readBody(t, res)
	if res.StatusCode != 200 {
		t.Fatalf("delete %d", res.StatusCode)
	}
	if len(s.gb.Messages) != 0 || len(s.gbPriv.Messages) != 0 {
		t.Fatalf("leftover public=%d priv=%d", len(s.gb.Messages), len(s.gbPriv.Messages))
	}
}

func TestGuestbookBadEmail(t *testing.T) {
	s := newTestServer(t)
	ts := gbClient(t, s)
	defer ts.Close()
	cases := []string{
		`{"name":"a","text":"hi","email":"not-an-email"}`,
		`{"name":"a","text":"hi","email":"a@b.com\nBcc:x@y.com"}`,
		`{"name":"a","text":"hi","email":"javascript:foo@bar.com"}`,
	}
	for _, body := range cases {
		res := postJSON(t, ts.URL+"/guestbook", "", body)
		got := readBody(t, res)
		if res.StatusCode != 400 {
			t.Fatalf("%s -> %d %s", body, res.StatusCode, got)
		}
		s.gbHits = map[string][]time.Time{}
	}
}
