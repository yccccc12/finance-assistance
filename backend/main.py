from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
import structlog
import logging
from datetime import datetime
from typing import Optional
import sys

from config import get_settings
from models.schemas import (
    ReceiptUploadResponse, 
    ErrorResponse, 
    HealthCheckResponse,
    ReceiptData,
    ReceiptItem
)

import os
import re
import time
import json
from pathlib import Path
import requests
import markdown
from bs4 import BeautifulSoup
import tempfile
import asyncio
from receipt_ocr.processors import ReceiptProcessor
from receipt_ocr.providers import OpenAIProvider

from elevenlabs import ElevenLabs
import anthropic

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Database Configuration
TIDB_HOST = os.getenv("TIDB_HOST")
TIDB_PORT = os.getenv("TIDB_PORT")
TIDB_USERNAME = os.getenv("TIDB_USERNAME")
TIDB_PASSWORD = os.getenv("TIDB_PASSWORD")
TIDB_DATABASE = os.getenv("TIDB_DATABASE")

DATABASE_URL = f"mysql+pymysql://{TIDB_USERNAME}:{TIDB_PASSWORD}@{TIDB_HOST}:{TIDB_PORT}/{TIDB_DATABASE}?ssl_verify_cert=true&ssl_verify_identity=true"

# Configure logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger(__name__)

# Get settings
settings = get_settings()

# Create database engine
engine = None
SessionLocal = None



try:
    # Create engine with SSL configuration for TiDB Cloud
    connect_args = {
        "ssl": {
            "ssl_mode": "VERIFY_IDENTITY"
        }
    }
    
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("✅ Database engine created successfully!")
except Exception as e:
    print(f"⚠️ Warning: Database connection failed: {e}")

# Set up Claude Client
claude_client = None
if ANTHROPIC_API_KEY is None:
    print("Warning: ANTHROPIC API key not configured.")
else:
    claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Set up ElevenLabs client
elevenlabs_client = None
if ELEVENLABS_API_KEY is None:
    print("Warning: ELEVENLABS API key not configured.")
else:
    elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

app = FastAPI(title="Hackathon RAG API")

# Configure CORS to allow frontend requests (simple wildcard, no credentials)
# Note: Browsers block wildcard + credentials, and our fetch calls do not send credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4028",
        "http://127.0.0.1:4028"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # Force CORS header when origin is present (belt-and-suspenders)
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Vary"] = "Origin"
    return response


# Helper function to get database session
def get_db():
    """Dependency to get database session"""
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# PyDantic models for the API endpoints
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    contextUsed: bool = False
    chunksFound: int = 0

class STTResponse(BaseModel):
    text: str
    language: Optional[str] = None

class ParseTransactionRequest(BaseModel):
    text: str

class ParseTransactionResponse(BaseModel):
    description: str
    amount: Optional[float] = None
    date: Optional[str] = None  # ISO format date string
    category: Optional[str] = None  # One of: food, transport, utilities, entertainment, healthcare, shopping, education, other

class ParseSubscriptionRequest(BaseModel):
    text: str

class ParseSubscriptionResponse(BaseModel):
    serviceName: str
    cost: Optional[float] = None
    billingFrequency: Optional[str] = None  # One of: monthly, quarterly, yearly
    nextPaymentDate: Optional[str] = None  # ISO format date string
    category: Optional[str] = None  # One of: Entertainment, Productivity, Health & Fitness, Education, Shopping, Utilities, Other
    description: Optional[str] = None

class TransactionBase(BaseModel):
    user_id: int
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_date: datetime  

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_date: Optional[datetime] = None

class TransactionOut(TransactionBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }

class SubscriptionBase(BaseModel):
    service_name: str
    cost: float
    payment_date: datetime
    category: Optional[str] = None
    description: Optional[str] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    service_name: Optional[str] = None
    cost: Optional[float] = None
    payment_date: Optional[datetime] = None
    category: Optional[str] = None
    description: Optional[str] = None

class SubscriptionOut(SubscriptionBase):
    subscription_id: int

    model_config = {
        "from_attributes": True
    }


