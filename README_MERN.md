# Fluency2Work MERN Transformation

This project has been transformed into a MERN stack application.

## Prerequisites
- Node.js
- MongoDB (running locally on port 27017)

## Setup & Run

### 1. Server (Backend)
Navigate to the `server` directory:
```bash
cd server
npm install
```

**Seed the Database:**
Make sure MongoDB is running, then populate the database with the initial data:
```bash
node seed.js
```

**Start the Server:**
```bash
node index.js
```
The server will run on `http://localhost:5000`.

### 2. Client (Frontend)
Open a new terminal and navigate to the `client` directory:
```bash
cd client
npm install
npm run dev
```
The client will run on `http://localhost:5173`.

## Structure
- **server/**: Node.js + Express + MongoDB backend.
  - `models/`: Mongoose schemas.
  - `seed.js`: Script to populate the database.
  - `index.js`: Main server file.
- **client/**: React + Vite frontend.
  - `src/App.jsx`: Main application logic.
  - `src/index.css`: Styles ported from the original HTML.
  - `public/audio`: Audio assets.
