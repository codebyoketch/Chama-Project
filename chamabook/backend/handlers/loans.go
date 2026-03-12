package handlers

import (
	"net/http"
	"time"

	"chamabook/config"
	"chamabook/models"

	"github.com/gin-gonic/gin"
)

type LoanInput struct {
	UserID       uint    `json:"user_id" binding:"required"`
	Amount       float64 `json:"amount" binding:"required"`
	InterestRate float64 `json:"interest_rate"`
	InterestType string  `json:"interest_type"` // flat | reducing
	DueMonths    int     `json:"due_months"`    // repayment period in months
	ClientTempID string  `json:"client_temp_id"`
}

type RepaymentInput struct {
	LoanID       uint    `json:"loan_id" binding:"required"`
	Amount       float64 `json:"amount" binding:"required"`
	Notes        string  `json:"notes"`
	ClientTempID string  `json:"client_temp_id"`
}

// GetLoans returns all loans for the group
func GetLoans(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	status := c.Query("status") // optional: active | completed | defaulted

	query := config.DB.Where("group_id = ?", groupID).Preload("User").Preload("Repayments")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var loans []models.Loan
	query.Order("created_at DESC").Find(&loans)

	c.JSON(http.StatusOK, gin.H{"loans": loans})
}

// IssueLoan creates a new loan for a member
func IssueLoan(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	approverID, _ := c.Get("userID")

	var input LoanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default values
	if input.InterestRate == 0 {
		input.InterestRate = 10
	}
	if input.InterestType == "" {
		input.InterestType = "flat"
	}
	if input.DueMonths == 0 {
		input.DueMonths = 3
	}

	// Calculate total due based on interest type
	var totalDue float64
	if input.InterestType == "flat" {
		interest := (input.Amount * input.InterestRate / 100) * float64(input.DueMonths)
		totalDue = input.Amount + interest
	} else {
		// Reducing balance — simplified calculation
		totalDue = input.Amount * (1 + (input.InterestRate/100)*float64(input.DueMonths))
	}

	loan := models.Loan{
		UserID:       input.UserID,
		GroupID:      groupID.(uint),
		Amount:       input.Amount,
		InterestRate: input.InterestRate,
		InterestType: input.InterestType,
		TotalDue:     totalDue,
		TotalPaid:    0,
		Balance:      totalDue,
		IssuedAt:     time.Now(),
		DueAt:        time.Now().AddDate(0, input.DueMonths, 0),
		Status:       "active",
		ApprovedBy:   approverID.(uint),
		ClientTempID: input.ClientTempID,
	}

	if err := config.DB.Create(&loan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not issue loan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Loan issued", "loan": loan})
}

// RecordRepayment records a loan repayment
func RecordRepayment(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input RepaymentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch the loan
	var loan models.Loan
	if err := config.DB.First(&loan, input.LoanID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Loan not found"})
		return
	}

	repayment := models.Repayment{
		LoanID:       input.LoanID,
		UserID:       userID.(uint),
		Amount:       input.Amount,
		PaidAt:       time.Now(),
		Notes:        input.Notes,
		ClientTempID: input.ClientTempID,
	}

	config.DB.Create(&repayment)

	// Update loan balance
	newPaid := loan.TotalPaid + input.Amount
	newBalance := loan.TotalDue - newPaid
	status := "active"
	if newBalance <= 0 {
		status = "completed"
		newBalance = 0
	}

	config.DB.Model(&loan).Updates(map[string]interface{}{
		"total_paid": newPaid,
		"balance":    newBalance,
		"status":     status,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":    "Repayment recorded",
		"repayment":  repayment,
		"loan_balance": newBalance,
		"status":     status,
	})
}
