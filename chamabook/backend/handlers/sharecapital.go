package handlers

import (
	"fmt"
	"net/http"
	"time"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

type MemberSummary struct {
	UserID          uint    `json:"user_id"`
	UserName        string  `json:"user_name"`
	TotalShares     int     `json:"total_shares"`
	TotalAmount     float64 `json:"total_amount"`
	TotalPaid       float64 `json:"total_paid"`
	WithdrawnShares int     `json:"withdrawn_shares"`
	WithdrawnAmount float64 `json:"withdrawn_amount"`
	NetShares       int     `json:"net_shares"`
	NetAmount       float64 `json:"net_amount"`
	HasPending      bool    `json:"has_pending"` // has unpaid installments
}

func updateSharePaymentStatus(record *models.ShareCapital) {
	now := time.Now()
	if record.AmountPaid >= record.Amount {
		record.PaymentStatus = "paid"
	} else if now.After(record.InstallmentDeadline) {
		record.PaymentStatus = "overdue"
	} else if record.AmountPaid > 0 {
		record.PaymentStatus = "partial"
	} else {
		record.PaymentStatus = "pending"
	}
}

// AssignDefaultShare assigns 1 share to a member if they don't already have one.
// Called automatically when a member is added.
func AssignDefaultShare(userID, groupID uint) {
	// Check if member already has any shares
	var count int64
	config.DB.Model(&models.ShareCapital{}).
		Where("user_id = ? AND group_id = ?", userID, groupID).
		Count(&count)
	if count > 0 {
		return // already has shares
	}

	// Get default share price from group settings
	var settings models.GroupSettings
	sharePrice := 2500.0 // fallback default
	if config.DB.Where("group_id = ?", groupID).First(&settings).Error == nil {
		if settings.DefaultSharePrice > 0 {
			sharePrice = settings.DefaultSharePrice
		}
	}

	deadline := time.Now().AddDate(0, 3, 0)
	record := models.ShareCapital{
		UserID:              userID,
		GroupID:             groupID,
		Shares:              1,
		SharePrice:          sharePrice,
		Amount:              sharePrice,
		AmountPaid:          0,
		PaymentStatus:       "pending",
		InstallmentDeadline: deadline,
		Type:                "purchase",
		Notes:               "Default share — auto-assigned on registration",
	}
	config.DB.Create(&record)
}

func GetShareCapital(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	// Update overdue statuses first
	now := time.Now()
	config.DB.Model(&models.ShareCapital{}).
		Where("group_id = ? AND payment_status IN ('pending','partial') AND installment_deadline < ?", groupID, now).
		Update("payment_status", "overdue")

	var records []models.ShareCapital
	config.DB.Where("group_id = ?", groupID).Preload("User").
		Order("created_at DESC").Find(&records)
	for i, r := range records {
		records[i].RecordedByName = populateRecorderName(r.RecordedBy)
	}

	var summaries []MemberSummary
	config.DB.Model(&models.ShareCapital{}).
		Select("user_id, SUM(shares) as total_shares, SUM(amount) as total_amount, SUM(amount_paid) as total_paid").
		Where("group_id = ?", groupID).Group("user_id").Scan(&summaries)

	for i, s := range summaries {
		var u models.User
		config.DB.Select("name").First(&u, s.UserID)
		summaries[i].UserName = u.Name

		type WSum struct {
			TotalShares int
			TotalAmount float64
		}
		var w WSum
		config.DB.Model(&models.ShareCapitalWithdrawal{}).
			Select("COALESCE(SUM(shares),0) as total_shares, COALESCE(SUM(total_amount),0) as total_amount").
			Where("user_id = ? AND group_id = ?", s.UserID, groupID).Scan(&w)
		summaries[i].WithdrawnShares = w.TotalShares
		summaries[i].WithdrawnAmount = w.TotalAmount
		summaries[i].NetShares = s.TotalShares - w.TotalShares
		summaries[i].NetAmount = s.TotalPaid - w.TotalAmount // net value is what's actually been paid minus withdrawals

		// Check if member has any unpaid installments
		var pendingCount int64
		config.DB.Model(&models.ShareCapital{}).
			Where("user_id = ? AND group_id = ? AND payment_status IN ('pending','partial','overdue')", s.UserID, groupID).
			Count(&pendingCount)
		summaries[i].HasPending = pendingCount > 0
	}

	var withdrawals []models.ShareCapitalWithdrawal
	config.DB.Where("group_id = ?", groupID).Preload("User").
		Order("created_at DESC").Find(&withdrawals)
	for i, w := range withdrawals {
		withdrawals[i].ApprovedByName = populateRecorderName(w.ApprovedBy)
	}

	var grandTotal float64
	config.DB.Model(&models.ShareCapital{}).
		Where("group_id = ?", groupID).
		Select("COALESCE(SUM(amount), 0)").Scan(&grandTotal)

	var totalPaidIn float64
	config.DB.Model(&models.ShareCapital{}).
		Where("group_id = ?", groupID).
		Select("COALESCE(SUM(amount_paid), 0)").Scan(&totalPaidIn)

	var totalWithdrawn float64
	config.DB.Model(&models.ShareCapitalWithdrawal{}).
		Where("group_id = ?", groupID).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&totalWithdrawn)

	var pendingAmount float64
	config.DB.Model(&models.ShareCapital{}).
		Where("group_id = ? AND payment_status IN ('pending','partial','overdue')", groupID).
		Select("COALESCE(SUM(amount - amount_paid), 0)").Scan(&pendingAmount)

	c.JSON(http.StatusOK, gin.H{
		"records":         records,
		"summaries":       summaries,
		"withdrawals":     withdrawals,
		"grand_total":     grandTotal,
		"total_paid_in":   totalPaidIn,
		"total_withdrawn": totalWithdrawn,
		"net_total":       totalPaidIn - totalWithdrawn,
		"pending_amount":  pendingAmount,
	})
}

