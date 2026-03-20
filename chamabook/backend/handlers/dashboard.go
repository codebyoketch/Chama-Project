package handlers

import (
	"net/http"
	"time"

	"chamabook/config"
	"chamabook/models"
<<<<<<< HEAD

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
=======
	"github.com/gin-gonic/gin"
)

func GetDashboard(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)

	// ── Basic counts ──────────────────────────────────────────────────────────
	var memberCount, activeLoans, pendingLoans int64
	config.DB.Model(&models.User{}).Where("group_id = ? AND is_active = true", gid).Count(&memberCount)
	config.DB.Model(&models.Loan{}).Where("group_id = ? AND status = 'active'", gid).Count(&activeLoans)
	config.DB.Model(&models.Loan{}).Where("group_id = ? AND status = 'pending'", gid).Count(&pendingLoans)

	// ── Branches ─────────────────────────────────────────────────────────────
	var branches []models.Branch
	config.DB.Where("group_id = ?", gid).Find(&branches)

	var saccoBranchID, tbBranchID uint
	for _, b := range branches {
		if b.Type == "sacco" { saccoBranchID = b.ID }
		if b.Type == "table_banking" { tbBranchID = b.ID }
	}

	// ── Contributions split by branch ─────────────────────────────────────────
	type AmountResult struct{ Total float64 }

	var saccoContrib, tbContrib AmountResult
	config.DB.Model(&models.Contribution{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND branch_id = ?", gid, saccoBranchID).
		Scan(&saccoContrib)
	config.DB.Model(&models.Contribution{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND branch_id = ?", gid, tbBranchID).
		Scan(&tbContrib)

	var saccoFinesDeducted, tbFinesDeducted AmountResult
	config.DB.Model(&models.Contribution{}).
		Select("COALESCE(SUM(fines_deducted),0) as total").
		Where("group_id = ? AND branch_id = ?", gid, saccoBranchID).
		Scan(&saccoFinesDeducted)
	config.DB.Model(&models.Contribution{}).
		Select("COALESCE(SUM(fines_deducted),0) as total").
		Where("group_id = ? AND branch_id = ?", gid, tbBranchID).
		Scan(&tbFinesDeducted)

	// ── Loans split by branch ─────────────────────────────────────────────────
	var saccoLoanTotal, tbLoanTotal AmountResult
	var saccoLoanBalance, tbLoanBalance AmountResult
	var saccoLoanRepaid, tbLoanRepaid AmountResult

	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, saccoBranchID).
		Scan(&saccoLoanTotal)
	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, tbBranchID).
		Scan(&tbLoanTotal)

	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(balance),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, saccoBranchID).
		Scan(&saccoLoanBalance)
	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(balance),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, tbBranchID).
		Scan(&tbLoanBalance)

	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(total_paid),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, saccoBranchID).
		Scan(&saccoLoanRepaid)
	config.DB.Model(&models.Loan{}).
		Select("COALESCE(SUM(total_paid),0) as total").
		Where("group_id = ? AND branch_id = ? AND status = 'active'", gid, tbBranchID).
		Scan(&tbLoanRepaid)

	// ── Welfare ───────────────────────────────────────────────────────────────
	var welfareIn, welfareOut AmountResult
	config.DB.Model(&models.WelfareContribution{}).
		Select("COALESCE(SUM(amount),0) as total").Where("group_id = ?", gid).Scan(&welfareIn)
	config.DB.Model(&models.WelfareDisbursement{}).
		Select("COALESCE(SUM(amount),0) as total").Where("group_id = ?", gid).Scan(&welfareOut)
	welfareBalance := welfareIn.Total - welfareOut.Total

	// ── Share capital ─────────────────────────────────────────────────────────
	var shareCapitalTotal, shareCapitalPaid AmountResult
	config.DB.Model(&models.ShareCapital{}).
		Select("COALESCE(SUM(amount),0) as total").Where("group_id = ?", gid).Scan(&shareCapitalTotal)
	config.DB.Model(&models.ShareCapital{}).
		Select("COALESCE(SUM(amount_paid),0) as total").Where("group_id = ?", gid).Scan(&shareCapitalPaid)

	// ── Fines ─────────────────────────────────────────────────────────────────
	var unpaidFines, paidFines AmountResult
	config.DB.Model(&models.Fine{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND status = 'unpaid'", gid).Scan(&unpaidFines)
	config.DB.Model(&models.Fine{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where("group_id = ? AND status = 'paid'", gid).Scan(&paidFines)

	// ── Monthly contribution trend (last 6 months) ────────────────────────────
	type MonthlyData struct {
		Month  string  `json:"month"`
		Sacco  float64 `json:"sacco"`
		TB     float64 `json:"tb"`
		Total  float64 `json:"total"`
	}

	monthlyTrend := []MonthlyData{}
	for i := 5; i >= 0; i-- {
		t := time.Now().AddDate(0, -i, 0)
		monthStart := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)
		label := t.Format("Jan 06")

		var s, tb AmountResult
		config.DB.Model(&models.Contribution{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("group_id = ? AND branch_id = ? AND created_at >= ? AND created_at < ?",
				gid, saccoBranchID, monthStart, monthEnd).Scan(&s)
		config.DB.Model(&models.Contribution{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("group_id = ? AND branch_id = ? AND created_at >= ? AND created_at < ?",
				gid, tbBranchID, monthStart, monthEnd).Scan(&tb)

		monthlyTrend = append(monthlyTrend, MonthlyData{
			Month: label, Sacco: s.Total, TB: tb.Total, Total: s.Total + tb.Total,
		})
	}

	// ── Monthly loan repayments trend (last 6 months) ─────────────────────────
	type MonthlyRepayment struct {
		Month string  `json:"month"`
		Total float64 `json:"total"`
	}
	repaymentTrend := []MonthlyRepayment{}
	for i := 5; i >= 0; i-- {
		t := time.Now().AddDate(0, -i, 0)
		monthStart := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)
		label := t.Format("Jan 06")

		var r AmountResult
		config.DB.Model(&models.Repayment{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("created_at >= ? AND created_at < ? AND loan_id IN (SELECT id FROM loans WHERE group_id = ?)",
				monthStart, monthEnd, gid).Scan(&r)

		repaymentTrend = append(repaymentTrend, MonthlyRepayment{Month: label, Total: r.Total})
	}

	// ── Recent activity ───────────────────────────────────────────────────────
	var recentContributions []models.Contribution
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Limit(5).Find(&recentContributions)
	for i, c := range recentContributions {
		recentContributions[i].BranchName = populateBranchName(c.BranchID)
	}

	var upcomingMeetings []models.Meeting
	config.DB.Where("group_id = ? AND status = 'scheduled'", gid).Order("scheduled_at ASC").Limit(3).Find(&upcomingMeetings)

	var group models.Group
	config.DB.First(&group, gid)

	// ── Total funds ───────────────────────────────────────────────────────────
	totalSaccoFunds := saccoContrib.Total - saccoFinesDeducted.Total
	totalTBFunds := tbContrib.Total - tbFinesDeducted.Total
	totalFunds := totalSaccoFunds + totalTBFunds + welfareBalance + shareCapitalPaid.Total

	c.JSON(http.StatusOK, gin.H{
		// Core counts
		"member_count":   memberCount,
		"active_loans":   activeLoans,
		"pending_loans":  pendingLoans,

		// Fund totals
		"total_funds": gin.H{
			"total":         totalFunds,
			"sacco_savings": totalSaccoFunds,
			"tb_savings":    totalTBFunds,
			"welfare":       welfareBalance,
			"share_capital": shareCapitalPaid.Total,
		},

		// Contributions by branch
		"contributions": gin.H{
			"sacco_total":   saccoContrib.Total,
			"tb_total":      tbContrib.Total,
			"total":         saccoContrib.Total + tbContrib.Total,
			"sacco_net":     totalSaccoFunds,
			"tb_net":        totalTBFunds,
		},

		// Loans by branch
		"loans": gin.H{
			"sacco_loaned":  saccoLoanTotal.Total,
			"sacco_balance": saccoLoanBalance.Total,
			"sacco_repaid":  saccoLoanRepaid.Total,
			"tb_loaned":     tbLoanTotal.Total,
			"tb_balance":    tbLoanBalance.Total,
			"tb_repaid":     tbLoanRepaid.Total,
			"total_loaned":  saccoLoanTotal.Total + tbLoanTotal.Total,
			"total_balance": saccoLoanBalance.Total + tbLoanBalance.Total,
			"total_repaid":  saccoLoanRepaid.Total + tbLoanRepaid.Total,
		},

		// Other funds
		"welfare": gin.H{
			"balance":   welfareBalance,
			"total_in":  welfareIn.Total,
			"total_out": welfareOut.Total,
		},
		"share_capital": gin.H{
			"committed": shareCapitalTotal.Total,
			"paid_in":   shareCapitalPaid.Total,
		},
		"fines": gin.H{
			"unpaid": unpaidFines.Total,
			"paid":   paidFines.Total,
		},

		// Trends
		"monthly_contributions": monthlyTrend,
		"monthly_repayments":    repaymentTrend,

		// Recent activity
		"recent_contributions": recentContributions,
		"upcoming_meetings":    upcomingMeetings,
		"group":                group,
>>>>>>> master
	})
}
