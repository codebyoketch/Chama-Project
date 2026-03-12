package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"chamabook/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Africa/Nairobi",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSLMODE"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("❌ Failed to connect to database:", err)
	}

	// Get the underlying sql.DB to configure connection pooling
	// This is what solves your multiple connections problem!
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("❌ Failed to get sql.DB:", err)
	}

	sqlDB.SetMaxOpenConns(25)            // max simultaneous connections
	sqlDB.SetMaxIdleConns(10)            // keep 10 connections warm/ready
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // recycle connections every 5 mins

	DB = db
	log.Println("✅ Database connected successfully")
}

// MigrateDB auto-creates/updates tables from your models
func MigrateDB() {
	err := DB.AutoMigrate(
		&models.Group{},
		&models.User{},
		&models.Contribution{},
		&models.Loan{},
		&models.Repayment{},
		&models.Minute{},
		&models.SyncLog{},
	)
	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}
	log.Println("✅ Database migrated successfully")
}
