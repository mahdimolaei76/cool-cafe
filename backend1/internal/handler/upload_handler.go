package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	os.MkdirAll(uploadDir, 0755)
	return &UploadHandler{uploadDir: uploadDir}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Max 5MB
	r.ParseMultipartForm(5 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "فایل ارسال نشده")
		return
	}
	defer file.Close()

	// Validate image type
	ct := header.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		respondError(w, http.StatusBadRequest, "فقط فایل تصویری مجاز است")
		return
	}

	// Generate filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%s-%s%s", time.Now().Format("20060102"), uuid.New().String()[:8], ext)

	dst, err := os.Create(filepath.Join(h.uploadDir, filename))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "خطا در ذخیره فایل")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		respondError(w, http.StatusInternalServerError, "خطا در ذخیره فایل")
		return
	}

	// Return URL relative to server root — frontend can access via /uploads/filename
	respondJSON(w, http.StatusOK, map[string]string{
		"url":      "/uploads/" + filename,
		"filename": filename,
	})
}
