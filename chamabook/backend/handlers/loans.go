package handlers

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
)

type LoanInput struct {
	UserID         uint    `json:"user_id"`
	BranchID       uint    `json:"branch_id"`
	Amount         float64 `json:"amount"`
	InterestRate   float64 `json:"interest_rate"`
	InterestType   string  `json:"interest_type"`
	InterestPeriod string  `json:"interest_period"`
	TermMonths     int     `json:"term_months"`
	ClientTempID   string  `json:"client_temp_id"`
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

func calculateMonthlyPayment(amount, interestRate float64, termMonths int, interestType, interestPeriod string) (totalDue, monthlyPayment float64) {
	if termMonths <= 0 { termMonths = 12 }
	if interestRate <= 0 { interestRate = 10 }

	effectiveMonthlyRate := interestRate
	if interestPeriod == "annual" {
		effectiveMonthlyRate = interestRate / 12
	}

	if interestType == "reducing" {
		r := effectiveMonthlyRate / 100
		if r == 0 {
			monthlyPayment = amount / float64(termMonths)
			totalDue = amount
		} else {
			monthlyPayment = amount * r * math.Pow(1+r, float64(termMonths)) /
				(math.Pow(1+r, float64(termMonths)) - 1)
			totalDue = monthlyPayment * float64(termMonths)
		}
	} else {
		totalInterest := amount * (effectiveMonthlyRate / 100) * float64(termMonths)
		totalDue = amount + totalInterest
		monthlyPayment = totalDue / float64(termMonths)
	}
	return round2(totalDue), round2(monthlyPayment)
}

func generateSchedule(loan models.Loan, repayments []models.Repayment) []models.LoanScheduleEntry {
	schedule := []models.LoanScheduleEntry{}

	monthlyRate := loan.InterestRate / 100
	if loan.InterestPeriod == "annual" {
		monthlyRate = (loan.InterestRate / 100) / 12
	}

	now := time.Now()
	totalRepaid := 0.0
	for _, r := range repayments { totalRepaid += r.Amount }

	paid := make([]float64, loan.TermMonths+1)
	remaining := totalRepaid
	for i := 0; i < loan.TermMonths && remaining > 0; i++ {
		if remaining >= loan.MonthlyPayment {
			paid[i] = loan.MonthlyPayment
			remaining -= loan.MonthlyPayment
		} else {
			paid[i] = remaining
			remaining = 0
		}
	}

	balance := loan.Amount

	for i := 0; i < loan.TermMonths; i++ {
		dueDate := loan.IssuedAt.AddDate(0, i+1, 0)
		openingBalance := balance

		var interest, principal, payment float64

		if loan.InterestType == "reducing" {
			interest = round2(openingBalance * monthlyRate)
			payment = round2(loan.MonthlyPayment)
			if i == loan.TermMonths-1 {
				payment = round2(openingBalance + interest)
			}
			principal = round2(payment - interest)
			if principal > openingBalance {
				principal = round2(openingBalance)
				payment = round2(principal + interest)
			}
			balance = round2(math.Max(openingBalance-principal, 0))
		} else {
			totalInterest := loan.Amount * monthlyRate * float64(loan.TermMonths)
			interest = round2(totalInterest / float64(loan.TermMonths))
			payment = round2(loan.MonthlyPayment)
			principal = round2(payment - interest)
			balance = round2(math.Max(openingBalance-principal, 0))
		}

		amountPaid := paid[i]
		var status string
		if amountPaid >= payment {
			status = "paid"
		} else if dueDate.Before(now) {
			if amountPaid > 0 { status = "partial" } else { status = "missed" }
		} else {
			status = "upcoming"
		}

		schedule = append(schedule, models.LoanScheduleEntry{
			Month:          i + 1,
			DueDate:        dueDate,
			OpeningBalance: openingBalance,
			Principal:      principal,
			Interest:       interest,
			Payment:        payment,
			ClosingBalance: balance,
			Status:         status,
			AmountPaid:     amountPaid,
		})
	}
	return schedule
}

func canApproveLoan(role string) bool {
	return role == "secretary" || role == "chairperson" ||
		role == "vice_chairperson" || role == "admin"
}

func GetLoans(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	branchID := c.Query("branch_id")
	status := c.Query("status")

	query := config.DB.Where("group_id = ?", groupID).
		Preload("User").Preload("Repayments").Preload("Approvals")
	if branchID != "" { query = query.Where("branch_id = ?", branchID) }
	if status != "" { query = query.Where("status = ?", status) }

	var loans []models.Loan
	query.Order("created_at DESC").Find(&loans)

	for i, loan := range loans {
		loans[i].InitiatedByName = populateRecorderName(loan.InitiatedBy)
		loans[i].ApprovedByName = populateRecorderName(loan.ApprovedBy)
		loans[i].BranchName = populateBranchName(loan.BranchID)
		loans[i].ApprovalCount = len(loan.Approvals)
		for j, a := range loans[i].Approvals {
			loans[i].Approvals[j].ApproverName = populateRecorderName(a.ApproverID)
		}
	}

	var saccoTotal, tbTotal float64
	var saccoBalance, tbBalance float64
	var saccoRepaid, tbRepaid float64
	var saccoCount, tbCount int

	for _, loan := range loans {
		if loan.Status == "active" {
			var branch models.Branch
			config.DB.Select("type").First(&branch, loan.BranchID)
			if branch.Type == "sacco" {
				saccoTotal += loan.Amount
				saccoBalance += loan.Balance
				saccoRepaid += loan.TotalPaid
				saccoCount++
			} else if branch.Type == "table_banking" {
				tbTotal += loan.Amount
				tbBalance += loan.Balance
				tbRepaid += loan.TotalPaid
				tbCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"loans": loans,
		"summary": gin.H{
			"sacco": gin.H{
				"total_loaned":  saccoTotal,
				"total_balance": saccoBalance,
				"total_repaid":  saccoRepaid,
				"count":         saccoCount,
			},
			"table_banking": gin.H{
				"total_loaned":  tbTotal,
				"total_balance": tbBalance,
				"total_repaid":  tbRepaid,
				"count":         tbCount,
			},
			"total_loaned":  saccoTotal + tbTotal,
			"total_balance": saccoBalance + tbBalance,
			"total_repaid":  saccoRepaid + tbRepaid,
		},
	})
}

func GetLoanSchedule(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	loanID := c.Param("id")
	var loan models.Loan
	if err := config.DB.Where("id = ? AND group_id = ?", loanID, groupID).
		Preload("Repayments").Preload("User").Preload("Approvals").First(&loan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loan not found"})
		return
	}
	for j, a := range loan.Approvals {
		loan.Approvals[j].ApproverName = populateRecorderName(a.ApproverID)
	}
	schedule := generateSchedule(loan, loan.Repayments)
	loan.BranchName = populateBranchName(loan.BranchID)
	loan.InitiatedByName = populateRecorderName(loan.InitiatedBy)
	loan.ApprovedByName = populateRecorderName(loan.ApprovedBy)
	c.JSON(http.StatusOK, gin.H{"loan": loan, "schedule": schedule})
}

func IssueLoan(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	initiatorID, _ := c.Get("userID")
	gid := groupID.(uint)
	iid := initiatorID.(uint)

	var initiator models.User
	config.DB.Select("role, name").First(&initiator, iid)

	var input LoanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.UserID == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Member is required"}); return }
	if input.Amount <= 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be > 0"}); return }

	var member models.User
	if err := config.DB.Where("id = ? AND group_id = ?", input.UserID, gid).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	var approver models.User
	config.DB.Select("role").First(&approver, iid)
	canOverride := approver.Role == "admin" || approver.Role == "chairperson"

	membershipDuration := time.Since(member.CreatedAt)
	threeMonths := 90 * 24 * time.Hour
	notOldEnough := membershipDuration < threeMonths
	daysAsMember := int(membershipDuration.Hours() / 24)

	type ShareSum struct{ TotalShares int }
	var bought, withdrawn ShareSum
	config.DB.Model(&models.ShareCapital{}).
		Select("COALESCE(SUM(shares), 0) as total_shares").
		Where("user_id = ? AND group_id = ?", input.UserID, gid).Scan(&bought)
	config.DB.Model(&models.ShareCapitalWithdrawal{}).
		Select("COALESCE(SUM(shares), 0) as total_shares").
		Where("user_id = ? AND group_id = ?", input.UserID, gid).Scan(&withdrawn)
	netShares := bought.TotalShares - withdrawn.TotalShares

	warnings := []string{}
	if notOldEnough {
		daysLeft := int((threeMonths - membershipDuration).Hours() / 24)
		warnings = append(warnings, fmt.Sprintf(
			"Member has only been active for %d days (minimum 90, %d days remaining, eligible from %s)",
			daysAsMember, daysLeft, member.CreatedAt.Add(threeMonths).Format("2 January 2006"),
		))
	}
	if netShares <= 0 {
		warnings = append(warnings, "Member owns no shares")
	}
	if len(warnings) > 0 && !canOverride {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "Member does not meet loan eligibility requirements",
			"warnings":       warnings,
			"eligible":       false,
			"can_override":   false,
			"days_as_member": daysAsMember,
			"net_shares":     netShares,
			"eligible_on":    member.CreatedAt.Add(threeMonths).Format("2 January 2006"),
		})
		return
	}

	if input.InterestType == "" { input.InterestType = "flat" }
	if input.TermMonths == 0 { input.TermMonths = 12 }
	if input.InterestRate == 0 { input.InterestRate = 10 }
	if input.InterestPeriod == "" { input.InterestPeriod = "monthly" }

	totalDue, monthlyPayment := calculateMonthlyPayment(
		input.Amount, input.InterestRate, input.TermMonths,
		input.InterestType, input.InterestPeriod,
	)

	loan := models.Loan{
		UserID:         input.UserID,
		GroupID:        gid,
		BranchID:       input.BranchID,
		Amount:         input.Amount,
		InterestRate:   input.InterestRate,
		InterestType:   input.InterestType,
		InterestPeriod: input.InterestPeriod,
		TermMonths:     input.TermMonths,
		MonthlyPayment: monthlyPayment,
		TotalDue:       totalDue,
		TotalPaid:      0,
		Balance:        totalDue,
		IssuedAt:       time.Now(),
		DueAt:          time.Now().AddDate(0, input.TermMonths, 0),
		Status:         "pending",
		InitiatedBy:    iid,
		ClientTempID:   input.ClientTempID,
	}
	if err := config.DB.Create(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate loan"})
		return
	}
	config.DB.Preload("User").Preload("Approvals").First(&loan, loan.ID)
	loan.InitiatedByName = populateRecorderName(iid)
	loan.BranchName = populateBranchName(input.BranchID)

	c.JSON(http.StatusCreated, gin.H{
		"loan":    loan,
		"message": fmt.Sprintf("Loan initiated by %s. Awaiting 2 approvals.", initiator.Name),
	})
}