func AddShareCapital(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")
	var input struct {
		UserID          uint    `json:"user_id"`
		Shares          int     `json:"shares"`
		SharePrice      float64 `json:"share_price"`
		InitialPayment  float64 `json:"initial_payment"` // first installment (can be full amount)
		Type            string  `json:"type"`
		Notes           string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.UserID == 0 || input.Shares <= 0 || input.SharePrice <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member, shares and share price are required"})
		return
	}
	if input.Type == "" { input.Type = "purchase" }

	totalAmount := float64(input.Shares) * input.SharePrice
	initialPayment := input.InitialPayment
	if initialPayment <= 0 { initialPayment = 0 }
	if initialPayment > totalAmount { initialPayment = totalAmount }

	rid := recorderID.(uint)

	// Installment deadline: 3 months from now
	deadline := time.Now().AddDate(0, 3, 0)

	record := models.ShareCapital{
		UserID:              input.UserID,
		GroupID:             groupID.(uint),
		Shares:              input.Shares,
		SharePrice:          input.SharePrice,
		Amount:              totalAmount,
		AmountPaid:          initialPayment,
		InstallmentDeadline: deadline,
		Type:                input.Type,
		PaidAt:              time.Now(),
		RecordedBy:          rid,
		Notes:               input.Notes,
	}
	updateSharePaymentStatus(&record)

	if err := config.DB.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record share capital"})
		return
	}
	config.DB.Preload("User").First(&record, record.ID)
	record.RecordedByName = populateRecorderName(rid)

	c.JSON(http.StatusCreated, gin.H{
		"record":           record,
		"message":          "Share capital recorded",
		"balance_due":      totalAmount - initialPayment,
		"deadline":         deadline.Format("2 January 2006"),
	})
}

func PayShareInstallment(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")
	shareID := c.Param("id")

	var input struct {
		Amount float64 `json:"amount"`
		Notes  string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount must be greater than 0"})
		return
	}

	var record models.ShareCapital
	if err := config.DB.Where("id = ? AND group_id = ?", shareID, groupID).Preload("User").First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Share capital record not found"})
		return
	}

	if record.PaymentStatus == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This share purchase is already fully paid"})
		return
	}

	remaining := record.Amount - record.AmountPaid
	if input.Amount > remaining {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           fmt.Sprintf("Payment of KES %.0f exceeds the remaining balance of KES %.0f", input.Amount, remaining),
			"balance_due":     remaining,
		})
		return
	}

	newAmountPaid := record.AmountPaid + input.Amount
	record.AmountPaid = newAmountPaid
	updateSharePaymentStatus(&record)

	if err := config.DB.Model(&record).Updates(map[string]interface{}{
		"amount_paid":    newAmountPaid,
		"payment_status": record.PaymentStatus,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payment"})
		return
	}

	_ = recorderID

	c.JSON(http.StatusOK, gin.H{
		"message":        "Payment recorded",
		"amount_paid":    newAmountPaid,
		"balance_due":    record.Amount - newAmountPaid,
		"payment_status": record.PaymentStatus,
		"deadline":       record.InstallmentDeadline.Format("2 January 2006"),
	})
}

