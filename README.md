# DigiKhata - Digital Shop Ledger

DigiKhata is a production-ready, beautiful, and secure web application designed for shop owners to manage customer credits and daily expenses digitally. Built with a Glassmorphism design and modern vanilla Javascript on the frontend, and a robust Node.js/MongoDB API on the backend.

## Features

- **Authentication:** Secure login and registration with JWT and bcrypt.
- **Customer Management:** Maintain a list of customers with unique auto-generated IDs and long-press-to-delete functionality.
- **Transaction Tracking:** Record `Credit` (you give) and `Paid` (you receive) entries dynamically.
- **Live Running Balance:** Instantly visualizes if a customer has to give money back, or if they have paid in advance.
- **Voice Assistant:** Uses the Web Speech API to add transactions by simply speaking (e.g., *“500 rupees sugar”*).
- **Daily Expenses:** Track daily out-of-pocket expenses effortlessly.
- **PDF Generation:** Download a complete physical balance sheet for a customer via jsPDF.
- **WhatsApp Integration:** Automatically format and share credit alerts via WhatsApp.
- **Glassmorphism UI:** Stunning frosted glass effects, smooth micro-interactions, and 100% responsive design for mobile and desktop.

## Folder Structure

```
DigiKhata/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB Connection
│   ├── controllers/           # API Logic (Auth, Customer, Transaction, Expense)
│   ├── middleware/            # Security Middlewares (JWT)
│   ├── models/                # Mongoose Database Schemas
│   ├── routes/                # Express Route Endpoints
│   ├── server.js              # Application Entry Point
│   ├── package.json
│   └── .env                   # Environment Variables
│
├── frontend/
│   ├── css/
│   │   └── style.css          # Glassmorphism Design System
│   ├── js/
│   │   ├── api.js             # API Fetch Wrappers
│   │   ├── app.js             # Main App Routing & Listeners
│   │   ├── auth.js            # Auth State & Token Management
│   │   ├── components.js      # Dynamic HTML render functions
│   │   ├── pdf.js             # PDF Sheet Generator
│   │   ├── speech.js          # Speech-to-Text handler
│   │   └── whatsapp.js        # WhatsApp Share Intent Logic
│   └── index.html             # Main View Container
└── README.md
```

## Step-by-Step Installation

### Prerequisites
1. Ensure you have **Node.js** installed on your system.
2. Ensure you have **MongoDB** running locally (or update the `.env` connection string to a cloud Atlas cluster).

### Step 1: Backend Setup
1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the necessary Node.js packages:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   node server.js
   ```
   *You should see a message: `Server running on port 5000` and `MongoDB Connected`.*

### Step 2: Frontend Setup
The frontend is a pure Vanilla JS Single Page Application. It does not require a build step!
1. Open the `frontend` folder.
2. If you are using VS Code, use the **Live Server** extension on `index.html`. 
   - *Alternatively, simply drag and drop `index.html` into your web browser.*
3. Ensure the browser is running on `localhost` to allow the Web Speech API to access your microphone without strict HTTPS restrictions.

## Usage Guide
1. **Register**: First, create a new shop owner account on the Register screen.
2. **Dashboard**: Here you can see your total credits given vs total payments received. 
3. **Add Customer**: Click "Add" to enter a customer's name and phone number.
4. **Detail View**: Click on any customer to see their running balance.
   - Click "Give Credit" or "Got Payment" to add a transaction manually.
   - Click the **Microphone** icon in the transaction modal to say *"150 rupees for snacks"*, it will auto-fill the amount and description!
   - Click the **PDF** icon to download a ledger statement.
   - Click the **WhatsApp** icon to quickly message the pending balance to the customer.
   - **Click and hold** (Long Press) a transaction to delete it.

## Developer Notes
- Change `MONGO_URI` in `backend/.env` to connect to a production database.
- The `fetch` calls in `frontend/js/api.js` assume the backend is running at `http://localhost:5000/api`. If deployed externally, update the `API_URL` variable.

Enjoy using your elegant and capable DigiKhata Ledger application!
