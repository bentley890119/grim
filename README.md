# GrimAIO - Roblox Script Key Shop

A dark-themed e-commerce website for selling Roblox script keys with Stripe payment integration.

## Features
- Monthly (€9.27) and Lifetime (€17.38) script key licenses
- Stripe checkout payment flow
- Auto-generated script keys (GRIM-XXXX-XXXX-XXXX format)
- Discord join button
- Dark terminal/hacker theme with neon green accents

---

## Setup Instructions (For Your Friend)

### Requirements
- **Node.js** (v18+) - [Download](https://nodejs.org)
- **Python** (3.10+) - [Download](https://python.org)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free cloud)
- **Yarn** - Run `npm install -g yarn` after installing Node.js

### Step 1: Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/grimaio-template.git
cd grimaio-template
```

### Step 2: Set Up the Backend
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate   # On Mac/Linux
# venv\Scripts\activate    # On Windows

# Install dependencies
pip install -r requirements.txt

# Edit the .env file with your own values:
# MONGO_URL="mongodb://localhost:27017"    (or your MongoDB Atlas URL)
# DB_NAME="grimaio"
# CORS_ORIGINS="*"
# STRIPE_API_KEY=sk_test_YOUR_STRIPE_KEY   (get from https://dashboard.stripe.com/test/apikeys)
```

### Step 3: Set Up the Frontend
```bash
cd frontend

# Install dependencies
yarn install

# Edit the .env file:
# REACT_APP_BACKEND_URL=http://localhost:8001
```

### Step 4: Run the App
Open **two terminals**:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

The website will open at **http://localhost:3000**

---

## Getting Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register) and create a free account
2. Go to **Developers → API Keys**
3. Copy the **Secret key** (starts with `sk_test_...`)
4. Paste it in `backend/.env` as `STRIPE_API_KEY`

## Customization
- **Change prices**: Edit `PRODUCTS` dict in `backend/server.py`
- **Change branding**: Edit the text in `frontend/src/App.js`
- **Change Discord link**: Search for `discord.gg` in `frontend/src/App.js`
- **Change colors**: Edit CSS variables in `frontend/src/index.css`

---

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe

## License
MIT