func ApproveLoan(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	approverID, _ := c.Get("userID")
	loanID := c.Param("id")
	gid := groupID.(uint)
	aid := approverID.(uint)

	var input struct {
		Action string `json:"action"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Action != "approved" && input.Action != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Action must be 'approved' or 'rejected'"})
		return
	}

	var approver models.User
	config.DB.Select("role, name").First(&approver, aid)
	if !canApproveLoan(approver.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your role cannot approve loans"})
		return
	}

	var loan models.Loan
	if err := config.DB.Where("id = ? AND group_id = ?", loanID, gid).
		Preload("Approvals").Preload("User").First(&loan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loan not found"})
		return
	}

	if loan.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Loan is already %s", loan.Status)})
		return
	}

	for _, a := range loan.Approvals {
		if a.ApproverID == aid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You have already actioned this loan"})
			return
		}
	}

	if loan.InitiatedBy == aid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot approve a loan you initiated"})
		return
	}

	approval := models.LoanApproval{
		LoanID:       loan.ID,
		ApproverID:   aid,
		ApproverRole: approver.Role,
		Action:       input.Action,
		Notes:        input.Notes,
	}
	config.DB.Create(&approval)
	config.DB.Preload("Approvals").First(&loan, loan.ID)

	if input.Action == "rejected" {
		config.DB.Model(&loan).Update("status", "rejected")
		loan.Status = "rejected"
		go SendPushToUser(loan.UserID, "❌ Loan Application Rejected",
			fmt.Sprintf("Your loan of KES %.0f was rejected by %s", loan.Amount, approver.Name), "/portal")
	} else {
		approvedCount := 0
		for _, a := range loan.Approvals {
			if a.Action == "approved" { approvedCount++ }
		}
		if approvedCount >= 2 {
			config.DB.Model(&loan).Updates(map[string]interface{}{
				"status": "active", "approved_by": aid,
			})
			loan.Status = "active"
			go SendPushToUser(loan.UserID, "✅ Loan Approved!",
				fmt.Sprintf("Your loan of KES %.0f has been approved. Monthly payment: KES %.0f",
					loan.Amount, loan.MonthlyPayment), "/portal")
		}
	}

	config.DB.Preload("User").Preload("Approvals").First(&loan, loan.ID)
	loan.InitiatedByName = populateRecorderName(loan.InitiatedBy)
	loan.BranchName = populateBranchName(loan.BranchID)
	for j, a := range loan.Approvals {
		loan.Approvals[j].ApproverName = populateRecorderName(a.ApproverID)
	}

	approvedCount := 0
	for _, a := range loan.Approvals {
		if a.Action == "approved" { approvedCount++ }
	}

	msg := fmt.Sprintf("Loan %s by %s (%d/2 approvals)", input.Action, approver.Name, approvedCount)
	if loan.Status == "active" { msg = "Loan fully approved and activated!" }
	if loan.Status == "rejected" { msg = "Loan rejected." }

	c.JSON(http.StatusOK, gin.H{
		"loan": loan, "message": msg, "approval_count": approvedCount,
	})
}

type RepaymentInput struct {
	LoanID       uint    `json:"loan_id"`
	Amount       float64 `json:"amount"`
	Notes        string  `json:"notes"`
	ClientTempID string  `json:"client_temp_id"`
}

func RecordRepayment(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")

	var input RepaymentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.LoanID == 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Loan ID is required"}); return }
	if input.Amount <= 0 { c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be > 0"}); return }

	var loan models.Loan
	if err := config.DB.Where("id = ? AND group_id = ?", input.LoanID, groupID).First(&loan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loan not found"})
		return
	}
	if loan.Status == "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot record payment on a pending loan — approve it first"})
		return
	}

	rid := recorderID.(uint)
	repayment := models.Repayment{
		LoanID:       input.LoanID,
		UserID:       loan.UserID,
		Amount:       input.Amount,
		PaidAt:       time.Now(),
		Notes:        input.Notes,
		RecordedBy:   rid,
		ClientTempID: input.ClientTempID,
	}
	if err := config.DB.Create(&repayment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record repayment"})
		return
	}

	newTotalPaid := round2(loan.TotalPaid + input.Amount)
	newBalance := round2(loan.TotalDue - newTotalPaid)
	status := loan.Status
	if newBalance <= 0 { status = "cleared"; newBalance = 0 }
	config.DB.Model(&loan).Updates(map[string]interface{}{
		"total_paid": newTotalPaid, "balance": newBalance, "status": status,
	})

	config.DB.Preload("Repayments").Preload("User").Preload("Approvals").First(&loan, loan.ID)
	loan.InitiatedByName = populateRecorderName(loan.InitiatedBy)
	loan.ApprovedByName = populateRecorderName(loan.ApprovedBy)
	schedule := generateSchedule(loan, loan.Repayments)
	repayment.RecordedByName = populateRecorderName(rid)

	go SendPushToUser(loan.UserID, "💰 Loan Payment Recorded",
		fmt.Sprintf("KES %.0f payment recorded. Balance: KES %.0f", input.Amount, newBalance), "/portal")

	c.JSON(http.StatusCreated, gin.H{
		"repayment": repayment, "loan": loan,
		"schedule": schedule, "message": "Repayment recorded",
	})
}
