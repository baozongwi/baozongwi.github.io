package main

import (
	"strings"
	"testing"
	"time"
)

func TestSanitizeEmail(t *testing.T) {
	okCases := map[string]string{
		"":                  "",
		"  a@example.com  ": "a@example.com",
		"Name <a@ex.com>":   "a@ex.com",
		"foo+tag@gmail.com": "foo+tag@gmail.com",
	}
	for in, want := range okCases {
		got, ok := sanitizeEmail(in)
		if !ok || got != want {
			t.Fatalf("%q -> %q %v, want %q", in, got, ok, want)
		}
	}
	bad := []string{"nope", "a@", "@b.com", "a@b", "a@b.com\nCc:x@y.com", "a@b.com,c@d.com"}
	for _, in := range bad {
		if got, ok := sanitizeEmail(in); ok {
			t.Fatalf("%q accepted as %q", in, got)
		}
	}
}

func TestBuildGBMailReplyToAndNoInjection(t *testing.T) {
	cfg := smtpCfg{from: "baozongwi@qq.com", to: "baozongwi@qq.com"}
	raw, err := buildGBMail(cfg, gbMail{
		Name:    "infernity",
		Email:   "friend@example.com",
		Text:    "hello\nsecond",
		Whisper: true,
		Time:    time.Date(2026, 9, 18, 21, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatal(err)
	}
	msg := string(raw)
	if !strings.Contains(msg, "Reply-To:") || !strings.Contains(msg, "friend@example.com") {
		t.Fatalf("missing Reply-To\n%s", msg)
	}
	if !strings.Contains(msg, "From:") || !strings.Contains(msg, "baozongwi@qq.com") {
		t.Fatalf("missing From\n%s", msg)
	}
	if strings.Contains(msg, "\nBcc:") || strings.Contains(msg, "\nCc:") {
		t.Fatalf("injected header\n%s", msg)
	}
	if !strings.Contains(msg, "悄悄话") {
		t.Fatalf("missing kind\n%s", msg)
	}
	if !strings.Contains(msg, "hello\r\nsecond") {
		t.Fatalf("body newlines\n%s", msg)
	}
}

func TestBuildGBMailOwnerReplyToVisitor(t *testing.T) {
	cfg := smtpCfg{from: "baozongwi@qq.com", to: "baozongwi@qq.com"}
	raw, err := buildGBMail(cfg, gbMail{
		Name:     "infernity",
		Text:     "收到啦",
		Original: "你好",
		Reply:    true,
		To:       "friend@example.com",
		Time:     time.Date(2026, 9, 18, 21, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatal(err)
	}
	msg := string(raw)
	if !strings.Contains(msg, "To: <friend@example.com>") && !strings.Contains(msg, "To: friend@example.com") {
		t.Fatalf("to visitor\n%s", msg)
	}
	if !strings.Contains(msg, "baozongwi@qq.com") {
		t.Fatalf("from owner\n%s", msg)
	}
	if !strings.Contains(msg, "回复了你") {
		t.Fatalf("subject/body\n%s", msg)
	}
	if !strings.Contains(msg, "收到啦") || !strings.Contains(msg, "你好") {
		t.Fatalf("missing texts\n%s", msg)
	}
}