@app.post("/transactions", response_model=TransactionOut)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    try:
        query = text("""
            INSERT INTO transactions (user_id, amount, category, description, purchase_date)
            VALUES (:user_id, :amount, :category, :description, :purchase_date)
        """)

        result = db.execute(query, data.dict())
        db.commit()

        new_id = result.lastrowid

        transaction = db.execute(
            text("SELECT * FROM transactions WHERE id = :id"),
            {"id": new_id}
        ).fetchone()

        return transaction

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/transactions", response_model=List[TransactionOut])
def get_all_transactions(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM transactions ORDER BY purchase_date DESC")).fetchall()
    return rows

@app.get("/transactions/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM transactions WHERE id = :id"),
        {"id": transaction_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return row

@app.put("/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: int, update: TransactionUpdate, db: Session = Depends(get_db)):
    updates = {k: v for k, v in update.dict().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    set_clause = ", ".join([f"{key} = :{key}" for key in updates])
    updates["id"] = transaction_id

    db.execute(text(f"""
        UPDATE transactions SET {set_clause}
        WHERE id = :id
    """), updates)

    db.commit()

    updated = db.execute(
        text("SELECT * FROM transactions WHERE id = :id"),
        {"id": transaction_id}
    ).fetchone()

    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return updated

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM transactions WHERE id = :id"),
        {"id": transaction_id}
    )
    db.commit()

    return {"message": "Transaction deleted successfully"}

@app.post("/subscriptions", response_model=SubscriptionOut)
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db)):
    try:
        query = text("""
            INSERT INTO subscriptions (service_name, cost, payment_date, category, description)
            VALUES (:service_name, :cost, :payment_date, :category, :description)
        """)

        result = db.execute(query, data.dict())
        db.commit()

        new_id = result.lastrowid

        subscription = db.execute(
            text("SELECT * FROM subscriptions WHERE subscription_id = :id"),
            {"id": new_id}
        ).fetchone()

        return subscription

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/subscriptions", response_model=List[SubscriptionOut])
def get_all_subscriptions(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM subscriptions ORDER BY payment_date DESC")).fetchall()
    return rows

@app.get("/subscriptions/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(subscription_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM subscriptions WHERE subscription_id = :id"),
        {"id": subscription_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return row

@app.put("/subscriptions/{subscription_id}", response_model=SubscriptionOut)
def update_subscription(subscription_id: int, update: SubscriptionUpdate, db: Session = Depends(get_db)):
    updates = {k: v for k, v in update.dict().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    set_clause = ", ".join([f"{key} = :{key}" for key in updates])
    updates["id"] = subscription_id

    db.execute(text(f"""
        UPDATE subscriptions SET {set_clause}
        WHERE subscription_id = :id
    """), updates)

    db.commit()

    updated = db.execute(
        text("SELECT * FROM subscriptions WHERE subscription_id = :id"),
        {"id": subscription_id}
    ).fetchone()

    if not updated:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return updated

@app.delete("/subscriptions/{subscription_id}")
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM subscriptions WHERE subscription_id = :id"),
        {"id": subscription_id}
    )
    db.commit()

    return {"message": "Subscription deleted successfully"}

# Get current date and time in malaysia timezone
def get_current_malaysia_time():
    import pytz
    malaysia_tz = pytz.timezone("Asia/Kuala_Lumpur")
    return datetime.now(malaysia_tz)

def get_all_transactions_data(db: Session):
    """
    Fetch all transactions from the database and return
    them as a list of dicts (easy to send to AI models).
    """
    rows = db.execute(
        text("SELECT * FROM transactions ORDER BY purchase_date DESC")
    ).fetchall()

    transactions = [dict(row._mapping) for row in rows]
    return transactions

def get_all_subscription_data(db: Session):
    """
    Fetch all subscriptions from the database and return
    them as a list of dicts (easy to send to AI models).
    """
    rows = db.execute(
        text("SELECT * FROM subscriptions ORDER BY payment_date DESC")
    ).fetchall()

    subscriptions = [dict(row._mapping) for row in rows]
    return subscriptions

@app.post("/claude", response_model=ChatResponse)
async def claude_chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Accepts a message from the user and returns a reply generated by Claude LLM.
    """
    try:
        if claude_client is None:
            return ChatResponse(reply="Claude API key not configured.", contextUsed=False, chunksFound=0)

        system_prompt = f"""
        You are an AI financial assistant helping users manage their personal finances.
        You can provide advice on budgeting, saving, spending analysis, debt management,
        and general financial planning. Be conversational, helpful, and provide actionable advice.

        Current Malaysia Time: {get_current_malaysia_time()}

        If the user asks about transactions, use the following data as reference:
        {get_all_transactions_data(db)}

        If the user asks about subscriptions, use the following data as reference:
        {get_all_subscription_data(db)}
        """

        res = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": request.message}],
        )

        reply_text = res.content[0].text

        return ChatResponse(
            reply=reply_text,
            contextUsed=True
        )

    except Exception as e:
        return ChatResponse(reply=f"Error generating Claude response: {str(e)}", contextUsed=False, chunksFound=0)
        
# Elevenlabs endpoint - Speech to Text
@app.post("/stt")
async def speech_to_text(request: Request):
    try:
        # Check if ElevenLabs client is available
        if elevenlabs_client is None:
            raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

        # Read raw binary audio directly from the request body
        audio_bytes = await request.body()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio received")

        # Call ElevenLabs STT
        transcription = elevenlabs_client.speech_to_text.convert(
            file=audio_bytes,
            model_id="scribe_v1",
            language_code = "eng"
        )

        return {"text": transcription.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")

# Parse transaction endpoint using Claude AI
@app.post("/parse-transaction", response_model=ParseTransactionResponse)
async def parse_transaction(request: ParseTransactionRequest):
    """
    Parse transaction data from natural language text using Claude AI.
    Extracts amount, date, description, and category from user's voice input.
    """
    try:
        if claude_client is None:
            raise HTTPException(status_code=500, detail="Claude API key not configured")

        current_date = get_current_malaysia_time()
        date_str = current_date.strftime("%Y-%m-%d")

        system_prompt = f"""
        You are a financial transaction parser. Extract transaction information from the user's spoken input.

        Available categories: food, transport, utilities, entertainment, healthcare, shopping, education, other

        Current date: {date_str}

        Return a JSON object with the following structure:
        {{
            "description": "A clear description of the transaction",
            "amount": 0.0,
            "date": "YYYY-MM-DD" or null if not specified (default to current date if not mentioned),
            "category": "one of the available categories" or null
        }}

        Rules:
        - Extract the amount in dollars (handle phrases like "25 dollars", "$25", "twenty five dollars")
        - Parse dates if mentioned (e.g., "yesterday", "today", "last week", "December 5th" should be converted to YYYY-MM-DD format)
        - If date is not mentioned, use current date: {date_str}
        - Extract a meaningful description (remove filler words like "I spent", "I paid")
        - Determine the most appropriate category based on keywords
        - Return ONLY valid JSON, no additional text or explanation
        """

        user_message = f"""Parse this transaction: "{request.text}"

        Return JSON with description, amount, date (YYYY-MM-DD or null), and category.
        """

        res = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        reply_text = res.content[0].text.strip()

        # Extract JSON from the response (handle markdown code blocks if present)
        try:
            # Try to parse the entire response as JSON first
            if reply_text.startswith("```"):
                # Extract JSON from markdown code block
                json_str = reply_text.split("```json")[-1].split("```")[0].strip()
                if not json_str:
                    json_str = reply_text.split("```")[1].strip()
            elif reply_text.startswith("{"):
                json_str = reply_text
            else:
                # Try to find JSON in the response
                start_idx = reply_text.find("{")
                end_idx = reply_text.rfind("}") + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = reply_text[start_idx:end_idx]
                else:
                    raise ValueError("No JSON found in response")

            parsed_data = json.loads(json_str)

            # Validate and set defaults
            description = parsed_data.get("description", request.text.strip())
            amount = parsed_data.get("amount")
            date = parsed_data.get("date") or date_str
            category = parsed_data.get("category")

            # Validate category
            valid_categories = ["food", "transport", "utilities", "entertainment", "healthcare", "shopping", "education", "other"]
            if category and category not in valid_categories:
                category = None

            return ParseTransactionResponse(
                description=description,
                amount=amount,
                date=date,
                category=category
            )
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            # Fallback: return basic structure with just description
            logger.error(f"Failed to parse Claude response: {e}", response=reply_text)
            return ParseTransactionResponse(
                description=request.text.strip(),
                amount=None,
                date=date_str,
                category=None
            )

    except Exception as e:
        logger.error(f"Error parsing transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse transaction: {str(e)}")

@app.post("/parse-subscription", response_model=ParseSubscriptionResponse)
async def parse_subscription(request: ParseSubscriptionRequest):
    """
    Parse subscription data from natural language text using Claude AI.
    Extracts service name, cost, billing frequency, next payment date, category, and description.
    """
    try:
        if claude_client is None:
            raise HTTPException(status_code=500, detail="Claude API key not configured")

        current_date = get_current_malaysia_time()
        date_str = current_date.strftime("%Y-%m-%d")

        system_prompt = f"""
        You are a subscription management parser. Extract subscription information from the user's spoken input.

        Available categories: Entertainment, Productivity, Health & Fitness, Education, Shopping, Utilities, Other

        Available billing frequencies: monthly, quarterly, yearly

        Current date: {date_str}

        Return a JSON object with the following structure:
        {{
            "serviceName": "Name of the service or subscription",
            "cost": 0.0,
            "billingFrequency": "monthly" or "quarterly" or "yearly" or null,
            "nextPaymentDate": "YYYY-MM-DD" or null if not specified,
            "category": "one of the available categories" or null,
            "description": "optional additional notes" or null
        }}

        Rules:
        - Extract the service name (e.g., "Netflix", "Spotify", "Amazon Prime")
        - Extract the cost in dollars (handle phrases like "15 dollars", "$15", "fifteen dollars per month")
        - Determine billing frequency from phrases like "monthly", "per month", "every month", "quarterly", "yearly", "annual", "per year"
        - Parse next payment date if mentioned (e.g., "next payment on December 15th", "renews on the 5th")
        - If next payment date is not mentioned, calculate it based on billing frequency (default to one month from current date for monthly)
        - Determine the most appropriate category based on service name and keywords
        - Extract any additional description or notes if mentioned
        - Return ONLY valid JSON, no additional text or explanation
        """

        user_message = f"""Parse this subscription: "{request.text}"

        Return JSON with serviceName, cost, billingFrequency (monthly/quarterly/yearly or null), nextPaymentDate (YYYY-MM-DD or null), category, and description (optional).
        """

        res = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        reply_text = res.content[0].text.strip()

        # Extract JSON from the response
        try:
            if reply_text.startswith("```"):
                json_str = reply_text.split("```json")[-1].split("```")[0].strip()
                if not json_str:
                    json_str = reply_text.split("```")[1].strip()
            elif reply_text.startswith("{"):
                json_str = reply_text
            else:
                start_idx = reply_text.find("{")
                end_idx = reply_text.rfind("}") + 1
                if start_idx != -1 and end_idx > start_idx:
                    json_str = reply_text[start_idx:end_idx]
                else:
                    raise ValueError("No JSON found in response")

            parsed_data = json.loads(json_str)

            # Validate and set defaults
            service_name = parsed_data.get("serviceName", request.text.strip())
            cost = parsed_data.get("cost")
            billing_frequency = parsed_data.get("billingFrequency", "monthly")
            next_payment_date = parsed_data.get("nextPaymentDate")
            category = parsed_data.get("category")
            description = parsed_data.get("description")

            # Validate billing frequency
            valid_frequencies = ["monthly", "quarterly", "yearly"]
            if billing_frequency and billing_frequency not in valid_frequencies:
                billing_frequency = "monthly"

            # Validate category
            valid_categories = ["Entertainment", "Productivity", "Health & Fitness", "Education", "Shopping", "Utilities", "Other"]
            if category and category not in valid_categories:
                category = "Other"

            # If next payment date is not provided, default based on billing frequency
            if not next_payment_date:
                from datetime import timedelta
                if billing_frequency == "monthly":
                    # Add approximately 30 days
                    next_payment_date = (current_date + timedelta(days=30)).strftime("%Y-%m-%d")
                elif billing_frequency == "quarterly":
                    # Add approximately 90 days
                    next_payment_date = (current_date + timedelta(days=90)).strftime("%Y-%m-%d")
                elif billing_frequency == "yearly":
                    # Add approximately 365 days
                    next_payment_date = (current_date + timedelta(days=365)).strftime("%Y-%m-%d")
                else:
                    # Default to one month
                    next_payment_date = (current_date + timedelta(days=30)).strftime("%Y-%m-%d")

            return ParseSubscriptionResponse(
                serviceName=service_name,
                cost=cost,
                billingFrequency=billing_frequency,
                nextPaymentDate=next_payment_date,
                category=category,
                description=description
            )
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            # Fallback: return basic structure
            logger.error(f"Failed to parse Claude response: {e}", response=reply_text)
            return ParseSubscriptionResponse(
                serviceName=request.text.strip(),
                cost=None,
                billingFrequency="monthly",
                nextPaymentDate=date_str,
                category=None,
                description=None
            )

    except Exception as e:
        logger.error(f"Error parsing subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse subscription: {str(e)}")

@app.get("/api/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns the status of the API and its dependencies.
    """
    receipt_ocr_configured = await check_receipt_ocr_health()
    
    logger.info("health_check", receipt_ocr_configured=receipt_ocr_configured)
    
    return HealthCheckResponse(
        status="healthy" if receipt_ocr_configured else "degraded",
        timestamp=datetime.utcnow(),
        version="1.0.0",
        taggun_configured=receipt_ocr_configured  # Keep field name for backward compatibility
    )


@app.post(
    "/api/receipt/process",
    response_model=ReceiptUploadResponse,
    status_code=200,
    tags=["Receipt Processing"]
)
async def process_receipt(
    file: UploadFile = File(..., description="Receipt image file (JPEG, PNG, HEIC, or PDF)")
):
    """
    Process a receipt image using Receipt OCR (receipt-ocr library).
    
    Args:
        file: The receipt image file to process
        
    Returns:
        ReceiptUploadResponse containing the extracted receipt data
        
    Raises:
        HTTPException: If file validation fails or processing errors occur
    """
    start_time = datetime.utcnow()
    
    logger.info(
        "receipt_upload_received",
        filename=file.filename,
        content_type=file.content_type,
        size=file.size if hasattr(file, 'size') else 'unknown'
    )
    
    # Validate file type
    if file.content_type not in settings.allowed_mime_types:
        logger.warning(
            "invalid_file_type",
            filename=file.filename,
            content_type=file.content_type
        )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.allowed_mime_types)}"
        )
    
    # Read file content
    try:
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size
        if file_size > settings.max_upload_size:
            logger.warning(
                "file_too_large",
                filename=file.filename,
                size=file_size,
                max_size=settings.max_upload_size
            )
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.max_upload_size / 1024 / 1024:.2f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="File is empty"
            )
            
    except Exception as e:
        logger.error("error_reading_file", filename=file.filename, error=str(e))
        raise HTTPException(
            status_code=400,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Process receipt with Receipt OCR
    try:
        # Process receipt using OCR
        receipt_response = await process_receipt_with_ocr(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type
        )
        
        # Parse the response
        receipt_data = parse_receipt_response(receipt_response)
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(
            "receipt_processed_successfully",
            filename=file.filename,
            processing_time=processing_time,
            merchant=receipt_data.store_name,
            total=receipt_data.total_amount
        )
        
        return ReceiptUploadResponse(
            success=True,
            message="Receipt processed successfully",
            data=receipt_data,
            processing_time=processing_time,
            raw_response=receipt_response if settings.debug else None
        )
        
    except ValueError as e:
        logger.error(
            "receipt_processing_error",
            filename=file.filename,
            error=str(e)
        )
        raise HTTPException(
            status_code=502,
            detail=f"Error processing receipt: {str(e)}"
        )
        
    except Exception as e:
        logger.error(
            "unexpected_processing_error",
            filename=file.filename,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the receipt"
        )


# Initialize Receipt OCR (using receipt-ocr library)
# Initialize provider and processor
receipt_ocr_api_key = settings.receipt_ocr_api_key
receipt_ocr_base_url = settings.receipt_ocr_base_url
receipt_ocr_model = settings.receipt_ocr_model

receipt_ocr_provider = None
receipt_ocr_processor = None

if receipt_ocr_api_key:
    try:
        # Check if using Groq with a text-only model
        is_groq = receipt_ocr_base_url and "groq.com" in receipt_ocr_base_url
        groq_vision_models = ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]
        is_groq_text_only = is_groq and receipt_ocr_model not in groq_vision_models
        
        if is_groq_text_only:
            logger.warning(
                "groq_vision_not_supported",
                message=f"Groq model '{receipt_ocr_model}' doesn't support vision/image inputs. receipt-ocr requires vision models. "
                        f"Consider using 'meta-llama/llama-4-scout-17b-16e-instruct' for Groq or OpenAI (gpt-4o)."
            )

        receipt_ocr_provider = OpenAIProvider(
            api_key=receipt_ocr_api_key,
            base_url=receipt_ocr_base_url if receipt_ocr_base_url else None
        )
        receipt_ocr_processor = ReceiptProcessor(receipt_ocr_provider)
        logger.info("receipt_ocr_initialized", model=receipt_ocr_model, is_groq=is_groq)
    except Exception as e:
        logger.error("receipt_ocr_init_error", error=str(e))


