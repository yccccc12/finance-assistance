"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date


class ReceiptItem(BaseModel):
    """Model for individual receipt items."""
    name: str = Field(..., description="Item name")
    price: float = Field(..., description="Item price")
    quantity: Optional[int] = Field(1, description="Item quantity")
    category: Optional[str] = Field(None, description="Item category")


class ReceiptData(BaseModel):
    """Model for extracted receipt data."""
    store_name: Optional[str] = Field(None, alias="storeName", description="Store/merchant name")
    total_amount: float = Field(..., alias="totalAmount", description="Total amount")
    subtotal: Optional[float] = Field(None, description="Subtotal before tax")
    tax: Optional[float] = Field(None, description="Tax amount")
    tip: Optional[float] = Field(None, description="Tip amount")
    date: Optional[str] = Field(None, description="Receipt date")
    time: Optional[str] = Field(None, description="Receipt time")
    items: List[ReceiptItem] = Field(default_factory=list, description="List of items")
    currency: Optional[str] = Field("USD", description="Currency code")
    payment_method: Optional[str] = Field(None, alias="paymentMethod", description="Payment method")
    address: Optional[str] = Field(None, description="Store address")
    phone: Optional[str] = Field(None, description="Store phone number")
    confidence: Optional[float] = Field(None, description="OCR confidence score")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "storeName": "Whole Foods Market",
                "totalAmount": 87.45,
                "subtotal": 80.00,
                "tax": 7.45,
                "date": "2025-12-05",
                "items": [
                    {"name": "Organic Bananas", "price": 3.99, "quantity": 1},
                    {"name": "Almond Milk", "price": 4.50, "quantity": 2}
                ]
            }
        }


class ReceiptUploadResponse(BaseModel):
    """Response model for receipt upload."""
    success: bool = Field(..., description="Whether the processing was successful")
    message: str = Field(..., description="Response message")
    data: Optional[ReceiptData] = Field(None, description="Extracted receipt data")
    processing_time: Optional[float] = Field(None, alias="processingTime", description="Processing time in seconds")
    raw_response: Optional[Dict[str, Any]] = Field(None, alias="rawResponse", description="Raw Taggun response")
    
    class Config:
        populate_by_name = True


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    message: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, alias="errorCode", description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    
    class Config:
        populate_by_name = True


class HealthCheckResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Current timestamp")
    version: str = Field("1.0.0", description="API version")
    taggun_configured: bool = Field(..., alias="taggunConfigured", description="Whether Taggun API is configured")
    
    class Config:
        populate_by_name = True
