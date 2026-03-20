package handlers

import (
<<<<<<< HEAD
	"net/http"

	"chamabook/config"
	"chamabook/models"

=======
	"fmt"
	"net/http"
	"chamabook/config"
	"chamabook/models"
>>>>>>> master
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

<<<<<<< HEAD
type AddMemberInput struct {
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Role     string `json:"role"`
	Password string `json:"password" binding:"required,min=6"`
}

// GetMembers returns all members in the group
func GetMembers(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var members []models.User
	config.DB.Where("group_id = ? AND is_active = true", groupID).Find(&members)

	c.JSON(http.StatusOK, gin.H{"members": members, "count": len(members)})
}

// AddMember adds a new member to the group (admin/treasurer only)
func AddMember(c *gin.Context) {
	groupID, _ := c.Get("groupID")

	var input AddMemberInput
=======
var ValidRoles = map[string]bool{
	"admin":             true,
	"chairperson":       true,
	"vice_chairperson":  true, // 👈 new
	"treasurer":         true,
	"secretary":         true,
	"member":            true,
}

type MemberInput struct {
	Name           string `json:"name"`
	Phone          string `json:"phone"`
	IDNumber       string `json:"id_number"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	Password       string `json:"password"`
	MembershipType string `json:"membership_type"`
}

func GetMembers(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	var members []models.User
	config.DB.Where("group_id = ? AND is_active = true", groupID).Find(&members)
	c.JSON(http.StatusOK, gin.H{"members": members})
}

func GetBranches(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	var branches []models.Branch
	config.DB.Where("group_id = ?", groupID).Find(&branches)
	c.JSON(http.StatusOK, gin.H{"branches": branches})
}

func AddMember(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	var input MemberInput
>>>>>>> master
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
<<<<<<< HEAD

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not process password"})
		return
	}

	role := input.Role
	if role == "" {
		role = "member"
	}

	member := models.User{
		GroupID:      groupID.(uint),
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         role,
	}

	if err := config.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not add member. Email may already exist."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Member added", "member": member})
}

// GetMemberSummary returns a member's contribution and loan summary
func GetMemberSummary(c *gin.Context) {
	memberID := c.Param("id")
	groupID, _ := c.Get("groupID")

	var member models.User
=======
	if input.Name == "" || input.Phone == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, phone and password are required"})
		return
	}
	role := input.Role
	if role == "" || !ValidRoles[role] { role = "member" }

	// Admin role cannot be assigned through this endpoint — must be done via admin portal
	if role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin role cannot be assigned when adding a member. Use the Admin Portal to promote a member to admin."})
		return
	}

	membershipType := input.MembershipType
	if membershipType != "sacco_only" && membershipType != "both" {
		membershipType = "both"
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	gid := groupID.(uint)
	accountNumber := generateAccountNumber(gid)

	member := models.User{
		GroupID:        gid,
		Name:           input.Name,
		Phone:          input.Phone,
		IDNumber:       input.IDNumber,
		Email:          input.Email,
		AccountNumber:  accountNumber,
		PasswordHash:   string(hash),
		Role:           role,
		MembershipType: membershipType,
		IsActive:       true,
	}
	if err := config.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create member. Phone or ID may already exist."})
		return
	}

	// Auto-assign default share for SACCO members
	AssignDefaultShare(member.ID, gid)

	c.JSON(http.StatusCreated, gin.H{"member": member, "message": "Member added"})
}

func UpdateMemberRole(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	requesterID, _ := c.Get("userID")
	memberID := c.Param("id")

	var input struct{ Role string `json:"role"` }
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !ValidRoles[input.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	// Prevent admin from changing their own role
	if fmt.Sprintf("%d", requesterID.(uint)) == memberID && input.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot change your own admin role"})
		return
	}

	var member models.User
	// Strictly enforce group scope — admin can only manage their own group
	if err := config.DB.Where("id = ? AND group_id = ?", memberID, groupID).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found in your group"})
		return
	}

	config.DB.Model(&member).Update("role", input.Role)
	c.JSON(http.StatusOK, gin.H{"message": "Role updated", "role": input.Role})
}

func ResetMemberPassword(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	memberID := c.Param("id")

	var input struct{ Password string `json:"password"` }
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(input.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
		return
	}

	var member models.User
	// Strictly enforce group scope
	if err := config.DB.Where("id = ? AND group_id = ?", memberID, groupID).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found in your group"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	config.DB.Model(&member).Update("password_hash", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func GetMemberSummary(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	memberID := c.Param("id")
	role, _ := c.Get("role")
	userID, _ := c.Get("userID")

	// Members can only view their own summary
	if role.(string) == "member" && fmt.Sprintf("%d", userID.(uint)) != memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only view your own data"})
		return
	}

	var member models.User
	// Always scope to group — prevents cross-group data access
>>>>>>> master
	if err := config.DB.Where("id = ? AND group_id = ?", memberID, groupID).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

<<<<<<< HEAD
	// Total contributions
	var totalContributions float64
	config.DB.Model(&models.Contribution{}).
		Where("user_id = ? AND group_id = ?", memberID, groupID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalContributions)

	// Active loans
	var activeLoans []models.Loan
	config.DB.Where("user_id = ? AND group_id = ? AND status = 'active'", memberID, groupID).
		Find(&activeLoans)

	c.JSON(http.StatusOK, gin.H{
		"member":               member,
		"total_contributions":  totalContributions,
		"active_loans":         activeLoans,
	})
}

// DeactivateMember soft-deletes a member
func DeactivateMember(c *gin.Context) {
	memberID := c.Param("id")
	groupID, _ := c.Get("groupID")

	result := config.DB.Model(&models.User{}).
		Where("id = ? AND group_id = ?", memberID, groupID).
		Update("is_active", false)

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member deactivated"})
}
=======
	var contributions []models.Contribution
	config.DB.Where("user_id = ? AND group_id = ?", memberID, groupID).Order("created_at DESC").Find(&contributions)
	for i, cont := range contributions {
		contributions[i].BranchName = populateBranchName(cont.BranchID)
		contributions[i].RecordedByName = populateRecorderName(cont.RecordedBy)
	}

	var loans []models.Loan
	config.DB.Where("user_id = ? AND group_id = ?", memberID, groupID).
		Preload("Repayments").Preload("Approvals").Find(&loans)
	for i, loan := range loans {
		loans[i].BranchName = populateBranchName(loan.BranchID)
		loans[i].InitiatedByName = populateRecorderName(loan.InitiatedBy)
		loans[i].ApprovedByName = populateRecorderName(loan.ApprovedBy)
		for j, a := range loans[i].Approvals {
			loans[i].Approvals[j].ApproverName = populateRecorderName(a.ApproverID)
		}
	}

	var fines []models.Fine
	config.DB.Where("user_id = ? AND group_id = ?", memberID, groupID).Order("created_at DESC").Find(&fines)

	var welfare []models.WelfareContribution
	config.DB.Where("user_id = ? AND group_id = ?", memberID, groupID).Find(&welfare)

	var attendance []models.MeetingAttendance
	config.DB.Where("user_id = ? AND group_id = ?", memberID, groupID).Find(&attendance)

	// Enrich attendance with meeting details
	attendanceWithMeetings := []map[string]interface{}{}
	for _, a := range attendance {
		var meeting models.Meeting
		config.DB.Where("id = ? AND group_id = ?", a.MeetingID, groupID).First(&meeting)
		attendanceWithMeetings = append(attendanceWithMeetings, map[string]interface{}{
			"ID":          a.ID,
			"meeting_id":  a.MeetingID,
			"status":      a.Status,
			"fine_amount": a.FineAmount,
			"notes":       a.Notes,
			"meeting":     meeting,
		})
	}

	// All group meetings for member to see upcoming
	var allMeetings []models.Meeting
	config.DB.Where("group_id = ?", groupID).
		Preload("Attendance").
		Order("scheduled_at DESC").Find(&allMeetings)

	var totalContributions, totalLoanBalance, totalFines, totalWelfare float64
	for _, c := range contributions { totalContributions += c.Amount }
	for _, l := range loans { totalLoanBalance += l.Balance }
	for _, f := range fines { if f.Status == "unpaid" { totalFines += f.Amount } }
	for _, w := range welfare { totalWelfare += w.Amount }

	c.JSON(http.StatusOK, gin.H{
		"member":              member,
		"contributions":       contributions,
		"loans":               loans,
		"fines":               fines,
		"welfare":             welfare,
		"attendance":          attendanceWithMeetings,
		"meetings":            allMeetings,
		"total_contributions": totalContributions,
		"total_loan_balance":  totalLoanBalance,
		"total_fines":         totalFines,
		"total_welfare":       totalWelfare,
	})
}

func DeactivateMember(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	requesterID, _ := c.Get("userID")
	memberID := c.Param("id")

	// Prevent self-deactivation
	if fmt.Sprintf("%d", requesterID.(uint)) == memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot deactivate your own account"})
		return
	}

	var member models.User
	// Strictly enforce group scope
	if err := config.DB.Where("id = ? AND group_id = ?", memberID, groupID).First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found in your group"})
		return
	}

	// Prevent deactivating another admin
	if member.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot deactivate an admin account"})
		return
	}

	config.DB.Model(&member).Update("is_active", false)
	c.JSON(http.StatusOK, gin.H{"message": "Member deactivated"})
}
>>>>>>> master