# Receipt OCR helper functions
async def process_receipt_with_ocr(file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """Process a receipt image using receipt-ocr library."""
    if not receipt_ocr_api_key:
        raise ValueError(
            "Receipt OCR API key is not configured. Set RECEIPT_OCR_API_KEY in your environment or .env file."
        )
    
    if not receipt_ocr_processor:
        raise ValueError(
            "Receipt OCR processor is not initialized. Check your API key and configuration."
        )
    
    # Check if using Groq with a text-only model
    is_groq = receipt_ocr_base_url and "groq.com" in receipt_ocr_base_url
    groq_vision_models = ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]
    is_groq_text_only = is_groq and receipt_ocr_model not in groq_vision_models
    
    if is_groq_text_only:
        raise ValueError(
            f"Groq model '{receipt_ocr_model}' doesn't support vision/image inputs. The receipt-ocr library requires vision models.\n"
            "Options:\n"
            "1. Use Groq's vision model: set RECEIPT_OCR_MODEL=meta-llama/llama-4-scout-17b-16e-instruct\n"
            "2. Use OpenAI (gpt-4o) which supports vision - set RECEIPT_OCR_BASE_URL to https://api.openai.com/v1 or leave empty\n"
            "3. Use a hybrid approach with local OCR (Tesseract) + Groq for text processing\n"
            f"Current model: {receipt_ocr_model}"
        )
    
    logger.info(
        "processing_receipt",
        filename=filename,
        content_type=content_type,
        file_size=len(file_content),
        model=receipt_ocr_model
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
                lambda: receipt_ocr_processor.process_receipt(
                    tmp_file_path,
                    json_schema,
                    receipt_ocr_model,
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


def parse_receipt_response(receipt_data: Dict[str, Any]) -> ReceiptData:
    """Parse receipt-ocr response into our ReceiptData model."""
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


async def check_receipt_ocr_health() -> bool:
    """Check if Receipt OCR is accessible and properly configured."""
    try:
        return bool(receipt_ocr_api_key and receipt_ocr_processor is not None)
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return False


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    logger.error(
        "http_exception",
        path=request.url.path,
        status_code=exc.status_code,
        detail=exc.detail
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            message=str(exc.detail),
            error_code=f"HTTP_{exc.status_code}"
        ).model_dump(by_alias=True)
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            success=False,
            message="An internal server error occurred",
            error_code="INTERNAL_ERROR",
            details={"error": str(exc)} if settings.debug else {}
        ).model_dump(by_alias=True)
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("application_starting", version="1.0.0")
    yield
    # Shutdown
    logger.info("application_shutting_down")

@app.post(
    "/api/receipt/process-url",
    response_model=ReceiptUploadResponse,
    status_code=200,
    tags=["Receipt Processing"]
)

async def process_receipt_from_url(url: str):
    """
    Process a receipt from a URL.
    
    Args:
        url: URL of the receipt image
        
    Returns:
        ReceiptUploadResponse containing the extracted receipt data
    """
    # This endpoint could be implemented to download from URL and process
    # For now, returning a not implemented response
    raise HTTPException(
        status_code=501,
        detail="URL processing not yet implemented. Please use file upload."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)