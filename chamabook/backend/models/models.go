package models

import (
	"time"
<<<<<<< HEAD

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
=======
	"gorm.io/gorm"
)


type Group struct {
	gorm.Model
	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description"`
	Code        string `json:"code" gorm:"uniqueIndex"`
	Users       []User `json:"users,omitempty" gorm:"foreignKey:GroupID"`
}

type Branch struct {
	gorm.Model
	GroupID     uint   `json:"group_id" gorm:"not null"`
	Name        string `json:"name" gorm:"not null"`
	Type        string `json:"type" gorm:"not null"` // sacco | table_banking
	MaxMembers  int    `json:"max_members" gorm:"default:0"`
	Description string `json:"description"`
	Group       Group  `json:"group,omitempty" gorm:"foreignKey:GroupID"`
}

type User struct {
	gorm.Model
	GroupID        uint   `json:"group_id" gorm:"not null"`
	Name           string `json:"name" gorm:"not null"`
	Phone          string `json:"phone" gorm:"not null"`
	IDNumber       string `json:"id_number"`
	AccountNumber  string `json:"account_number" gorm:"uniqueIndex"`
	Email          string `json:"email"`
	PasswordHash   string `json:"-"`
	Role           string `json:"role" gorm:"default:'member'"`
	IsActive       bool   `json:"is_active" gorm:"default:true"`
	MembershipType string `json:"membership_type" gorm:"default:'both'"` // sacco_only | both
	Group          Group  `json:"group,omitempty" gorm:"foreignKey:GroupID"`
}

type Contribution struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	BranchID       uint      `json:"branch_id"`
	BranchName     string    `json:"branch_name" gorm:"-"`
	Amount         float64   `json:"amount" gorm:"not null"`
	FinesDeducted  float64   `json:"fines_deducted" gorm:"default:0"`
	NetAmount      float64   `json:"net_amount" gorm:"default:0"`
	Period         string    `json:"period" gorm:"not null"`
	PaidAt         time.Time `json:"paid_at"`
	Notes          string    `json:"notes"`
	RecordedBy     uint      `json:"recorded_by"`
	RecordedByName string    `json:"recorded_by_name" gorm:"-"`
	ClientTempID   string    `json:"client_temp_id"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Type           string    `json:"type" gorm:"default:'sacco_savings'"` // sacco_savings | tb_contribution
}

type Loan struct {
	gorm.Model
	UserID          uint           `json:"user_id" gorm:"not null"`
	GroupID         uint           `json:"group_id" gorm:"not null"`
	BranchID        uint           `json:"branch_id"`
	BranchName      string         `json:"branch_name" gorm:"-"`
	Amount          float64        `json:"amount" gorm:"not null"`
	InterestRate    float64        `json:"interest_rate" gorm:"default:10"`
	InterestType    string         `json:"interest_type" gorm:"default:'flat'"`
	InterestPeriod  string         `json:"interest_period" gorm:"default:'monthly'"`
	TermMonths      int            `json:"term_months" gorm:"default:12"`
	MonthlyPayment  float64        `json:"monthly_payment"`
	TotalDue        float64        `json:"total_due"`
	TotalPaid       float64        `json:"total_paid" gorm:"default:0"`
	Balance         float64        `json:"balance"`
	IssuedAt        time.Time      `json:"issued_at"`
	DueAt           time.Time      `json:"due_at"`
	Status          string         `json:"status" gorm:"default:'pending'"` // pending | active | rejected | cleared | defaulted
	InitiatedBy     uint           `json:"initiated_by"`
	InitiatedByName string         `json:"initiated_by_name" gorm:"-"`
	ApprovedBy      uint           `json:"approved_by"`
	ApprovedByName  string         `json:"approved_by_name" gorm:"-"`
	ClientTempID    string         `json:"client_temp_id"`
	ApprovalCount   int            `json:"approval_count" gorm:"-"`
	User            User           `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Repayments      []Repayment    `json:"repayments,omitempty" gorm:"foreignKey:LoanID"`
	Approvals       []LoanApproval `json:"approvals,omitempty" gorm:"foreignKey:LoanID"`
}

