package middleware

import (
	"net/http"
	"os"
	"strings"
<<<<<<< HEAD
	"time"

=======
>>>>>>> master
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID  uint   `json:"user_id"`
	GroupID uint   `json:"group_id"`
	Role    string `json:"role"`
	jwt.RegisteredClaims
}

<<<<<<< HEAD
// GenerateToken creates a JWT for a logged-in user
func GenerateToken(userID uint, groupID uint, role string) (string, error) {
	claims := Claims{
		UserID:  userID,
		GroupID: groupID,
		Role:    role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// AuthRequired is the middleware that protects routes
=======
>>>>>>> master
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}
<<<<<<< HEAD

		// Header format: "Bearer <token>"
		parts := strings.Split(authHeader, " ")
=======
		parts := strings.SplitN(authHeader, " ", 2)
>>>>>>> master
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}
<<<<<<< HEAD

		tokenStr := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

=======
		tokenStr := parts[1]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})
>>>>>>> master
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
<<<<<<< HEAD

		// Attach user info to context so handlers can use it
=======
>>>>>>> master
		c.Set("userID", claims.UserID)
		c.Set("groupID", claims.GroupID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

<<<<<<< HEAD
// AdminOnly restricts to admin/treasurer roles
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" && role != "treasurer" {
=======
// Role hierarchy:
// admin(6) > chairperson(5) > vice_chairperson(4) > treasurer(3) > secretary(2) > member(1)
//
// vice_chairperson sits between chairperson and treasurer:
// - Can approve/reject loans (same as chairperson/secretary)
// - Can access all treasurer-level views
// - Cannot change settings (chairperson only)
// - Cannot deactivate members (chairperson only)
func roleLevel(role string) int {
	switch role {
	case "admin":            return 6
	case "chairperson":      return 5
	case "vice_chairperson": return 4 // 👈 new
	case "treasurer":        return 3
	case "secretary":        return 2
	case "member":           return 1
	default:                 return 0
	}
}

func requireRole(minRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if roleLevel(role.(string)) < roleLevel(minRole) {
>>>>>>> master
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}
		c.Next()
	}
}
<<<<<<< HEAD
=======

// AdminOnly — admin only, strictly scoped to their own group
func AdminOnly() gin.HandlerFunc { return requireRole("admin") }

// ChairpersonOrAbove — chairperson + admin only
// vice_chairperson does NOT get settings/deactivation access
func ChairpersonOrAbove() gin.HandlerFunc { return requireRole("chairperson") }

// ViceChairpersonOrAbove — vice_chairperson + chairperson + admin
// Used for loan approvals and similar oversight actions
func ViceChairpersonOrAbove() gin.HandlerFunc { return requireRole("vice_chairperson") }

// TreasurerOrAbove — treasurer + vice_chairperson + chairperson + admin
func TreasurerOrAbove() gin.HandlerFunc { return requireRole("treasurer") }

// SecretaryOrAbove — secretary + treasurer + vice_chairperson + chairperson + admin
func SecretaryOrAbove() gin.HandlerFunc { return requireRole("secretary") }
>>>>>>> master
