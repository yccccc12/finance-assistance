# Finance Assistance OCR Backend

Professional FastAPI backend service for receipt OCR processing using Taggun API.

## Features

- 🚀 **FastAPI Framework** - High-performance async web framework
- 📸 **Taggun OCR Integration** - Industry-leading receipt scanning technology
- 🔒 **Type Safety** - Pydantic models for request/response validation
- 📊 **Structured Logging** - JSON structured logs for production monitoring
- 🛡️ **Error Handling** - Comprehensive error handling and validation
- 🌐 **CORS Support** - Configured for cross-origin requests
- 📝 **API Documentation** - Auto-generated Swagger/ReDoc documentation
- ✅ **Health Checks** - Built-in health monitoring endpoints

## Tech Stack

- **Python 3.9+**
- **FastAPI** - Modern web framework
- **Taggun API** - Receipt OCR service
- **Pydantic** - Data validation
- **Structlog** - Structured logging
- **HTTPX** - Async HTTP client
- **Uvicorn** - ASGI server

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration and settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── models/
│   ├── __init__.py
│   └── schemas.py        # Pydantic models
└── services/
    ├── __init__.py
    └── taggun_service.py # Taggun API integration
```

## Setup Instructions

### 1. Prerequisites

- Python 3.9 or higher
- Taggun API key (sign up at https://www.taggun.io/)

### 2. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
# Taggun API Configuration
TAGGUN_API_KEY=e468807dcc5c488c85aede1767d20b43
TAGGUN_API_URL=https://api.taggun.io/api/receipt/v1/verbose/file

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# CORS Configuration (Frontend URL)
ALLOWED_ORIGINS=http://localhost:4028,http://localhost:3000

# File Upload Configuration
MAX_UPLOAD_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/heic,application/pdf

# Logging
LOG_LEVEL=INFO
```

### 5. Run the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## API Endpoints

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T10:30:00Z",
  "version": "1.0.0",
  "taggunConfigured": true
}
```

### Process Receipt
```http
POST /api/receipt/process
Content-Type: multipart/form-data

file: [receipt image file]
```

Response:
```json
{
  "success": true,
  "message": "Receipt processed successfully",
  "data": {
    "storeName": "Whole Foods Market",
    "totalAmount": 87.45,
    "subtotal": 80.00,
    "tax": 7.45,
    "date": "2025-12-05",
    "time": "14:30:00",
    "items": [
      {
        "name": "Organic Bananas",
        "price": 3.99,
        "quantity": 1,
        "category": "Produce"
      }
    ],
    "currency": "USD",
    "paymentMethod": "Credit Card",
    "confidence": 0.95
  },
  "processingTime": 2.34
}
```

## Taggun API Integration

### How It Works

1. **Upload**: Client uploads receipt image via multipart/form-data
2. **Validation**: Backend validates file type, size, and content
3. **Processing**: Image is sent to Taggun API for OCR processing
4. **Parsing**: Taggun response is parsed into structured data
5. **Response**: Structured receipt data is returned to client

### Supported File Types

- JPEG/JPG images
- PNG images
- HEIC images (iPhone photos)
- PDF documents

### File Size Limits

- Maximum file size: 10MB
- Configurable via `MAX_UPLOAD_SIZE` environment variable

## Error Handling

The API provides detailed error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "details": {
    "additional": "error information"
  }
}
```

Common error codes:
- `HTTP_400` - Bad request (invalid file, missing parameters)
- `HTTP_413` - File too large
- `HTTP_502` - Taggun API error
- `HTTP_500` - Internal server error

## Logging

The application uses structured logging with JSON output:

```json
{
  "timestamp": "2025-12-06T10:30:00Z",
  "event": "receipt_processed_successfully",
  "filename": "receipt.jpg",
  "processing_time": 2.34,
  "merchant": "Whole Foods Market",
  "total": 87.45
}
```

Log levels can be configured via the `LOG_LEVEL` environment variable.

## Security Considerations

1. **API Key Protection**: Keep your Taggun API key secure in `.env` file
2. **File Validation**: All uploads are validated for type and size
3. **CORS Configuration**: Only allowed origins can access the API
4. **Error Messages**: Sensitive information is hidden in production mode
5. **Rate Limiting**: Consider implementing rate limiting for production use

## Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:8000/api/health

# Process receipt
curl -X POST http://localhost:8000/api/receipt/process \
  -F "file=@/path/to/receipt.jpg"
```

### Unit Tests

```bash
# Run tests (if implemented)
pytest tests/ -v
```

## Production Deployment

### Using Docker (Recommended)

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t finance-ocr-backend .
docker run -p 8000:8000 --env-file .env finance-ocr-backend
```

### Using Systemd

Create `/etc/systemd/system/finance-ocr.service`:

```ini
[Unit]
Description=Finance OCR Backend
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/finance-ocr/backend
Environment="PATH=/opt/finance-ocr/backend/venv/bin"
ExecStart=/opt/finance-ocr/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Environment-Specific Configuration

Production `.env`:
```bash
DEBUG=False
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://your-production-domain.com
```

## Monitoring and Observability

### Health Check Endpoint

Use `/api/health` for monitoring services (Kubernetes, Docker, etc.)

### Structured Logs

All logs are in JSON format for easy parsing by log aggregation tools:
- Elasticsearch
- Splunk
- Datadog
- CloudWatch

## Performance Optimization

1. **Async Processing**: All I/O operations are async
2. **Connection Pooling**: HTTPX client handles connection reuse
3. **Timeout Configuration**: 60s timeout for Taggun API calls
4. **Response Caching**: Consider implementing caching for repeated requests

## Troubleshooting

### Common Issues

**Issue**: `"Taggun API error: 401 - Unauthorized"`
**Solution**: Check that your `TAGGUN_API_KEY` is correct in `.env`

**Issue**: `"File too large"`
**Solution**: Increase `MAX_UPLOAD_SIZE` or compress the image

**Issue**: `"Module not found"`
**Solution**: Ensure virtual environment is activated and dependencies installed

**Issue**: `"CORS error from frontend"`
**Solution**: Add your frontend URL to `ALLOWED_ORIGINS`

## API Rate Limits

Taggun API has usage limits based on your plan:
- Free tier: Limited requests per month
- Paid tiers: Higher limits

Monitor your usage at https://dashboard.taggun.io/

## Support and Documentation

- Taggun API Docs: https://docs.taggun.io/
- FastAPI Docs: https://fastapi.tiangolo.com/
- Project Issues: [Create an issue]

## License

[Your License Here]

## Contributing

[Your contribution guidelines]

---

**Made with ❤️ by Professional Backend Engineers**

