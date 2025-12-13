# FinanceAssist – Project Story

## 🌟 Inspiration

Money touches every part of life, yet managing it often feels chaotic. We found ourselves juggling:
- Scattered receipts
- Unexpected subscription renewals
- Confusing spending patterns
- Manual transactions we kept forgetting to log
- Multiple apps that never worked together

That’s when we asked:
*“What if managing your money felt as simple as chatting with a friend?”*
*“What if your finances could organize themselves?”*

**FinanceAssist** was born from this vision — an AI-powered personal finance assistant that listens, analyzes, predicts, and helps you take control effortlessly.

## 🧠 What It Does

FinanceAssist is a multi-modal, AI-powered personal finance assistant designed to simplify how users track and understand their finances. It combines automation, intelligent analysis, and a beautiful interface to deliver a seamless financial experience.

## ⭐ Features

### 1. Smart Dashboard — Complete Financial Overview
FinanceAssist’s dashboard provides an instant snapshot of a user’s financial world:
- Total spent this month
- Predicted cash flow for upcoming periods
- Financial health score (based on savings, stability, subscriptions)
- Upcoming bill renewals
- Biggest spending categories
- Visual analytics: line charts, donut charts, bar charts

Every widget updates in real time as new data flows in.

### 2. Transaction Tracking (Manual + Voice + NLP)
FinanceAssist lets users record expenses in three intuitive ways:

**✔ Manual Entry**
- Straightforward fields for Description, Amount, Date, and Category.

**✔ Speech-to-Text Entry**
- Powered by **ElevenLabs**, users can add transactions by speaking naturally:
  > “Paid 350 for groceries yesterday.” → Automatically categorized as Food & Dining.

### 3. Receipt Scanner (AI-Powered OCR)
FinanceAssist extracts structured data from uploaded JPG, PNG, and PDF receipts using AI-powered OCR (LLM-based `receipt-ocr`).

It identifies:
- Store name
- Total amount
- Tax
- Date
- Itemized list (if available)

**✔ Manual Correction**
- Users can fine-tune items, tax, date, category, and amount, ensuring high accuracy even for imperfect receipts.

### 4. Shared Bill Splitting (with WhatsApp Sharing)
A fully implemented, user-ready feature. If a receipt contains multiple items, FinanceAssist allows users to:
- Select the items they personally consumed
- Automatically calculate their subtotal, proportional tax amount, and final payable total

**✔ WhatsApp-Sharable Summary**
- Generates a beautifully formatted summary including itemized list, tax, subtotal, and final owed amount, ready to share via WhatsApp.

### 5. Subscription Tracker — Know Your Renewals
Users can add and manage recurring subscription expenses with name, monthly cost, renewal date, and category.
- Highlights renewals 7 days before their due date
- Displays analytics: total monthly cost, costliest subscriptions, yearly projections

### 6. AI Financial Assistant (RAG-Powered)
Includes a conversational AI (powered by **Claude**) that analyzes real user data to answer questions like:
- “How much did I spend on transportation this week?”
- “What categories am I overspending on?”
- “Forecast my cash flow next month.”

## 🛠️ How we built it

We designed FinanceAssist as a scalable, AI-first, cloud-native system.

### Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Recharts
- **Backend**: FastAPI (Python)
- **Database**: TiDB (Distributed SQL)
- **AI Features**: RAG, NLP, Claude API
- **OCR**: `receipt-ocr` (LLM-based)
- **Speech AI**: ElevenLabs Speech-to-Text
- **Platform**: Cursor

We engineered FinanceAssist for speed, simplicity, and intelligence — with each component seamlessly connected.

## 🧗 Challenges we ran into

Every feature pushed us into new territory:
- **OCR variability**: Receipts come in every possible format.
- **NLP categorization**: Handling messy, natural language transaction descriptions.
- **Bill-splitting**: Designing a model that correctly allocates tax and subtotals.
- **RAG pipeline**: Building a fast pipeline that returns insights within seconds.
- **UI/UX**: Presenting deep financial insights without overwhelming the user.

## 🏆 Accomplishments that we're proud of

- 🎉 **Major Wins**:
    - Built multi-modal financial input (text, voice, OCR)
    - Delivered a smooth, intuitive dashboard
    - Created a highly accurate shared bill-splitting engine
    - Integrated RAG-based AI insights for personalized financial analysis
    - Achieved fast performance despite complex data workflows

But our proudest achievement? **FinanceAssist actually feels like a personal financial companion.**

## 📚 What we learned

This project was a masterclass in full-stack engineering and AI integration. We learned:
- How to combine speech, OCR, NLP, and RAG into a single workflow.
- Designing user-centric fintech interfaces that simplify complex data.
- Implementing secure, scalable financial systems.
- Building an app that balances AI automation with user control.

## 🚀 What’s next for FinanceAssist

FinanceAssist is just the beginning. Here’s where we’re taking it next:

**🔮 Upcoming Features**
- Real-time bank integration (Open Banking APIs)
- Goal-based savings planner
- Budget auto-generation using spending habits
- Investment insights and portfolio tracking
- Gamified financial challenges & rewards
- Scheduled financial reports delivered by AI

**Long-term Vision**
To become the all-in-one AI-powered financial copilot for every user, everywhere.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- **TiDB Database Cluster** (Serverless or Self-Hosted)
- API Keys:
  - **LLM Provider** (Groq/OpenAI) for OCR
  - **Anthropic** (Claude) for AI features
  - **ElevenLabs** for Voice features

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
# Database Configuration (TiDB)
TIDB_HOST=your_tidb_host
TIDB_PORT=4000
TIDB_USERNAME=your_username
TIDB_PASSWORD=your_password
TIDB_DATABASE=finance_db

# Receipt OCR Configuration
RECEIPT_OCR_API_KEY=your_groq_or_openai_key
RECEIPT_OCR_BASE_URL=https://api.groq.com/openai/v1
RECEIPT_OCR_MODEL=llama-3.3-70b-versatile

# AI Services
ANTHROPIC_API_KEY=your_claude_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Server Configuration
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

### Frontend Setup

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
│   │   └── receipt_ocr_service.py   # OCR integration
│   └── README.md                    # Backend documentation
│
├── src/                             # Next.js Frontend
│   ├── app/                         # App router pages
│   │   ├── dashboard/               # Dashboard page
│   │   ├── receipt-scanner/         # Receipt OCR feature
│   │   ├── transaction-tracker/     # Transaction management
│   │   ├── subscription-manager/    # Subscription tracking
│   │   ├── bill-splitting-interface/# Bill splitting
│   │   └── ai-assistant-chat/       # AI chat assistant
│   ├── components/                  # React components
│   ├── lib/                         # Utilities
│   └── styles/                      # Global styles
│
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
```

### AI Chat
```http
POST /claude
```

## 🔑 Getting API Keys

### 1. Receipt OCR (Groq/OpenAI)
- **Groq** (Recommended): [console.groq.com](https://console.groq.com/keys)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)

### 2. AI Assistant (Anthropic)
- Get key at [console.anthropic.com](https://console.anthropic.com/)

### 3. Voice Input (ElevenLabs)
- Get key at [elevenlabs.io](https://elevenlabs.io/)

### 4. Database (TiDB)
- Create a serverless cluster at [tidbcloud.com](https://tidbcloud.com/)

### Collaborator
Goh Yi Cheng | Kueh Pang Lang | Kueh Pang Teng | Liew Jin Sze

## 📝 License
MIT License
