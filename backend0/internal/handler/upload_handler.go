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
	// Create upload directory if it doesn't exist
	os.MkdirAll(uploadDir, 0755)
	return &UploadHandler{uploadDir: uploadDir}
}

type UploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Max 5MB
	r.ParseMultipartForm(5 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to get file from request")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		respondError(w, http.StatusBadRequest, "Only image files are allowed")
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s-%s%s", time.Now().Format("20060102"), uuid.New().String()[:8], ext)

	// Create file
	dst, err := os.Create(filepath.Join(h.uploadDir, filename))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create file")
		return
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, file); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	respondJSON(w, http.StatusOK, UploadResponse{
		URL:      "/uploads/" + filename,
		Filename: filename,
	})
}
