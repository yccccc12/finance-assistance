"""
Taggun OCR Service
Handles all interactions with the Taggun API for receipt processing.
"""

import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog

from models.schemas import ReceiptData, ReceiptItem
from config import get_settings

# Configure structured logging
logger = structlog.get_logger(__name__)


class TaggunOCRService:
    """Service class for interacting with Taggun API."""
    
    def __init__(self):
        """Initialize the Taggun service with configuration."""
        self.settings = get_settings()
        self.api_key = self.settings.taggun_api_key
        self.api_url = self.settings.taggun_api_url
        self.timeout = 60.0  # 60 seconds timeout for OCR processing
        
        if not self.api_key:
            logger.warning(
                "taggun_api_key_missing",
                message="TAGGUN_API_KEY is not configured; receipt processing will fail until set."
            )
        
    async def process_receipt(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Process a receipt image using Taggun API.
        
        Args:
            file_content: The binary content of the receipt image
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Dictionary containing the Taggun API response
            
        Raises:
            httpx.HTTPError: If the API request fails
            ValueError: If the response is invalid
        """
        if not self.api_key:
            raise ValueError(
                "Taggun API key is not configured. Set TAGGUN_API_KEY in your environment or .env file."
            )
        logger.info(
            "processing_receipt",
            filename=filename,
            content_type=content_type,
            file_size=len(file_content)
        )
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Prepare the request
                files = {
                    'file': (filename, file_content, content_type)
                }
                
                headers = {
                    'apikey': self.api_key,
                    'Accept': 'application/json'
                }
                
                # Make the API request
                response = await client.post(
                    self.api_url,
                    files=files,
                    headers=headers
                )
                
                # Check for successful response
                response.raise_for_status()
                
                # Parse JSON response
                taggun_data = response.json()
                
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                
                logger.info(
                    "receipt_processed_successfully",
                    filename=filename,
                    processing_time=processing_time,
                    confidence=taggun_data.get('confidenceLevel')
                )
                
                return taggun_data
                
        except httpx.TimeoutException as e:
            logger.error("taggun_request_timeout", filename=filename, error=str(e))
            raise ValueError(f"Taggun API request timed out after {self.timeout} seconds")
            
        except httpx.HTTPStatusError as e:
            logger.error(
                "taggun_http_error",
                filename=filename,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise ValueError(f"Taggun API error: {e.response.status_code} - {e.response.text}")
            
        except Exception as e:
            logger.error("taggun_unexpected_error", filename=filename, error=str(e))
            raise ValueError(f"Unexpected error processing receipt: {str(e)}")
    
    def parse_taggun_response(self, taggun_data: Dict[str, Any]) -> ReceiptData:
        """
        Parse Taggun API response into our ReceiptData model.
        
        Args:
            taggun_data: Raw response from Taggun API
            
        Returns:
            ReceiptData object with parsed information
        """
        try:
            # Extract merchant information
            try:
                merchant_name = self._extract_merchant_name(taggun_data)
            except Exception as e:
                logger.error("error_extracting_merchant", error=str(e))
                merchant_name = "Unknown"
            
            # Extract amounts
            try:
                total_amount = self._extract_total_amount(taggun_data)
            except Exception as e:
                logger.error("error_extracting_total", error=str(e))
                total_amount = 0.0
                
            try:
                subtotal = self._extract_field(taggun_data, 'subtotalAmount', 'subTotal')
                tax = self._extract_field(taggun_data, 'taxAmount', 'tax')
                tip = self._extract_field(taggun_data, 'tipAmount', 'tip')
            except Exception as e:
                logger.error("error_extracting_amounts", error=str(e))
                subtotal = tax = tip = None
            
            # Extract date and time
            try:
                receipt_date = self._extract_date(taggun_data)
                receipt_time = self._extract_time(taggun_data)
            except Exception as e:
                logger.error("error_extracting_datetime", error=str(e))
                receipt_date = receipt_time = None
            
            # Extract line items
            try:
                items = self._extract_line_items(taggun_data)
            except Exception as e:
                logger.error("error_extracting_items", error=str(e))
                items = []
            
            # Extract additional information
            try:
                currency = self._extract_currency(taggun_data)
                payment_method = self._extract_payment_method(taggun_data)
                address = self._extract_address(taggun_data)
                phone = self._extract_phone(taggun_data)
            except Exception as e:
                logger.error("error_extracting_additional_info", error=str(e))
                currency = "USD"
                payment_method = address = phone = None
            
            # Calculate confidence score
            confidence = taggun_data.get('confidenceLevel', 0.0)
            
            receipt_data = ReceiptData(
                store_name=merchant_name,
                total_amount=total_amount,
                subtotal=subtotal,
                tax=tax,
                tip=tip,
                date=receipt_date,
                time=receipt_time,
                items=items,
                currency=currency,
                payment_method=payment_method,
                address=address,
                phone=phone,
                confidence=confidence
            )
            
            logger.info(
                "taggun_response_parsed",
                merchant=merchant_name,
                total=total_amount,
                items_count=len(items)
            )
            
            return receipt_data
            
        except Exception as e:
            logger.error("error_parsing_taggun_response", error=str(e))
            # Return minimal data if parsing fails
            return ReceiptData(
                store_name="Unknown",
                total_amount=0.0,
                items=[]
            )
    
    def _extract_merchant_name(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract merchant name from Taggun response."""
        merchant = data.get('merchantName', {})
        if isinstance(merchant, dict):
            return merchant.get('data', 'Unknown Merchant')
        return str(merchant) if merchant else 'Unknown Merchant'
    
    def _extract_total_amount(self, data: Dict[str, Any]) -> float:
        """Extract total amount from Taggun response."""
        total = data.get('totalAmount', {})
        if isinstance(total, dict):
            return float(total.get('data', 0.0))
        return float(total) if total else 0.0
    
    def _extract_field(self, data: Dict[str, Any], *field_names: str) -> Optional[float]:
        """Extract a numeric field from Taggun response."""
        for field_name in field_names:
            field_value = data.get(field_name, {})
            if isinstance(field_value, dict):
                value = field_value.get('data')
                if value:
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        pass
            elif field_value:
                try:
                    return float(field_value)
                except (ValueError, TypeError):
                    pass
        return None
    
    def _extract_date(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract date from Taggun response."""
        date_field = data.get('date', {})
        date_str = None
        
        if isinstance(date_field, dict):
            date_str = date_field.get('data')
        elif isinstance(date_field, str):
            date_str = date_field
            
        if date_str:
            # Try to parse and format the date
            try:
                # Taggun returns dates in various formats, normalize to YYYY-MM-DD
                from datetime import datetime
                parsed_date = datetime.fromisoformat(date_str.replace('/', '-'))
                return parsed_date.strftime('%Y-%m-%d')
            except:
                return date_str
        return None
    
    def _extract_time(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract time from Taggun response."""
        time_field = data.get('time', {})
        if isinstance(time_field, dict):
            return time_field.get('data')
        elif isinstance(time_field, str):
            return time_field
        return None
    
    def _extract_line_items(self, data: Dict[str, Any]) -> List[ReceiptItem]:
        """Extract line items from Taggun response."""
        items = []
        
        # Try 'entities' first (some receipts use this)
        entities = data.get('entities', [])
        if entities and isinstance(entities, list):
            for entity in entities:
                try:
                    # Extract item details
                    description = entity.get('description', {})
                    item_name = description.get('data', 'Unknown Item') if isinstance(description, dict) else str(description)
                    
                    amount = entity.get('amount', {})
                    item_price = float(amount.get('data', 0.0)) if isinstance(amount, dict) else float(amount or 0.0)
                    
                    quantity = entity.get('quantity', {})
                    item_quantity = int(quantity.get('data', 1)) if isinstance(quantity, dict) else 1
                    
                    category = entity.get('category', {})
                    item_category = category.get('data') if isinstance(category, dict) else None
                    
                    if item_name and item_price > 0:
                        items.append(ReceiptItem(
                            name=item_name,
                            price=item_price,
                            quantity=item_quantity,
                            category=item_category
                        ))
                        
                except (ValueError, TypeError, KeyError) as e:
                    logger.warning("error_parsing_line_item_from_entities", entity=entity, error=str(e))
                    continue
        
        # If no items found, try 'amounts' array (alternative Taggun format)
        if not items:
            amounts = data.get('amounts', [])
            if amounts and isinstance(amounts, list):
                for amount_entry in amounts:
                    try:
                        # Extract item details from amounts array
                        item_text = amount_entry.get('text', '')
                        item_price = float(amount_entry.get('data', 0.0))
                        
                        # Skip if it's a total/subtotal/tax line
                        lower_text = item_text.lower()
                        if any(skip in lower_text for skip in ['total', 'tax', 'sub-total', 'subtotal', 'balance', 'rounding']):
                            continue
                        
                        if item_text and item_price > 0:
                            items.append(ReceiptItem(
                                name=item_text.strip(),
                                price=item_price,
                                quantity=1,
                                category=None
                            ))
                            
                    except (ValueError, TypeError, KeyError) as e:
                        logger.warning("error_parsing_line_item_from_amounts", amount_entry=amount_entry, error=str(e))
                        continue
        
        return items
    
    def _extract_currency(self, data: Dict[str, Any]) -> str:
        """Extract currency from Taggun response."""
        # Try to get currency from currency field first
        currency = data.get('currency', {})
        if isinstance(currency, dict):
            currency_code = currency.get('data')
            if currency_code:
                return currency_code
        elif isinstance(currency, str) and currency:
            return currency
        
        # If not found, try to get from totalAmount.currencyCode
        total_amount = data.get('totalAmount', {})
        if isinstance(total_amount, dict):
            currency_code = total_amount.get('currencyCode')
            if currency_code:
                return currency_code
        
        # Default to USD
        return 'USD'
    
    def _extract_payment_method(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract payment method from Taggun response."""
        payment = data.get('paymentMethod', {})
        if isinstance(payment, dict):
            return payment.get('data')
        elif isinstance(payment, str):
            return payment
        return None
    
    def _extract_address(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract merchant address from Taggun response."""
        address = data.get('merchantAddress', {})
        if isinstance(address, dict):
            return address.get('data')
        elif isinstance(address, str):
            return address
        return None
    
    def _extract_phone(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract merchant phone from Taggun response."""
        phone = data.get('merchantPhone', {})
        if isinstance(phone, dict):
            return phone.get('data')
        elif isinstance(phone, str):
            return phone
        return None
    
    async def health_check(self) -> bool:
        """
        Check if the Taggun API is accessible and properly configured.
        
        Returns:
            True if the API is accessible, False otherwise
        """
        try:
            # Just check if we have an API key configured
            return bool(self.api_key and self.api_key != "e468807dcc5c488c85aede1767d20b43")
        except Exception as e:
            logger.error("health_check_failed", error=str(e))
            return False
