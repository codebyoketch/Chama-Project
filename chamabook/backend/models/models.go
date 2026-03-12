package models

import (
	"time"

	"gorm.io/gorm"
)

// Group represents a SACCO or chama savings group
type Group struct {
	gorm.Model
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Code        string `gorm:"uniqueIndex" json:"code"` // e.g. "CHAMA-001"
	Users       []User `json:"users,omitempty"`
}

// User is a member or admin of a group
type User struct {
	gorm.Model
	GroupID      uint   `gorm:"not null" json:"group_id"`
	Name         string `gorm:"not null" json:"name"`
	Phone        string `gorm:"not null" json:"phone"`
	Email        string `gorm:"uniqueIndex" json:"email"`
	PasswordHash string `gorm:"not null" json:"-"` // never expose password
	Role         string `gorm:"default:'member'" json:"role"` // admin | treasurer | secretary | member
	IsActive     bool   `gorm:"default:true" json:"is_active"`
	Group        Group  `json:"group,omitempty"`
}

// Contribution tracks monthly/weekly member deposits
type Contribution struct {
	gorm.Model
	UserID      uint      `gorm:"not null" json:"user_id"`
	GroupID     uint      `gorm:"not null" json:"group_id"`
	Amount      float64   `gorm:"not null" json:"amount"`
	Period      string    `gorm:"not null" json:"period"` // e.g. "2024-01" for January 2024
	PaidAt      time.Time `json:"paid_at"`
	Notes       string    `json:"notes"`
	RecordedBy  uint      `json:"recorded_by"` // user_id of treasurer who recorded it
	ClientTempID string   `json:"client_temp_id,omitempty"` // for offline sync
	User        User      `json:"user,omitempty"`
}

// Loan tracks loans issued to members
type Loan struct {
	gorm.Model
	UserID        uint        `gorm:"not null" json:"user_id"`
	GroupID       uint        `gorm:"not null" json:"group_id"`
	Amount        float64     `gorm:"not null" json:"amount"`
	InterestRate  float64     `gorm:"default:10" json:"interest_rate"` // percentage
	InterestType  string      `gorm:"default:'flat'" json:"interest_type"` // flat | reducing
	TotalDue      float64     `json:"total_due"`
	TotalPaid     float64     `gorm:"default:0" json:"total_paid"`
	Balance       float64     `json:"balance"`
	IssuedAt      time.Time   `json:"issued_at"`
	DueAt         time.Time   `json:"due_at"`
	Status        string      `gorm:"default:'active'" json:"status"` // active | completed | defaulted
	ApprovedBy    uint        `json:"approved_by"`
	ClientTempID  string      `json:"client_temp_id,omitempty"`
	Repayments    []Repayment `json:"repayments,omitempty"`
	User          User        `json:"user,omitempty"`
}

// Repayment tracks individual loan repayments
type Repayment struct {
	gorm.Model
	LoanID       uint      `gorm:"not null" json:"loan_id"`
	UserID       uint      `gorm:"not null" json:"user_id"`
	Amount       float64   `gorm:"not null" json:"amount"`
	PaidAt       time.Time `json:"paid_at"`
	Notes        string    `json:"notes"`
	ClientTempID string    `json:"client_temp_id,omitempty"`
}

// Minute stores meeting records
type Minute struct {
	gorm.Model
	GroupID     uint      `gorm:"not null" json:"group_id"`
	MeetingDate time.Time `json:"meeting_date"`
	Agenda      string    `json:"agenda"`
	Content     string    `gorm:"type:text" json:"content"`
	Attendees   string    `gorm:"type:text" json:"attendees"` // JSON array of user IDs
	RecordedBy  uint      `json:"recorded_by"`
	ClientTempID string   `json:"client_temp_id,omitempty"`
}

// SyncLog tracks offline operations that need syncing
type SyncLog struct {
	gorm.Model
	UserID    uint   `json:"user_id"`
	GroupID   uint   `json:"group_id"`
	Action    string `json:"action"`    // CREATE | UPDATE | DELETE
	Resource  string `json:"resource"`  // contribution | loan | repayment | minute
	Payload   string `gorm:"type:text" json:"payload"` // JSON of the record
	Synced    bool   `gorm:"default:false" json:"synced"`
	SyncedAt  *time.Time `json:"synced_at"`
}
