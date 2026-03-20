package handlers

import (
	"net/http"
	"chamabook/config"
	"chamabook/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func GetSettings(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)
	var settings models.GroupSettings
	if err := config.DB.Where("group_id = ?", gid).First(&settings).Error; err != nil {
		settings = models.GroupSettings{
			GroupID: gid, AbsentFine: 200, AbsentNoApologyFine: 500,
			LateFine: 100, TableBankingMax: 0, ContributionDay: 1, DefaultSharePrice: 2500,
		}
		config.DB.Create(&settings)
	}
	var group models.Group
	config.DB.First(&group, gid)
	var branches []models.Branch
	config.DB.Where("group_id = ?", gid).Find(&branches)
	c.JSON(http.StatusOK, gin.H{"settings": settings, "group": group, "branches": branches})
}

func UpdateSettings(c *gin.Context) {
	groupID, _ := c.Get("groupID")
	gid := groupID.(uint)
	var input struct {
		GroupName           string  `json:"group_name"`
		GroupDescription    string  `json:"group_description"`
		AbsentFine          float64 `json:"absent_fine"`
		AbsentNoApologyFine float64 `json:"absent_no_apology_fine"`
		LateFine            float64 `json:"late_fine"`
		TableBankingMax     int     `json:"table_banking_max"`
		ContributionDay     int     `json:"contribution_day"`
		DefaultSharePrice   float64 `json:"default_share_price"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.GroupName != "" {
		config.DB.Model(&models.Group{}).Where("id = ?", gid).Updates(map[string]interface{}{
			"name": input.GroupName, "description": input.GroupDescription,
		})
	}
	if input.TableBankingMax >= 0 {
		config.DB.Model(&models.Branch{}).Where("group_id = ? AND type = 'table_banking'", gid).
			Update("max_members", input.TableBankingMax)
	}
	var settings models.GroupSettings
	if config.DB.Where("group_id = ?", gid).First(&settings).Error != nil {
		settings = models.GroupSettings{GroupID: gid}
	}
	settings.AbsentFine = input.AbsentFine
	settings.AbsentNoApologyFine = input.AbsentNoApologyFine
	if input.LateFine >= 0 { settings.LateFine = input.LateFine }
	settings.TableBankingMax = input.TableBankingMax
	if input.ContributionDay > 0 { settings.ContributionDay = input.ContributionDay }
	if input.DefaultSharePrice > 0 { settings.DefaultSharePrice = input.DefaultSharePrice }
	config.DB.Save(&settings)
	c.JSON(http.StatusOK, gin.H{"message": "Settings updated", "settings": settings})
}

func UpdatePassword(c *gin.Context) {
	userID, _ := c.Get("userID")
	groupID, _ := c.Get("groupID")
	var input struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
		UserID          uint   `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.NewPassword == "" || len(input.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password must be at least 6 characters"})
		return
	}
	targetID := userID.(uint)
	role, _ := c.Get("role")
	if input.UserID > 0 && role.(string) == "admin" {
		targetID = input.UserID
	}
	var user models.User
	if err := config.DB.Where("id = ? AND group_id = ?", targetID, groupID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if targetID == userID.(uint) && input.CurrentPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
			return
		}
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	config.DB.Model(&user).Update("password_hash", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}