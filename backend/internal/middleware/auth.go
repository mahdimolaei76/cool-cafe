package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type contextKey string

const (
	UserIDKey   contextKey = "userID"
	UserRoleKey contextKey = "userRole"
)

type AuthMiddleware struct {
	jwtSecret string
}

func NewAuthMiddleware(jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{jwtSecret: jwtSecret}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"message":"Authorization header required"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"message":"Invalid authorization header format"}`, http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(m.jwtSecret), nil
		})

		if err != nil {
			// اگه توکن منقضی شده → 403 (فرانت می‌ره refresh بزنه)
			// اگه توکن کلاً نامعتبره → 401 (فرانت می‌ره لاگین)
			if isTokenExpired(err) {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"message":"Token expired"}`, http.StatusForbidden)
			} else {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"message":"Invalid token"}`, http.StatusUnauthorized)
			}
			return
		}

		if !token.Valid {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"message":"Invalid token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"message":"Invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		// بررسی انقضا به صورت صریح (defense-in-depth)
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"message":"Token expired"}`, http.StatusForbidden)
				return
			}
		}

		userIDStr, ok := claims["sub"].(string)
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"message":"Invalid user ID in token"}`, http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"message":"Invalid user ID format"}`, http.StatusUnauthorized)
			return
		}

		role, _ := claims["role"].(string)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserRoleKey, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(string)
		if !ok || role != "admin" {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"message":"Admin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return id, ok
}

func GetUserRole(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(UserRoleKey).(string)
	return role, ok
}

// isTokenExpired تشخیص می‌دهد که آیا خطا به دلیل انقضای توکن است یا نامعتبر بودن آن
func isTokenExpired(err error) bool {
	return strings.Contains(err.Error(), "expired") ||
		strings.Contains(err.Error(), "token is expired")
}
