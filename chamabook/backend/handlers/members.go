package handlers

import (
	"net/http"

	"chamabook/config"
	"chamabook/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AddMemberInput struct {
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Role     string `json:"role"`
	Password string `json:"password" binding:"required,min=6"`
}

// GetMembers returns all members in the group
func GetMembers(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var members []models.User
	config.DB.Where("group_id = ? AND is_active = true", groupID).Find(&members)

	c.JSON(http.StatusOK, gin.H{"members": members, "count": len(members)})
}

// AddMember adds a new member to the group (admin/treasurer only)
func AddMember(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var input AddMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process password"})
		return
	}

	role := input.Role
	if role == "" {
		role = "member"
	}

	member := models.User{
		GroupID:      groupID.(uint),
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         role,
	}

	if err := config.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not add member. Email may already exist."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Member added", "member": member})
}

// GetMemberSummary returns a member's contribution and loan summary
func GetMemberSummary(c *gin.Context) {
	memberID := c.Param("id")
	groupID, _ := c.Get("groupID")

	var member models.User
	if err := config.DB.Where("id = ? AND group_id = ?", memberID, groupID).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	// Total contributions
	var totalContributions float64
	config.DB.Model(&models.Contribution{}).
		Where("user_id = ? AND group_id = ?", memberID, groupID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalContributions)

	// Active loans
	var activeLoans []models.Loan
	config.DB.Where("user_id = ? AND group_id = ? AND status = 'active'", memberID, groupID).
		Find(&activeLoans)

	c.JSON(http.StatusOK, gin.H{
		"member":               member,
		"total_contributions":  totalContributions,
		"active_loans":         activeLoans,
	})
}

// DeactivateMember soft-deletes a member
func DeactivateMember(c *gin.Context) {
	memberID := c.Param("id")
	groupID, _ := c.Get("groupID")

	result := config.DB.Model(&models.User{}).
		Where("id = ? AND group_id = ?", memberID, groupID).
		Update("is_active", false)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member deactivated"})
}
