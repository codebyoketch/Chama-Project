package handlers

import (
	"net/http"
	"time"

	"chamabook/config"
	"chamabook/models"
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
	})
}
