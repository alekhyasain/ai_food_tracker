#!/bin/bash

# Food Diary Setup Script - For new machines
# Usage: ./setup.sh

echo "🍽️  Food Diary - Setup Script"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   macOS: brew install node"
    echo "   Linux: sudo apt install nodejs npm"
    echo "   Windows: Download from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git first"
    exit 1
fi

echo "✅ Git found: $(git --version)"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    cd ..
    git clone https://github.com/alekhyasain/ai_food_tracker.git
    cd ai_food_tracker
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  npm start"
echo ""
echo "Then open:"
echo "  http://localhost:3000"
echo ""
echo "📚 For deployment guide, see DEPLOYMENT.md"
echo ""

# Ask if user wants to start the server
read -p "Start the server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm start
fi
