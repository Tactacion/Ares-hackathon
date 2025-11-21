# ARES - Aerial Risk Evaluation System
**Autonomous Air Traffic Control powered by Multi-Agent AI**

A cutting-edge autonomous ATC system that uses specialized AI agents to detect conflicts, manage separation, issue voice clearances, and maintain safe airspace operations.

![ARES Dashboard](https://img.shields.io/badge/Status-Operational-success)
![Python](https://img.shields.io/badge/Python-3.10+-blue)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)

## Features

### Core Capabilities
- **5 Specialized AI Agents** working in parallel:
  - Risk Detection Agent - Identifies separation violations, runway incursions
  - Conflict Resolution Agent - Plans conflict avoidance maneuvers
  - Weather Advisory Agent - Issues weather-related clearances
  - Approach Sequencing Agent - Optimizes arrival flows
  - Voice Communications Agent - Generates realistic ATC voice clearances

### New MVP Features (Inspired by Princeton Hackathon)
- **Task-Based Workflow System** - Intelligent deduplication and auto-expiration
- **6-Hour Weather Forecast Timeline** - Visual risk assessment timeline
- **Conflict Timeline Predictor** - Predict conflicts NOW/+5min/+10min/+15min

### Advanced Features
- **Real-time Risk Scoring** using NTSB incident database
- **ElevenLabs Voice Synthesis** with urgency modulation
- **Live Flight Tracking** via OpenSky Network
- **Interactive Map Visualization** with Mapbox GL
- **WebSocket Real-time Updates**
- **Redis Caching** for performance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ARES FRONTEND (React)                     │
│  ┌────────────┐  ┌───────────┐  ┌──────────────────────┐   │
│  │  Map View  │  │   Tasks   │  │  Weather/Conflict    │   │
│  │  (Mapbox)  │  │   Panel   │  │     Timelines        │   │
│  └────────────┘  └───────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ▼ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                 ARES BACKEND (FastAPI)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Multi-Agent AI System                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │  Risk    │  │ Conflict │  │ Weather  │           │   │
│  │  │ Detector │  │ Resolver │  │ Advisory │  + 2 more │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Task    │  │  NTSB    │  │  Voice   │  │  Redis   │   │
│  │ Manager  │  │ Database │  │  Synth   │  │  Cache   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis
- OpenAI API key
- ElevenLabs API key
- Mapbox token

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Tactacion/Ares-hackathon.git
cd Ares-hackathon
```

2. **Backend Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

3. **Frontend Setup**
```bash
cd frontend
npm install

# Copy and configure environment variables
cp .env.example .env
# Add your Mapbox token
```

4. **Start Redis**
```bash
redis-server
# Or on macOS with Homebrew:
brew services start redis
```

5. **Run the Application**

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
python3 main.py
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

6. **Open in Browser**
```
http://localhost:5173
```

## Usage

### Load Demo Scenarios

Use the quick-load buttons in the header:
- **🚨 CRITICAL** - Separation violation scenario
- **⚡ HIGH TRAFFIC** - High workload with multiple aircraft
- **🛬 ARRIVALS** - Approach sequencing scenario

### Task Management

Tasks are automatically generated when alerts are detected:
- View active tasks in the Task Panel
- Expand tasks to see AI recommendations and pilot messages
- Resolve tasks when action is taken
- Tasks auto-expire after 10 minutes if not updated

### Timeline Predictors

- **Weather Timeline** - 6-hour forecast with risk visualization
- **Conflict Timeline** - Predicted separation conflicts at NOW/+5min/+10min/+15min

## Configuration

### Environment Variables

**Backend (.env)**:
```env
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend (.env)**:
```env
VITE_MAPBOX_TOKEN=your_token_here
```

## API Documentation

Once running, visit:
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
- Task API: http://localhost:8000/api/tasks

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **WebSocket** - Real-time communication
- **Redis** - Caching and pub/sub
- **OpenAI GPT-4** - AI agent intelligence
- **ElevenLabs** - Voice synthesis
- **Pydantic** - Data validation

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Mapbox GL** - Map visualization

## Project Structure

```
Ares/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration
│   ├── models.py               # Data models
│   ├── task_models.py          # Task system models
│   ├── services/
│   │   ├── ai_copilot.py       # AI agent orchestration
│   │   ├── risk_detector_enhanced.py
│   │   ├── task_manager.py     # Task lifecycle management
│   │   ├── voice_controller.py # Voice synthesis
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskPanel.tsx
│   │   │   ├── WeatherTimeline.tsx
│   │   │   ├── ConflictTimeline.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
└── README.md
```

## Contributing

This is a hackathon project built for demonstration purposes. Contributions and feedback are welcome!

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Inspired by the Princeton Hackathon project "Amelia - Cursor for Air Traffic Controllers"
- Built with Claude Code
- NTSB aviation incident database for risk analysis
- OpenSky Network for live flight data

## Demo

Watch ARES in action detecting and resolving conflicts in real-time!

---

**Built with ❤️ for safer skies**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
