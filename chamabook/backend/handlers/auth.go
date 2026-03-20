package handlers

import (
<<<<<<< HEAD
	"net/http"

	"chamabook/config"
	"chamabook/middleware"
	"chamabook/models"

=======
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
	"chamabook/config"
	"chamabook/models"
>>>>>>> master
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

<<<<<<< HEAD
type RegisterInput struct {
	GroupName string `json:"group_name" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register creates a new group and its first admin user
=======
func generateAccountNumber(groupID uint) string {
	year := time.Now().Format("06")
	var maxID int
	config.DB.Raw("SELECT COALESCE(MAX(id), 0) FROM users").Scan(&maxID)
	return fmt.Sprintf("KT%s%04d", year, maxID+1)
}

// ── Register ──────────────────────────────────────────────────────────────
type RegisterInput struct {
	GroupName  string `json:"group_name"`
	AdminName  string `json:"admin_name"`
	Phone      string `json:"phone"`
	IDNumber   string `json:"id_number"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

>>>>>>> master
func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
<<<<<<< HEAD

	// Hash the password
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process password"})
		return
	}

	// Create the group first
	group := models.Group{Name: input.GroupName}
	if err := config.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create group"})
		return
	}

	// Create the admin user
	user := models.User{
		GroupID:      group.ID,
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         "admin",
	}
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user"})
		return
	}

	token, _ := middleware.GenerateToken(user.ID, group.ID, user.Role)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Group created successfully",
		"token":   token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
		"group": gin.H{
			"id":   group.ID,
			"name": group.Name,
		},
	})
}

// Login authenticates a user and returns a JWT
=======
	if input.GroupName == "" || input.AdminName == "" || input.Phone == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Group name, admin name, phone and password are required"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	clean := strings.ToUpper(strings.ReplaceAll(input.GroupName, " ", ""))
	if len(clean) > 4 { clean = clean[:4] }
	code := fmt.Sprintf("%s-%d", clean, rand.Intn(9000)+1000)

	// Create group
	group := models.Group{Name: input.GroupName, Code: code}
	if err := config.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	// Auto-create both branches
	sacBranch := models.Branch{GroupID: group.ID, Name: "SACCO", Type: "sacco"}
	tbBranch := models.Branch{GroupID: group.ID, Name: "Table Banking", Type: "table_banking"}
	config.DB.Create(&sacBranch)
	config.DB.Create(&tbBranch)

	// Create admin
	accountNumber := generateAccountNumber(group.ID)
	admin := models.User{
		GroupID: group.ID, Name: input.AdminName, Phone: input.Phone,
		IDNumber: input.IDNumber, Email: input.Email,
		AccountNumber: accountNumber, PasswordHash: string(hash),
		Role: "admin", IsActive: true,
	}
	if err := config.DB.Create(&admin).Error; err != nil {
		config.DB.Delete(&group)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create admin. Phone or ID may already exist."})
		return
	}

	token, _ := GenerateToken(admin.ID, group.ID, admin.Role)
	c.JSON(http.StatusCreated, gin.H{
		"token": token, "user": admin, "group": group,
		"branches": []models.Branch{sacBranch, tbBranch},
	})
}

// ── Login ─────────────────────────────────────────────────────────────────
type LoginInput struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

>>>>>>> master
func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
<<<<<<< HEAD

	var user models.User
	if err := config.DB.Where("email = ?", input.Email).Preload("Group").First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, _ := middleware.GenerateToken(user.ID, user.GroupID, user.Role)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
		"group": gin.H{
			"id":   user.Group.ID,
			"name": user.Group.Name,
		},
=======
	if input.Identifier == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifier and password are required"})
		return
	}

	var user models.User
	if err := config.DB.Where("phone = ? OR id_number = ?", input.Identifier, input.Identifier).
		Preload("Group").First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account deactivated. Contact your admin."})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Load branches
	var branches []models.Branch
	config.DB.Where("group_id = ?", user.GroupID).Find(&branches)

	token, _ := GenerateToken(user.ID, user.GroupID, user.Role)
	c.JSON(http.StatusOK, gin.H{
		"token": token, "user": user, "group": user.Group, "branches": branches,
>>>>>>> master
	})
}
