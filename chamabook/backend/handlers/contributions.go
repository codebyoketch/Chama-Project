package handlers

import (
	"net/http"
	"time"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

type ContributionInput struct {
	UserID       uint    `json:"user_id"`
	BranchID     uint    `json:"branch_id"`
	Amount       float64 `json:"amount"`
	Period       string  `json:"period"`
	Notes        string  `json:"notes"`
	ClientTempID string  `json:"client_temp_id"`
	Type         string  `json:"type"` // sacco_savings | tb_contribution — auto-detected if blank
}

func populateBranchName(branchID uint) string {
	if branchID == 0 { return "" }
	var b models.Branch
	if config.DB.Select("name,type").First(&b, branchID).Error == nil { return b.Name }
	return ""
}

func populateBranchType(branchID uint) string {
	if branchID == 0 { return "sacco" }
	var b models.Branch
	if config.DB.Select("type").First(&b, branchID).Error == nil { return b.Type }
	return "sacco"
}

func populateRecorderName(id uint) string {
	if id == 0 { return "" }
	var u models.User
	if config.DB.Select("name").First(&u, id).Error == nil { return u.Name }
	return ""
}

func GetContributions(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	period := c.Query("period")
	branchID := c.Query("branch_id")
	contribType := c.Query("type") // sacco_savings | tb_contribution

	query := config.DB.Where("group_id = ?", groupID).Preload("User")
	if period != "" { query = query.Where("period = ?", period) }
	if branchID != "" { query = query.Where("branch_id = ?", branchID) }
	if contribType != "" { query = query.Where("type = ?", contribType) }

	var contributions []models.Contribution
	query.Order("created_at DESC").Find(&contributions)
	for i, cont := range contributions {
		contributions[i].RecordedByName = populateRecorderName(cont.RecordedBy)
		contributions[i].BranchName = populateBranchName(cont.BranchID)
	}

	// Totals split by type for summary cards
	type TypeTotal struct {
		Type        string  `json:"type"`
		TotalAmount float64 `json:"total_amount"`
		TotalNet    float64 `json:"total_net"`
		Count       int64   `json:"count"`
	}
	var typeTotals []TypeTotal
	config.DB.Model(&models.Contribution{}).
		Select("type, SUM(amount) as total_amount, SUM(net_amount) as total_net, COUNT(*) as count").
		Where("group_id = ?", groupID).
		Group("type").Scan(&typeTotals)

	c.JSON(http.StatusOK, gin.H{
		"contributions": contributions,
		"type_totals":   typeTotals,
	})
}

func AddContribution(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var input ContributionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.UserID == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Member is required"}); return }
	if input.Amount <= 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be > 0"}); return }
	if input.Period == "" { c.JSON(http.StatusBadRequest, gin.H{"error": "Period is required"}); return }

	gid := groupID.(uint)
	rid := recorderID.(uint)

	// Auto-detect type from branch
	contribType := input.Type
	if contribType == "" && input.BranchID > 0 {
		bType := populateBranchType(input.BranchID)
		if bType == "table_banking" {
			contribType = "tb_contribution"
		} else {
			contribType = "sacco_savings"
		}
	}
	if contribType == "" { contribType = "sacco_savings" }

	notes := input.Notes
	if notes == "" {
		if contribType == "tb_contribution" {
			notes = "Monthly Table Banking Contribution"
		} else {
			notes = "Monthly SACCO Savings"
		}
	}

	// Deduct unpaid fines first
	var unpaidFines []models.Fine
	config.DB.Where("user_id = ? AND group_id = ? AND status = 'unpaid'", input.UserID, gid).
		Order("created_at ASC").Find(&unpaidFines)

	remaining := input.Amount
	finesDeducted := 0.0

	for _, fine := range unpaidFines {
		if remaining <= 0 { break }
		if remaining >= fine.Amount {
			remaining -= fine.Amount
			finesDeducted += fine.Amount
			now := time.Now()
			config.DB.Model(&fine).Updates(map[string]interface{}{
				"status": "paid", "paid_at": now,
				"notes": "Auto-deducted from contribution",
			})
		} else {
			finesDeducted += remaining
			config.DB.Model(&fine).Update("amount", fine.Amount-remaining)
			remaining = 0
		}
	}

	netAmount := remaining

	contribution := models.Contribution{
		UserID:        input.UserID,
		GroupID:       gid,
		BranchID:      input.BranchID,
		Type:          contribType,
		Amount:        input.Amount,
		FinesDeducted: finesDeducted,
		NetAmount:     netAmount,
		Period:        input.Period,
		PaidAt:        time.Now(),
		Notes:         notes,
		RecordedBy:    rid,
		ClientTempID:  input.ClientTempID,
	}
	if err := config.DB.Create(&contribution).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record contribution"})
		return
	}
	config.DB.Preload("User").First(&contribution, contribution.ID)
	contribution.RecordedByName = populateRecorderName(rid)
	contribution.BranchName = populateBranchName(input.BranchID)

	c.JSON(http.StatusCreated, gin.H{
		"contribution":   contribution,
		"fines_deducted": finesDeducted,
		"net_amount":     netAmount,
		"type":           contribType,
		"message":        "Contribution recorded",
	})
}

