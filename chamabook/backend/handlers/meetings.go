package handlers

import (
	"fmt"
	"net/http"
	"time"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

func parseTime(s string) time.Time {
	formats := []string{
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil { return t }
	}
	return time.Now()
}

func GetMeetings(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	var meetings []models.Meeting
	config.DB.Where("group_id = ?", groupID).
		Preload("Attendance").Preload("Attendance.User").
		Order("scheduled_at DESC").Find(&meetings)
	c.JSON(http.StatusOK, gin.H{"meetings": meetings})
}

func AddMeeting(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")
	var input struct {
		Title             string  `json:"title"`
		ScheduledAt       string  `json:"scheduled_at"`
		Location          string  `json:"location"`
		Agenda            string  `json:"agenda"`
		FineAbsent        float64 `json:"fine_absent"`
		FineAbsentApology float64 `json:"fine_absent_apology"`
		FineLate          float64 `json:"fine_late"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}
	meeting := models.Meeting{
		GroupID:           groupID.(uint),
		Title:             input.Title,
		ScheduledAt:       parseTime(input.ScheduledAt),
		Location:          input.Location,
		Agenda:            input.Agenda,
		FineAbsent:        input.FineAbsent,
		FineAbsentApology: input.FineAbsentApology,
		FineLate:          input.FineLate,
		Status:            "scheduled",
		RecordedBy:        recorderID.(uint),
	}
	if err := config.DB.Create(&meeting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule meeting"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"meeting": meeting, "message": "Meeting scheduled"})
}

func SaveAttendance(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	issuerID, _ := c.Get("userID")
	meetingID := c.Param("id")

	var meeting models.Meeting
	if err := config.DB.Where("id = ? AND group_id = ?", meetingID, groupID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}

	var input struct {
		Attendance []struct {
			UserID uint   `json:"user_id"`
			Status string `json:"status"` // present | absent | absent_apology | late
			Notes  string `json:"notes"`
		} `json:"attendance"`
		AbsentFine          float64 `json:"absent_fine"`
		AbsentNoApologyFine float64 `json:"absent_no_apology_fine"`
		FineLate            float64 `json:"fine_late"`
		Minutes             string  `json:"minutes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use per-meeting overrides if provided, else use meeting defaults
	absentFine := meeting.FineAbsent
	if input.AbsentFine > 0 { absentFine = input.AbsentFine }
	absentApologyFine := meeting.FineAbsentApology
	if input.AbsentNoApologyFine > 0 { absentApologyFine = input.AbsentNoApologyFine }
	lateFine := meeting.FineLate
	if input.FineLate > 0 { lateFine = input.FineLate }

	// Update meeting fine amounts
	config.DB.Model(&meeting).Updates(map[string]interface{}{
		"fine_absent":         absentFine,
		"fine_absent_apology": absentApologyFine,
		"fine_late":           lateFine,
	})

	gid := groupID.(uint)
	iid := issuerID.(uint)

	config.DB.Where("meeting_id = ?", meeting.ID).Delete(&models.MeetingAttendance{})

	finesIssued := 0
	totalFines := 0.0

	for _, a := range input.Attendance {
		var fineAmount float64
		var fineID uint

		switch a.Status {
		case "absent":
			fineAmount = absentFine
		case "absent_apology":
			fineAmount = absentApologyFine
		case "late":
			fineAmount = lateFine
		}

		if fineAmount > 0 {
			var reason string
			switch a.Status {
			case "absent":
				reason = fmt.Sprintf("Absent (no apology): %s", meeting.Title)
			case "absent_apology":
				reason = fmt.Sprintf("Absent (with apology): %s", meeting.Title)
			case "late":
				reason = fmt.Sprintf("Late arrival: %s", meeting.Title)
			}
			fine := models.Fine{
				UserID:    a.UserID,
				GroupID:   gid,
				Amount:    fineAmount,
				Reason:    reason,
				Type:      "meeting",
				Status:    "unpaid",
				MeetingID: meeting.ID,
				IssuedBy:  iid,
			}
			if config.DB.Create(&fine).Error == nil {
				fineID = fine.ID
				finesIssued++
				totalFines += fineAmount
			}
		}

		config.DB.Create(&models.MeetingAttendance{
			MeetingID: meeting.ID, UserID: a.UserID, GroupID: gid,
			Status: a.Status, FineAmount: fineAmount, FineID: fineID, Notes: a.Notes,
		})
	}

	updates := map[string]interface{}{"status": "completed"}
	if input.Minutes != "" { updates["minutes"] = input.Minutes }
	config.DB.Model(&meeting).Updates(updates)

	config.DB.Preload("Attendance").Preload("Attendance.User").First(&meeting, meeting.ID)
	c.JSON(http.StatusOK, gin.H{
		"meeting":      meeting,
		"fines_issued": finesIssued,
		"total_fines":  totalFines,
		"message":      fmt.Sprintf("Attendance saved. %d fine(s) issued totalling KES %.0f", finesIssued, totalFines),
	})
}

func GetMeetingReport(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	meetingID := c.Param("id")
	var meeting models.Meeting
	if err := config.DB.Where("id = ? AND group_id = ?", meetingID, groupID).
		Preload("Attendance").Preload("Attendance.User").First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}
	present := []models.MeetingAttendance{}
	absentApology := []models.MeetingAttendance{}
	absent := []models.MeetingAttendance{}
	late := []models.MeetingAttendance{}

	totalFines := 0.0
	for _, a := range meeting.Attendance {
		totalFines += a.FineAmount
		switch a.Status {
		case "present":
			present = append(present, a)
		case "absent_apology":
			absentApology = append(absentApology, a)
		case "absent":
			absent = append(absent, a)
		case "late":
			late = append(late, a)
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"meeting":        meeting,
		"present":        present,
		"absent_apology": absentApology,
		"absent":         absent,
		"late":           late,
		"total_fines":    totalFines,
		"summary": gin.H{
			"total":          len(meeting.Attendance),
			"present":        len(present),
			"absent_apology": len(absentApology),
			"absent":         len(absent),
			"late":           len(late),
		},
	})
}

func UpdateMeeting(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	meetingID := c.Param("id")
	var meeting models.Meeting
	if err := config.DB.Where("id = ? AND group_id = ?", meetingID, groupID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}
	var input struct {
		Title             string  `json:"title"`
		ScheduledAt       string  `json:"scheduled_at"`
		Location          string  `json:"location"`
		Agenda            string  `json:"agenda"`
		Minutes           string  `json:"minutes"`
		Status            string  `json:"status"`
		FineAbsent        float64 `json:"fine_absent"`
		FineAbsentApology float64 `json:"fine_absent_apology"`
		FineLate          float64 `json:"fine_late"`
	}
	c.ShouldBindJSON(&input)
	updates := map[string]interface{}{}
	if input.Title != "" { updates["title"] = input.Title }
	if input.Location != "" { updates["location"] = input.Location }
	if input.Agenda != "" { updates["agenda"] = input.Agenda }
	if input.Minutes != "" { updates["minutes"] = input.Minutes }
	if input.Status != "" { updates["status"] = input.Status }
	if input.FineAbsent > 0 { updates["fine_absent"] = input.FineAbsent }
	if input.FineAbsentApology > 0 { updates["fine_absent_apology"] = input.FineAbsentApology }
	if input.FineLate >= 0 { updates["fine_late"] = input.FineLate }
	if input.ScheduledAt != "" { updates["scheduled_at"] = parseTime(input.ScheduledAt) }
	config.DB.Model(&meeting).Updates(updates)
	config.DB.Preload("Attendance").Preload("Attendance.User").First(&meeting, meeting.ID)
	c.JSON(http.StatusOK, gin.H{"meeting": meeting})
}

func DeleteMeeting(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	meetingID := c.Param("id")
	var meeting models.Meeting
	if err := config.DB.Where("id = ? AND group_id = ?", meetingID, groupID).First(&meeting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting not found"})
		return
	}
	config.DB.Where("meeting_id = ?", meeting.ID).Delete(&models.MeetingAttendance{})
	config.DB.Delete(&meeting)
	c.JSON(http.StatusOK, gin.H{"message": "Meeting deleted"})
}
