FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for PyMuPDF
RUN apt-get update && apt-get install -y \
    libmupdf-dev \
    libfreetype6-dev \
    libharfbuzz-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libffi-dev \
    pkg-config \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway will set the PORT environment variable
# Don't expose a specific port, let Railway handle it

# Command to run the application
# Use ${PORT:-8000} to default to 8000 if PORT is not set
CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}