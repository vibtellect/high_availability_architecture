FROM python:3.11-slim

WORKDIR /app

# Install Docker CLI to execute docker commands
RUN apt-get update && apt-get install -y \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port
EXPOSE 8084

# Run the application
CMD ["python", "app.py"] 