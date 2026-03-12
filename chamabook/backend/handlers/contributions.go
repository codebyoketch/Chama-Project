package handlers

import (
	"net/http"

	"chamabook/config"
	"chamabook/models"

	"github.com/gin-gonic/gin"
)

type ContributionInput struct {
	UserID       uint    `json:"user_id" binding:"required"`
	Amount       float64 `json:"amount" binding:"required"`
	Period       string  `json:"period" binding:"required"` // "2024-01"
	Notes        string  `json:"notes"`
	ClientTempID string  `json:"client_temp_id"` // offline sync ID
}

// GetContributions returns all contributions for the group
func GetContributions(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	period := c.Query("period") // optional filter e.g. ?period=2024-01

	query := config.DB.Where("group_id = ?", groupID).Preload("User")
	if period != "" {
		query = query.Where("period = ?", period)
	}

	var contributions []models.Contribution
	query.Order("paid_at DESC").Find(&contributions)

	c.JSON(http.StatusOK, gin.H{"contributions": contributions})
}

// AddContribution records a new contribution
func AddContribution(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var input ContributionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contribution := models.Contribution{
		UserID:       input.UserID,
		GroupID:      groupID.(uint),
		Amount:       input.Amount,
		Period:       input.Period,
		Notes:        input.Notes,
		RecordedBy:   recorderID.(uint),
		ClientTempID: input.ClientTempID,
	}

	if err := config.DB.Create(&contribution).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save contribution"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Contribution recorded",
		"contribution": contribution,
	})
}

// GetGroupSummary returns contribution stats for the whole group
func GetGroupContributionSummary(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	period := c.Query("period")

	type MemberContribution struct {
		UserID uint    `json:"user_id"`
		Name   string  `json:"name"`
		Total  float64 `json:"total"`
		Paid   bool    `json:"paid"` // paid this period
	}

	var results []MemberContribution
	query := `
		SELECT u.id as user_id, u.name, COALESCE(SUM(c.amount), 0) as total,
		EXISTS(SELECT 1 FROM contributions WHERE user_id = u.id AND period = ? AND group_id = ?) as paid
		FROM users u
		LEFT JOIN contributions c ON c.user_id = u.id AND c.group_id = ?
		WHERE u.group_id = ? AND u.is_active = true
		GROUP BY u.id, u.name
	`
	config.DB.Raw(query, period, groupID, groupID, groupID).Scan(&results)

	c.JSON(http.StatusOK, gin.H{"summary": results, "period": period})
}

// SyncContributions handles bulk sync from offline mode
func SyncContributions(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var inputs []ContributionInput
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var saved []models.Contribution
	for _, input := range inputs {
		contribution := models.Contribution{
			UserID:       input.UserID,
			GroupID:      groupID.(uint),
			Amount:       input.Amount,
			Period:       input.Period,
			Notes:        input.Notes,
			RecordedBy:   recorderID.(uint),
			ClientTempID: input.ClientTempID,
		}
		config.DB.Create(&contribution)
		saved = append(saved, contribution)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sync complete",
		"synced":  len(saved),
		"records": saved,
	})
}
