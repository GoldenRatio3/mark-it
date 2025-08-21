# Mark-It: AI-Powered Exam Marking System

An intelligent exam marking platform that combines LangChain AI with computer vision to provide accurate, reliable marking of both text-based and visual reasoning questions.

## 🚀 Key Features

### ✅ **Improved Confidence Scoring**

- **No more "always 1" confidence scores** - Uses objective criteria matching instead of LLM self-assessment
- **Multi-factor confidence calculation** based on:
  - Criteria fulfillment percentage
  - Marks awarded vs. available ratio
  - Feedback quality indicators
  - Question type complexity

### 🔍 **Visual Reasoning Support**

- **Graph paper question marking** using OpenCV and computer vision
- **Geometric accuracy measurement** for shapes, scale, rotation, and position
- **Automatic shape detection** and classification
- **Precision marking** with configurable tolerance levels

### 👨‍🏫 **Teacher Review Workflow**

- **Batch approval** by confidence threshold
- **Individual question review** with detailed breakdowns
- **Override capabilities** for AI marking decisions
- **Audit trail** for all teacher modifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Student Paper │    │   Mark Scheme    │    │   AI Marking    │
│   (PDF/Image)   │───▶│   (PDF)          │───▶│   (LangChain)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Visual Analysis  │    │ Confidence      │
                       │ (OpenCV)         │    │ Scoring         │
                       └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Teacher Review   │    │ Final Results   │
                       │ Dashboard        │    │ Export          │
                       └──────────────────┘    └─────────────────┘
```

## 🛠️ Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- OpenCV dependencies (see below)

### Python Backend Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install OpenCV system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y libopencv-dev python3-opencv

# Install Tesseract OCR
sudo apt-get install tesseract-ocr
```

### Frontend Setup

```bash
cd app
npm install
npm run dev
```

## 📖 Usage

### 1. Basic Marking

```python
from app.lib.visual_marking import VisualMarker
from app.lib.confidence_scorer import ConfidenceScorer

# Initialize components
visual_marker = VisualMarker(grid_spacing=50.0)
confidence_scorer = ConfidenceScorer()

# Mark a visual question
result = visual_marker.mark_visual_question(
    "student_answer.jpg",
    expected_answer={
        'shape_type': 'triangle',
        'vertices': [[2, 2], [4, 6], [7, 3]],
        'tolerance': {
            'scale': 0.1,
            'rotation': 5.0,
            'position': 1.0
        }
    }
)
```

### 2. Confidence Scoring

```python
# Calculate confidence from criteria matching
confidence = confidence_scorer.calculate_confidence_from_criteria(
    student_answer="Student's answer text",
    mark_scheme=[
        Criterion(
            description="Correct method",
            marks=2,
            keywords=["method", "correct", "approach"]
        )
    ],
    llm_feedback="AI feedback text"
)

print(f"Confidence: {confidence.confidence_score:.3f}")
print(f"Criteria met: {confidence.criteria_matched}/{confidence.total_criteria}")
```

### 3. API Usage

```typescript
// Mark a paper via API
const response = await fetch('/api/mark', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		files: [markSchemeFile, studentPaperFile],
		markSchemeData: {
			/* optional mark scheme metadata */
		},
		questionTypes: {
			/* question type mapping */
		},
	}),
});

const result = await response.json();
```

## 🔧 Configuration

### Environment Variables

```bash
# .env file
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
LANGSMITH_API_KEY=your_langsmith_key
```

### Visual Marking Settings

```python
# Configure tolerance levels
visual_marker = VisualMarker(
    grid_spacing=50.0,  # pixels per grid unit
    tolerance=0.1       # general tolerance
)

# Question-specific tolerances
expected_answer = {
    'shape_type': 'triangle',
    'vertices': [[2, 2], [4, 6], [7, 3]],
    'tolerance': {
        'scale': 0.1,      # 10% scale tolerance
        'rotation': 5.0,   # 5° rotation tolerance
        'position': 1.0    # 1 grid unit position tolerance
    }
}
```

## 📊 Teacher Review Workflow

### 1. **Batch Approval**

- Set confidence threshold (e.g., 0.8)
- Automatically approve high-confidence questions
- Focus review time on uncertain cases

### 2. **Individual Review**

- Expand question details for full analysis
- View confidence breakdown and reasoning
- See visual analysis for geometric questions

### 3. **Override Management**

- Modify AI marks when necessary
- Provide reasoning for overrides
- Maintain audit trail

## 🧪 Testing

### Run Python Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_visual_marking.py

# Run with coverage
pytest --cov=app
```

### Test Visual Marking

```bash
# Test with sample images
python -m app.lib.visual_marking

# Test confidence scoring
python -m app.lib.confidence_scorer
```

## 🚀 Deployment

### Production Setup

```bash
# Build frontend
cd app
npm run build

# Start production server
npm start

# Python backend (with gunicorn)
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    libopencv-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "app/main.py"]
```

## 📈 Performance & Scalability

### Current Capabilities

- **Text questions**: ~2-5 seconds per question
- **Visual questions**: ~5-15 seconds per question
- **Batch processing**: Up to 100 papers per hour
- **Concurrent users**: 10+ simultaneous teachers

### Optimization Tips

- Use appropriate image resolution (300-600 DPI)
- Ensure good lighting and contrast in scanned papers
- Configure tolerance levels based on question requirements
- Use batch processing for large paper sets

## 🔮 Roadmap

### Phase 1 (Current)

- ✅ Improved confidence scoring
- ✅ Visual question support
- ✅ Teacher review workflow

### Phase 2 (Next 3 months)

- [ ] Mark scheme auto-parsing
- [ ] Partial credit detection
- [ ] Real-time marking during upload

### Phase 3 (Next 6 months)

- [ ] Multi-modal feedback export
- [ ] Curriculum standards mapping
- [ ] LMS integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the [documentation](docs/)
- Contact the development team

---

**Built with ❤️ for educators and students**
