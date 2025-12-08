"""
Receipt OCR Service using receipt-ocr library
Handles all interactions with receipt-ocr for receipt processing.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog
import tempfile
import os
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

from receipt_ocr.processors import ReceiptProcessor
from receipt_ocr.providers import OpenAIProvider
from models.schemas import ReceiptData, ReceiptItem
from config import get_settings

# Configure structured logging
logger = structlog.get_logger(__name__)


class ReceiptOCRService:
    """Service class for processing receipts using receipt-ocr library."""
    
    def __init__(self):
        """Initialize the Receipt OCR service with configuration."""
        self.settings = get_settings()
        self.api_key = self.settings.receipt_ocr_api_key
        self.base_url = self.settings.receipt_ocr_base_url
        self.model = self.settings.receipt_ocr_model
        
        if not self.api_key:
            logger.warning(
                "receipt_ocr_api_key_missing",
                message="RECEIPT_OCR_API_KEY is not configured; receipt processing will fail until set."
            )
        
        # Initialize the provider and processor
        self.provider = None
        self.processor = None
        
        if self.api_key:
            try:
                # Check if using Groq with a text-only model
                is_groq = self.base_url and "groq.com" in self.base_url
                groq_vision_models = ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]
                is_groq_text_only = is_groq and self.model not in groq_vision_models
                
                if is_groq_text_only:
                    logger.warning(
                        "groq_vision_not_supported",
                        message=f"Groq model '{self.model}' doesn't support vision/image inputs. receipt-ocr requires vision models. "
                                f"Consider using 'meta-llama/llama-4-scout-17b-16e-instruct' for Groq or OpenAI (gpt-4o)."
                    )

                self.provider = OpenAIProvider(
                    api_key=self.api_key,
                    base_url=self.base_url if self.base_url else None
                )
                self.processor = ReceiptProcessor(self.provider)
                logger.info("receipt_ocr_initialized", model=self.model, is_groq=is_groq)
            except Exception as e:
                logger.error("receipt_ocr_init_error", error=str(e))
    
    async def process_receipt(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Process a receipt image using receipt-ocr library.
        
        Args:
            file_content: The binary content of the receipt image
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Dictionary containing the extracted receipt data
            
        Raises:
            ValueError: If the API key is not configured or processing fails
        """
        if not self.api_key:
            raise ValueError(
                "Receipt OCR API key is not configured. Set RECEIPT_OCR_API_KEY in your environment or .env file."
            )
        
        if not self.processor:
            raise ValueError(
                "Receipt OCR processor is not initialized. Check your API key and configuration."
            )
        
        # Check if using Groq with a text-only model
        is_groq = self.base_url and "groq.com" in self.base_url
        groq_vision_models = ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]
        is_groq_text_only = is_groq and self.model not in groq_vision_models
        
        if is_groq_text_only:
            raise ValueError(
                f"Groq model '{self.model}' doesn't support vision/image inputs. The receipt-ocr library requires vision models.\n"
                "Options:\n"
                "1. Use Groq's vision model: set RECEIPT_OCR_MODEL=meta-llama/llama-4-scout-17b-16e-instruct\n"
                "2. Use OpenAI (gpt-4o) which supports vision - set RECEIPT_OCR_BASE_URL to https://api.openai.com/v1 or leave empty\n"
                "3. Use a hybrid approach with local OCR (Tesseract) + Groq for text processing\n"
                f"Current model: {self.model}"
            )
        
        logger.info(
            "processing_receipt",
            filename=filename,
            content_type=content_type,
            file_size=len(file_content),
            model=self.model
        )
        
        start_time = datetime.utcnow()
        
        try:
            # Save file content to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            try:
                # Define JSON schema for extraction
                json_schema = {
                    "merchant_name": "string",
                    "merchant_address": "string",
                    "transaction_date": "string",
                    "transaction_time": "string",
                    "total_amount": "number",
                    "subtotal_amount": "number",
                    "tax_amount": "number",
                    "tip_amount": "number",
                    "currency": "string",
                    "payment_method": "string",
                    "merchant_phone": "string",
                    "line_items": [
                        {
                            "item_name": "string",
                            "item_quantity": "number",
                            "item_price": "number",
                            "item_total": "number"
                        }
                    ]
                }
                
                # Process the receipt (run in executor since it's synchronous)
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: self.processor.process_receipt(
                        tmp_file_path,
                        json_schema,
                        self.model,
                        response_format_type="json_object"
                    )
                )
                
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                
                logger.info(
                    "receipt_processed_successfully",
                    filename=filename,
                    processing_time=processing_time
                )
                
                return result
                
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                    
        except Exception as e:
            logger.error("receipt_ocr_processing_error", filename=filename, error=str(e))
            raise ValueError(f"Error processing receipt: {str(e)}")
    
    def parse_receipt_response(self, receipt_data: Dict[str, Any]) -> ReceiptData:
        """
        Parse receipt-ocr response into our ReceiptData model.
        
        Args:
            receipt_data: Raw response from receipt-ocr
            
        Returns:
            ReceiptData object with parsed information
        """
        try:
            # Extract merchant information
            merchant_name = receipt_data.get('merchant_name') or 'Unknown'
            
            # Extract amounts
            total_amount = float(receipt_data.get('total_amount', 0.0))
            subtotal = receipt_data.get('subtotal_amount')
            subtotal = float(subtotal) if subtotal is not None else None
            
            tax = receipt_data.get('tax_amount')
            tax = float(tax) if tax is not None else None
            
            tip = receipt_data.get('tip_amount')
            tip = float(tip) if tip is not None else None
            
            # Extract date and time
            receipt_date = receipt_data.get('transaction_date')
            receipt_time = receipt_data.get('transaction_time')
            
            # Extract line items
            items = []
            line_items = receipt_data.get('line_items', [])
            for item in line_items:
                try:
                    item_name = item.get('item_name', 'Unknown Item')
                    item_price = float(item.get('item_price', 0.0))
                    item_quantity = int(item.get('item_quantity', 1))
                    
                    if item_name and item_price > 0:
                        items.append(ReceiptItem(
                            name=item_name,
                            price=item_price,
                            quantity=item_quantity,
                            category=None
                        ))
                except (ValueError, TypeError) as e:
                    logger.warning("error_parsing_line_item", item=item, error=str(e))
                    continue
            
            # Extract additional information
            currency = receipt_data.get('currency', 'USD')
            payment_method = receipt_data.get('payment_method')
            address = receipt_data.get('merchant_address')
            phone = receipt_data.get('merchant_phone')
            
            receipt_data_obj = ReceiptData(
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
                confidence=None  # receipt-ocr doesn't provide confidence score
            )
            
            logger.info(
                "receipt_response_parsed",
                merchant=merchant_name,
                total=total_amount,
                items_count=len(items)
            )
            
            return receipt_data_obj
            
        except Exception as e:
            logger.error("error_parsing_receipt_response", error=str(e))
            # Return minimal data if parsing fails
            return ReceiptData(
                store_name="Unknown",
                total_amount=0.0,
                items=[]
            )
    
    async def health_check(self) -> bool:
        """
        Check if the Receipt OCR service is accessible and properly configured.
        
        Returns:
            True if the service is configured, False otherwise
        """
        try:
            return bool(self.api_key and self.processor is not None)
        except Exception as e:
            logger.error("health_check_failed", error=str(e))
            return False