// LoanScheduleEntry — generated dynamically, not stored
type LoanScheduleEntry struct {
	Month          int       `json:"month"`
	DueDate        time.Time `json:"due_date"`
	OpeningBalance float64   `json:"opening_balance"`
	Principal      float64   `json:"principal"`
	Interest       float64   `json:"interest"`
	Payment        float64   `json:"payment"`
	ClosingBalance float64   `json:"closing_balance"`
	Status         string    `json:"status"` // paid | due | upcoming | missed
	AmountPaid     float64   `json:"amount_paid"`
}

type Repayment struct {
	gorm.Model
	LoanID         uint      `json:"loan_id" gorm:"not null"`
	UserID         uint      `json:"user_id" gorm:"not null"`
	Amount         float64   `json:"amount" gorm:"not null"`
	PaidAt         time.Time `json:"paid_at"`
	Notes          string    `json:"notes"`
	RecordedBy     uint      `json:"recorded_by"`
	RecordedByName string    `json:"recorded_by_name" gorm:"-"`
	ClientTempID   string    `json:"client_temp_id"`
}

type Fine struct {
	gorm.Model
	UserID       uint       `json:"user_id" gorm:"not null"`
	GroupID      uint       `json:"group_id" gorm:"not null"`
	BranchID     uint       `json:"branch_id"`
	BranchName   string     `json:"branch_name" gorm:"-"`
	Amount       float64    `json:"amount" gorm:"not null"`
	Reason       string     `json:"reason" gorm:"not null"`
	Period       string     `json:"period"`
	Type         string     `json:"type" gorm:"default:'manual'"` // manual | auto | meeting
	Status       string     `json:"status" gorm:"default:'unpaid'"`
	PaidAt       *time.Time `json:"paid_at"`
	MeetingID    uint       `json:"meeting_id"`
	IssuedBy     uint       `json:"issued_by"`
	IssuedByName string     `json:"issued_by_name" gorm:"-"`
	Notes        string     `json:"notes"`
	User         User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type WelfareContribution struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	BranchID       uint      `json:"branch_id"`
	BranchName     string    `json:"branch_name" gorm:"-"`
	Amount         float64   `json:"amount" gorm:"not null"`
	Period         string    `json:"period"`
	PaidAt         time.Time `json:"paid_at"`
	Notes          string    `json:"notes"`
	RecordedBy     uint      `json:"recorded_by"`
	RecordedByName string    `json:"recorded_by_name" gorm:"-"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type WelfareDisbursement struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	BranchID       uint      `json:"branch_id"`
	Amount         float64   `json:"amount" gorm:"not null"`
	Reason         string    `json:"reason" gorm:"not null"`
	DisbursedAt    time.Time `json:"disbursed_at"`
	ApprovedBy     uint      `json:"approved_by"`
	ApprovedByName string    `json:"approved_by_name" gorm:"-"`
	Notes          string    `json:"notes"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type Meeting struct {
	gorm.Model
	GroupID           uint              `json:"group_id" gorm:"not null"`
	BranchID          uint              `json:"branch_id"`
	Title             string            `json:"title" gorm:"not null"`
	ScheduledAt       time.Time         `json:"scheduled_at"`
	Location          string            `json:"location"`
	Agenda            string            `json:"agenda"`
	Minutes           string            `json:"minutes"`
	Status            string            `json:"status" gorm:"default:'scheduled'"`
	FineAbsent        float64           `json:"fine_absent" gorm:"default:75"`
	FineAbsentApology float64           `json:"fine_absent_apology" gorm:"default:50"`
	FineLate          float64 			`json:"fine_late" gorm:"default:0"`
	RecordedBy        uint              `json:"recorded_by"`
	Attendance        []MeetingAttendance `json:"attendance,omitempty" gorm:"foreignKey:MeetingID"`
}

type MeetingAttendance struct {
	gorm.Model
	MeetingID  uint    `json:"meeting_id" gorm:"not null"`
	UserID     uint    `json:"user_id" gorm:"not null"`
	GroupID    uint    `json:"group_id" gorm:"not null"`
	Status     string  `json:"status" gorm:"default:'present'"` // present | absent | absent_apology
	FineAmount float64 `json:"fine_amount" gorm:"default:0"`
	FineID     uint    `json:"fine_id"`
	Notes      string  `json:"notes"`
	User       User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type SyncLog struct {
	gorm.Model
	UserID   uint       `json:"user_id"`
	GroupID  uint       `json:"group_id"`
	Action   string     `json:"action"`
	Resource string     `json:"resource"`
	Payload  string     `json:"payload"`
	Synced   bool       `json:"synced" gorm:"default:false"`
	SyncedAt *time.Time `json:"synced_at"`
}

type GroupSettings struct {
	gorm.Model
	GroupID             uint    `json:"group_id" gorm:"uniqueIndex;not null"`
	AbsentFine          float64 `json:"absent_fine" gorm:"default:50"`
	AbsentNoApologyFine float64 `json:"absent_no_apology_fine" gorm:"default:75"`
	LateFine            float64 `json:"late_fine" gorm:"default:30"`
	TableBankingMax     int     `json:"table_banking_max" gorm:"default:0"`
	ContributionDay     int     `json:"contribution_day" gorm:"default:1"`
	DefaultSharePrice   float64 `json:"default_share_price" gorm:"default:2500"`
	Group               Group   `json:"group,omitempty" gorm:"foreignKey:GroupID"`
}


type ContributionPayout struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	BranchID       uint      `json:"branch_id"`
	BranchName     string    `json:"branch_name" gorm:"-"`
	Amount         float64   `json:"amount" gorm:"not null"`
	Reason         string    `json:"reason"`
	Period         string    `json:"period"`
	DisbursedAt    time.Time `json:"disbursed_at"`
	ApprovedBy     uint      `json:"approved_by"`
	ApprovedByName string    `json:"approved_by_name" gorm:"-"`
	Notes          string    `json:"notes"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type ShareCapital struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	Shares         int       `json:"shares" gorm:"default:0"`
	SharePrice     float64   `json:"share_price" gorm:"not null"`
	Amount         float64   `json:"amount" gorm:"not null"`
	AmountPaid         float64   `json:"amount_paid" gorm:"default:0"`     // amount paid so far
	PaymentStatus      string    `json:"payment_status" gorm:"default:'pending'"` // pending | partial | paid | overdue
	InstallmentDeadline time.Time `json:"installment_deadline"`             // 3 months from purchase
	Type           string    `json:"type" gorm:"default:'purchase'"` // purchase | topup
	PaidAt         time.Time `json:"paid_at"`
	RecordedBy     uint      `json:"recorded_by"`
	RecordedByName string    `json:"recorded_by_name" gorm:"-"`
	Notes          string    `json:"notes"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type ShareCapitalWithdrawal struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	GroupID        uint      `json:"group_id" gorm:"not null"`
	Shares         int       `json:"shares" gorm:"not null"`
	AmountPerShare float64   `json:"amount_per_share" gorm:"not null"`
	TotalAmount    float64   `json:"total_amount" gorm:"not null"`
	Reason         string    `json:"reason"`
	WithdrawnAt    time.Time `json:"withdrawn_at"`
	ApprovedBy     uint      `json:"approved_by"`
	ApprovedByName string    `json:"approved_by_name" gorm:"-"`
	Notes          string    `json:"notes"`
	User           User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type LoanApproval struct {
	gorm.Model
	LoanID       uint   `json:"loan_id" gorm:"not null"`
	ApproverID   uint   `json:"approver_id" gorm:"not null"`
	ApproverName string `json:"approver_name" gorm:"-"`
	ApproverRole string `json:"approver_role"`
	Action       string `json:"action"` // approved | rejected
	Notes        string `json:"notes"`
}

type PushSubscription struct {
	gorm.Model
	UserID   uint   `json:"user_id" gorm:"not null"`
	GroupID  uint   `json:"group_id" gorm:"not null"`
	Endpoint string `json:"endpoint" gorm:"not null;type:text"`
	P256dh   string `json:"p256dh" gorm:"type:text"`
	Auth     string `json:"auth"`
>>>>>>> master
}
