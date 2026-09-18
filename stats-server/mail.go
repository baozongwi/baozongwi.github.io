package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
	"time"
	"unicode/utf8"
)

type smtpCfg struct {
	host string
	port string
	user string
	pass string
	from string
	to   string
}

type gbMail struct {
	Name     string
	Email    string
	Text     string
	Original string
	Whisper  bool
	Reply    bool
	Time     time.Time
	To       string
}

func smtpCfgFromEnv() smtpCfg {
	cfg := smtpCfg{
		host: envDefault("SMTP_HOST", "smtp.qq.com"),
		port: envDefault("SMTP_PORT", "465"),
		user: strings.TrimSpace(os.Getenv("SMTP_USER")),
		pass: strings.TrimSpace(os.Getenv("SMTP_PASS")),
		from: strings.TrimSpace(os.Getenv("SMTP_FROM")),
		to:   strings.TrimSpace(os.Getenv("SMTP_TO")),
	}
	if cfg.from == "" {
		cfg.from = cfg.user
	}
	if cfg.to == "" {
		cfg.to = cfg.from
	}
	return cfg
}

func envDefault(k, d string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return d
	}
	return v
}

func sanitizeEmail(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", true
	}
	if strings.ContainsAny(s, "\r\n\t,;:") {
		return "", false
	}
	if utf8.RuneCountInString(s) > 80 {
		return "", false
	}
	addr, err := mail.ParseAddress(s)
	if err != nil || addr.Address == "" {
		return "", false
	}
	at := strings.LastIndex(addr.Address, "@")
	if at <= 0 || at == len(addr.Address)-1 {
		return "", false
	}
	if !strings.Contains(addr.Address[at+1:], ".") {
		return "", false
	}
	return addr.Address, true
}

func (s *server) notifyGB(m gbMail) {
	if s.mailer == nil {
		return
	}
	run := func() {
		if err := s.mailer(m); err != nil {
			log.Printf("guestbook mail: %v", err)
		}
	}
	if s.mailSync {
		run()
		return
	}
	go run()
}

func (s *server) sendSMTP(m gbMail) error {
	cfg := s.smtp
	if cfg.user == "" || cfg.pass == "" || cfg.from == "" {
		return nil
	}
	dest := cfg.to
	if m.To != "" {
		dest = m.To
	}
	if dest == "" {
		return nil
	}
	raw, err := buildGBMail(cfg, m)
	if err != nil {
		return err
	}
	addr := net.JoinHostPort(cfg.host, cfg.port)
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	var conn net.Conn
	if cfg.port == "465" {
		tlsCfg := &tls.Config{ServerName: cfg.host, MinVersion: tls.VersionTLS12}
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}
	if err != nil {
		return err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))

	c, err := smtp.NewClient(conn, cfg.host)
	if err != nil {
		return err
	}
	defer func() { _ = c.Close() }()
	if err := c.Hello("baozongwi.xyz"); err != nil {
		return err
	}
	if cfg.port != "465" {
		if ok, _ := c.Extension("STARTTLS"); ok {
			if err := c.StartTLS(&tls.Config{ServerName: cfg.host, MinVersion: tls.VersionTLS12}); err != nil {
				return err
			}
		}
	}
	if err := c.Auth(smtp.PlainAuth("", cfg.user, cfg.pass, cfg.host)); err != nil {
		return err
	}
	if err := c.Mail(cfg.from); err != nil {
		return err
	}
	if err := c.Rcpt(dest); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(raw); err != nil {
		_ = w.Close()
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

func buildGBMail(cfg smtpCfg, m gbMail) ([]byte, error) {
	from := mail.Address{Name: "净土", Address: cfg.from}
	dest := cfg.to
	if m.To != "" {
		dest = m.To
	}
	to := mail.Address{Address: dest}
	when := m.Time
	if when.IsZero() {
		when = time.Now()
	}
	cst := time.FixedZone("CST", 8*3600)
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", from.String())
	fmt.Fprintf(&b, "To: %s\r\n", to.String())

	if m.Reply {
		rtOwner := mail.Address{Name: "baozongwi", Address: cfg.from}
		fmt.Fprintf(&b, "Reply-To: %s\r\n", rtOwner.String())
		fmt.Fprintf(&b, "Subject: %s\r\n", mime.BEncoding.Encode("UTF-8", "[净土] baozongwi 回复了你"))
		b.WriteString("MIME-Version: 1.0\r\n")
		b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		b.WriteString("Content-Transfer-Encoding: 8bit\r\n")
		fmt.Fprintf(&b, "Date: %s\r\n", when.In(cst).Format(time.RFC1123Z))
		fmt.Fprintf(&b, "Message-ID: <%s.%d@baozongwi.xyz>\r\n", newGBID(), when.UnixNano())
		b.WriteString("\r\n")
		b.WriteString("baozongwi 在净土回复了你。\r\n\r\n")
		b.WriteString("----\r\n")
		b.WriteString(strings.ReplaceAll(m.Text, "\n", "\r\n"))
		b.WriteString("\r\n----\r\n")
		if m.Original != "" {
			b.WriteString("\r\n你之前写的：\r\n")
			b.WriteString(strings.ReplaceAll(m.Original, "\n", "\r\n"))
			b.WriteString("\r\n")
		}
		b.WriteString("\r\nhttps://baozongwi.xyz/guestbook/\r\n")
		return []byte(b.String()), nil
	}

	kind := "公开留言"
	if m.Whisper {
		kind = "悄悄话"
	}
	if m.Email != "" {
		rt := mail.Address{Name: m.Name, Address: m.Email}
		fmt.Fprintf(&b, "Reply-To: %s\r\n", rt.String())
	}
	fmt.Fprintf(&b, "Subject: %s\r\n", mime.BEncoding.Encode("UTF-8", fmt.Sprintf("[净土] %s · %s", kind, m.Name)))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: 8bit\r\n")
	fmt.Fprintf(&b, "Date: %s\r\n", when.In(cst).Format(time.RFC1123Z))
	fmt.Fprintf(&b, "Message-ID: <%s.%d@baozongwi.xyz>\r\n", newGBID(), when.UnixNano())
	b.WriteString("\r\n")
	fmt.Fprintf(&b, "净土收到一条%s。\r\n\r\n", kind)
	fmt.Fprintf(&b, "昵称：%s\r\n", m.Name)
	if m.Email != "" {
		fmt.Fprintf(&b, "邮箱：%s\r\n", m.Email)
	} else {
		b.WriteString("邮箱：（未填，直接回复这封邮件发不回去）\r\n")
	}
	fmt.Fprintf(&b, "时间：%s\r\n\r\n", when.In(cst).Format("2006-01-02 15:04:05"))
	b.WriteString("----\r\n")
	b.WriteString(strings.ReplaceAll(m.Text, "\n", "\r\n"))
	b.WriteString("\r\n----\r\n")
	if m.Email != "" {
		b.WriteString("\r\n在 QQ 邮箱里直接回复即可回对方。\r\n")
	}
	b.WriteString("https://baozongwi.xyz/guestbook/\r\n")
	return []byte(b.String()), nil
}
