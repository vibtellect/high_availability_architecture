package middleware

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sirupsen/logrus"
	"github.com/sony/gobreaker"
)

var (
	// Circuit Breaker State Metrics
	gobreakerState = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "gobreaker_state",
			Help: "Current state of Go circuit breakers (0=open, 1=closed, 2=half_open)",
		},
		[]string{"name", "service", "target_service"},
	)

	// Circuit Breaker Request Metrics
	gobreakerRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gobreaker_requests_total",
			Help: "Total number of requests processed by Go circuit breakers",
		},
		[]string{"name", "service", "target_service"},
	)

	gobreakerSuccessesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gobreaker_successes_total",
			Help: "Total number of successful requests through Go circuit breakers",
		},
		[]string{"name", "service", "target_service"},
	)

	gobreakerFailuresTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gobreaker_failures_total",
			Help: "Total number of failed requests through Go circuit breakers",
		},
		[]string{"name", "service", "target_service"},
	)

	// Circuit Breaker State Transition Metrics
	gobreakerStateTransitionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gobreaker_state_transitions_total",
			Help: "Total number of state transitions in Go circuit breakers",
		},
		[]string{"name", "service", "target_service", "from_state", "to_state"},
	)

	// Circuit Breaker Duration Metrics
	gobreakerCallDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "gobreaker_call_duration_seconds",
			Help:    "Duration of calls through Go circuit breakers",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"name", "service", "target_service", "result"},
	)
)

// CircuitBreakerMetrics provides functionality to record circuit breaker metrics
type CircuitBreakerMetrics struct {
	logger *logrus.Logger
}

// NewCircuitBreakerMetrics creates a new circuit breaker metrics recorder
func NewCircuitBreakerMetrics(logger *logrus.Logger) *CircuitBreakerMetrics {
	return &CircuitBreakerMetrics{
		logger: logger,
	}
}

// RecordState records the current state of a circuit breaker
func (cbm *CircuitBreakerMetrics) RecordState(name, service, targetService string, state gobreaker.State) {
	var stateValue float64
	switch state {
	case gobreaker.StateOpen:
		stateValue = 0
	case gobreaker.StateClosed:
		stateValue = 1
	case gobreaker.StateHalfOpen:
		stateValue = 2
	}

	gobreakerState.WithLabelValues(name, service, targetService).Set(stateValue)

	if cbm.logger != nil && cbm.logger.IsLevelEnabled(logrus.DebugLevel) {
		cbm.logger.WithFields(logrus.Fields{
			"circuit_breaker": name,
			"service":         service,
			"target_service":  targetService,
			"state":           state.String(),
			"state_value":     stateValue,
		}).Debug("Circuit breaker state recorded")
	}
}

// RecordRequest records metrics for a circuit breaker request
func (cbm *CircuitBreakerMetrics) RecordRequest(name, service, targetService string) {
	gobreakerRequestsTotal.WithLabelValues(name, service, targetService).Inc()
}

// RecordSuccess records a successful circuit breaker call
func (cbm *CircuitBreakerMetrics) RecordSuccess(name, service, targetService string, duration float64) {
	gobreakerSuccessesTotal.WithLabelValues(name, service, targetService).Inc()
	gobreakerCallDuration.WithLabelValues(name, service, targetService, "success").Observe(duration)
}

// RecordFailure records a failed circuit breaker call
func (cbm *CircuitBreakerMetrics) RecordFailure(name, service, targetService string, duration float64) {
	gobreakerFailuresTotal.WithLabelValues(name, service, targetService).Inc()
	gobreakerCallDuration.WithLabelValues(name, service, targetService, "failure").Observe(duration)
}

// RecordStateTransition records a state transition in a circuit breaker
func (cbm *CircuitBreakerMetrics) RecordStateTransition(name, service, targetService string, fromState, toState gobreaker.State) {
	gobreakerStateTransitionsTotal.WithLabelValues(
		name,
		service,
		targetService,
		fromState.String(),
		toState.String(),
	).Inc()

	if cbm.logger != nil {
		cbm.logger.WithFields(logrus.Fields{
			"circuit_breaker": name,
			"service":         service,
			"target_service":  targetService,
			"from_state":      fromState.String(),
			"to_state":        toState.String(),
		}).Info("Circuit breaker state transition recorded")
	}
}

// UpdateCircuitBreakerMetrics updates all circuit breaker metrics periodically
func (cbm *CircuitBreakerMetrics) UpdateCircuitBreakerMetrics(cbs map[string]*gobreaker.CircuitBreaker, serviceName string) {
	for name, cb := range cbs {
		// Extract target service from circuit breaker name
		targetService := extractTargetService(name)

		// Record current state
		cbm.RecordState(name, serviceName, targetService, cb.State())

		// Record current counts
		counts := cb.Counts()

		// Update request totals (these are cumulative)
		gobreakerRequestsTotal.WithLabelValues(name, serviceName, targetService).Add(float64(counts.Requests))
		gobreakerSuccessesTotal.WithLabelValues(name, serviceName, targetService).Add(float64(counts.TotalSuccesses))
		gobreakerFailuresTotal.WithLabelValues(name, serviceName, targetService).Add(float64(counts.TotalFailures))
	}
}

// extractTargetService extracts the target service name from circuit breaker name
func extractTargetService(cbName string) string {
	// Map circuit breaker names to target services
	serviceMap := map[string]string{
		"ProductService": "product-service",
		"UserService":    "user-service",
		"Analytics":      "analytics-service",
	}

	if target, exists := serviceMap[cbName]; exists {
		return target
	}

	// Default fallback
	return "unknown-service"
}
