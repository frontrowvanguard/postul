# Postul API Server

FastAPI server for Postul - AI-powered startup idea validation platform.

## Features

- Voice input processing (accepts transcribed text from mobile client)
- AI-powered idea analysis using OpenAI
- Supabase integration for PostgreSQL database and authentication
- RESTful API with async/await for scalability
- JWT token authentication via Supabase

## Setup

### Prerequisites

- Python 3.13+
- Supabase account and project
- OpenAI API key
- PostgreSQL database (via Supabase)

### Installation

1. Install dependencies:
```bash
uv sync
```

2. Create a `.env` file in the `server` directory with the following variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
APP_NAME=Postul API
DEBUG=false
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

3. Run the server:
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Database Schema

### Tables

#### `projects`
Stores user projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-incrementing project ID |
| user_id | VARCHAR | NOT NULL, INDEXED | Supabase user UUID |
| name | VARCHAR(255) | NOT NULL | Project name |
| description | TEXT | NULLABLE | Project description |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### `ideas`
Stores user ideas and AI-generated analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Auto-incrementing idea ID |
| user_id | VARCHAR | NOT NULL, INDEXED | Supabase user UUID |
| project_id | INTEGER | NULLABLE, FOREIGN KEY -> projects.id | Associated project ID |
| transcribed_text | TEXT | NOT NULL | Original voice input text |
| analysis_json | JSON | NULLABLE | AI-generated analysis stored as JSON |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

### Database Setup

The database tables are automatically created on server startup using SQLAlchemy. Ensure your `DATABASE_URL` is correctly configured in the `.env` file.

To manually create tables (if needed):
```python
from database import init_db
await init_db()
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Ideas
- `POST /api/v1/ideas/analyze` - Analyze a transcribed idea (requires authentication)
- `GET /api/v1/ideas/{idea_id}` - Get a specific idea (requires authentication)
- `GET /api/v1/ideas` - List ideas for the current user (requires authentication)

### Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase-jwt-token>
```

## Project Structure

```
server/
├── main.py                 # FastAPI app entry point
├── config.py              # Environment configuration
├── database.py            # SQLAlchemy models and database setup
├── dependencies.py        # FastAPI dependencies (auth)
├── schema.py              # Pydantic models for requests/responses
├── services/
│   ├── ai_service.py      # OpenAI integration
│   └── supabase_service.py # Supabase authentication
└── routers/
    └── ideas.py           # Idea analysis endpoints
```

## Development

### Running Tests

```bash
# TODO: Add test commands
```

### Code Style

Follow PEP 8 and use type hints throughout the codebase.

## Deployment

The server is designed to be deployed on any platform that supports Python and FastAPI (e.g., Railway, Render, AWS, GCP).

Ensure environment variables are properly set in your deployment environment.

## License

MIT

