# Finance Assistance - Personal Finance Management Platform

A comprehensive personal finance management application with AI-powered receipt OCR, expense tracking, subscription management, and bill splitting capabilities.

## 🌟 Features

- **📸 Receipt Scanner** - AI-powered OCR using Taggun API for automatic receipt data extraction
- **📊 Dashboard** - Visual analytics with charts for spending patterns and cash flow
- **💰 Transaction Tracker** - Track income and expenses with voice input support
- **📅 Subscription Manager** - Monitor recurring subscriptions and get renewal alerts
- **🧾 Bill Splitting** - Easy bill splitting among friends and family
- **🤖 AI Assistant** - Chat-based financial assistance and insights

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 with Tailwind CSS
- **Charts**: Recharts
- **Port**: 4028

### Backend
- **Framework**: FastAPI (Python)
- **OCR Service**: Taggun API
- **Logging**: Structured JSON logs with structlog
- **Port**: 8000

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- Taggun API key ([Get one here](https://www.taggun.io/))

### Option 1: Automated Setup (Recommended)

```bash
# Make the script executable (first time only)
chmod +x start-dev.sh

# Start both frontend and backend
./start-dev.sh
```

This will:
- ✅ Check prerequisites
- ✅ Set up virtual environment
- ✅ Install dependencies
- ✅ Start backend on http://localhost:8000
- ✅ Start frontend on http://localhost:4028

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Taggun API key
cat > .env << EOF
TAGGUN_API_KEY=your_api_key_here
TAGGUN_API_URL=https://api.taggun.io/api/receipt/v1/verbose/file
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:4028,http://localhost:3000
MAX_UPLOAD_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/heic,application/pdf
LOG_LEVEL=INFO
EOF

# Start backend
python main.py
```

#### Frontend Setup

```bash
# In a new terminal, from project root
npm install

# Optional: Create .env.local for frontend config
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start frontend
npm run dev
```

## 📍 URLs

Once running, access:

| Service | URL |
|---------|-----|
| **Frontend App** | http://localhost:4028 |
| **Backend API** | http://localhost:8000 |
| **API Documentation** | http://localhost:8000/api/docs |
| **API ReDoc** | http://localhost:8000/api/redoc |
| **Health Check** | http://localhost:8000/api/health |

## 📂 Project Structure

```
financeassistance/
├── backend/                          # FastAPI Backend
│   ├── main.py                      # FastAPI application
│   ├── config.py                    # Configuration management
│   ├── requirements.txt             # Python dependencies
│   ├── models/
│   │   └── schemas.py               # Pydantic models
│   ├── services/
│   │   └── taggun_service.py        # Taggun OCR integration
│   ├── README.md                    # Backend documentation
│   └── ENV_SETUP.md                 # Environment setup guide
│
├── src/                             # Next.js Frontend
│   ├── app/                         # App router pages
│   │   ├── dashboard/               # Dashboard page
│   │   ├── receipt-scanner/         # Receipt OCR feature
│   │   ├── transaction-tracker/     # Transaction management
│   │   ├── subscription-manager/    # Subscription tracking
│   │   ├── bill-splitting-interface/# Bill splitting
│   │   └── ai-assistant-chat/       # AI chat assistant
│   ├── components/
│   │   ├── common/                  # Shared components
│   │   └── ui/                      # UI components
│   ├── lib/
│   │   └── api.js                   # Backend API client
│   └── styles/                      # Global styles
│
├── SETUP_INSTRUCTIONS.md            # Complete setup guide
├── start-dev.sh                     # Development startup script
├── package.json                     # Frontend dependencies
└── README.md                        # This file
```

## 🔧 API Endpoints

### Health Check
```http
GET /api/health
```

### Process Receipt
```http
POST /api/receipt/process
Content-Type: multipart/form-data

Body:
  file: [receipt image file]
```

**Supported formats**: JPEG, PNG, HEIC, PDF (max 10MB)

**Example Response:**
```json
{
  "success": true,
  "message": "Receipt processed successfully",
  "data": {
    "storeName": "Whole Foods Market",
    "totalAmount": 87.45,
    "date": "2025-12-05",
    "items": [
      {"name": "Organic Bananas", "price": 3.99, "quantity": 1}
    ]
  },
  "processingTime": 2.34
}
```

## 🔑 Getting Taggun API Key

1. Visit https://www.taggun.io/
2. Sign up for a free account (100 requests/month)
3. Navigate to your dashboard
4. Copy your API key
5. Add it to `backend/.env` as `TAGGUN_API_KEY`

## 🧪 Testing

### Test Backend Configuration

```bash
cd backend
source venv/bin/activate
python test_taggun.py
```

### Test API with cURL

```bash
# Health check
curl http://localhost:8000/api/health

# Process receipt
curl -X POST http://localhost:8000/api/receipt/process \
  -F "file=@path/to/receipt.jpg"
```

### Test Frontend

1. Open http://localhost:4028
2. Navigate to "Receipt Scanner"
3. Upload a receipt image
4. Verify data extraction

## 📚 Documentation

- **[Complete Setup Guide](SETUP_INSTRUCTIONS.md)** - Detailed setup instructions
- **[Backend Documentation](backend/README.md)** - FastAPI backend details
- **[Environment Setup](backend/ENV_SETUP.md)** - Environment configuration guide

## 🛠️ Development

### Frontend Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Backend Development

```bash
python main.py                    # Start with auto-reload
uvicorn main:app --reload         # Alternative startup
pytest tests/                     # Run tests (if implemented)
```

## 🐛 Troubleshooting

### Backend Issues

**"Module not found"**
```bash
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

**"Taggun API key not configured"**
- Verify `backend/.env` file exists
- Check `TAGGUN_API_KEY` is set correctly
- Restart backend server

### Frontend Issues

**"Cannot connect to backend"**
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS settings in backend

**CORS Errors**
- Add your frontend URL to `ALLOWED_ORIGINS` in `backend/.env`
- Restart backend after changes

### Port Conflicts

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 4028  
lsof -ti:4028 | xargs kill -9
```

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ CORS configuration for API security
- ✅ File type and size validation
- ✅ Input validation with Pydantic
- ✅ Structured error handling
- ⚠️ Remember to use HTTPS in production
- ⚠️ Implement rate limiting for production

## 📦 Tech Stack

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- Recharts
- Heroicons

### Backend
- FastAPI
- Python 3.9+
- Pydantic
- Structlog
- HTTPX
- Uvicorn

### External Services
- Taggun OCR API

## 🚀 Deployment

### Backend Deployment

**Docker:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Deployment

Deploy to Vercel, Netlify, or any Next.js hosting platform:

```bash
npm run build
npm run start
```

## 📝 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Check the [troubleshooting section](#-troubleshooting)
- Review [setup instructions](SETUP_INSTRUCTIONS.md)
- Check backend logs for errors
- Open an issue on GitHub

---

**Built with ❤️ using Next.js and FastAPI**
