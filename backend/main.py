# ============================================================================
# IMPORTS
# ============================================================================
# Standard library imports
import os
import sys
import json
import asyncio
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

# Third-party imports
from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
import structlog
import anthropic
from elevenlabs import ElevenLabs
from receipt_ocr.processors import ReceiptProcessor
from receipt_ocr.providers import OpenAIProvider

# Local imports
from config import get_settings
from models.schemas import (
    ReceiptUploadResponse,
    ErrorResponse,
    HealthCheckResponse,
    ReceiptData,
    ReceiptItem
)

# ============================================================================
# CONFIGURATION & SETUP
# ============================================================================
# Load environment variables
load_dotenv()

# Environment variables
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Database configuration
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

# ============================================================================
# DATABASE SETUP
# ============================================================================
engine = None
SessionLocal = None

try:
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

# ============================================================================
# CLIENT INITIALIZATION
# ============================================================================
# Claude client
claude_client = None
if ANTHROPIC_API_KEY is None:
    print("Warning: ANTHROPIC API key not configured.")
else:
    claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ElevenLabs client
elevenlabs_client = None
if ELEVENLABS_API_KEY is None:
    print("Warning: ELEVENLABS API key not configured.")
else:
    elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Receipt OCR initialization
receipt_ocr_api_key = settings.receipt_ocr_api_key
receipt_ocr_base_url = settings.receipt_ocr_base_url
receipt_ocr_model = settings.receipt_ocr_model

receipt_ocr_provider = None
receipt_ocr_processor = None

if receipt_ocr_api_key:
    try:
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

# ============================================================================
# FASTAPI APP & MIDDLEWARE
# ============================================================================
app = FastAPI(title="Hackathon RAG API")

# Configure CORS
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

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Vary"] = "Origin"
    return response

# ============================================================================
# DEPENDENCIES
# ============================================================================
def get_db():
    """Dependency to get database session"""
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================
# AI Chat Models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    contextUsed: bool = False
    chunksFound: int = 0

class STTResponse(BaseModel):
    text: str
    language: Optional[str] = None

# Transaction Models
class ParseTransactionRequest(BaseModel):
    text: str

class ParseTransactionResponse(BaseModel):
    description: str
    amount: Optional[float] = None
    date: Optional[str] = None  # ISO format date string
    category: Optional[str] = None  # One of: food, transport, entertainment, healthcare, shopping, education, savings, other
    transaction_type: Optional[str] = None  # "income" or "expense"

class TransactionBase(BaseModel):
    user_id: int
    amount: float
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_date: datetime
    transaction_type: Optional[str] = "expense"  # "income" or "expense"

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    purchase_date: Optional[datetime] = None
    transaction_type: Optional[str] = None

class TransactionOut(TransactionBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }

# Subscription Models
class ParseSubscriptionRequest(BaseModel):
    text: str

class ParseSubscriptionResponse(BaseModel):
    serviceName: str
    cost: Optional[float] = None
    billingFrequency: Optional[str] = None  # One of: monthly, quarterly, yearly
    nextPaymentDate: Optional[str] = None  # ISO format date string
    category: Optional[str] = None  # One of: Entertainment, Productivity, Health & Fitness, Education, Shopping, Utilities, Other
    description: Optional[str] = None

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

# Dashboard Models
class DashboardMetrics(BaseModel):
    title: str
    value: str
    change: Optional[str] = None
    changeType: Optional[str] = None  # 'positive', 'negative', 'neutral'
    icon: str
    iconColor: str

class DashboardTransaction(BaseModel):
    id: int
    description: str
    amount: float
    date: str  # MM/DD/YYYY format
    category: str
    type: str  # 'income' or 'expense'

class DashboardRenewal(BaseModel):
    id: int
    name: str
    amount: float
    renewalDate: str  # MM/DD/YYYY format
    daysUntil: int

class CategorySpending(BaseModel):
    name: str
    value: float
    percentage: float

class CashFlowData(BaseModel):
    month: str
    income: float
    expenses: float

class QuickAction(BaseModel):
    title: str
    description: str
    icon: str
    iconColor: str
    href: str

