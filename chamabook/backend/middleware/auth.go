package middleware

import (
	"net/http"
	"os"
	"strings"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID  uint   `json:"user_id"`
	GroupID uint   `json:"group_id"`
	Role    string `json:"role"`
	jwt.RegisteredClaims
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}
		tokenStr := parts[1]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("groupID", claims.GroupID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

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
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}
		c.Next()
	}
}

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