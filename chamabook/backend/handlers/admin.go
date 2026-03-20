package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ── Whitelisted fields per model ─────────────────────────────────────────────
// Only real DB columns — never nested objects or gorm:"-" virtual fields
var allowedFields = map[string]map[string]bool{
	"members": {
		"name": true, "phone": true, "id_number": true, "email": true,
		"role": true, "is_active": true, "membership_type": true, "account_number": true,
	},
	"contributions": {
		"amount": true, "fines_deducted": true, "net_amount": true,
		"period": true, "notes": true, "branch_id": true,
	},
	"loans": {
		"amount": true, "interest_rate": true, "interest_type": true,
		"term_months": true, "monthly_payment": true, "total_due": true,
		"total_paid": true, "balance": true, "status": true, "notes": true,
	},
	"fines": {
		"amount": true, "reason": true, "period": true,
		"type": true, "status": true, "notes": true,
	},
}

func AdminGetAll(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)

	var members []models.User
	config.DB.Where("group_id = ?", gid).Find(&members)

	var contributions []models.Contribution
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Find(&contributions)
	for i, cont := range contributions {
		contributions[i].RecordedByName = populateRecorderName(cont.RecordedBy)
		contributions[i].BranchName = populateBranchName(cont.BranchID)
	}

	var loans []models.Loan
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Find(&loans)
	for i, loan := range loans {
		loans[i].ApprovedByName = populateRecorderName(loan.ApprovedBy)
		loans[i].BranchName = populateBranchName(loan.BranchID)
	}

	var fines []models.Fine
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Find(&fines)
	for i, f := range fines {
		fines[i].IssuedByName = populateRecorderName(f.IssuedBy)
	}

	var welfare []models.WelfareContribution
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Find(&welfare)

	var disbursements []models.WelfareDisbursement
	config.DB.Where("group_id = ?", gid).Preload("User").Order("created_at DESC").Find(&disbursements)

	var meetings []models.Meeting
	config.DB.Where("group_id = ?", gid).Preload("Attendance").Preload("Attendance.User").Order("scheduled_at DESC").Find(&meetings)

	c.JSON(http.StatusOK, gin.H{
		"members":       members,
		"contributions": contributions,
		"loans":         loans,
		"fines":         fines,
		"welfare":       welfare,
		"disbursements": disbursements,
		"meetings":      meetings,
	})
}