func WithdrawShareCapital(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	approverID, _ := c.Get("userID")
	var input struct {
		UserID         uint    `json:"user_id"`
		Shares         int     `json:"shares"`
		AmountPerShare float64 `json:"amount_per_share"`
		Reason         string  `json:"reason"`
		Notes          string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.UserID == 0 || input.Shares <= 0 || input.AmountPerShare <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member, shares and amount per share are required"})
		return
	}
	gid := groupID.(uint)

	// Only count fully paid shares as available for withdrawal
	type ShareSum struct{ TotalShares int }
	var bought ShareSum
	var withdrawn ShareSum
	config.DB.Model(&models.ShareCapital{}).
		Select("COALESCE(SUM(shares), 0) as total_shares").
		Where("user_id = ? AND group_id = ? AND payment_status = 'paid'", input.UserID, gid).Scan(&bought)
	config.DB.Model(&models.ShareCapitalWithdrawal{}).
		Select("COALESCE(SUM(shares), 0) as total_shares").
		Where("user_id = ? AND group_id = ?", input.UserID, gid).Scan(&withdrawn)

	availableShares := bought.TotalShares - withdrawn.TotalShares
	if input.Shares > availableShares {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":            fmt.Sprintf("Member only has %d fully paid shares available for withdrawal", availableShares),
			"available_shares": availableShares,
		})
		return
	}

	aid := approverID.(uint)
	withdrawal := models.ShareCapitalWithdrawal{
		UserID:         input.UserID,
		GroupID:        gid,
		Shares:         input.Shares,
		AmountPerShare: input.AmountPerShare,
		TotalAmount:    float64(input.Shares) * input.AmountPerShare,
		Reason:         input.Reason,
		WithdrawnAt:    time.Now(),
		ApprovedBy:     aid,
		Notes:          input.Notes,
	}
	if err := config.DB.Create(&withdrawal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record withdrawal"})
		return
	}
	config.DB.Preload("User").First(&withdrawal, withdrawal.ID)
	withdrawal.ApprovedByName = populateRecorderName(aid)

	c.JSON(http.StatusCreated, gin.H{
		"withdrawal":       withdrawal,
		"shares_remaining": availableShares - input.Shares,
		"message":          "Share withdrawal recorded",
	})
}

func UpdateMembershipType(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	memberID := c.Param("id")
	var input struct {
		MembershipType string `json:"membership_type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.MembershipType != "sacco_only" && input.MembershipType != "both" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "membership_type must be 'sacco_only' or 'both'"})
		return
	}
	if err := config.DB.Model(&models.User{}).
		Where("id = ? AND group_id = ?", memberID, groupID).
		Update("membership_type", input.MembershipType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update membership type"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Membership type updated"})
}

func AssignDefaultSharesToAll(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)

	// Get default share price
	var settings models.GroupSettings
	sharePrice := 2500.0
	if config.DB.Where("group_id = ?", gid).First(&settings).Error == nil {
		if settings.DefaultSharePrice > 0 {
			sharePrice = settings.DefaultSharePrice
		}
	}

	// Get all active SACCO members
	var members []models.User
	config.DB.Where("group_id = ? AND is_active = true", gid).Find(&members)

	assigned := 0
	skipped := 0

	for _, m := range members {
		// Skip non-SACCO members
		if m.MembershipType == "both" || m.MembershipType == "sacco_only" || m.MembershipType == "" {
			var count int64
			config.DB.Model(&models.ShareCapital{}).
				Where("user_id = ? AND group_id = ?", m.ID, gid).Count(&count)
			if count == 0 {
				deadline := m.CreatedAt.AddDate(0, 3, 0)
				// If deadline already passed use today + 3 months
				if deadline.Before(time.Now()) {
					deadline = time.Now().AddDate(0, 3, 0)
				}
				record := models.ShareCapital{
					UserID:              m.ID,
					GroupID:             gid,
					Shares:              1,
					SharePrice:          sharePrice,
					Amount:              sharePrice,
					AmountPaid:          0,
					PaymentStatus:       "pending",
					InstallmentDeadline: deadline,
					Type:                "purchase",
					Notes:               "Default share — auto-assigned",
				}
				if config.DB.Create(&record).Error == nil {
					assigned++
				}
			} else {
				skipped++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("Assigned default shares to %d members", assigned),
		"assigned": assigned,
		"skipped":  skipped,
		"share_price": sharePrice,
	})
}