package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"chamabook/config"
	"chamabook/models"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gin-gonic/gin"
)

func SavePushSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")
	groupID, _ := c.Get("groupID")

	var input struct {
		Endpoint string `json:"endpoint"`
		P256dh   string `json:"p256dh"`
		Auth     string `json:"auth"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Endpoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Endpoint required"})
		return
	}

	var sub models.PushSubscription
	config.DB.Where("user_id = ?", userID).FirstOrInit(&sub)
	sub.UserID   = userID.(uint)
	sub.GroupID  = groupID.(uint)
	sub.Endpoint = input.Endpoint
	sub.P256dh   = input.P256dh
	sub.Auth     = input.Auth
	config.DB.Save(&sub)

	c.JSON(http.StatusOK, gin.H{"message": "Push subscription saved"})
}

func DeletePushSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")
	config.DB.Where("user_id = ?", userID).Delete(&models.PushSubscription{})
	c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed"})
}

func GetVapidPublicKey(c *gin.Context) {
	key := os.Getenv("VAPID_PUBLIC_KEY")
	c.JSON(http.StatusOK, gin.H{"public_key": key})
}

type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon"`
	URL   string `json:"url"`
}

func SendPushToGroup(groupID uint, title, body, url string) {
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidPublic  := os.Getenv("VAPID_PUBLIC_KEY")
	vapidEmail   := os.Getenv("VAPID_EMAIL")
	if vapidPrivate == "" {
		fmt.Println("VAPID_PRIVATE_KEY not set — skipping push")
		return
	}

	var subs []models.PushSubscription
	config.DB.Where("group_id = ?", groupID).Find(&subs)

	payload, _ := json.Marshal(PushPayload{
		Title: title, Body: body, Icon: "/icon-192.png", URL: url,
	})

	for _, sub := range subs {
		resp, err := webpush.SendNotification(payload, &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys:     webpush.Keys{Auth: sub.Auth, P256dh: sub.P256dh},
		}, &webpush.Options{
			VAPIDPublicKey:  vapidPublic,
			VAPIDPrivateKey: vapidPrivate,
			Subscriber:      vapidEmail,
			TTL:             30,
		})
		if err != nil {
			fmt.Printf("Push to group sub %d failed: %v\n", sub.ID, err)
			if resp != nil && resp.StatusCode == 410 {
				config.DB.Delete(&sub)
			}
		} else {
			resp.Body.Close()
		}
	}
}

func SendPushToUser(userID uint, title, body, url string) {
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	vapidPublic  := os.Getenv("VAPID_PUBLIC_KEY")
	vapidEmail   := os.Getenv("VAPID_EMAIL")
	if vapidPrivate == "" {
		return
	}

	var sub models.PushSubscription
	if config.DB.Where("user_id = ?", userID).First(&sub).Error != nil {
		return // user has no push subscription — silent skip
	}

	payload, _ := json.Marshal(PushPayload{
		Title: title, Body: body, Icon: "/icon-192.png", URL: url,
	})

	resp, err := webpush.SendNotification(payload, &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys:     webpush.Keys{Auth: sub.Auth, P256dh: sub.P256dh},
	}, &webpush.Options{
		VAPIDPublicKey:  vapidPublic,
		VAPIDPrivateKey: vapidPrivate,
		Subscriber:      vapidEmail,
		TTL:             30,
	})
	if err != nil {
		fmt.Printf("Push to user %d failed: %v\n", userID, err)
		if resp != nil && resp.StatusCode == 410 {
			config.DB.Delete(&sub)
		}
	} else {
		resp.Body.Close()
	}
}