func GetGroupContributionSummary(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	type Summary struct {
		Period      string  `json:"period"`
		BranchID    uint    `json:"branch_id"`
		Type        string  `json:"type"`
		TotalAmount float64 `json:"total_amount"`
		Count       int     `json:"count"`
	}
	var summaries []Summary
	config.DB.Model(&models.Contribution{}).
		Select("period, branch_id, type, SUM(amount) as total_amount, COUNT(*) as count").
		Where("group_id = ?", groupID).Group("period, branch_id, type").
		Order("period DESC").Scan(&summaries)
	c.JSON(http.StatusOK, gin.H{"summary": summaries})
}

func SyncContributions(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")
	var inputs []ContributionInput
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	gid := groupID.(uint)
	rid := recorderID.(uint)
	synced := 0
	for _, input := range inputs {
		if input.ClientTempID != "" {
			var existing models.Contribution
			if config.DB.Where("client_temp_id = ? AND group_id = ?", input.ClientTempID, gid).First(&existing).Error == nil { continue }
		}
		contribType := input.Type
		if contribType == "" { contribType = "sacco_savings" }
		notes := input.Notes
		if notes == "" { notes = "Monthly Contribution" }
		contribution := models.Contribution{
			UserID: input.UserID, GroupID: gid, BranchID: input.BranchID,
			Type: contribType, Amount: input.Amount, Period: input.Period,
			PaidAt: time.Now(), Notes: notes, RecordedBy: rid, ClientTempID: input.ClientTempID,
		}
		if config.DB.Create(&contribution).Error == nil { synced++ }
	}
	c.JSON(http.StatusOK, gin.H{"synced": synced})
}

func GetContributionPayouts(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	var payouts []models.ContributionPayout
	config.DB.Where("group_id = ?", groupID).Preload("User").
		Order("created_at DESC").Find(&payouts)
	for i, p := range payouts {
		payouts[i].ApprovedByName = populateRecorderName(p.ApprovedBy)
		payouts[i].BranchName = populateBranchName(p.BranchID)
	}

	var saccoIn, tbIn, totalOut float64
	config.DB.Model(&models.Contribution{}).
		Where("group_id = ? AND type = 'sacco_savings'", groupID).
		Select("COALESCE(SUM(net_amount), 0)").Scan(&saccoIn)
	config.DB.Model(&models.Contribution{}).
		Where("group_id = ? AND type = 'tb_contribution'", groupID).
		Select("COALESCE(SUM(net_amount), 0)").Scan(&tbIn)
	config.DB.Model(&models.ContributionPayout{}).
		Where("group_id = ?", groupID).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalOut)

	totalIn := saccoIn + tbIn
	c.JSON(http.StatusOK, gin.H{
		"payouts":   payouts,
		"total_in":  totalIn,
		"sacco_in":  saccoIn,
		"tb_in":     tbIn,
		"total_out": totalOut,
		"balance":   totalIn - totalOut,
	})
}

func AddContributionPayout(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	approverID, _ := c.Get("userID")
	var input struct {
		UserID   uint    `json:"user_id"`
		BranchID uint    `json:"branch_id"`
		Amount   float64 `json:"amount"`
		Reason   string  `json:"reason"`
		Period   string  `json:"period"`
		Notes    string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.UserID == 0 || input.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member and amount are required"})
		return
	}
	aid := approverID.(uint)
	payout := models.ContributionPayout{
		UserID: input.UserID, GroupID: groupID.(uint), BranchID: input.BranchID,
		Amount: input.Amount, Reason: input.Reason, Period: input.Period,
		DisbursedAt: time.Now(), ApprovedBy: aid, Notes: input.Notes,
	}
	if err := config.DB.Create(&payout).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payout"})
		return
	}
	config.DB.Preload("User").First(&payout, payout.ID)
	payout.ApprovedByName = populateRecorderName(aid)
	payout.BranchName = populateBranchName(input.BranchID)
	c.JSON(http.StatusCreated, gin.H{"payout": payout, "message": "Payout recorded"})
}
