package api

import (
	"bytes"
	"encoding/binary"
	"image"
	_ "image/jpeg" // registers the JPEG header reader for image.DecodeConfig
	_ "image/png"  // registers the PNG header reader for image.DecodeConfig
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// What an image may be (feature 004, research section 3). The bytes are judged, never the file's name or the type the
// browser claims. Nothing is decoded beyond the header, and nothing is re-encoded: an image is stored as it was sent.
const (
	maxImageBytes     = 5 << 20 // "5 MiB"
	maxImagesPerTrade = 10
	maxNoteChars      = 200
	maxNameChars      = 100
	maxImageSide      = 16384
	maxImagePixels    = 64_000_000
)

const errNotAnImage = "Only PNG, JPEG and WebP images are allowed."

var (
	pngMagic = []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
	// the IEND chunk (length 0, type, CRC) that ends every PNG
	pngEnd = []byte{0, 0, 0, 0, 'I', 'E', 'N', 'D', 0xae, 0x42, 0x60, 0x82}
)

// checkImage returns the content type the bytes really are, or "" when they are not an allowed image.
func checkImage(b []byte) string {
	switch {
	case bytes.HasPrefix(b, pngMagic):
		// DecodeConfig reads only the header, so the end of the file is checked here: nothing may follow the image
		if !bytes.HasSuffix(b, pngEnd) || !sizeInRange(b) {
			return ""
		}
		return "image/png"
	case len(b) > 3 && b[0] == 0xff && b[1] == 0xd8 && b[2] == 0xff:
		t := bytes.TrimRight(b, "\x00")
		if len(t) < 4 || t[len(t)-2] != 0xff || t[len(t)-1] != 0xd9 || !sizeInRange(b) {
			return ""
		}
		return "image/jpeg"
	case isWebP(b):
		return "image/webp"
	}
	return ""
}

func sizeInRange(b []byte) bool {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(b))
	if err != nil || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > maxImageSide || cfg.Height > maxImageSide {
		return false
	}
	return int64(cfg.Width)*int64(cfg.Height) <= maxImagePixels
}

// isWebP: a RIFF container whose declared size matches the body and whose first chunk is a WebP image chunk. WebP is
// judged by its structure only (no decoder is added); the size limit and the headers it is served with bound a
// malformed one.
func isWebP(b []byte) bool {
	if len(b) < 20 || string(b[0:4]) != "RIFF" || string(b[8:12]) != "WEBP" {
		return false
	}
	if int64(binary.LittleEndian.Uint32(b[4:8]))+8 != int64(len(b)) && int64(binary.LittleEndian.Uint32(b[4:8]))+9 != int64(len(b)) {
		return false // the RIFF size counts everything after its own 8 bytes (a pad byte is allowed after an odd chunk)
	}
	switch string(b[12:16]) {
	case "VP8 ", "VP8L", "VP8X":
		return true
	}
	return false
}

// cleanName makes a file name safe to show and to put in a header: no path, no control characters or characters that
// break a header, spaces collapsed, at most maxNameChars. An empty result is "Screenshot" with the time it was added.
func cleanName(raw string, now time.Time, loc *time.Location) string {
	if !utf8.ValidString(raw) {
		raw = strings.ToValidUTF8(raw, "")
	}
	raw = strings.ReplaceAll(raw, "\\", "/")
	if i := strings.LastIndex(raw, "/"); i >= 0 {
		raw = raw[i+1:]
	}
	var sb strings.Builder
	for _, r := range raw {
		switch {
		case unicode.IsControl(r), r == '"', r == '<', r == '>', r == '|', r == ':', r == '*', r == '?', unicode.Is(unicode.Cf, r):
			sb.WriteRune(' ')
		default:
			sb.WriteRune(r)
		}
	}
	name := strings.Join(strings.Fields(sb.String()), " ")
	if r := []rune(name); len(r) > maxNameChars {
		name = strings.TrimSpace(string(r[:maxNameChars]))
	}
	if name == "" || strings.Trim(name, ".") == "" {
		return "Screenshot " + now.In(loc).Format("2 Jan 2006 15:04")
	}
	return name
}
