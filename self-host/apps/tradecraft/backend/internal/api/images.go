package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log"
	"mime"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/objects"
	"tradecraft/internal/store"
)

// Images on trades (feature 004). A row of trade_image holds an image's details and the bytes are an object in the bucket
// under the row's id; this file is the owner's routes for them. An agent token is refused by every one of them by the
// owner gate, so an agent can list nothing here and fetch no image.

// Objects is where the bytes live. internal/objects.Store is the real one (SeaweedFS over S3).
type Objects interface {
	Put(ctx context.Context, key, contentType string, data []byte) error
	Get(ctx context.Context, key string) ([]byte, error)
	Delete(ctx context.Context, key string) error
}

// Option changes how New builds the app.
type Option func(*Server)

// WithObjects gives the app its image storage. Without it the image routes answer 503 and everything else works.
func WithObjects(o Objects) Option { return func(s *Server) { s.objects = o } }

var errNoStorage = &apiError{status: http.StatusServiceUnavailable, Code: "images_unavailable",
	Message: "Images are not available: the image storage is not set up."}

var errStorageDown = &apiError{status: http.StatusBadGateway, Code: "images_storage",
	Message: "The image storage did not answer. Nothing was changed. Try again."}

type tradeImageJSON struct {
	ID          string `json:"id"`
	TradeID     string `json:"tradeId"`
	Name        string `json:"name"`
	Note        string `json:"note"`
	ContentType string `json:"contentType"`
	SizeBytes   int32  `json:"sizeBytes"`
	CreatedAt   string `json:"createdAt"`
}

type imageLimitsJSON struct {
	MaxBytes     int `json:"maxBytes"`
	MaxCount     int `json:"maxCount"`
	MaxNoteChars int `json:"maxNoteChars"`
}

type tradeImagesJSON struct {
	Items  []tradeImageJSON `json:"items"`
	Limits imageLimitsJSON  `json:"limits"`
}

func imageLimits() imageLimitsJSON {
	return imageLimitsJSON{MaxBytes: maxImageBytes, MaxCount: maxImagesPerTrade, MaxNoteChars: maxNoteChars}
}

func imageAPIError(status int, code, msg string) *apiError {
	return &apiError{status: status, Code: code, Message: msg}
}

func megabytes(n int) string { return fmt.Sprintf("%.1f MB", float64(n)/float64(1<<20)) }

// listTradeImages answers a trade's images in the order they were added, with the limits the screens quote. No bytes.
func (s *Server) listTradeImages(c *fiber.Ctx) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	return s.tradeImages(c, id)
}

// tradeImages is the list of one trade's images; the agent tool list_trade_images runs it too (mcp.go).
func (s *Server) tradeImages(c *fiber.Ctx, id string) error {
	ctx := c.Context()
	if _, err := s.q.TradeExistsForImages(ctx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("trade")
		}
		return err
	}
	rows, err := s.q.ListTradeImages(ctx, id)
	if err != nil {
		return err
	}
	out := tradeImagesJSON{Items: make([]tradeImageJSON, 0, len(rows)), Limits: imageLimits()}
	for _, r := range rows {
		out.Items = append(out.Items, tradeImageJSON{ID: r.ID, TradeID: r.TradeID, Name: r.Name, Note: r.Note,
			ContentType: r.ContentType, SizeBytes: r.SizeBytes, CreatedAt: fmtTime(r.CreatedAt)})
	}
	return c.JSON(out)
}

// addTradeImage stores the request body as an image of the trade. The bytes are judged (imagecheck.go), the count is
// checked while the trade row is locked, and one audit entry is written in the same transaction.
func (s *Server) addTradeImage(c *fiber.Ctx) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	body := bytes.Clone(c.Body()) // the request buffer is reused by the server
	if len(body) > maxImageBytes {
		return imageAPIError(http.StatusRequestEntityTooLarge, "image_too_big",
			fmt.Sprintf("That image is %s. The limit is %s.", megabytes(len(body)), megabytes(maxImageBytes)))
	}
	if s.objects == nil {
		return errNoStorage
	}
	ctype := checkImage(body)
	if ctype == "" {
		return imageAPIError(http.StatusUnprocessableEntity, "image_not_allowed", errNotAnImage)
	}
	ctx := c.Context()
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	name := cleanName(c.Query("name"), s.now(), loc)
	actor, by := actorOf(c)
	var out store.TradeImage
	stored := false
	err = s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.TradeForAudit(ctx, id) // locks the trade row for this transaction
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("trade")
		}
		if err != nil {
			return err
		}
		n, err := q.CountTradeImages(ctx, id)
		if err != nil {
			return err
		}
		if int(n) >= maxImagesPerTrade {
			return imageAPIError(http.StatusConflict, "image_limit",
				fmt.Sprintf("This trade already has %d images. Remove one to add another.", maxImagesPerTrade))
		}
		out, err = q.InsertImage(ctx, store.InsertImageParams{TradeID: id, Name: name, ContentType: ctype, SizeBytes: int32(len(body))})
		if err != nil {
			return err
		}
		// the picture goes to the bucket before the row is committed: if the bucket refuses, the row is rolled back
		if err := s.objects.Put(ctx, out.ID, ctype, body); err != nil {
			log.Printf("image storage: put failed: %v", err)
			return errStorageDown
		}
		stored = true
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "attachment_added",
			Subject: tradeSubject(cur.Instrument, cur.Direction, cur.EntryAt, loc)})
	})
	if err != nil {
		if stored { // the commit itself failed after the object was stored: do not leave it behind
			s.dropObject(out.ID)
		}
		return err
	}
	return c.Status(http.StatusCreated).JSON(tradeImageJSON{ID: out.ID, TradeID: out.TradeID, Name: out.Name, Note: out.Note,
		ContentType: out.ContentType, SizeBytes: out.SizeBytes, CreatedAt: fmtTime(out.CreatedAt)})
}

