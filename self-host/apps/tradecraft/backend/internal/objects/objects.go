// Package objects keeps the bytes of the journal's images in an S3-compatible bucket (the owner's SeaweedFS, feature
// 004). The database holds each image's details; this holds only the picture, under the image's id.
package objects

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// callTimeout bounds every call to the bucket: a store that hangs must not hold a database connection and a trade's row
// lock (an upload runs inside that transaction) for ever.
const callTimeout = 30 * time.Second

// ErrNotFound is what Get answers when the bucket has no such object.
var ErrNotFound = errors.New("object not found")

// Store is one bucket on one S3 endpoint.
type Store struct {
	c      *minio.Client
	bucket string

	mu      sync.Mutex
	checked bool // the bucket is known to exist
}

// FromEnv builds the store from S3_ENDPOINT (for example https://s3.example.com), S3_ACCESS_KEY, S3_SECRET_KEY,
// S3_BUCKET (default tradecraft-images) and S3_REGION (default us-east-1). It answers nil, nil when S3_ENDPOINT is not
// set: the journal then runs without images and says so when one is asked for.
func FromEnv() (*Store, error) {
	endpoint := strings.TrimSpace(os.Getenv("S3_ENDPOINT"))
	if endpoint == "" {
		return nil, nil
	}
	u, err := url.Parse(endpoint)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, fmt.Errorf("S3_ENDPOINT must be an address like https://s3.example.com")
	}
	key, secret := os.Getenv("S3_ACCESS_KEY"), os.Getenv("S3_SECRET_KEY")
	if key == "" || secret == "" {
		return nil, fmt.Errorf("S3_ACCESS_KEY and S3_SECRET_KEY must be set when S3_ENDPOINT is")
	}
	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		bucket = "tradecraft-images"
	}
	region := os.Getenv("S3_REGION")
	if region == "" {
		region = "us-east-1"
	}
	c, err := minio.New(u.Host, &minio.Options{
		Creds:        credentials.NewStaticV4(key, secret, ""),
		Secure:       u.Scheme == "https",
		Region:       region,
		BucketLookup: minio.BucketLookupPath,
	})
	if err != nil {
		return nil, err
	}
	return &Store{c: c, bucket: bucket}, nil
}

// ensure creates the bucket the first time it is needed, so a fresh SeaweedFS needs no setup step.
func (s *Store) ensure(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.checked {
		return nil
	}
	ok, err := s.c.BucketExists(ctx, s.bucket)
	if err != nil {
		return err
	}
	if !ok {
		if err := s.c.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
			// another start may have made it a moment ago
			if again, e2 := s.c.BucketExists(ctx, s.bucket); e2 != nil || !again {
				return err
			}
		}
	}
	s.checked = true
	return nil
}

func (s *Store) Put(ctx context.Context, key, contentType string, data []byte) error {
	ctx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()
	if err := s.ensure(ctx); err != nil {
		return err
	}
	_, err := s.c.PutObject(ctx, s.bucket, key, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (s *Store) Get(ctx context.Context, key string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()
	o, err := s.c.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer o.Close()
	b, err := io.ReadAll(o)
	if err != nil {
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return b, nil
}

func (s *Store) Delete(ctx context.Context, key string) error {
	ctx, cancel := context.WithTimeout(ctx, callTimeout)
	defer cancel()
	return s.c.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}
