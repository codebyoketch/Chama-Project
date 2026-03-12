package routes

import (
	"chamabook/handlers"
	"chamabook/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")

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
	}
}
