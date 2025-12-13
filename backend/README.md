# Finance Assistance Backend

Professional FastAPI backend service for receipt OCR processing, financial data management, and AI-powered assistance.

## Features

- 🚀 **FastAPI Framework** - High-performance async web framework
- 🗄️ **TiDB Storage** - Scalable distributed SQL database for secure financial data
- 🤖 **LLM-based OCR** - Advanced receipt scanning using `receipt-ocr` (OpenAI/Groq models)
- 💰 **Transaction Management** - Track income and expenses
- 📅 **Subscription Manager** - Monitor recurring subscriptions
- 📊 **Dashboard Analytics** - Visual analytics and spending breakdowns
- 🧠 **AI Assistant** - Claude-powered financial advice and transaction parsing
- 🔒 **Type Safety** - Pydantic models for request/response validation
- 📝 **API Documentation** - Auto-generated Swagger/ReDoc documentation

## Tech Stack

- **Python 3.9+**
- **FastAPI**
- **TiDB** - Distributed SQL Database (MySQL compatible)
- **SQLAlchemy** - Database ORM
- **receipt-ocr** - LLM-based receipt OCR
- **Anthropic Claude** - AI Assistant & Parsing
- **ElevenLabs** - Speech-to-Text
- **Pydantic** - Data validation
- **Structlog** - Structured logging

## Project Structure

```
backend/
├── main.py                # FastAPI application entry point
├── config.py              # Configuration and settings
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
├── models/
│   ├── __init__.py
│   └── schemas.py         # Pydantic models
└── services/
    ├── __init__.py
    ├── receipt_ocr_service.py # LLM-based OCR integration
    └── taggun_service.py      # Legacy Taggun integration (deprecated)
```

## Setup Instructions

### 1. Prerequisites

- Python 3.9 or higher
- TiDB Database Cluster (Serverless or Self-Hosted)
- API Keys:
  - LLM Provider (Groq/OpenAI) for OCR
  - Anthropic (Claude) for AI features
  - ElevenLabs for Voice features

### 2. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create `.env`:

```bash
# Database
TIDB_HOST=...
TIDB_PORT=4000
TIDB_USERNAME=...
TIDB_PASSWORD=...
TIDB_DATABASE=finance_db

# AI & OCR
RECEIPT_OCR_API_KEY=your_key
RECEIPT_OCR_BASE_URL=https://api.groq.com/openai/v1
RECEIPT_OCR_MODEL=llama-3.3-70b-versatile
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...

# Server
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:4028,http://localhost:3000
```

### 5. Run the Server

```bash
python main.py
```

## API Endpoints Overview

Full interactive documentation available at `http://localhost:8000/api/docs`.

### 🏥 Health Check

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check service status and dependencies |

### 💸 Transactions

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/transactions` | List all transactions |
| `POST` | `/transactions` | Create a new transaction |
| `GET` | `/transactions/{id}` | Get specific transaction details |
| `PUT` | `/transactions/{id}` | Update a transaction |
| `DELETE` | `/transactions/{id}` | Delete a transaction |

### 📅 Subscriptions

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/subscriptions` | List all subscriptions |
| `POST` | `/subscriptions` | Create a new subscription |
| `GET` | `/subscriptions/{id}` | Get specific subscription details |
| `PUT` | `/subscriptions/{id}` | Update a subscription |
| `DELETE` | `/subscriptions/{id}` | Delete a subscription |

### 📊 Dashboard

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard` | Get comprehensive dashboard metrics, cash flow, and renewals |

### 🤖 AI & Processing

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/claude` | Chat with AI financial assistant (context-aware) |
| `POST` | `/stt` | Convert speech to text (ElevenLabs) |
| `POST` | `/parse-transaction` | Parse natural language text into transaction data |
| `POST` | `/parse-subscription` | Parse natural language text into subscription data |

### 🧾 Receipt OCR

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/receipt/process` | Upload and process receipt image (supports JPEG, PNG, HEIC, PDF) |
| `POST` | `/api/receipt/process-url` | Process receipt from URL (Not Implemented) |

