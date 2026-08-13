package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// مدت اعتبار access token: ۱۵ دقیقه (کوتاه برای امنیت بیشتر)
const accessTokenTTL = 15 * time.Minute

// مدت اعتبار refresh token: ۷ روز
const refreshTokenTTL = 7 * 24 * time.Hour

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret}
}

type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refreshToken"`
	User         *domain.User `json:"user"`
}

type RefreshResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
}

func (s *AuthService) Login(ctx context.Context, username, password string) (*LoginResponse, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateAndSaveRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{Token: accessToken, RefreshToken: refreshToken, User: user}, nil
}

// Refresh توکن access جدید و (در صورت نیاز) refresh جدید صادر می‌کند
func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*RefreshResponse, error) {
	hash := hashToken(rawRefreshToken)

	rec, err := s.userRepo.FindRefreshToken(ctx, hash)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// کاربر را از DB بخوان تا مطمئن شویم هنوز فعال است
	user, err := s.userRepo.FindByID(ctx, rec.UserID)
	if err != nil {
		return nil, ErrInvalidToken
	}

	newAccessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// refresh token رو rotate کن (برای امنیت بیشتر)
	newRefreshToken, err := s.generateAndSaveRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &RefreshResponse{Token: newAccessToken, RefreshToken: newRefreshToken}, nil
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

func (s *AuthService) Logout(ctx context.Context, userID uuid.UUID) {
	// خطا رو ignore می‌کنیم — logout باید همیشه موفق باشه از دید کلاینت
	_ = s.userRepo.RevokeRefreshToken(ctx, userID)
}

// generateAccessToken یک JWT کوتاه‌مدت (15 دقیقه) برای API calls
func (s *AuthService) generateAccessToken(user *domain.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":  user.ID.String(),
		"name": user.Name,
		"role": user.Role,
		"exp":  time.Now().Add(accessTokenTTL).Unix(),
		"iat":  time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// generateAndSaveRefreshToken یک توکن opaque تولید و hash آن را در DB ذخیره می‌کند
func (s *AuthService) generateAndSaveRefreshToken(ctx context.Context, userID uuid.UUID) (string, error) {
	rawToken := uuid.New().String() + uuid.New().String() // ۷۲ کاراکتر تصادفی
	hash := hashToken(rawToken)
	expiresAt := time.Now().Add(refreshTokenTTL)

	if err := s.userRepo.SaveRefreshToken(ctx, userID, hash, expiresAt); err != nil {
		return "", err
	}
	return rawToken, nil
}

// hashToken برای ذخیره‌سازی امن توکن در DB (هرگز توکن خام نگه نمی‌داریم)
func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// HashPassword — use this to generate hashes for the seed SQL
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}