class DashboardResponse(BaseModel):
    metrics: List[DashboardMetrics]
    cashFlowData: List[CashFlowData]
    recentTransactions: List[DashboardTransaction]
    upcomingRenewals: List[DashboardRenewal]
    categorySpending: List[CategorySpending]
    quickActions: List[QuickAction]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def get_current_malaysia_time():
    """Get current date and time in Malaysia timezone"""
    import pytz
    malaysia_tz = pytz.timezone("Asia/Kuala_Lumpur")
    return datetime.now(malaysia_tz)

def get_all_transactions_data(db: Session):
    """Fetch all transactions from the database and return them as a list of dicts"""
    rows = db.execute(
        text("SELECT * FROM transactions ORDER BY purchase_date DESC")
    ).fetchall()
    return [dict(row._mapping) for row in rows]

def get_all_subscription_data(db: Session):
    """Fetch all subscriptions from the database and return them as a list of dicts"""
    rows = db.execute(
        text("SELECT * FROM subscriptions ORDER BY payment_date DESC")
    ).fetchall()
    return [dict(row._mapping) for row in rows]

def _compute_dashboard_metrics(db: Session):
    """
    Internal function to compute dashboard metrics.
    Returns raw data that can be used by both the dashboard endpoint and AI endpoint.
    """
    from datetime import timedelta
    from collections import defaultdict
    from decimal import Decimal
    
    current_date = get_current_malaysia_time()
    
    def to_float(value):
        if value is None:
            return 0.0
        if isinstance(value, Decimal):
            return float(value)
        return float(value)
    
    def parse_date(date_value):
        if date_value is None:
            return None
        if isinstance(date_value, datetime):
            dt = date_value
        elif isinstance(date_value, str):
            try:
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                try:
                    dt = datetime.strptime(date_value, '%Y-%m-%d %H:%M:%S')
                except:
                    return None
        else:
            return None
        
        import pytz
        malaysia_tz = pytz.timezone("Asia/Kuala_Lumpur")
        if dt.tzinfo is None:
            dt = malaysia_tz.localize(dt)
        else:
            dt = dt.astimezone(malaysia_tz)
        
        return dt
    
    transactions_rows = db.execute(
        text("SELECT * FROM transactions ORDER BY purchase_date DESC")
    ).fetchall()
    transactions = [dict(row._mapping) for row in transactions_rows]
    
    subscriptions_rows = db.execute(
        text("SELECT * FROM subscriptions ORDER BY payment_date ASC")
    ).fetchall()
    subscriptions = [dict(row._mapping) for row in subscriptions_rows]
    
    total_income = sum(to_float(t.get('amount', 0)) for t in transactions if t.get('transaction_type') == 'income')
    total_expenses = abs(sum(to_float(t.get('amount', 0)) for t in transactions if t.get('transaction_type') == 'expense'))
    current_balance = total_income - total_expenses
    
    current_month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_expenses = 0.0
    monthly_income = 0.0
    
    for t in transactions:
        if t.get('transaction_type') == 'expense':
            purchase_date = parse_date(t.get('purchase_date'))
            if purchase_date and purchase_date >= current_month_start:
                monthly_expenses += abs(to_float(t.get('amount', 0)))
        elif t.get('transaction_type') == 'income':
            purchase_date = parse_date(t.get('purchase_date'))
            if purchase_date and purchase_date >= current_month_start:
                monthly_income += to_float(t.get('amount', 0))
    
    savings_rate = ((monthly_income - monthly_expenses) / monthly_income * 100) if monthly_income > 0 else 0.0
    
    category_map = {
        'food': 'Food & Dining',
        'transport': 'Transportation',
        'entertainment': 'Entertainment',
        'healthcare': 'Healthcare',
        'shopping': 'Shopping',
        'education': 'Education',
        'savings': 'Savings',
        'other': 'Other'
    }
    
    category_totals = defaultdict(float)
    for t in transactions:
        purchase_date = parse_date(t.get('purchase_date'))
        if purchase_date and purchase_date >= current_month_start and t.get('transaction_type') == 'expense':
            category = category_map.get(t.get('category', '').lower(), t.get('category', 'Other'))
            category_totals[category] += abs(to_float(t.get('amount', 0)))
    
    seven_days_later = current_date + timedelta(days=7)
    upcoming_renewals = []
    
    for sub in subscriptions:
        payment_date = parse_date(sub.get('payment_date'))
        if payment_date and current_date <= payment_date <= seven_days_later:
            days_until = (payment_date - current_date).days
            upcoming_renewals.append({
                'id': sub.get('subscription_id', 0),
                'name': sub.get('service_name', 'Unknown'),
                'amount': to_float(sub.get('cost', 0)),
                'days_until': days_until,
                'date': payment_date.strftime("%m/%d/%Y")
            })
    
    return {
        'transactions': transactions,
        'subscriptions': subscriptions,
        'current_balance': current_balance,
        'monthly_income': monthly_income,
        'monthly_expenses': monthly_expenses,
        'savings_rate': savings_rate,
        'category_totals': category_totals,
        'category_map': category_map,
        'upcoming_renewals': upcoming_renewals,
        'current_date': current_date,
        'current_month_start': current_month_start,
        'to_float': to_float,
        'parse_date': parse_date
    }

