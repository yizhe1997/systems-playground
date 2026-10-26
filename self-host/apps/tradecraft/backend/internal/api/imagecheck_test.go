package api

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"strings"
	"testing"
	"time"
)

func tinyPNG(t *testing.T, w, h int) []byte {
	t.Helper()
	var b bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func tinyJPEG(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := jpeg.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 2)), nil); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

// tinyWebP is a RIFF container of the right shape with a lossless chunk; WebP is judged by structure only.
func tinyWebP() []byte {
	payload := make([]byte, 14)
	var b bytes.Buffer
	b.WriteString("RIFF")
	_ = binary.Write(&b, binary.LittleEndian, uint32(4+8+len(payload)))
	b.WriteString("WEBP")
	b.WriteString("VP8L")
	_ = binary.Write(&b, binary.LittleEndian, uint32(len(payload)))
	b.Write(payload)
	return b.Bytes()
}

func TestCheckImageAcceptsTheThreeTypesByTheirBytes(t *testing.T) {
	for name, tc := range map[string]struct {
		body []byte
		want string
	}{
		"png":  {tinyPNG(t, 3, 2), "image/png"},
		"jpeg": {tinyJPEG(t), "image/jpeg"},
		"webp": {tinyWebP(), "image/webp"},
		// a JPEG may carry zero padding after its end marker
		"jpeg with padding": {append(tinyJPEG(t), 0, 0, 0), "image/jpeg"},
	} {
		if got := checkImage(tc.body); got != tc.want {
			t.Errorf("%s: got %q, want %q", name, got, tc.want)
		}
	}
}

func TestCheckImageRefusesEverythingElse(t *testing.T) {
	bigPNG := tinyPNG(t, 1, 1)
	// the same PNG with its header rewritten to declare 20,000 x 20,000 pixels (the CRC is not checked by DecodeConfig)
	huge := append([]byte{}, bigPNG...)
	binary.BigEndian.PutUint32(huge[16:20], 20000)
	binary.BigEndian.PutUint32(huge[20:24], 20000)
	badRIFF := tinyWebP()
	binary.LittleEndian.PutUint32(badRIFF[4:8], 999)
	for name, body := range map[string][]byte{
		"empty":               {},
		"svg":                 []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		"gif":                 []byte("GIF89a\x01\x00\x01\x00\x00\x00\x00;"),
		"pdf":                 []byte("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF"),
		"html":                []byte("<!doctype html><script>alert(1)</script>"),
		"script named as png": []byte("alert(document.cookie)"),
		"text":                []byte(strings.Repeat("hello ", 50)),
		"png with trailing":   append(append([]byte{}, bigPNG...), []byte("<script>")...),
		"png cut short":       bigPNG[:len(bigPNG)-20],
		"png declaring huge":  huge,
		"jpeg cut short":      tinyJPEG(t)[:20],
		"jpeg with trailing":  append(tinyJPEG(t), []byte("<script>")...),
		"webp wrong size":     badRIFF,
		"webp wrong chunk":    append(tinyWebP()[:12], append([]byte("JUNK"), tinyWebP()[16:]...)...),
	} {
		if got := checkImage(body); got != "" {
			t.Errorf("%s: accepted as %q", name, got)
		}
	}
}

func TestCleanName(t *testing.T) {
	loc, _ := time.LoadLocation("America/Chicago")
	now := time.Date(2026, 10, 25, 14, 41, 0, 0, time.UTC) // 09:41 in Chicago
	for _, tc := range []struct{ in, want string }{
		{"chart.png", "chart.png"},
		{"C:\\Users\\me\\Pictures\\chart 1.png", "chart 1.png"},
		{"../../etc/passwd", "passwd"},
		{"  spaced    out  .png ", "spaced out .png"},
		{"a\"b<c>d|e:f.png", "a b c d e f.png"},
		{"line\nbreak\r\n.png", "line break .png"},
		{"", "Screenshot 25 Oct 2026 09:41"},
		{"...", "Screenshot 25 Oct 2026 09:41"},
		{"/", "Screenshot 25 Oct 2026 09:41"},
		{strings.Repeat("x", 300), strings.Repeat("x", 100)},
	} {
		if got := cleanName(tc.in, now, loc); got != tc.want {
			t.Errorf("cleanName(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
