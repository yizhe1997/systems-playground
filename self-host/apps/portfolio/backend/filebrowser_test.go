package main

import "testing"

func TestResumeFilesDir(t *testing.T) {
	cases := []struct {
		name    string
		appEnv  string
		wantDir string
	}{
		{"unset defaults to dev", "", "/resumes/dev"},
		{"development is explicit dev", "development", "/resumes/dev"},
		{"production", "production", "/resumes/prod"},
		{"unrecognized value falls back to dev", "staging", "/resumes/dev"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("APP_ENV", tc.appEnv)
			if got := resumeFilesDir(); got != tc.wantDir {
				t.Errorf("resumeFilesDir() with APP_ENV=%q = %q, want %q", tc.appEnv, got, tc.wantDir)
			}
		})
	}
}
