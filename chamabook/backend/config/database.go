package config

import (
	"fmt"
	"log"
	"os"
<<<<<<< HEAD
	"time"

	"chamabook/models"

=======
	"chamabook/models"
>>>>>>> master
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Africa/Nairobi",
<<<<<<< HEAD
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSLMODE"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
=======
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
>>>>>>> master
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}
<<<<<<< HEAD

	// Get the underlying sql.DB to configure connection pooling
	// This is what solves your multiple connections problem!
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("❌ Failed to get sql.DB:", err)
	}

	sqlDB.SetMaxOpenConns(25)            // max simultaneous connections
	sqlDB.SetMaxIdleConns(10)            // keep 10 connections warm/ready
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // recycle connections every 5 mins

=======
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
>>>>>>> master
	DB = db
	log.Println("✅ Database connected successfully")
}

<<<<<<< HEAD
// MigrateDB auto-creates/updates tables from your models
func MigrateDB() {
	err := DB.AutoMigrate(
		&models.Group{},
=======
func MigrateDB() {
	err := DB.AutoMigrate(
		&models.Group{},
		&models.Branch{},
>>>>>>> master
		&models.User{},
		&models.Contribution{},
		&models.Loan{},
		&models.Repayment{},
<<<<<<< HEAD
		&models.Minute{},
		&models.SyncLog{},
=======
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
>>>>>>> master
	)
	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}
<<<<<<< HEAD
=======

	// Allow multiple empty id_numbers
	DB.Exec(`DROP INDEX IF EXISTS idx_users_id_number`)
	DB.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_number 
        ON users (id_number) 
        WHERE id_number IS NOT NULL AND id_number != '' AND deleted_at IS NULL`)

>>>>>>> master
	log.Println("✅ Database migrated successfully")
}
