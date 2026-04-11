package tradingcopilot

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/audit"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/observability"
)

type AlertService struct {
	repo      *Repository
	publisher EventPublisher
	reader    AlertReaderProvider
}

type AlertReaderProvider interface {
	NewReader(topic, groupID string) *kafka.Reader
}

func NewAlertService(repo *Repository, publisher EventPublisher) *AlertService {
	service := &AlertService{repo: repo, publisher: publisher}
	if rp, ok := publisher.(AlertReaderProvider); ok {
		service.reader = rp
	}
	return service
}

type AlertChannelRequest struct {
	SubscriberUserID string `json:"subscriberUserId"`
	ChannelType      string `json:"channelType"`
	Destination      string `json:"destination"`
}

func (a *AlertService) ConfigureChannel(ctx context.Context, req AlertChannelRequest) (AlertChannel, error) {
	ct := strings.ToLower(strings.TrimSpace(req.ChannelType))
	if ct != "telegram" && ct != "discord" && ct != "webhook" {
		return AlertChannel{}, fmt.Errorf("channelType must be one of: telegram, discord, webhook")
	}
	if strings.TrimSpace(req.SubscriberUserID) == "" {
		return AlertChannel{}, fmt.Errorf("subscriberUserId is required")
	}
	if strings.TrimSpace(req.Destination) == "" {
		return AlertChannel{}, fmt.Errorf("destination is required")
	}

	_, err := a.repo.UpsertSubscription(ctx, req.SubscriberUserID, true, nil)
	if err != nil {
		return AlertChannel{}, err
	}
	return a.repo.UpsertAlertChannel(ctx, req.SubscriberUserID, ct, req.Destination)
}

type TradeStatusDispatchResult struct {
	AlertEventID     string `json:"alertEventId"`
	DispatchPolicy   string `json:"dispatchPolicy"`
	ChannelsTargeted int    `json:"channelsTargeted"`
	ChannelsSent     int    `json:"channelsSent"`
	ManualReview     bool   `json:"manualReview"`
}

func (a *AlertService) HandleTradeStatusUpdate(ctx context.Context, tradePlanID, statusEvent, dispatchPolicy string) (TradeStatusDispatchResult, error) {
	started := time.Now()
	defer observability.RecordAlertDispatchLatency(started)

	policy := strings.ToLower(strings.TrimSpace(dispatchPolicy))
	if policy == "" {
		policy = "auto_send"
	}
	if policy != "auto_send" && policy != "confirm_before_send" {
		return TradeStatusDispatchResult{}, fmt.Errorf("dispatchPolicy must be one of: auto_send, confirm_before_send")
	}

	eventType := strings.ToLower(strings.TrimSpace(statusEvent))
	if eventType == "" {
		return TradeStatusDispatchResult{}, fmt.Errorf("statusEvent is required")
	}

	alertEvent, err := a.repo.CreateAlertEvent(ctx, tradePlanID, eventType, policy, map[string]any{
		"tradePlanId":    tradePlanID,
		"statusEvent":    eventType,
		"dispatchPolicy": policy,
		"occurredAt":     time.Now().UTC(),
	})
	if err != nil {
		return TradeStatusDispatchResult{}, err
	}

	channels, err := a.repo.ListActiveAlertChannels(ctx)
	if err != nil {
		return TradeStatusDispatchResult{}, err
	}

	result := TradeStatusDispatchResult{
		AlertEventID:     alertEvent.ID,
		DispatchPolicy:   policy,
		ChannelsTargeted: len(channels),
		ChannelsSent:     0,
		ManualReview:     policy == "confirm_before_send",
	}
	if result.ManualReview {
		audit.LogAction("creator", "alert_manual_review", tradePlanID, map[string]any{"statusEvent": eventType, "dispatchPolicy": policy, "alertEventId": alertEvent.ID})
		return result, nil
	}

	for _, channel := range channels {
		now := time.Now().UTC()
		_, _ = a.repo.CreateAlertDelivery(ctx, alertEvent.ID, channel.ID, "sent", 1, nil, &now)
		_ = a.publisher.PublishJSON(ctx, "tradingcopilot.alert.events.v1", alertEvent.ID, map[string]any{
			"eventType":      "alert_delivery_result",
			"alertEventId":   alertEvent.ID,
			"alertChannelId": channel.ID,
			"status":         "sent",
			"attemptCount":   1,
			"occurredAt":     now,
		})
		result.ChannelsSent++
	}

	_ = a.publisher.PublishJSON(ctx, "tradingcopilot.alert.events.v1", alertEvent.ID, map[string]any{
		"eventType":       "alert_dispatch_requested",
		"alertEventId":    alertEvent.ID,
		"tradePlanId":     tradePlanID,
		"subscriberCount": len(channels),
		"occurredAt":      time.Now().UTC(),
	})
	audit.LogAction("creator", "alert_dispatched", tradePlanID, map[string]any{"statusEvent": eventType, "dispatchPolicy": policy, "channelsSent": result.ChannelsSent, "alertEventId": alertEvent.ID})

	return result, nil
}

func (a *AlertService) GrantSubscription(ctx context.Context, userID string, expiresAt *time.Time) (Subscription, error) {
	if strings.TrimSpace(userID) == "" {
		return Subscription{}, fmt.Errorf("subscriberUserId is required")
	}
	return a.repo.UpsertSubscription(ctx, userID, true, expiresAt)
}

func (a *AlertService) RevokeSubscription(ctx context.Context, userID string) (Subscription, error) {
	if strings.TrimSpace(userID) == "" {
		return Subscription{}, fmt.Errorf("subscriberUserId is required")
	}
	return a.repo.UpsertSubscription(ctx, userID, false, nil)
}

func (a *AlertService) ConsumeAlertDeliveryResults(ctx context.Context, groupID string, handle func(payload map[string]any) error) error {
	if a.reader == nil {
		return fmt.Errorf("reader provider is not configured")
	}
	reader := a.reader.NewReader("tradingcopilot.alert.events.v1", groupID)
	defer reader.Close()

	for {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			return err
		}
		var payload map[string]any
		if err := json.Unmarshal(msg.Value, &payload); err != nil {
			continue
		}
		if eventType, _ := payload["eventType"].(string); eventType != "alert_delivery_result" {
			continue
		}
		if err := handle(payload); err != nil {
			return err
		}
	}
}
