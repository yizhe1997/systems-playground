package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"tradecraft/internal/api"
	"tradecraft/internal/objects"
)

// Feature 004: images on trades. Real tiny images through the real routes against a real Postgres.

func pngBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, w, h))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

// rawCall sends a request whose body is raw bytes (an image) with the given Content-Type and bearer token.
func rawCall(t *testing.T, method, path string, body []byte, ctype, token string) (int, http.Header, []byte) {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	return res.StatusCode, res.Header, raw
}

func addImage(t *testing.T, tradeID string, body []byte, name string) (int, map[string]any) {
	t.Helper()
	path := "/trades/" + tradeID + "/images"
	if name != "" {
		path += "?name=" + url.QueryEscape(name)
	}
	status, _, raw := rawCall(t, "POST", path, body, "image/png", ownerToken())
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	return status, out
}

func oneTrade(t *testing.T) string {
	t.Helper()
	reset(t)
	return trade(t, tradeA(account(t, "A", "USD", ""))).str("id")
}

func TestAddImageStoresItAndListsItInOrder(t *testing.T) {
	id := oneTrade(t)
	st, a := addImage(t, id, pngBytes(t, 3, 2), "first chart.png")
	if st != 201 || a["name"] != "first chart.png" || a["contentType"] != "image/png" || a["note"] != "" {
		t.Fatalf("%d %v", st, a)
	}
	st, b := addImage(t, id, pngBytes(t, 4, 4), "") // no name: the default
	if st != 201 || !strings.HasPrefix(fmt.Sprint(b["name"]), "Screenshot ") {
		t.Fatalf("%d %v", st, b)
	}
	l := call(t, "GET", "/trades/"+id+"/images", nil)
	mustStatus(t, l, 200)
	items, _ := l.body["items"].([]any)
	if len(items) != 2 || items[0].(map[string]any)["id"] != a["id"] || items[1].(map[string]any)["id"] != b["id"] {
		t.Fatalf("order: %s", l.raw)
	}
	lim, _ := l.body["limits"].(map[string]any)
	if lim["maxBytes"].(float64) != 5242880 || lim["maxCount"].(float64) != 10 || lim["maxNoteChars"].(float64) != 200 {
		t.Fatalf("limits: %v", lim)
	}
	if strings.Contains(string(l.raw), `"data"`) {
		t.Errorf("the list carries bytes: %s", l.raw)
	}
}

func TestTheStoredTypeIsDecidedFromTheBytes(t *testing.T) {
	id := oneTrade(t)
	// sent as a JPEG, it is a PNG: stored as a PNG
	st, _, raw := rawCall(t, "POST", "/trades/"+id+"/images", pngBytes(t, 2, 2), "image/jpeg", ownerToken())
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	if st != 201 || out["contentType"] != "image/png" {
		t.Fatalf("%d %s", st, raw)
	}
	// sent as a PNG, it is a page: refused
	st, _, raw = rawCall(t, "POST", "/trades/"+id+"/images", []byte("<html><script>alert(1)</script></html>"), "image/png", ownerToken())
	if st != 422 {
		t.Fatalf("%d %s", st, raw)
	}
}

