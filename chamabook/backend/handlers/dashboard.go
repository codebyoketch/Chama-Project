package handlers

import (
	"net/http"
	"time"

	"chamabook/config"
	"chamabook/models"

	"github.com/gin-gonic/gin"
)

// ── MINUTES ────────────────────────────────────────────────────────────────

type MinuteInput struct {
	MeetingDate  string `json:"meeting_date" binding:"required"` // "2024-01-15"
	Agenda       string `json:"agenda"`
	Content      string `json:"content" binding:"required"`
	Attendees    string `json:"attendees"` // JSON array of user IDs
	ClientTempID string `json:"client_temp_id"`
}

func GetMinutes(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var minutes []models.Minute
	config.DB.Where("group_id = ?", groupID).Order("meeting_date DESC").Find(&minutes)

	c.JSON(http.StatusOK, gin.H{"minutes": minutes})
}

func AddMinute(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var input MinuteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	meetingDate, err := time.Parse("2006-01-02", input.MeetingDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	minute := models.Minute{
		GroupID:      groupID.(uint),
		MeetingDate:  meetingDate,
		Agenda:       input.Agenda,
		Content:      input.Content,
		Attendees:    input.Attendees,
		RecordedBy:   recorderID.(uint),
		ClientTempID: input.ClientTempID,
	}

	if err := config.DB.Create(&minute).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save minutes"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Minutes saved", "minute": minute})
}

func UpdateMinute(c *gin.Context) {
	minuteID := c.Param("id")
	groupID, _ := c.Get("groupID")

	var input MinuteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := config.DB.Model(&models.Minute{}).
		Where("id = ? AND group_id = ?", minuteID, groupID).
		Updates(map[string]interface{}{
			"agenda":    input.Agenda,
			"content":   input.Content,
			"attendees": input.Attendees,
		})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Minutes not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Minutes updated"})
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────

func GetDashboard(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	// Total members
	var totalMembers int64
	config.DB.Model(&models.User{}).Where("group_id = ? AND is_active = true", groupID).Count(&totalMembers)

	// Total contributions (all time)
	var totalContributions float64
	config.DB.Model(&models.Contribution{}).
		Where("group_id = ?", groupID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalContributions)

	// Active loans count and total outstanding
	var activeLoansCount int64
	var totalOutstanding float64
	config.DB.Model(&models.Loan{}).Where("group_id = ? AND status = 'active'", groupID).Count(&activeLoansCount)
	config.DB.Model(&models.Loan{}).
		Where("group_id = ? AND status = 'active'", groupID).
		Select("COALESCE(SUM(balance), 0)").Scan(&totalOutstanding)

	// Recent contributions (last 5)
	var recentContributions []models.Contribution
	config.DB.Where("group_id = ?", groupID).
		Preload("User").Order("created_at DESC").Limit(5).
		Find(&recentContributions)

	// Overdue loans
	var overdueLoans int64
	config.DB.Model(&models.Loan{}).
		Where("group_id = ? AND status = 'active' AND due_at < ?", groupID, time.Now()).
		Count(&overdueLoans)

	c.JSON(http.StatusOK, gin.H{
		"total_members":       totalMembers,
		"total_contributions": totalContributions,
		"active_loans":        activeLoansCount,
		"total_outstanding":   totalOutstanding,
		"overdue_loans":       overdueLoans,
		"recent_contributions": recentContributions,
	})
}
