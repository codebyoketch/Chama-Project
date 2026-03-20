package handlers

import (
	"net/http"
	"time"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

func GetWelfareSummary(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var contributions []models.WelfareContribution
	config.DB.Where("group_id = ?", groupID).Preload("User").Order("created_at DESC").Find(&contributions)

	var disbursements []models.WelfareDisbursement
	config.DB.Where("group_id = ?", groupID).Preload("User").Order("created_at DESC").Find(&disbursements)

	// Populate recorded_by names
	for i, c := range contributions {
		if c.RecordedBy > 0 {
			var r models.User
			if config.DB.Select("name").First(&r, c.RecordedBy).Error == nil {
				contributions[i].RecordedByName = r.Name
			}
		}
	}
	for i, d := range disbursements {
		if d.ApprovedBy > 0 {
			var r models.User
			if config.DB.Select("name").First(&r, d.ApprovedBy).Error == nil {
				disbursements[i].ApprovedByName = r.Name
			}
		}
	}

	var totalIn, totalOut float64
	for _, c := range contributions { totalIn += c.Amount }
	for _, d := range disbursements { totalOut += d.Amount }

	c.JSON(http.StatusOK, gin.H{
		"contributions":  contributions,
		"disbursements":  disbursements,
		"total_in":       totalIn,
		"total_out":      totalOut,
		"balance":        totalIn - totalOut,
	})
}

func AddWelfareContribution(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var input struct {
		UserID uint    `json:"user_id"`
		Amount float64 `json:"amount"`
		Period string  `json:"period"`
		Notes  string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.UserID == 0 || input.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member and amount are required"})
		return
	}

	rid := recorderID.(uint)
	var recorder models.User
	config.DB.Select("name").First(&recorder, rid)

	contrib := models.WelfareContribution{
		UserID:     input.UserID,
		GroupID:    groupID.(uint),
		Amount:     input.Amount,
		Period:     input.Period,
		PaidAt:     time.Now(),
		Notes:      input.Notes,
		RecordedBy: rid,
	}

	if err := config.DB.Create(&contrib).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record welfare contribution"})
		return
	}

	config.DB.Preload("User").First(&contrib, contrib.ID)
	contrib.RecordedByName = recorder.Name
	c.JSON(http.StatusCreated, gin.H{"contribution": contrib, "message": "Welfare contribution recorded"})
}

func AddWelfareDisbursement(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	approverID, _ := c.Get("userID")

	var input struct {
		UserID uint    `json:"user_id"`
		Amount float64 `json:"amount"`
		Reason string  `json:"reason"`
		Notes  string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.UserID == 0 || input.Amount <= 0 || input.Reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member, amount and reason are required"})
		return
	}

	aid := approverID.(uint)
	var approver models.User
	config.DB.Select("name").First(&approver, aid)

	disbursement := models.WelfareDisbursement{
		UserID:      input.UserID,
		GroupID:     groupID.(uint),
		Amount:      input.Amount,
		Reason:      input.Reason,
		DisbursedAt: time.Now(),
		ApprovedBy:  aid,
		Notes:       input.Notes,
	}

	if err := config.DB.Create(&disbursement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record disbursement"})
		return
	}

	config.DB.Preload("User").First(&disbursement, disbursement.ID)
	disbursement.ApprovedByName = approver.Name
	c.JSON(http.StatusCreated, gin.H{"disbursement": disbursement, "message": "Disbursement recorded"})
}