func TestRefusedImagesChangeNothing(t *testing.T) {
	id := oneTrade(t)
	for name, body := range map[string][]byte{
		"svg":   []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`),
		"pdf":   []byte("%PDF-1.7 hello"),
		"empty": {},
		"text":  []byte("x.png"),
	} {
		st, e := addImage(t, id, body, "x.png")
		if st != 422 || e["code"] != "image_not_allowed" || e["message"] != "Only PNG, JPEG and WebP images are allowed." {
			t.Errorf("%s: %d %v", name, st, e)
		}
	}
	l := call(t, "GET", "/trades/"+id+"/images", nil)
	if items, _ := l.body["items"].([]any); len(items) != 0 {
		t.Errorf("a refused image was stored: %s", l.raw)
	}
	if _, _, entries := auditList(t, "kind=attachment_added"); len(entries) != 0 {
		t.Errorf("a refused add wrote an audit entry: %+v", entries)
	}
}

func TestOverSizeAndTheEleventhImage(t *testing.T) {
	id := oneTrade(t)
	st, e := addImage(t, id, make([]byte, 5<<20+1), "big.png")
	if st != 413 || e["code"] != "image_too_big" {
		t.Fatalf("%d %v", st, e)
	}
	if !strings.Contains(fmt.Sprint(e["message"]), "The limit is 5.0 MB.") {
		t.Errorf("message: %v", e["message"])
	}
	for i := 0; i < 10; i++ {
		if st, e := addImage(t, id, pngBytes(t, 1, i+1), ""); st != 201 {
			t.Fatalf("image %d: %d %v", i+1, st, e)
		}
	}
	st, e = addImage(t, id, pngBytes(t, 1, 1), "")
	if st != 409 || e["code"] != "image_limit" || e["message"] != "This trade already has 10 images. Remove one to add another." {
		t.Fatalf("%d %v", st, e)
	}
}

func TestTwoAddsCannotBothTakeTheLastPlace(t *testing.T) {
	id := oneTrade(t)
	for i := 0; i < 9; i++ {
		addImage(t, id, pngBytes(t, 1, i+1), "")
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	got := map[int]int{}
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			st, _ := addImage(t, id, pngBytes(t, 2, i+1), "")
			mu.Lock()
			got[st]++
			mu.Unlock()
		}(i)
	}
	wg.Wait()
	if got[201] != 1 || got[409] != 19 {
		t.Fatalf("results: %v", got)
	}
	var n int
	if err := pool.QueryRow(t.Context(), "SELECT count(*) FROM trade_image WHERE trade_id = $1", id).Scan(&n); err != nil || n != 10 {
		t.Fatalf("stored %d (%v)", n, err)
	}
}

func TestUnknownTradeAndDeletedTradeAndBacktestAccount(t *testing.T) {
	reset(t)
	st, e := addImage(t, "00000000-0000-0000-0000-000000000000", pngBytes(t, 1, 1), "")
	if st != 404 {
		t.Fatalf("%d %v", st, e)
	}
	if l := call(t, "GET", "/trades/00000000-0000-0000-0000-000000000000/images", nil); l.status != 404 {
		t.Fatalf("%d", l.status)
	}
	// a Backtest account's trade, then deleted: images still add, and survive a delete and a restore
	bt := call(t, "POST", "/accounts", map[string]any{"name": "BT", "currency": "USD", "kind": "backtest"})
	mustStatus(t, bt, 201)
	tr := trade(t, tradeA(bt.str("id")))
	id := tr.str("id")
	if st, e := addImage(t, id, pngBytes(t, 2, 2), "a.png"); st != 201 {
		t.Fatalf("%d %v", st, e)
	}
	mustStatus(t, call(t, "DELETE", "/trades/"+id, nil), 200)
	if st, e := addImage(t, id, pngBytes(t, 3, 3), "b.png"); st != 201 {
		t.Fatalf("on a deleted trade: %d %v", st, e)
	}
	mustStatus(t, call(t, "POST", "/trades/"+id+"/restore", nil), 200)
	l := call(t, "GET", "/trades/"+id+"/images", nil)
	if items, _ := l.body["items"].([]any); len(items) != 2 {
		t.Fatalf("images after delete and restore: %s", l.raw)
	}
}

func TestAnImageIsServedOnlyToBeDisplayed(t *testing.T) {
	id := oneTrade(t)
	_, a := addImage(t, id, pngBytes(t, 2, 2), "my chart")
	imgID := fmt.Sprint(a["id"])

	st, h, raw := rawCall(t, "GET", "/images/"+imgID, nil, "", ownerToken())
	if st != 200 || h.Get("Content-Type") != "image/png" || !bytes.HasPrefix(raw, []byte{0x89, 'P', 'N', 'G'}) {
		t.Fatalf("%d %v", st, h)
	}
	for k, want := range map[string]string{
		"X-Content-Type-Options":  "nosniff",
		"Content-Security-Policy": "default-src 'none'; sandbox",
		"Cache-Control":           "private, max-age=3600",
		"Content-Disposition":     "inline",
	} {
		if got := h.Get(k); got != want {
			t.Errorf("%s = %q, want %q", k, got, want)
		}
	}
	_, h, _ = rawCall(t, "GET", "/images/"+imgID+"?download=1", nil, "", ownerToken())
	if d := h.Get("Content-Disposition"); !strings.HasPrefix(d, "attachment") || !strings.Contains(d, "my chart.png") {
		t.Errorf("download disposition: %q", d)
	}
	if st, _, _ := rawCall(t, "GET", "/images/00000000-0000-0000-0000-000000000000", nil, "", ownerToken()); st != 404 {
		t.Errorf("unknown image: %d", st)
	}
}

func TestNoteIsTrimmedLimitedAndNotAudited(t *testing.T) {
	id := oneTrade(t)
	_, a := addImage(t, id, pngBytes(t, 2, 2), "n.png")
	imgID := fmt.Sprint(a["id"])
	r := call(t, "PUT", "/images/"+imgID, map[string]any{"note": "  Entry, 5 min chart  "})
	mustStatus(t, r, 200)
	if r.str("note") != "Entry, 5 min chart" {
		t.Errorf("note %q", r.str("note"))
	}
	mustStatus(t, call(t, "PUT", "/images/"+imgID, map[string]any{"note": ""}), 200) // empty is allowed
	over := call(t, "PUT", "/images/"+imgID, map[string]any{"note": strings.Repeat("é", 201)})
	if over.status != 422 || over.fields()["note"] != "A note can be at most 200 characters." {
		t.Fatalf("%d %s", over.status, over.raw)
	}
	mustStatus(t, call(t, "PUT", "/images/"+imgID, map[string]any{"note": strings.Repeat("é", 200)}), 200)
	if st := call(t, "PUT", "/images/00000000-0000-0000-0000-000000000000", map[string]any{"note": "x"}).status; st != 404 {
		t.Errorf("unknown image: %d", st)
	}
	// only the add is an entry; the note edits are not
	if _, _, entries := auditList(t, ""); len(entries) != 1 || entries[0].Kind != "attachment_added" {
		t.Errorf("entries: %+v", entries)
	}
}

func TestRemoveDeletesForGoodAndWritesOneEntryEach(t *testing.T) {
	id := oneTrade(t)
	_, a := addImage(t, id, pngBytes(t, 2, 2), "secret-name.png")
	imgID := fmt.Sprint(a["id"])
	mustStatus(t, call(t, "PUT", "/images/"+imgID, map[string]any{"note": "private note"}), 200)

	if _, err := imgStore.Get(t.Context(), imgID); err != nil {
		t.Fatalf("the picture should be in the bucket before the remove: %v", err)
	}
	if st, _, _ := rawCall(t, "DELETE", "/images/"+imgID, nil, "", ownerToken()); st != 204 {
		t.Fatalf("remove: %d", st)
	}
	if _, err := imgStore.Get(t.Context(), imgID); !errors.Is(err, objects.ErrNotFound) {
		t.Errorf("the picture should be gone from the bucket: %v", err)
	}
	if st, _, _ := rawCall(t, "GET", "/images/"+imgID, nil, "", ownerToken()); st != 404 {
		t.Errorf("a removed image answers %d", st)
	}
	var n int
	if err := pool.QueryRow(t.Context(), "SELECT count(*) FROM trade_image").Scan(&n); err != nil || n != 0 {
		t.Errorf("rows left: %d (%v)", n, err)
	}
	if st, _, _ := rawCall(t, "DELETE", "/images/"+imgID, nil, "", ownerToken()); st != 404 {
		t.Errorf("remove twice: %d", st)
	}

	_, _, entries := auditList(t, "")
	added, removed := 0, 0
	for _, e := range entries {
		switch e.Kind {
		case "attachment_added":
			added++
		case "attachment_removed":
			removed++
		default:
			continue
		}
		if len(e.ChangedFields) != 0 || !strings.Contains(e.Subject, "NQ long trade of ") || strings.Contains(e.Subject, "secret-name") || strings.Contains(e.Subject, "private note") {
			t.Errorf("entry holds more than the trade: %+v", e)
		}
	}
	if added != 1 || removed != 1 {
		t.Fatalf("entries: added %d removed %d: %+v", added, removed, entries)
	}
}

func TestImageCountIsOnTheTradeReads(t *testing.T) {
	id := oneTrade(t)
	if got := call(t, "GET", "/trades/"+id, nil); got.str("imageCount") != "0" {
		t.Fatalf("none yet: %s", got.raw)
	}
	addImage(t, id, pngBytes(t, 2, 2), "")
	addImage(t, id, pngBytes(t, 3, 3), "")
	if got := call(t, "GET", "/trades/"+id, nil); got.str("imageCount") != "2" {
		t.Errorf("get: %s", got.raw)
	}
	l := call(t, "GET", "/trades", nil)
	if len(l.list) != 1 || fmt.Sprint(l.list[0]["imageCount"]) != "2" {
		t.Errorf("list: %s", l.raw)
	}
}

func TestOtherRoutesKeepASmallBodyLimit(t *testing.T) {
	reset(t)
	big, _ := json.Marshal(map[string]any{"timeZone": strings.Repeat("a", 100<<10)})
	req := httptest.NewRequest("PUT", "/settings", bytes.NewReader(big))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ownerToken())
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 413 {
		t.Errorf("a 100 KiB body to PUT /settings: %d", res.StatusCode)
	}
}

// brokenStore is a bucket that refuses everything, to prove a failed store changes nothing in the journal.
type brokenStore struct{}

func (brokenStore) Put(context.Context, string, string, []byte) error { return errors.New("bucket down") }
func (brokenStore) Get(context.Context, string) ([]byte, error)       { return nil, errors.New("bucket down") }
func (brokenStore) Delete(context.Context, string) error             { return errors.New("bucket down") }

func TestAFailedStoreChangesNothingAndNoStorageSaysSo(t *testing.T) {
	id := oneTrade(t)
	good := app
	defer func() { app = good }()

	app = api.New(pool, func() time.Time { return clock }, testSecret, api.WithObjects(brokenStore{}))
	if st, out := addImage(t, id, pngBytes(t, 2, 2), "x.png"); st != 502 || out["code"] != "images_storage" {
		t.Fatalf("add with the bucket down: %d %v", st, out)
	}
	var n int
	if err := pool.QueryRow(t.Context(), "SELECT count(*) FROM trade_image").Scan(&n); err != nil || n != 0 {
		t.Errorf("a refused picture left %d rows (%v)", n, err)
	}
	if _, _, entries := auditList(t, ""); len(entries) != 0 {
		t.Errorf("a refused picture left audit entries: %+v", entries)
	}

	app = api.New(pool, func() time.Time { return clock }, testSecret) // no storage at all
	if st, out := addImage(t, id, pngBytes(t, 2, 2), "x.png"); st != 503 || out["code"] != "images_unavailable" {
		t.Fatalf("add with no storage: %d %v", st, out)
	}
	if st := call(t, "GET", "/trades/"+id+"/images", nil).status; st != 200 {
		t.Errorf("listing needs no bucket: %d", st)
	}
}

func TestExportListsEveryImageWithoutItsBytes(t *testing.T) {
	id := oneTrade(t)
	_, a := addImage(t, id, pngBytes(t, 3, 3), "export-me.png")
	r := call(t, "GET", "/export", nil)
	mustStatus(t, r, 200)
	imgs, _ := r.body["images"].([]any)
	if len(imgs) != 1 {
		t.Fatalf("images: %s", r.raw)
	}
	m := imgs[0].(map[string]any)
	if m["id"] != a["id"] || m["tradeId"] != id || m["name"] != "export-me.png" || m["contentType"] != "image/png" ||
		m["path"] != "/api/images/"+fmt.Sprint(a["id"]) || m["sizeBytes"] == nil || m["createdAt"] == nil {
		t.Errorf("entry: %v", m)
	}
	for k := range m {
		if k == "data" || k == "bytes" || k == "base64" {
			t.Errorf("the export carries %q", k)
		}
	}
	if tr := r.body["trades"].([]any)[0].(map[string]any); fmt.Sprint(tr["imageCount"]) != "1" {
		t.Errorf("trade imageCount in the export: %v", tr["imageCount"])
	}
}

func TestAgentSeesImageDetailsOnlyAndIsRefusedTheBytes(t *testing.T) {
	id := oneTrade(t)
	_, a := addImage(t, id, pngBytes(t, 3, 3), "agent-sees-name.png")
	mustStatus(t, call(t, "PUT", "/images/"+fmt.Sprint(a["id"]), map[string]any{"note": "a note"}), 200)
	token := agentWithToken(t, "Claude Desktop")
	sess := startDoor(t).connect(t, token)

	text, isErr := callTool(t, sess, "list_trade_images", map[string]any{"tradeId": id})
	if isErr {
		t.Fatal(text)
	}
	var out struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal([]byte(text), &out); err != nil || len(out.Items) != 1 {
		t.Fatalf("answer: %s", text)
	}
	it := out.Items[0]
	if it["name"] != "agent-sees-name.png" || it["note"] != "a note" || it["contentType"] != "image/png" || it["sizeBytes"] == nil {
		t.Errorf("item: %v", it)
	}
	for k := range it {
		if k == "data" || k == "bytes" || k == "base64" {
			t.Errorf("the tool carries %q", k)
		}
	}
	// one agent_read entry names the tool and the trade
	_, _, entries := auditList(t, "kind=agent_read")
	if len(entries) != 1 || !strings.HasPrefix(entries[0].Subject, "list_trade_images, ") {
		t.Errorf("entries: %+v", entries)
	}
	// an unknown trade is a tool error
	if _, isErr := callTool(t, sess, "list_trade_images", map[string]any{"tradeId": "00000000-0000-0000-0000-000000000000"}); !isErr {
		t.Error("an unknown trade answered")
	}
	// the picture itself is not an agent's to fetch
	if got := callWith(t, "GET", "/images/"+fmt.Sprint(a["id"]), nil, token); got.status == 200 {
		t.Errorf("an agent token fetched an image: %d", got.status)
	}
}
