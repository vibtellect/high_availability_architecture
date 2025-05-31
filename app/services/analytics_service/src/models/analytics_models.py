from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List, Literal, Union
from uuid import uuid4

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator, ConfigDict
from pydantic.functional_serializers import PlainSerializer
from typing_extensions import Annotated, Self

# Custom types with validators
UserId = Annotated[str, Field(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')]
SessionId = Annotated[str, Field(min_length=1, max_length=100)]
ProductId = Annotated[str, Field(min_length=1, max_length=50)]
EventType = Literal[
    "page_view", "product_view", "add_to_cart", "remove_from_cart", 
    "purchase", "user_signup", "user_login", "search", "checkout_start", 
    "checkout_complete", "payment_failed", "api_call", "error", "custom"
]

# Decimal serializer for currency values
CurrencyValue = Annotated[
    Decimal, 
    PlainSerializer(lambda x: float(x), return_type=float, when_used='json'),
    Field(ge=0, decimal_places=2)
]

class AnalyticsEvent(BaseModel):
    """Enhanced Analytics Event with Pydantic v2 features"""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
        populate_by_name=True
    )
    
    # Core fields
    event_id: str = Field(default_factory=lambda: str(uuid4()), description="Unique event identifier")
    user_id: Optional[UserId] = Field(None, description="User identifier")
    session_id: Optional[SessionId] = Field(None, description="Session identifier") 
    event_type: EventType = Field(..., description="Type of analytics event")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Product/commerce fields  
    product_id: Optional[ProductId] = None
    product_name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    price: Optional[CurrencyValue] = None
    quantity: Optional[int] = Field(None, ge=1, le=1000)
    currency: Optional[str] = Field("USD", min_length=3, max_length=3)
    
    # User context
    user_agent: Optional[str] = Field(None, max_length=500)
    ip_address: Optional[str] = Field(None, pattern=r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$')
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    city: Optional[str] = Field(None, max_length=100)
    
    # Technical context
    page_url: Optional[str] = Field(None, max_length=2000)
    referrer: Optional[str] = Field(None, max_length=2000)
    search_query: Optional[str] = Field(None, max_length=500)
    
    # Additional data
    properties: Dict[str, Any] = Field(default_factory=dict, description="Additional event properties")
    revenue: Optional[CurrencyValue] = None
    
    @field_validator('timestamp')
    @classmethod
    def validate_timestamp(cls, v: datetime) -> datetime:
        """Ensure timestamp is timezone-aware"""
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    
    @field_validator('properties')
    @classmethod
    def validate_properties(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Limit properties size and validate content"""
        if len(str(v)) > 10000:  # 10KB limit
            raise ValueError("Properties payload too large (max 10KB)")
        return v
    
    @model_validator(mode='after')
    def validate_commerce_fields(self) -> Self:
        """Validate commerce-related field dependencies"""
        if self.event_type == "purchase" and not self.revenue:
            if self.price and self.quantity:
                # Auto-calculate revenue
                object.__setattr__(self, 'revenue', self.price * self.quantity)
            else:
                raise ValueError("Purchase events must have revenue or (price + quantity)")
        
        if self.product_id and not self.product_name:
            raise ValueError("Product name required when product_id is provided")
            
        return self
    
    @computed_field
    @property
    def event_day(self) -> str:
        """Computed field for date partitioning"""
        return self.timestamp.strftime('%Y-%m-%d')
    
    @computed_field
    @property
    def event_hour(self) -> int:
        """Computed field for hourly analytics"""
        return self.timestamp.hour
    
    @computed_field
    @property 
    def total_value(self) -> Optional[float]:
        """Computed total monetary value"""
        if self.revenue:
            return float(self.revenue)
        elif self.price and self.quantity:
            return float(self.price * self.quantity)
        return None

class MetricData(BaseModel):
    """Enhanced metric data with validation"""
    model_config = ConfigDict(validate_assignment=True)
    
    metric_name: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9_.-]+$')
    value: float = Field(..., description="Metric value")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    dimensions: Dict[str, str] = Field(default_factory=dict, description="Metric dimensions")
    unit: Optional[str] = Field(None, max_length=20)
    
    @field_validator('dimensions')
    @classmethod
    def validate_dimensions(cls, v: Dict[str, str]) -> Dict[str, str]:
        """Validate dimension keys and values"""
        if len(v) > 20:
            raise ValueError("Too many dimensions (max 20)")
        for key, value in v.items():
            if not key or len(key) > 50:
                raise ValueError("Invalid dimension key")
            if len(str(value)) > 200:
                raise ValueError("Dimension value too long")
        return v
    
    @computed_field
    @property
    def metric_day(self) -> str:
        return self.timestamp.strftime('%Y-%m-%d')

class AnalyticsAggregation(BaseModel):
    """Time-based analytics aggregations with validation"""
    model_config = ConfigDict(validate_assignment=True)
    
    period: Literal["minute", "hour", "day", "week", "month"] = Field(..., description="Aggregation period")
    period_start: datetime = Field(..., description="Start of the period")
    period_end: datetime = Field(..., description="End of the period")
    event_type: Optional[EventType] = None
    
    # Aggregated metrics
    total_events: int = Field(ge=0)
    unique_users: int = Field(ge=0) 
    unique_sessions: int = Field(ge=0)
    total_revenue: CurrencyValue = Field(default=Decimal('0'))
    avg_session_duration: Optional[float] = Field(None, ge=0)
    
    # Computed aggregations
    conversion_metrics: Dict[str, float] = Field(default_factory=dict)
    top_products: List[Dict[str, Any]] = Field(default_factory=list)
    geo_distribution: Dict[str, int] = Field(default_factory=dict)
    
    @model_validator(mode='after')
    def validate_period_bounds(self) -> Self:
        """Validate that period_end > period_start"""
        if self.period_end <= self.period_start:
            raise ValueError("period_end must be after period_start")
        return self
    
    @computed_field
    @property
    def period_duration_hours(self) -> float:
        """Duration of the period in hours"""
        return (self.period_end - self.period_start).total_seconds() / 3600
    
    @computed_field
    @property
    def events_per_hour(self) -> float:
        """Average events per hour in this period"""
        if self.period_duration_hours > 0:
            return self.total_events / self.period_duration_hours
        return 0.0

class DashboardMetrics(BaseModel):
    """Enhanced dashboard metrics with computed fields"""
    model_config = ConfigDict(validate_assignment=True)
    
    # Core KPIs
    total_users: int = Field(ge=0)
    active_sessions: int = Field(ge=0)
    total_revenue: CurrencyValue = Field(default=Decimal('0'))
    total_events: int = Field(ge=0)
    
    # Time-based metrics  
    events_last_hour: int = Field(ge=0, default=0)
    events_last_24h: int = Field(ge=0, default=0) 
    revenue_last_24h: CurrencyValue = Field(default=Decimal('0'))
    new_users_today: int = Field(ge=0, default=0)
    
    # Performance metrics
    avg_response_time: float = Field(ge=0, default=0.0)
    error_rate: float = Field(ge=0, le=100, default=0.0)  # Percentage
    
    # Conversion funnel
    page_views: int = Field(ge=0, default=0)
    add_to_carts: int = Field(ge=0, default=0)
    purchases: int = Field(ge=0, default=0)
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @computed_field
    @property
    def conversion_rate(self) -> float:
        """Conversion rate from page views to purchases"""
        return (self.purchases / self.page_views * 100) if self.page_views > 0 else 0.0
    
    @computed_field  
    @property
    def cart_conversion_rate(self) -> float:
        """Conversion rate from cart additions to purchases"""
        return (self.purchases / self.add_to_carts * 100) if self.add_to_carts > 0 else 0.0
    
    @computed_field
    @property
    def avg_revenue_per_user(self) -> float:
        """Average revenue per user"""
        return float(self.total_revenue / self.total_users) if self.total_users > 0 else 0.0
    
    @computed_field
    @property
    def growth_metrics(self) -> Dict[str, float]:
        """Computed growth metrics"""
        return {
            "events_growth_rate": (self.events_last_24h / max(1, self.total_events - self.events_last_24h)) * 100,
            "revenue_growth_rate": float((self.revenue_last_24h / max(Decimal('1'), self.total_revenue - self.revenue_last_24h)) * 100)
        }

class HealthStatus(BaseModel):
    """Enhanced health status with validation"""
    model_config = ConfigDict(validate_assignment=True)
    
    service_name: str = Field(..., min_length=1, max_length=100)
    status: Literal["healthy", "degraded", "unhealthy"] = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = Field(..., min_length=1, max_length=50)
    
    # System metrics
    uptime_seconds: float = Field(ge=0)
    memory_usage_mb: float = Field(ge=0)
    cpu_usage_percent: float = Field(ge=0, le=100)
    
    # Dependencies
    database_status: Literal["connected", "disconnected", "degraded"] = "connected"
    redis_status: Literal["connected", "disconnected", "degraded"] = "connected"
    aws_status: Literal["connected", "disconnected", "degraded"] = "connected"
    
    # Performance
    avg_response_time_ms: float = Field(ge=0, default=0.0)
    requests_per_second: float = Field(ge=0, default=0.0)
    error_count_last_hour: int = Field(ge=0, default=0)
    
    details: Dict[str, Any] = Field(default_factory=dict)
    
    @computed_field
    @property 
    def overall_health_score(self) -> float:
        """Computed overall health score (0-100)"""
        score = 100.0
        
        if self.status == "degraded":
            score -= 30
        elif self.status == "unhealthy":
            score -= 60
            
        if self.database_status != "connected":
            score -= 20
        if self.redis_status != "connected":
            score -= 10
        if self.aws_status != "connected":
            score -= 15
            
        if self.cpu_usage_percent > 80:
            score -= 10
        if self.error_count_last_hour > 10:
            score -= 5
            
        return max(0.0, score)
    
    @computed_field
    @property
    def uptime_formatted(self) -> str:
        """Human-readable uptime"""
        hours = int(self.uptime_seconds // 3600)
        minutes = int((self.uptime_seconds % 3600) // 60)
        return f"{hours}h {minutes}m"
    
    @model_validator(mode='after')
    def validate_health_consistency(self) -> Self:
        """Ensure health status is consistent with metrics"""
        if self.status == "healthy" and self.overall_health_score < 70:
            raise ValueError("Health status inconsistent with computed score")
        return self

# Request/Response models for API endpoints
class EventBatchRequest(BaseModel):
    """Batch event submission request"""
    model_config = ConfigDict(validate_assignment=True)
    
    events: List[AnalyticsEvent] = Field(..., min_length=1, max_length=1000)
    
    @field_validator('events')
    @classmethod
    def validate_batch_size(cls, v: List[AnalyticsEvent]) -> List[AnalyticsEvent]:
        """Validate batch constraints"""
        if len(v) > 1000:
            raise ValueError("Batch too large (max 1000 events)")
        return v

class EventSearchRequest(BaseModel):
    """Event search request with filters"""
    model_config = ConfigDict(validate_assignment=True)
    
    user_id: Optional[UserId] = None
    event_type: Optional[EventType] = None
    start_time: Optional[datetime] = None 
    end_time: Optional[datetime] = None
    limit: int = Field(100, ge=1, le=10000)
    offset: int = Field(0, ge=0)
    
    @model_validator(mode='after')
    def validate_time_range(self) -> Self:
        """Validate time range"""
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

class EventSearchResponse(BaseModel):
    """Event search response"""
    events: List[AnalyticsEvent]
    total_count: int = Field(ge=0)
    has_more: bool
    
    @computed_field
    @property
    def page_info(self) -> Dict[str, Any]:
        """Pagination information"""
        return {
            "returned_count": len(self.events),
            "total_count": self.total_count,
            "has_more": self.has_more
        } 