package services

import (
	"context"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/middleware"
)

// MetricsUpdater handles periodic updates of circuit breaker metrics
type MetricsUpdater struct {
	productClient *ProductServiceClient
	metrics       *middleware.CircuitBreakerMetrics
	logger        *logrus.Logger
	updateTicker  *time.Ticker
	done          chan bool
}

// NewMetricsUpdater creates a new metrics updater
func NewMetricsUpdater(productClient *ProductServiceClient, logger *logrus.Logger) *MetricsUpdater {
	return &MetricsUpdater{
		productClient: productClient,
		metrics:       middleware.NewCircuitBreakerMetrics(logger),
		logger:        logger,
		done:          make(chan bool),
	}
}

// Start begins the periodic metrics update process
func (mu *MetricsUpdater) Start(ctx context.Context, interval time.Duration) {
	mu.updateTicker = time.NewTicker(interval)

	mu.logger.WithField("interval", interval.String()).Info("Starting circuit breaker metrics updater")

	go func() {
		defer mu.updateTicker.Stop()

		// Update metrics immediately on start
		mu.updateMetrics()

		for {
			select {
			case <-mu.updateTicker.C:
				mu.updateMetrics()
			case <-mu.done:
				mu.logger.Info("Metrics updater stopped")
				return
			case <-ctx.Done():
				mu.logger.Info("Metrics updater stopped due to context cancellation")
				return
			}
		}
	}()
}

// Stop stops the metrics updater
func (mu *MetricsUpdater) Stop() {
	mu.logger.Info("Stopping circuit breaker metrics updater")
	close(mu.done)
}

// updateMetrics updates all circuit breaker metrics
func (mu *MetricsUpdater) updateMetrics() {
	if mu.productClient != nil {
		mu.productClient.UpdateMetrics()
	}

	mu.logger.Debug("Circuit breaker metrics updated")
}
