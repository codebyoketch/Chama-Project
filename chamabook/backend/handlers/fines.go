package handlers

import (
	"net/http"
	"time"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

type FineInput struct {
	UserID uint    `json:"user_id"`
	Amount float64 `json:"amount"`
	Reason string  `json:"reason"`
	Period string  `json:"period"`
	Notes  string  `json:"notes"`
}

func GetFines(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	status := c.Query("status")

	query := config.DB.Where("group_id = ?", groupID).Preload("User")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var fines []models.Fine
	query.Order("created_at DESC").Find(&fines)

	for i, fine := range fines {
		if fine.IssuedBy > 0 {
			var issuer models.User
			if config.DB.Select("name").First(&issuer, fine.IssuedBy).Error == nil {
				fines[i].IssuedByName = issuer.Name
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"fines": fines})
}

func IssueFine(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	issuerID, _ := c.Get("userID")

	var input FineInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.UserID == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Member is required"}); return }
	if input.Amount <= 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"}); return }
	if input.Reason == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "Reason is required"}); return }

	iid := issuerID.(uint)
	var issuer models.User
	config.DB.Select("name").First(&issuer, iid)

	fine := models.Fine{
		UserID:   input.UserID,
		GroupID:  groupID.(uint),
		Amount:   input.Amount,
		Reason:   input.Reason,
		Period:   input.Period,
		Type:     "manual",
		Status:   "unpaid",
		IssuedBy: iid,
		Notes:    input.Notes,
	}

	if err := config.DB.Create(&fine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue fine"})
		return
	}

	config.DB.Preload("User").First(&fine, fine.ID)
	fine.IssuedByName = issuer.Name

	c.JSON(http.StatusCreated, gin.H{"fine": fine, "message": "Fine issued"})
}

func PayFine(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	fineID := c.Param("id")

	var fine models.Fine
	if err := config.DB.Where("id = ? AND group_id = ?", fineID, groupID).First(&fine).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
		return
	}

	now := time.Now()
	config.DB.Model(&fine).Updates(map[string]interface{}{
		"status":  "paid",
		"paid_at": now,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Fine marked as paid"})
}

func WaiveFine(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	fineID := c.Param("id")

	var fine models.Fine
	if err := config.DB.Where("id = ? AND group_id = ?", fineID, groupID).First(&fine).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fine not found"})
		return
	}

	config.DB.Model(&fine).Update("status", "waived")
	c.JSON(http.StatusOK, gin.H{"message": "Fine waived"})
}

// AutoIssueFines — call this at month end for members who haven't contributed
func AutoIssueFines(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var body struct {
		Period     string  `json:"period"`      // e.g. "2026-02"
		FineAmount float64 `json:"fine_amount"` // amount to fine per member
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Period == "" || body.FineAmount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Period and fine amount are required"})
		return
	}

	gid := groupID.(uint)

	// Get all active members
	var members []models.User
	config.DB.Where("group_id = ? AND is_active = true", gid).Find(&members)

	// Get members who contributed this period
	var contributed []struct{ UserID uint }
	config.DB.Model(&models.Contribution{}).
		Select("user_id").
		Where("group_id = ? AND period = ?", gid, body.Period).
		Scan(&contributed)

	contributedMap := map[uint]bool{}
	for _, c := range contributed { contributedMap[c.UserID] = true }

	issued := 0
	for _, member := range members {
		if contributedMap[member.ID] { continue }

		// Check if fine already issued for this member+period
		var existing models.Fine
		if config.DB.Where("user_id = ? AND group_id = ? AND period = ? AND type = 'auto'",
			member.ID, gid, body.Period).First(&existing).Error == nil {
			continue
		}

		fine := models.Fine{
			UserID:  member.ID,
			GroupID: gid,
			Amount:  body.FineAmount,
			Reason:  "Missed contribution for " + body.Period,
			Period:  body.Period,
			Type:    "auto",
			Status:  "unpaid",
		}
		if config.DB.Create(&fine).Error == nil { issued++ }
	}

	c.JSON(http.StatusOK, gin.H{"issued": issued, "message": "Auto fines issued"})
}
