package handlers

import (
    "net/http"
    "chamabook/config"
    "chamabook/models"
    "github.com/gin-gonic/gin"
)

func GetReports(c *gin.Context) {
    groupID, _ := c.Get("groupID")
    gid := groupID.(uint)

    // Contributions
    var totalContributions, totalFinesDeducted, totalNetContributions float64
    config.DB.Model(&models.Contribution{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalContributions)
    config.DB.Model(&models.Contribution{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(fines_deducted),0)").Scan(&totalFinesDeducted)
    config.DB.Model(&models.Contribution{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(net_amount),0)").Scan(&totalNetContributions)

    // Contribution payouts
    var totalContributionPayouts float64
    config.DB.Model(&models.ContributionPayout{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalContributionPayouts)

    // Loans
    var totalLoansIssued, totalRepaid, totalLoanBalance float64
    config.DB.Model(&models.Loan{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalLoansIssued)
    config.DB.Model(&models.Loan{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(total_paid),0)").Scan(&totalRepaid)
    config.DB.Model(&models.Loan{}).Where("group_id = ? AND status = 'active'", gid).
        Select("COALESCE(SUM(balance),0)").Scan(&totalLoanBalance)

    // Fines
    var totalFinesIssued, totalFinesPaid, totalFinesUnpaid float64
    config.DB.Model(&models.Fine{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalFinesIssued)
    config.DB.Model(&models.Fine{}).Where("group_id = ? AND status = 'paid'", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalFinesPaid)
    config.DB.Model(&models.Fine{}).Where("group_id = ? AND status = 'unpaid'", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalFinesUnpaid)

    // Welfare
    var totalWelfareIn, totalWelfareOut float64
    config.DB.Model(&models.WelfareContribution{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalWelfareIn)
    config.DB.Model(&models.WelfareDisbursement{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalWelfareOut)

    // Share capital
    var totalShareCapital float64
    config.DB.Model(&models.ShareCapital{}).Where("group_id = ?", gid).
        Select("COALESCE(SUM(amount),0)").Scan(&totalShareCapital)

    // Members
    var totalMembers, saccoOnly, both int64
    config.DB.Model(&models.User{}).Where("group_id = ? AND is_active = true", gid).Count(&totalMembers)
    config.DB.Model(&models.User{}).Where("group_id = ? AND is_active = true AND membership_type = 'sacco_only'", gid).Count(&saccoOnly)
    config.DB.Model(&models.User{}).Where("group_id = ? AND is_active = true AND membership_type = 'both'", gid).Count(&both)

    // Per-period contribution summary
    type PeriodSummary struct {
        Period      string  `json:"period"`
        TotalAmount float64 `json:"total_amount"`
        Count       int     `json:"count"`
    }
    var periodSummaries []PeriodSummary
    config.DB.Model(&models.Contribution{}).
        Select("period, SUM(amount) as total_amount, COUNT(*) as count").
        Where("group_id = ?", gid).Group("period").Order("period DESC").
        Scan(&periodSummaries)

    c.JSON(http.StatusOK, gin.H{
        "contributions": gin.H{
            "total_gross":    totalContributions,
            "fines_deducted": totalFinesDeducted,
            "total_net":      totalNetContributions,
            "total_payouts":  totalContributionPayouts,
            "balance":        totalNetContributions - totalContributionPayouts,
            "by_period":      periodSummaries,
        },
        "loans": gin.H{
            "total_issued":  totalLoansIssued,
            "total_repaid":  totalRepaid,
            "total_balance": totalLoanBalance,
        },
        "fines": gin.H{
            "total_issued": totalFinesIssued,
            "total_paid":   totalFinesPaid,
            "total_unpaid": totalFinesUnpaid,
        },
        "welfare": gin.H{
            "total_in":  totalWelfareIn,
            "total_out": totalWelfareOut,
            "balance":   totalWelfareIn - totalWelfareOut,
        },
        "share_capital": gin.H{
            "total": totalShareCapital,
        },
        "members": gin.H{
            "total":       totalMembers,
            "sacco_only":  saccoOnly,
            "both":        both,
        },
    })
}