#!/bin/bash

# Local Development Setup for AI Service
# This script sets up the Python environment for local testing

echo "🚀 Setting up AI Formula Generation Service for local development..."

# Navigate to ai-service directory
cd "$(dirname "$0")/ai-service" || exit 1

# Check if Python 3.11+ is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Found Python $PYTHON_VERSION"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo ""
    echo "⚠️  OpenAI API key not set!"
    echo "Please set your OpenAI API key:"
    echo "  export OPENAI_API_KEY='sk-proj-your-key-here'"
    echo ""
    echo "Or create a .env file in ai-service/ with:"
    echo "  OPENAI_API_KEY=sk-proj-your-key-here"
    echo ""
else
    echo "✅ OpenAI API key is configured"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the AI service locally:"
echo "  cd ai-service"
echo "  source venv/bin/activate"
echo "  export OPENAI_API_KEY='your-key-here'  # If not already set"
echo "  python app.py"
echo ""
echo "The service will be available at: http://localhost:8080"
echo ""
echo "To test the API:"
echo "  curl http://localhost:8080/health"
echo ""