// getImage serves the bytes of one image to the signed-in owner. It is sent so that a browser can only display it: the
// type is the one decided from the bytes when it was added, sniffing is off, and a sandbox policy covers any mistake.
func (s *Server) getImage(c *fiber.Ctx) error {
	id, err := pathID(c, "image")
	if err != nil {
		return err
	}
	if s.objects == nil {
		return errNoStorage
	}
	img, err := s.q.GetImageMeta(c.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("image")
	}
	if err != nil {
		return err
	}
	data, err := s.objects.Get(c.Context(), img.ID)
	if err != nil {
		if !errors.Is(err, objects.ErrNotFound) {
			log.Printf("image storage: get failed: %v", err)
		}
		return errStorageDown
	}
	c.Set("Content-Type", img.ContentType)
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Content-Security-Policy", "default-src 'none'; sandbox")
	c.Set("Cache-Control", "private, max-age=3600")
	disposition := "inline"
	if c.Query("download") == "1" {
		disposition = mime.FormatMediaType("attachment", map[string]string{"filename": downloadName(img.Name, img.ContentType)})
	}
	c.Set("Content-Disposition", disposition)
	return c.Send(data)
}

// downloadName is the name a downloaded image is saved under: its display name with the extension its type needs.
func downloadName(name, ctype string) string {
	ext := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}[ctype]
	n := strings.TrimSpace(name)
	l := strings.ToLower(n)
	if !strings.HasSuffix(l, ext) && !(ext == ".jpg" && strings.HasSuffix(l, ".jpeg")) {
		n += ext
	}
	return n
}

type imageNoteInput struct {
	Note string `json:"note"`
}

// updateImageNote changes an image's note. It is not an audit entry (research section 6).
func (s *Server) updateImageNote(c *fiber.Ctx) error {
	id, err := pathID(c, "image")
	if err != nil {
		return err
	}
	var in imageNoteInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	note := strings.TrimSpace(in.Note)
	if utf8.RuneCountInString(note) > maxNoteChars {
		return invalid("note", []fieldError{{Field: "note", Message: fmt.Sprintf("A note can be at most %d characters.", maxNoteChars)}})
	}
	r, err := s.q.UpdateImageNote(c.Context(), store.UpdateImageNoteParams{ID: id, Note: note})
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("image")
	}
	if err != nil {
		return err
	}
	return c.JSON(tradeImageJSON{ID: r.ID, TradeID: r.TradeID, Name: r.Name, Note: r.Note, ContentType: r.ContentType,
		SizeBytes: r.SizeBytes, CreatedAt: fmtTime(r.CreatedAt)})
}

// removeImage deletes an image for good, with one audit entry in the same transaction.
func (s *Server) removeImage(c *fiber.Ctx) error {
	id, err := pathID(c, "image")
	if err != nil {
		return err
	}
	ctx := c.Context()
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	if s.objects == nil {
		return errNoStorage
	}
	actor, by := actorOf(c)
	err = s.inTx(ctx, func(q *store.Queries) error {
		img, err := q.GetImageMeta(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("image")
		}
		if err != nil {
			return err
		}
		cur, err := q.TradeForAudit(ctx, img.TradeID)
		if err != nil {
			return err
		}
		if err := q.DeleteImage(ctx, id); err != nil {
			return err
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "attachment_removed",
			Subject: tradeSubject(cur.Instrument, cur.Direction, cur.EntryAt, loc)})
	})
	if err != nil {
		return err
	}
	s.dropObject(id) // after the commit: a failure here leaves an unreachable object, never a row without its picture
	return c.SendStatus(http.StatusNoContent)
}

// dropObject deletes an image's object. A failure is logged and left: nothing refers to the object any more.
func (s *Server) dropObject(id string) {
	if err := s.objects.Delete(context.Background(), id); err != nil {
		log.Printf("image storage: delete of %s failed (the object is now unreferenced): %v", id, err)
	}
}

// imageCounts answers how many images each of the trades has, with a single query (never the bytes).
func (s *Server) imageCounts(ctx context.Context, ids []string) (map[string]int, error) {
	counts := make(map[string]int, len(ids))
	if len(ids) == 0 {
		return counts, nil
	}
	rows, err := s.q.ImageCountsForTrades(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		counts[r.TradeID] = int(r.ImageCount)
	}
	return counts, nil
}

var imageUploadPath = regexp.MustCompile(`^/trades/[^/]+/images$`)

// smallBodies keeps every route but the image upload at a small effective body limit although the server accepts
// 6 MiB for the upload: a JSON route never needs more than a few KB.
func smallBodies(c *fiber.Ctx) error {
	if len(c.Body()) > 64<<10 && !(c.Method() == fiber.MethodPost && imageUploadPath.MatchString(c.Path())) {
		return imageAPIError(http.StatusRequestEntityTooLarge, "too_big", "That request is too big.")
	}
	return c.Next()
}