func adminUpdate(c *gin.Context, modelType string) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)
	id := c.Param("id")

	var rawInput map[string]interface{}
	if err := c.ShouldBindJSON(&rawInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build a clean update map — only whitelisted real DB columns
	allowed := allowedFields[modelType]
	clean := map[string]interface{}{}
	for k, v := range rawInput {
		key := strings.ToLower(k)
		if allowed[key] {
			clean[key] = v
		}
	}

	if len(clean) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}

	// Use raw SQL update to avoid GORM trying to touch virtual fields
	table := map[string]string{
		"members": "users", "contributions": "contributions",
		"loans": "loans", "fines": "fines",
	}[modelType]

	if table == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown model"})
		return
	}

	// Build SET clause
	setClauses := []string{"updated_at = ?"}
	args := []interface{}{time.Now()}
	for k, v := range clean {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", k))
		args = append(args, v)
	}
	args = append(args, id, gid)

	sql := fmt.Sprintf(
		`UPDATE %s SET %s WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
		table, strings.Join(setClauses, ", "),
	)

	result := config.DB.Exec(sql, args...)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update: " + result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Updated successfully"})
}

func adminDelete(c *gin.Context, model interface{}) {
	groupID, _ := c.Get("groupID")
	id := c.Param("id")
	if err := config.DB.Where("id = ? AND group_id = ?", id, groupID).First(model).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	config.DB.Delete(model)
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func AdminEditMember(c *gin.Context)         { adminUpdate(c, "members") }
func AdminDeleteMember(c *gin.Context)       { adminDelete(c, &models.User{}) }
func AdminEditContribution(c *gin.Context)   { adminUpdate(c, "contributions") }
func AdminDeleteContribution(c *gin.Context) { adminDelete(c, &models.Contribution{}) }
func AdminEditLoan(c *gin.Context)           { adminUpdate(c, "loans") }
func AdminDeleteLoan(c *gin.Context)         { adminDelete(c, &models.Loan{}) }
func AdminEditFine(c *gin.Context)           { adminUpdate(c, "fines") }
func AdminDeleteFine(c *gin.Context)         { adminDelete(c, &models.Fine{}) }

// ── Bulk Import ───────────────────────────────────────────────────────────────

type ImportRow struct {
	Name             string  `json:"name"`
	Phone            string  `json:"phone"`
	IDNumber         string  `json:"id_number"`
	Email            string  `json:"email"`
	Role             string  `json:"role"`
	MembershipType   string  `json:"membership_type"`
	Password         string  `json:"password"`
	ContribBalance   float64 `json:"contrib_balance"`
	ContribPeriod    string  `json:"contrib_period"`
	LoanBalance      float64 `json:"loan_balance"`
	LoanInterestRate float64 `json:"loan_interest_rate"`
	LoanTermMonths   int     `json:"loan_term_months"`
	WelfareBalance   float64 `json:"welfare_balance"`
	ShareCapital     float64 `json:"share_capital"`
	SharePrice       float64 `json:"share_price"`
	Shares           int     `json:"shares"`
}

type ImportResult struct {
	Row     int    `json:"row"`
	Name    string `json:"name"`
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

func BulkImportMembers(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	recorderID, _ := c.Get("userID")
	gid := groupID.(uint)
	rid := recorderID.(uint)

	var rows []ImportRow
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}
	if err := json.Unmarshal(body, &rows); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	results := []ImportResult{}
	imported := 0
	skipped := 0

	for i, row := range rows {
		rowNum := i + 2 // row 1 is header in Excel

		if strings.TrimSpace(row.Name) == "" || strings.TrimSpace(row.Phone) == "" {
			results = append(results, ImportResult{Row: rowNum, Name: row.Name, Status: "skipped", Message: "Name and phone are required"})
			skipped++
			continue
		}

		// Check duplicate phone in this group
		var existing models.User
		if config.DB.Where("phone = ? AND group_id = ?", row.Phone, gid).First(&existing).Error == nil {
			results = append(results, ImportResult{Row: rowNum, Name: row.Name, Status: "skipped", Message: "Phone already exists: " + row.Phone})
			skipped++
			continue
		}

		// Default password
		pwd := row.Password
		if pwd == "" {
			pwd = row.Phone // default password = phone number
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)

		role := row.Role
		if role == "" {
			role = "member"
		}
		membershipType := row.MembershipType
		if membershipType == "" {
			membershipType = "both"
		}

		// Generate account number
		var count int64
		config.DB.Model(&models.User{}).Where("group_id = ?", gid).Count(&count)
		year := time.Now().Year() % 100
		var grp models.Group
		config.DB.First(&grp, gid)
		prefix := "KT"
		if len(grp.Name) >= 2 {
			prefix = strings.ToUpper(grp.Name[:2])
		}
		accountNumber := fmt.Sprintf("%s%02d%04d", prefix, year, count+1)

		user := models.User{
			GroupID:        gid,
			Name:           strings.TrimSpace(row.Name),
			Phone:          strings.TrimSpace(row.Phone),
			IDNumber:       row.IDNumber,
			Email:          row.Email,
			Role:           role,
			MembershipType: membershipType,
			PasswordHash:   string(hash),
			AccountNumber:  accountNumber,
			IsActive:       true,
		}

		if err := config.DB.Create(&user).Error; err != nil {
			results = append(results, ImportResult{Row: rowNum, Name: row.Name, Status: "error", Message: err.Error()})
			skipped++
			continue
		}

		// Opening contribution balance
		if row.ContribBalance > 0 {
			period := row.ContribPeriod
			if period == "" {
				period = time.Now().Format("2006-01")
			}
			config.DB.Create(&models.Contribution{
				UserID:     user.ID,
				GroupID:    gid,
				Amount:     row.ContribBalance,
				NetAmount:  row.ContribBalance,
				Period:     period,
				PaidAt:     time.Now(),
				Notes:      "Opening balance (imported)",
				RecordedBy: rid,
			})
		}

		// Opening loan balance
		if row.LoanBalance > 0 {
			rate := row.LoanInterestRate
			if rate == 0 {
				rate = 10
			}
			termMonths := row.LoanTermMonths
			if termMonths == 0 {
				termMonths = 12
			}
			monthly := row.LoanBalance / float64(termMonths)
			config.DB.Create(&models.Loan{
				UserID:         user.ID,
				GroupID:        gid,
				Amount:         row.LoanBalance,
				InterestRate:   rate,
				InterestType:   "flat",
				TermMonths:     termMonths,
				MonthlyPayment: monthly,
				TotalDue:       row.LoanBalance,
				Balance:        row.LoanBalance,
				IssuedAt:       time.Now(),
				DueAt:          time.Now().AddDate(0, termMonths, 0),
				Status:         "active",
				ApprovedBy:     rid,
			})
		}

		// Welfare opening balance
		if row.WelfareBalance > 0 {
			config.DB.Create(&models.WelfareContribution{
				UserID:     user.ID,
				GroupID:    gid,
				Amount:     row.WelfareBalance,
				Period:     time.Now().Format("2006-01"),
				PaidAt:     time.Now(),
				Notes:      "Opening balance (imported)",
				RecordedBy: rid,
			})
		}

		// Share capital opening balance
		if row.ShareCapital > 0 {
			shares := row.Shares
			sharePrice := row.SharePrice
			if shares == 0 && sharePrice > 0 {
				shares = int(row.ShareCapital / sharePrice)
			}
			if sharePrice == 0 && shares > 0 {
				sharePrice = row.ShareCapital / float64(shares)
			}
			if shares == 0 {
				shares = 1
				sharePrice = row.ShareCapital
			}
			config.DB.Create(&models.ShareCapital{
				UserID:     user.ID,
				GroupID:    gid,
				Shares:     shares,
				SharePrice: sharePrice,
				Amount:     row.ShareCapital,
				Type:       "purchase",
				PaidAt:     time.Now(),
				Notes:      "Opening balance (imported)",
				RecordedBy: rid,
			})
		}

		results = append(results, ImportResult{
			Row:    rowNum,
			Name:   row.Name,
			Status: "imported",
			Message: fmt.Sprintf("Account: %s · Default password: %s", accountNumber, pwd),
		})
		imported++
	}

	// Count by status
	errors := 0
	for _, r := range results {
		if r.Status == "error" {
			errors++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
		"total":    len(rows),
		"results":  results,
	})
}

// Helper to safely parse float from string
func parseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}