import pytest
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import ValidationError
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.analytics_models import (
    AnalyticsEvent, MetricData, DashboardMetrics, HealthStatus,
    EventBatchRequest, EventSearchRequest
)

class TestAnalyticsEvent:
    """Test Pydantic v2 AnalyticsEvent model"""
    
    def test_basic_event_creation(self):
        """Test basic event creation with required fields"""
        event = AnalyticsEvent(
            event_type="page_view",
            user_id="user123"
        )
        
        assert event.event_type == "page_view"
        assert event.user_id == "user123"
        assert event.event_id is not None
        assert event.timestamp.tzinfo is not None
    
    def test_computed_fields(self):
        """Test computed fields functionality"""
        event = AnalyticsEvent(
            event_type="purchase",
            user_id="user123",
            price=Decimal("99.99"),
            quantity=2
        )
        
        # Test computed fields
        assert event.event_day is not None
        assert isinstance(event.event_hour, int)
        assert event.total_value == 199.98
    
    def test_commerce_validation(self):
        """Test commerce field validation"""
        # Valid purchase with revenue
        event = AnalyticsEvent(
            event_type="purchase",
            user_id="user123",
            revenue=Decimal("149.99")
        )
        assert event.revenue == Decimal("149.99")
        
        # Valid purchase with price and quantity (auto-calculate revenue)
        event = AnalyticsEvent(
            event_type="purchase", 
            user_id="user123",
            price=Decimal("50.00"),
            quantity=3
        )
        assert event.revenue == Decimal("150.00")
    
    def test_validation_errors(self):
        """Test validation error handling"""
        # Invalid event type
        with pytest.raises(ValidationError):
            AnalyticsEvent(event_type="invalid_type", user_id="user123")
        
        # Invalid user_id format
        with pytest.raises(ValidationError):
            AnalyticsEvent(event_type="page_view", user_id="")
    
    def test_serialization(self):
        """Test Pydantic v2 serialization"""
        event = AnalyticsEvent(
            event_type="product_view",
            user_id="user123",
            product_id="prod456",
            product_name="Test Product",
            price=Decimal("29.99")
        )
        
        # Test JSON serialization
        json_data = event.model_dump(mode='json')
        assert isinstance(json_data, dict)
        assert json_data['event_type'] == "product_view"
        assert isinstance(json_data['price'], float)

class TestDashboardMetrics:
    """Test DashboardMetrics with computed fields"""
    
    def test_conversion_rates(self):
        """Test conversion rate calculations"""
        metrics = DashboardMetrics(
            total_users=1000,
            active_sessions=500,
            total_events=15000,
            page_views=10000,
            add_to_carts=1000,
            purchases=100
        )
        
        assert metrics.conversion_rate == 1.0  # 100/10000 * 100
        assert metrics.cart_conversion_rate == 10.0  # 100/1000 * 100
        assert metrics.avg_revenue_per_user == 0.0  # no revenue set
    
    def test_growth_metrics(self):
        """Test growth metrics computation"""
        metrics = DashboardMetrics(
            total_users=1000,
            active_sessions=100,
            total_events=5000,
            events_last_24h=1000,
            total_revenue=Decimal("50000"),
            revenue_last_24h=Decimal("10000")
        )
        
        growth = metrics.growth_metrics
        assert 'events_growth_rate' in growth
        assert 'revenue_growth_rate' in growth

class TestEventBatchRequest:
    """Test batch request validation"""
    
    def test_valid_batch(self):
        """Test valid batch creation"""
        events = [
            AnalyticsEvent(event_type="page_view", user_id="user1"),
            AnalyticsEvent(event_type="product_view", user_id="user2")
        ]
        
        batch = EventBatchRequest(events=events)
        assert len(batch.events) == 2
    
    def test_batch_size_validation(self):
        """Test batch size limits"""
        # Empty batch should fail
        with pytest.raises(ValidationError):
            EventBatchRequest(events=[])

class TestHealthStatus:
    """Test HealthStatus model with computed fields"""
    
    def test_health_score_calculation(self):
        """Test overall health score computation"""
        status = HealthStatus(
            service_name="analytics-service",
            status="healthy",
            version="2.0.0",
            uptime_seconds=3600,
            memory_usage_mb=512,
            cpu_usage_percent=45,
            database_status="connected",
            redis_status="connected",
            aws_status="connected"
        )
        
        assert status.overall_health_score >= 70
        assert status.uptime_formatted == "1h 0m"
    
    def test_degraded_health(self):
        """Test degraded health status"""
        status = HealthStatus(
            service_name="analytics-service",
            status="degraded",
            version="2.0.0",
            uptime_seconds=1800,
            memory_usage_mb=1024,
            cpu_usage_percent=85,
            database_status="degraded",
            redis_status="connected",
            aws_status="disconnected",
            error_count_last_hour=15
        )
        
        score = status.overall_health_score
        assert score < 70  # Should be lower due to issues

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 