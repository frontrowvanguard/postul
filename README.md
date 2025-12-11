# Postul

**Postul** is an AI-powered platform where your ideas, theories, and hypotheses are postulated and valued. It helps aspiring entrepreneurs and educators validate startup ideas before building, guiding users to clarify problems and test assumptions with smart, research-backed prompts.

[![All Contributors](https://img.shields.io/github/all-contributors/projectOwner/projectName?color=ee8449&style=flat-square)](#contributors)


## 🎯 Overview

Postul increases early-stage startup success rates by helping users:
- **Clarify problems** - Transform raw ideas into clear, validated problem statements
- **Generate validation plans** - Create tailored interview and survey templates
- **Get market insights** - Access automated market sizing and competitor analysis
- **Track progress** - Visualize validation metrics and track work over time

The platform is designed for student founders, innovation educators, and early-stage teams who want to validate ideas efficiently before investing significant time and resources.

## ✨ Features

### Core Features
- **AI-Powered Idea Analysis** - Get comprehensive SWOT analysis, problem statements, and actionable insights
- **Voice Input Support** - Speak your ideas naturally with transcription support
- **Tiki-Taka Conversations** - Interactive AI advisor to help refine your thinking
- **Project Management** - Organize multiple ideas within projects
- **Survey Post Generation** - Create social media survey posts for validation (X/Twitter, Threads)
- **Flyer Generation** - Generate and edit marketing flyers with AI assistance
- **Text-to-Speech** - Convert AI responses to natural-sounding speech

### Technical Features
- **RESTful API** - FastAPI backend with async/await for scalability
- **Mobile App** - React Native/Expo app for iOS and Android
- **Real-time Processing** - Fast response times with optimized AI integration
- **Authentication** - Supabase JWT-based authentication
- **Database** - PostgreSQL via Supabase with SQLAlchemy ORM

## 🛠️ Tech Stack

### Backend
- **Python 3.13+** - Core language
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - ORM for database operations
- **Supabase** - Authentication and PostgreSQL database
- **OpenAI API** - GPT-4o-mini for idea analysis
- **Google Gemini** - Image generation and analysis
- **Supertonic TTS** - Text-to-speech synthesis
- **Docker** - Containerization

### Mobile App
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tooling
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **Expo AV** - Audio playback
- **Expo Speech Recognition** - Voice input

## 📁 Project Structure

```
postul/
├── server/                 # FastAPI backend
│   ├── main.py            # Application entry point
│   ├── config.py          # Environment configuration
│   ├── database.py        # Database models and setup
│   ├── schema.py          # Pydantic models
│   ├── routers/           # API route handlers
│   │   ├── ideas.py       # Idea analysis endpoints
│   │   ├── projects.py    # Project management endpoints
│   │   ├── tts.py         # Text-to-speech endpoints
│   │   └── flyers.py      # Flyer generation endpoints
│   ├── services/          # Business logic services
│   │   ├── ai_service.py  # OpenAI/Gemini integration
│   │   ├── tts_service.py # TTS processing
│   │   └── flyer_service.py # Flyer generation
│   └── assets/            # TTS models and voice styles
│
├── apps/
│   └── mobile/            # React Native mobile app
│       ├── app/           # Expo Router pages
│       ├── components/    # React components
│       ├── services/      # API client
│       └── constants/     # App configuration
│
└── docs/                  # Documentation
    └── prd.md            # Product requirements document
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.13+** (for backend)
- **Node.js 18+** and **pnpm** (for mobile app)
- **Supabase account** - [Create one here](https://supabase.com)
- **OpenAI API key** - [Get one here](https://platform.openai.com)
- **Google Gemini API key** - [Get one here](https://ai.google.dev)
- **Docker** (optional, for containerized deployment)

### Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   uv sync
   ```

3. **Create `.env` file:**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_JWT_SECRET=your-supabase-jwt-secret
   DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4o-mini
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash-image
   APP_NAME=Postul API
   DEBUG=false
   CORS_ORIGINS=http://localhost:3000,http://localhost:8081
   ```

4. **Run the server:**
   ```bash
   uv run python main.py
   ```

   Or with uvicorn directly:
   ```bash
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001
   ```

5. **Verify it's running:**
   - API docs: http://localhost:8001/docs
   - Health check: http://localhost:8001/health

### Mobile App Setup

1. **Navigate to mobile app directory:**
   ```bash
   cd apps/mobile
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure API endpoint:**
   Update `apps/mobile/constants/api.ts` with your backend URL:
   ```typescript
   export const API_BASE_URL = 'http://localhost:8001';
   ```

4. **Start the development server:**
   ```bash
   pnpm start
   ```

5. **Run on platform:**
   - iOS: `pnpm ios`
   - Android: `pnpm android`
   - Web: `pnpm web`

## 🐳 Docker Deployment

### Production

```bash
cd server
docker-compose up --build
```

### Development (with hot reload)

```bash
cd server
docker-compose -f docker-compose.dev.yml up --build
```

### Using Makefile

```bash
cd server
make build      # Build production image
make up         # Start production containers
make up-dev     # Start development containers
make down       # Stop containers
make logs       # View logs
make shell      # Open shell in container
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Ideas
- `POST /api/v1/ideas/analyze` - Analyze a transcribed idea
- `GET /api/v1/ideas/{idea_id}` - Get a specific idea
- `GET /api/v1/ideas` - List ideas for the current user

### Projects
- `POST /api/v1/projects` - Create a new project
- `GET /api/v1/projects` - List user projects
- `GET /api/v1/projects/{project_id}` - Get project details

### Text-to-Speech
- `POST /api/v1/tts/synthesize` - Convert text to speech

### Flyers
- `POST /api/v1/flyers/generate` - Generate a flyer for a project/idea
- `POST /api/v1/flyers/{flyer_id}/edit` - Edit a flyer with natural language

### Tiki-Taka Conversations
- `POST /api/v1/ideas/tiki-taka` - Interactive conversation with AI advisor

For detailed API documentation, visit `/docs` when the server is running.

## 🔐 Authentication

The API supports both authenticated and anonymous users:

- **Authenticated users**: Include a Bearer token in the Authorization header:
  ```
  Authorization: Bearer <supabase-jwt-token>
  ```

- **Anonymous users**: Omit the Authorization header (limited functionality)

## 🧪 Development

### Code Style

- **Backend**: Follow PEP 8 and use type hints throughout
- **Frontend**: Follow ESLint configuration (Expo defaults)

### Database Migrations

Database tables are automatically created on server startup. For manual migrations, see `migrations/` directory.

### Testing

```bash
# TODO: Add test commands
```

## 📊 Database Schema

### Projects Table
Stores user projects with name, description, and timestamps.

### Ideas Table
Stores user ideas with transcribed text and AI-generated analysis (stored as JSON).

### Flyers Table
Stores generated flyers with image URLs, edit history, and status.

See `server/README.md` for detailed schema documentation.

## 🎯 Roadmap

- [ ] Enhanced validation plan generator
- [ ] Market insight dashboard
- [ ] Survey response tracking
- [ ] Team collaboration features
- [ ] Export functionality for validation plans
- [ ] Integration with Google Forms API

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Mobile app powered by [Expo](https://expo.dev/)
- AI capabilities powered by [OpenAI](https://openai.com/) and [Google Gemini](https://ai.google.dev/)
- Database and auth by [Supabase](https://supabase.com/)

## 📞 Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Postul** - Where ideas are postulated and valued. 🚀

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ahnsv.github.io/"><img src="https://avatars.githubusercontent.com/u/24207964?v=4?s=100" width="100px;" alt="Tae/Humphrey"/><br /><sub><b>Tae/Humphrey</b></sub></a><br /><a href="#projectManagement-ahnsv" title="Project Management">📆</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->