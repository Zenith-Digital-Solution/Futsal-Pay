FROM python:3.14-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (no editable, no dev deps)
RUN uv sync --frozen --no-dev

# Copy application code
# note: the host virtual environment (
# `.venv` ) is ignored via .dockerignore.  the venv is created
# inside the container by `uv sync` above to avoid conflicts.
COPY . .

ENV PYTHONPATH=.
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"]