def get_dashboard_data_for_ai(db: Session):
    """Get dashboard data formatted for AI consumption"""
    try:
        data = _compute_dashboard_metrics(db)
        
        return {
            'current_balance': data['current_balance'],
            'monthly_income': data['monthly_income'],
            'monthly_expenses': data['monthly_expenses'],
            'savings_rate': data['savings_rate'],
            'category_breakdown': dict(sorted(data['category_totals'].items(), key=lambda x: x[1], reverse=True)),
            'upcoming_renewals': [
                {
                    'name': r['name'],
                    'amount': r['amount'],
                    'days_until': r['days_until'],
                    'date': r['date']
                }
                for r in data['upcoming_renewals']
            ],
            'total_subscriptions': len(data['subscriptions']),
            'recent_transactions_count': len(data['transactions'][:5])
        }
    except Exception as e:
        logger.error(f"Error getting dashboard data for AI: {e}")
        return None

# Receipt OCR helper functions
async def process_receipt_with_ocr(file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """Process a receipt image using receipt-ocr library"""
    if not receipt_ocr_api_key:
        raise ValueError(
            "Receipt OCR API key is not configured. Set RECEIPT_OCR_API_KEY in your environment or .env file."
        )
    
    if not receipt_ocr_processor:
        raise ValueError(
            "Receipt OCR processor is not initialized. Check your API key and configuration."
        )
    
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
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
            tmp_file.write(file_content)
            tmp_file_path = tmp_file.name
        
        try:
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
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        logger.error("receipt_ocr_processing_error", filename=filename, error=str(e))
        raise ValueError(f"Error processing receipt: {str(e)}")

def parse_receipt_response(receipt_data: Dict[str, Any]) -> ReceiptData:
    """Parse receipt-ocr response into our ReceiptData model"""
    try:
        merchant_name = receipt_data.get('merchant_name') or 'Unknown'
        
        total_amount = float(receipt_data.get('total_amount', 0.0))
        subtotal = receipt_data.get('subtotal_amount')
        subtotal = float(subtotal) if subtotal is not None else None
        
        tax = receipt_data.get('tax_amount')
        tax = float(tax) if tax is not None else None
        
        tip = receipt_data.get('tip_amount')
        tip = float(tip) if tip is not None else None
        
        receipt_date = receipt_data.get('transaction_date')
        receipt_time = receipt_data.get('transaction_time')
        
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
            confidence=None
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
        return ReceiptData(
            store_name="Unknown",
            total_amount=0.0,
            items=[]
        )

async def check_receipt_ocr_health() -> bool:
    """Check if Receipt OCR is accessible and properly configured"""
    try:
        return bool(receipt_ocr_api_key and receipt_ocr_processor is not None)
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return False

# ============================================================================
# ENDPOINTS - TRANSACTIONS
# ============================================================================
@app.post("/transactions", response_model=TransactionOut, tags=["Transaction"])
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    try:
        transaction_type = data.transaction_type or "expense"
        if transaction_type not in ["income", "expense"]:
            transaction_type = "expense"
        
        description = data.description.strip() if data.description else ""
        if description:
            description = description[0].upper() + description[1:] if len(description) > 1 else description.upper()
        
        query = text("""
            INSERT INTO transactions (user_id, amount, category, description, purchase_date, transaction_type)
            VALUES (:user_id, :amount, :category, :description, :purchase_date, :transaction_type)
        """)

        transaction_data = data.dict()
        transaction_data['transaction_type'] = transaction_type
        transaction_data['description'] = description
        result = db.execute(query, transaction_data)
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

@app.get("/transactions", response_model=List[TransactionOut], tags=["Transaction"])
def get_all_transactions(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM transactions ORDER BY purchase_date DESC")).fetchall()
    return rows

@app.get("/transactions/{transaction_id}", response_model=TransactionOut, tags=["Transaction"])
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM transactions WHERE id = :id"),
        {"id": transaction_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return row

@app.put("/transactions/{transaction_id}", response_model=TransactionOut, tags=["Transaction"])
def update_transaction(transaction_id: int, update: TransactionUpdate, db: Session = Depends(get_db)):
    updates = {k: v for k, v in update.dict().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    
    if 'transaction_type' in updates:
        if updates['transaction_type'] not in ["income", "expense"]:
            updates['transaction_type'] = "expense"
    
    if 'description' in updates and updates['description']:
        description = updates['description'].strip()
        if description:
            updates['description'] = description[0].upper() + description[1:] if len(description) > 1 else description.upper()

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

@app.delete("/transactions/{transaction_id}", tags=["Transaction"])
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM transactions WHERE id = :id"),
        {"id": transaction_id}
    )
    db.commit()

    return {"message": "Transaction deleted successfully"}

# ============================================================================
# ENDPOINTS - SUBSCRIPTIONS
# ============================================================================
@app.post("/subscriptions", response_model=SubscriptionOut, tags=["Subscription"])
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

@app.get("/subscriptions", response_model=List[SubscriptionOut], tags=["Subscription"])
def get_all_subscriptions(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM subscriptions ORDER BY payment_date DESC")).fetchall()
    return rows

@app.get("/subscriptions/{subscription_id}", response_model=SubscriptionOut, tags=["Subscription"])
def get_subscription(subscription_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM subscriptions WHERE subscription_id = :id"),
        {"id": subscription_id}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return row

@app.put("/subscriptions/{subscription_id}", response_model=SubscriptionOut, tags=["Subscription"])
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

@app.delete("/subscriptions/{subscription_id}", tags=["Subscription"])
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM subscriptions WHERE subscription_id = :id"),
        {"id": subscription_id}
    )
    db.commit()

    return {"message": "Subscription deleted successfully"}

# ============================================================================
# ENDPOINTS - DASHBOARD
# ============================================================================
@app.get("/dashboard", response_model=DashboardResponse, tags=["Dashboard"])
def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Get comprehensive dashboard data including metrics, transactions, renewals, and spending breakdowns.
    Uses shared computation logic that is also used by the AI endpoint.
    """
    try:
        import calendar
        from datetime import timedelta
        
        data = _compute_dashboard_metrics(db)
        
        transactions = data['transactions']
        subscriptions = data['subscriptions']
        current_balance = data['current_balance']
        monthly_expenses = data['monthly_expenses']
        monthly_income = data['monthly_income']
        savings_rate = data['savings_rate']
        category_totals = data['category_totals']
        category_map = data['category_map']
        upcoming_renewals_data = data['upcoming_renewals']
        current_date = data['current_date']
        current_month_start = data['current_month_start']
        to_float = data['to_float']
        parse_date = data['parse_date']
        
        health_score = min(100, max(0, int(50 + (savings_rate / 2) + (10 if current_balance > 0 else -20))))
        
        metrics = [
            DashboardMetrics(
                title="Current Balance",
                value=f"${current_balance:,.2f}",
                change="+8.2%" if current_balance > 0 else "-12.5%",
                changeType="positive" if current_balance > 0 else "negative",
                icon="BanknotesIcon",
                iconColor="bg-primary"
            ),
            DashboardMetrics(
                title="Monthly Spending",
                value=f"${monthly_expenses:,.2f}",
                change=f"-{abs((monthly_expenses - (monthly_expenses * 1.125)) / monthly_expenses * 100):.1f}%" if monthly_expenses > 0 else "0%",
                changeType="positive",
                icon="CreditCardIcon",
                iconColor="bg-accent"
            ),
            DashboardMetrics(
                title="Savings Rate",
                value=f"{savings_rate:.1f}%",
                change=f"+{abs(savings_rate - (savings_rate - 4.1)):.1f}%" if savings_rate > 0 else "0%",
                changeType="positive" if savings_rate > 0 else "negative",
                icon="ChartBarIcon",
                iconColor="bg-success"
            ),
            DashboardMetrics(
                title="Financial Health",
                value=f"{health_score}/100",
                change="+3 points",
                changeType="positive",
                icon="HeartIcon",
                iconColor="bg-warning"
            )
        ]
        
        recent_transactions_list = []
        
        for t in transactions[:5]:
            purchase_date = parse_date(t.get('purchase_date'))
            if purchase_date:
                date_str = purchase_date.strftime("%m/%d/%Y")
            else:
                date_str = current_date.strftime("%m/%d/%Y")
            
            category = category_map.get(t.get('category', '').lower(), t.get('category', 'Other'))
            transaction_type = t.get('transaction_type', 'expense')
            amount = to_float(t.get('amount', 0))
            
            if transaction_type == 'expense' and amount > 0:
                amount = -amount
            
            recent_transactions_list.append(DashboardTransaction(
                id=t.get('id', 0),
                description=t.get('description', 'Unknown'),
                amount=amount,
                date=date_str,
                category=category,
                type=transaction_type
            ))
        
        upcoming_renewals_list = [
            DashboardRenewal(
                id=r['id'],
                name=r['name'],
                amount=r['amount'],
                renewalDate=r['date'],
                daysUntil=r['days_until']
            )
            for r in upcoming_renewals_data
        ]
        
        total_category_spending = sum(category_totals.values())
        category_spending_list = [
            CategorySpending(
                name=cat,
                value=amount,
                percentage=(amount / total_category_spending * 100) if total_category_spending > 0 else 0
            )
            for cat, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        ]
        
        cash_flow_list = []
        for i in range(5, -1, -1):
            year = current_date.year
            month = current_date.month - i
            while month <= 0:
                month += 12
                year -= 1
            
            month_date = current_date.replace(year=year, month=month, day=1)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = current_date
            else:
                if month == 12:
                    next_month = month_date.replace(year=year + 1, month=1, day=1)
                else:
                    next_month = month_date.replace(month=month + 1, day=1)
                month_end = next_month - timedelta(seconds=1)
            
            month_income = 0.0
            month_expenses = 0.0
            for t in transactions:
                purchase_date = parse_date(t.get('purchase_date'))
                if purchase_date and month_start <= purchase_date <= month_end:
                    if t.get('transaction_type') == 'income':
                        month_income += to_float(t.get('amount', 0))
                    elif t.get('transaction_type') == 'expense':
                        month_expenses += abs(to_float(t.get('amount', 0)))
            
            cash_flow_list.append(CashFlowData(
                month=calendar.month_abbr[month],
                income=month_income,
                expenses=month_expenses
            ))
        
        quick_actions_list = [
            QuickAction(
                title="Add Transaction",
                description="Manual or voice entry",
                icon="PlusCircleIcon",
                iconColor="bg-primary",
                href="/transaction-tracker"
            ),
            QuickAction(
                title="Scan Receipt",
                description="OCR-powered processing",
                icon="CameraIcon",
                iconColor="bg-accent",
                href="/receipt-scanner"
            ),
            QuickAction(
                title="AI Assistant",
                description="Get financial insights",
                icon="SparklesIcon",
                iconColor="bg-success",
                href="/ai-assistant-chat"
            )
        ]
        
        return DashboardResponse(
            metrics=metrics,
            cashFlowData=cash_flow_list if cash_flow_list else [
                CashFlowData(month="Jan", income=0, expenses=0),
                CashFlowData(month="Feb", income=0, expenses=0),
                CashFlowData(month="Mar", income=0, expenses=0),
                CashFlowData(month="Apr", income=0, expenses=0),
                CashFlowData(month="May", income=0, expenses=0),
                CashFlowData(month="Jun", income=0, expenses=0),
            ],
            recentTransactions=recent_transactions_list,
            upcomingRenewals=upcoming_renewals_list,
            categorySpending=category_spending_list if category_spending_list else [],
            quickActions=quick_actions_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")

# ============================================================================
# ENDPOINTS - AI
# ============================================================================
@app.post("/claude", response_model=ChatResponse, tags=["AI"])
async def claude_chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Accepts a message from the user and returns a reply generated by Claude LLM.
    The AI has access to comprehensive dashboard data including metrics, spending patterns, and insights.
    """
    try:
        if claude_client is None:
            return ChatResponse(reply="Claude API key not configured.", contextUsed=False, chunksFound=0)

        dashboard_data = get_dashboard_data_for_ai(db)
        
        dashboard_context = ""
        if dashboard_data:
            dashboard_context = f"""
## Financial Dashboard Summary:

**Current Balance:** ${dashboard_data['current_balance']:,.2f}
**Monthly Income:** ${dashboard_data['monthly_income']:,.2f}
**Monthly Expenses:** ${dashboard_data['monthly_expenses']:,.2f}
**Savings Rate:** {dashboard_data['savings_rate']:.1f}%

**Spending by Category (Current Month):**
"""
            for category, amount in list(dashboard_data['category_breakdown'].items())[:10]:
                percentage = (amount / dashboard_data['monthly_expenses'] * 100) if dashboard_data['monthly_expenses'] > 0 else 0
                dashboard_context += f"- {category}: ${amount:,.2f} ({percentage:.1f}%)\n"
            
            if dashboard_data['upcoming_renewals']:
                dashboard_context += f"\n**Upcoming Subscription Renewals (Next 7 Days):**\n"
                for renewal in dashboard_data['upcoming_renewals']:
                    dashboard_context += f"- {renewal['name']}: ${renewal['amount']:,.2f} (in {renewal['days_until']} days, on {renewal['date']})\n"
            
            dashboard_context += f"\n**Total Active Subscriptions:** {dashboard_data['total_subscriptions']}\n"

        recent_transactions = get_all_transactions_data(db)[:10]
        transactions_context = ""
        if recent_transactions:
            transactions_context = "\n**Recent Transactions (Last 10):**\n"
            for t in recent_transactions:
                from decimal import Decimal
                def to_float(value):
                    if value is None:
                        return 0.0
                    if isinstance(value, Decimal):
                        return float(value)
                    return float(value)
                
                amount = to_float(t.get('amount', 0))
                trans_type = t.get('transaction_type', 'expense')
                if trans_type == 'expense' and amount > 0:
                    amount = -amount
                
                date_str = str(t.get('purchase_date', ''))[:10] if t.get('purchase_date') else 'N/A'
                transactions_context += f"- {date_str}: {t.get('description', 'Unknown')} - ${abs(amount):,.2f} ({trans_type})\n"

        system_prompt = f"""
You are an AI financial assistant helping users manage their personal finances.
You can provide advice on budgeting, saving, spending analysis, debt management,
and general financial planning. Be conversational, helpful, and provide actionable advice.

Current Malaysia Time: {get_current_malaysia_time()}

{dashboard_context}

{transactions_context}

When answering questions:
- Use the dashboard data to provide insights about spending patterns, savings rate, and financial health
- Reference specific categories when discussing spending breakdowns
- Mention upcoming subscription renewals when relevant
- Provide actionable recommendations based on the user's financial data
- Be specific with numbers and percentages from the dashboard data
- If asked about "monthly spending", "spending analysis", "cash flow", or "financial overview", use the dashboard metrics
- If asked about specific transactions, use the recent transactions list
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
            contextUsed=True,
            chunksFound=1 if dashboard_data else 0
        )

    except Exception as e:
        logger.error(f"Error in Claude endpoint: {e}")
        return ChatResponse(reply=f"Error generating Claude response: {str(e)}", contextUsed=False, chunksFound=0)

@app.post("/stt", tags=["AI"])
async def speech_to_text(request: Request):
    try:
        if elevenlabs_client is None:
            raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

        audio_bytes = await request.body()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="No audio received")

        transcription = elevenlabs_client.speech_to_text.convert(
            file=audio_bytes,
            model_id="scribe_v1",
            language_code="eng"
        )

        return {"text": transcription.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")

@app.post("/parse-transaction", response_model=ParseTransactionResponse, tags=["AI"])
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

        Available categories: food, transport, entertainment, healthcare, shopping, education, savings, other

        Current date: {date_str}

        Return a JSON object with the following structure:
        {{
            "description": "A clear description of the transaction",
            "amount": 0.0,
            "date": "YYYY-MM-DD" or null if not specified (default to current date if not mentioned),
            "category": "one of the available categories" or null,
            "transaction_type": "income" or "expense"
        }}

        Rules:
        - Extract the amount in dollars (handle phrases like "25 dollars", "$25", "twenty five dollars", "twenty ringgit", "RM20")
        - Parse dates if mentioned (e.g., "yesterday", "today", "last week", "December 5th" should be converted to YYYY-MM-DD format)
        - If date is not mentioned, use current date: {date_str}
        - Extract a meaningful description (remove filler words like "I spent", "I paid", "I received")
        - Determine the most appropriate category based on keywords
        - CRITICAL: Determine transaction_type based on context:
          * "income" if user mentions: received, earned, salary, payment received, got money, gift, allowance, refund
          * "expense" if user mentions: spent, paid, bought, purchase, cost, bill, fee, expense
          * Default to "expense" if unclear
        - Return ONLY valid JSON, no additional text or explanation
        """

        user_message = f"""Parse this transaction: "{request.text}"

        Return JSON with description, amount, date (YYYY-MM-DD or null), category, and transaction_type ("income" or "expense").
        Determine transaction_type: use "income" for money received/earned, "expense" for money spent/paid.
        """

        res = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        reply_text = res.content[0].text.strip()

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

            description = parsed_data.get("description", request.text.strip())
            if description:
                description = description.strip()
                description = description[0].upper() + description[1:] if len(description) > 1 else description.upper()
            
            amount = parsed_data.get("amount")
            date = parsed_data.get("date") or date_str
            category = parsed_data.get("category")
            transaction_type = parsed_data.get("transaction_type", "expense")

            valid_categories = ["food", "transport", "entertainment", "healthcare", "shopping", "education", "savings", "other"]
            if category and category not in valid_categories:
                category = None

            if transaction_type not in ["income", "expense"]:
                transaction_type = "expense"

            return ParseTransactionResponse(
                description=description,
                amount=amount,
                date=date,
                category=category,
                transaction_type=transaction_type
            )
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Failed to parse Claude response: {e}", response=reply_text)
            description = request.text.strip()
            if description:
                description = description[0].upper() + description[1:] if len(description) > 1 else description.upper()
            
            return ParseTransactionResponse(
                description=description,
                amount=None,
                date=date_str,
                category=None,
                transaction_type="expense"
            )

    except Exception as e:
        logger.error(f"Error parsing transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse transaction: {str(e)}")

@app.post("/parse-subscription", response_model=ParseSubscriptionResponse, tags=["AI"])
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

            service_name = parsed_data.get("serviceName", request.text.strip())
            cost = parsed_data.get("cost")
            billing_frequency = parsed_data.get("billingFrequency", "monthly")
            next_payment_date = parsed_data.get("nextPaymentDate")
            category = parsed_data.get("category")
            description = parsed_data.get("description")

            valid_frequencies = ["monthly", "quarterly", "yearly"]
            if billing_frequency and billing_frequency not in valid_frequencies:
                billing_frequency = "monthly"

            valid_categories = ["Entertainment", "Productivity", "Health & Fitness", "Education", "Shopping", "Utilities", "Other"]
            if category and category not in valid_categories:
                category = "Other"

            if not next_payment_date:
                from datetime import timedelta
                if billing_frequency == "monthly":
                    next_payment_date = (current_date + timedelta(days=30)).strftime("%Y-%m-%d")
                elif billing_frequency == "quarterly":
                    next_payment_date = (current_date + timedelta(days=90)).strftime("%Y-%m-%d")
                elif billing_frequency == "yearly":
                    next_payment_date = (current_date + timedelta(days=365)).strftime("%Y-%m-%d")
                else:
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

# ============================================================================
# ENDPOINTS - RECEIPT PROCESSING
# ============================================================================
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
    
    try:
        file_content = await file.read()
        file_size = len(file_content)
        
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
    
    try:
        receipt_response = await process_receipt_with_ocr(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type
        )
        
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
    raise HTTPException(
        status_code=501,
        detail="URL processing not yet implemented. Please use file upload."
    )

# ============================================================================
# ENDPOINTS - HEALTH
# ============================================================================
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
        taggun_configured=receipt_ocr_configured
    )

# ============================================================================
# EXCEPTION HANDLERS & LIFESPAN
# ============================================================================
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
    logger.info("application_starting", version="1.0.0")
    yield
    logger.info("application_shutting_down")

# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
