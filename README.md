# Smart Pantry

An AI-powered kitchen inventory management app that helps you track groceries, reduce food waste, and discover recipes.

## What it does

Smart Pantry keeps track of what's in your kitchen. Scan receipts to automatically add items, get expiration alerts before food goes bad, and find recipes based on ingredients you have. The app uses Google's Gemini AI for smart features like receipt OCR and recipe suggestions.

## Tech Stack

**Backend**
- Node.js + Express
- SQLite with better-sqlite3
- Google Gemini AI
- Tesseract.js for OCR
- Web Push for notifications
- TypeScript

**Frontend**
- React 18
- Tailwind CSS
- PWA with offline support
- Vite

## Features

- **Receipt Scanning**: Take a photo of your grocery receipt to auto-add items
- **Expiration Tracking**: Get notified before items expire
- **Recipe Suggestions**: AI-powered recipes based on what you have
- **Inventory Management**: Add, edit, and categorize items
- **Push Notifications**: Browser notifications for expiring items
- **Offline Support**: Works without internet, syncs when back online
- **User Authentication**: Secure login with JWT

## Getting Started

### Prerequisites
- Node.js 18+
- Google Gemini API key (for AI features)

### Installation

1. Set up the backend:
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

npm run db:init
npm run dev
```

2. Set up the frontend:
```bash
# From root directory
npm install
npm run dev
```

3. Open http://localhost:5173

## Environment Variables

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items |
| POST | `/api/inventory` | Add item |
| PUT | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Remove item |

### Receipts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/receipts/scan` | Upload and scan receipt |

### Recipes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes/suggest` | Get recipe suggestions |

## Project Structure

```
smart-pantry/
├── backend/
│   └── src/
│       ├── routes/
│       ├── services/
│       │   ├── gemini.ts     # AI integration
│       │   ├── ocr.ts        # Receipt scanning
│       │   └── notifications.ts
│       ├── db/
│       └── middleware/
├── src/                      # Frontend
│   ├── components/
│   └── App.tsx
├── public/
│   ├── manifest.json
│   └── sw.js                 # Service worker
└── package.json
```

## AI Features

### Receipt Scanning
Upload a receipt photo and the app extracts:
- Item names
- Quantities
- Estimated expiration dates

### Recipe Suggestions
Based on your inventory, Gemini suggests recipes that:
- Use ingredients you have
- Prioritize items expiring soon
- Match your dietary preferences

## License

MIT
