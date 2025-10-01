# 📊 Excel Analytics Platform

A powerful MERN stack application designed for visualizing and analyzing data from Excel files (.xls or .xlsx) using interactive 2D and 3D charts. It features secure JWT authentication, history tracking, and optional AI-powered data summarization using Gemini or OpenAI.

-----

## 🚀 Features

  * **Secure Authentication:** User and Admin roles managed via JWT.
  * **Excel Upload & Parsing:** Handles `.xls` and `.xlsx` files using SheetJS.
  * **Dynamic Charting:** Allows users to select X, Y (and Z) axes dynamically.
      * **2D Charts:** Bar, Line, Pie, Scatter (using Chart.js).
      * **3D Charts:** Column, Pie, Line, Scatter (using Three.js/R3F).
  * **Intelligent Axis Filtering:** Automatically filters Y-axis options to ensure only numerical data is used for quantitative plots.
  * **AI Integration:** Optional feature to generate smart summaries and insights using the Google Gemini or OpenAI API (API key is provided by the user on the dashboard).
  * **Analysis History:** Stores a record of user uploads and selected configurations.
  * **Chart Download:** Export generated charts as downloadable PNG images.

-----

## 🛠️ Tech Stack & Prerequisites

### Frontend

  * **React.js** (for UI)
  * **Tailwind CSS** (for styling)
  * **Chart.js** (`react-chartjs-2`) (for 2D charting)
  * **Three.js** (`@react-three/fiber`, `@react-three/drei`) (for 3D charting)
  * **`html-to-image`** (for chart download)

### Backend

  * **Node.js** & **Express.js** (Server)
  * **MongoDB Atlas** (Database)
  * **Mongoose** (ODM)
  * **JWT** (for Authentication)
  * **Multer** (for file upload handling)
  * **SheetJS/xlsx** (for Excel file parsing)
  * **AI SDKs:** `@google/genai` (Gemini) and `openai` (GPT)

### Prerequisites

You must have **Node.js** (v16+) and **npm** installed on your machine.

-----

## ⚙️ Installation and Setup

### Step 1: Clone the Repository

Clone the project to your local machine:

```bash
git clone https://github.com/joyaljms98/ExcelAnalytics.git
cd ExcelAnalytics
```

### Step 2: Install Dependencies

Navigate into the `backend` and `frontend` folders and install the required packages in each:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Environment Variables (.env)

You **MUST** create a `.env` file in the **`backend`** directory, based on the provided `.env.example`.

| Variable | Description |
| :--- | :--- |
| `MONGO_URI` | Your MongoDB Atlas connection string (including username and password). |
| `JWT_SECRET` | A long, random string used to sign JWT tokens. |
| `PORT` | The port the backend should run on (e.g., `5000`). |

**Create and fill `backend/.env`:**

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ExcelAnalyticsDB?retryWrites=true&w=majority
JWT_SECRET=SUPER_SECRET_KEY_FOR_JWT_SECURITY
PORT=5000

# AI KEYS ARE NOW OPTIONAL/UNUSED HERE. They are provided by the user on the dashboard.
# You can remove the AI keys from this backend .env file entirely.
```

-----

## ▶️ Running the Application

### 1\. Start the Backend Server

Navigate to the `backend` directory and start the server:

```bash
cd backend
npm run dev  # Assuming you have a 'dev' script defined, e.g., using nodemon/sucrase
# OR: node server.js
```

The server should start on port `5000`.

### 2\. Start the Frontend Development Server

Open a **new terminal window**, navigate to the `frontend` directory, and start the Vite development server:

```bash
cd frontend
npm run dev
```

The application should open automatically in your browser (usually at `http://localhost:5173`).

-----

## ☁️ Deployment Notes

This project is a MERN application and requires separate deployment for the frontend and backend.

### Backend Deployment (e.g., Render)

1.  Deploy the **`backend`** folder to a hosting service that supports Node.js (like **Render** or Vercel).
2.  In the hosting platform's settings, define the **Environment Variables** (`MONGO_URI`, `JWT_SECRET`) exactly as they appear in your local `.env` file.
3.  Once deployed, update the API base URL in your frontend code (in `Dashboard.jsx`, `Login.jsx`, `Register.jsx`, etc.) from `http://localhost:5000` to your live backend URL (e.g., `https://yourapp-api.render.com`).

### Frontend Deployment (e.g., Netlify)

1.  Deploy the **`frontend`** folder to a static hosting service like **Netlify** or GitHub Pages.
2.  The build command is typically `npm run build`.
3.  Ensure you have updated all `http://localhost:5000` references in the frontend to point to your live backend service's URL.

### GitHub Management

Remember to keep your project secure:

  * Ensure the local **`.env` files** are listed in your **`.gitignore`** and are never committed.
  * The `.env.example` file is safe to commit and serves as documentation.
