package routes

import (
	"chamabook/handlers"
	"chamabook/middleware"
<<<<<<< HEAD

=======
>>>>>>> master
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
<<<<<<< HEAD

	// ── Public routes (no auth needed) ─────────────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/register", handlers.Register) // create group + first admin
		auth.POST("/login", handlers.Login)
	}

	// ── Protected routes (JWT required) ─────────────────────────────────────
	protected := api.Group("/")
	protected.Use(middleware.AuthRequired())
	{
		// Dashboard
		protected.GET("dashboard", handlers.GetDashboard)

		// Members
		members := protected.Group("/members")
		{
			members.GET("", handlers.GetMembers)
			members.GET("/:id/summary", handlers.GetMemberSummary)
			members.POST("", middleware.AdminOnly(), handlers.AddMember)
			members.DELETE("/:id", middleware.AdminOnly(), handlers.DeactivateMember)
		}

		// Contributions
		contributions := protected.Group("/contributions")
		{
			contributions.GET("", handlers.GetContributions)
			contributions.GET("/summary", handlers.GetGroupContributionSummary)
			contributions.POST("", middleware.AdminOnly(), handlers.AddContribution)
			contributions.POST("/sync", middleware.AdminOnly(), handlers.SyncContributions) // offline sync
		}

		// Loans
		loans := protected.Group("/loans")
		{
			loans.GET("", handlers.GetLoans)
			loans.POST("", middleware.AdminOnly(), handlers.IssueLoan)
			loans.POST("/repayment", middleware.AdminOnly(), handlers.RecordRepayment)
		}

		// Minutes
		minutes := protected.Group("/minutes")
		{
			minutes.GET("", handlers.GetMinutes)
			minutes.POST("", handlers.AddMinute)
			minutes.PUT("/:id", handlers.UpdateMinute)
		}
=======
	api.POST("/auth/register", handlers.Register)
	api.POST("/auth/login", handlers.Login)

	// All authenticated
	auth := api.Group("/", middleware.AuthRequired())
	{
		auth.GET("/dashboard", handlers.GetDashboard)
		auth.GET("/settings", handlers.GetSettings)
		auth.GET("/branches", handlers.GetBranches)
		auth.GET("/members", handlers.GetMembers)
		auth.GET("/members/:id/summary", handlers.GetMemberSummary)
		auth.GET("/contributions", handlers.GetContributions)
		auth.GET("/contributions/summary", handlers.GetGroupContributionSummary)
		auth.GET("/contributions/payouts", handlers.GetContributionPayouts)
		auth.GET("/loans", handlers.GetLoans)
		auth.GET("/loans/:id/schedule", handlers.GetLoanSchedule)
		auth.POST("/loans/:id/approve", handlers.ApproveLoan) // 👈 any eligible role can approve
		auth.GET("/fines", handlers.GetFines)
		auth.GET("/welfare", handlers.GetWelfareSummary)
		auth.GET("/meetings", handlers.GetMeetings)
		auth.GET("/meetings/:id/report", handlers.GetMeetingReport)
		auth.GET("/sharecapital", handlers.GetShareCapital)
		auth.GET("/reports", handlers.GetReports)
		auth.POST("/auth/password", handlers.UpdatePassword)
		auth.GET("/push/vapid-key", handlers.GetVapidPublicKey)
		auth.POST("/push/subscribe", handlers.SavePushSubscription)
		auth.DELETE("/push/subscribe", handlers.DeletePushSubscription)
	}

	// Secretary or above (includes vice_chairperson)
	secretary := api.Group("/", middleware.AuthRequired(), middleware.SecretaryOrAbove())
	{
		secretary.POST("/members", handlers.AddMember)
		secretary.POST("/meetings", handlers.AddMeeting)
		secretary.PUT("/meetings/:id", handlers.UpdateMeeting)
		secretary.POST("/meetings/:id/close", handlers.SaveAttendance)
		secretary.PUT("/members/:id/membership", handlers.UpdateMembershipType)
	}

	// Treasurer or above
	treasurer := api.Group("/", middleware.AuthRequired(), middleware.TreasurerOrAbove())
	{
		treasurer.POST("/contributions", handlers.AddContribution)
		treasurer.POST("/contributions/sync", handlers.SyncContributions)
		treasurer.POST("/contributions/payout", handlers.AddContributionPayout)
		treasurer.POST("/loans", handlers.IssueLoan)
		treasurer.POST("/loans/repayment", handlers.RecordRepayment)
		treasurer.POST("/fines", handlers.IssueFine)
		treasurer.POST("/fines/auto", handlers.AutoIssueFines)
		treasurer.PUT("/fines/:id/pay", handlers.PayFine)
		treasurer.PUT("/fines/:id/waive", handlers.WaiveFine)
		treasurer.POST("/welfare/contribution", handlers.AddWelfareContribution)
		treasurer.POST("/welfare/disbursement", handlers.AddWelfareDisbursement)
		treasurer.POST("/sharecapital", handlers.AddShareCapital)
		treasurer.POST("/sharecapital/withdraw", handlers.WithdrawShareCapital)
		treasurer.POST("/sharecapital/:id/pay", handlers.PayShareInstallment)
	}

	// Chairperson or above (includes vice_chairperson)
	chairperson := api.Group("/", middleware.AuthRequired(), middleware.ChairpersonOrAbove())
	{
		chairperson.DELETE("/members/:id", handlers.DeactivateMember)
		chairperson.DELETE("/meetings/:id", handlers.DeleteMeeting)
		chairperson.PUT("/settings", handlers.UpdateSettings)
	}

	// Admin only — strictly scoped to their own group
	admin := api.Group("/", middleware.AuthRequired(), middleware.AdminOnly())
	{
		admin.PUT("/members/:id/role", handlers.UpdateMemberRole)
		admin.PUT("/members/:id/password", handlers.ResetMemberPassword)
	}

	// Admin portal — strictly scoped to their own group
	adminPortal := api.Group("/admin", middleware.AuthRequired(), middleware.AdminOnly())
	{
		adminPortal.GET("/all", handlers.AdminGetAll)
		adminPortal.PUT("/members/:id", handlers.AdminEditMember)
		adminPortal.DELETE("/members/:id", handlers.AdminDeleteMember)
		adminPortal.PUT("/contributions/:id", handlers.AdminEditContribution)
		adminPortal.DELETE("/contributions/:id", handlers.AdminDeleteContribution)
		adminPortal.PUT("/loans/:id", handlers.AdminEditLoan)
		adminPortal.DELETE("/loans/:id", handlers.AdminDeleteLoan)
		adminPortal.PUT("/fines/:id", handlers.AdminEditFine)
		adminPortal.DELETE("/fines/:id", handlers.AdminDeleteFine)
		adminPortal.POST("/import", handlers.BulkImportMembers)
		adminPortal.POST("/sharecapital/assign-defaults", handlers.AssignDefaultSharesToAll)
>>>>>>> master
	}
}
