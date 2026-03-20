package config

import (
	"fmt"
	"log"
	"os"
	"chamabook/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Africa/Nairobi",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	DB = db
	log.Println("✅ Database connected successfully")
}

func MigrateDB() {
	err := DB.AutoMigrate(
		&models.Group{},
		&models.Branch{},
		&models.User{},
		&models.Contribution{},
		&models.Loan{},
		&models.Repayment{},
		&models.LoanApproval{},       // 👈 new
		&models.Fine{},
		&models.WelfareContribution{},
		&models.WelfareDisbursement{},
		&models.Meeting{},
		&models.MeetingAttendance{},
		&models.SyncLog{},
		&models.GroupSettings{},
		&models.ContributionPayout{},
		&models.ShareCapital{},
		&models.ShareCapitalWithdrawal{},
		&models.PushSubscription{},   // 👈 new
	)
	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}

	// Allow multiple empty id_numbers
	DB.Exec(`DROP INDEX IF EXISTS idx_users_id_number`)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_number 
        ON users (id_number) 
        WHERE id_number IS NOT NULL AND id_number != '' AND deleted_at IS NULL`)

	log.Println("✅ Database migrated successfully")
}
