# Use an official Python runtime as a parent image
FROM python:3.8-slim-bullseye as base

# Set up builder stage to install build dependencies and Python packages
FROM base as builder

RUN mkdir /build
WORKDIR /build

# Copy requirements files
COPY requirements.txt requirements-test.txt ./

# Install system dependencies for building Python packages
# Install the required packages and tools for building Brunsli
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    libpng-dev \
    libfreetype6-dev \
    libaec-dev \
    libblosc-dev \
    git \
    cmake \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Clone and build Brunsli from source
RUN git clone https://github.com/google/brunsli.git && \
    cd brunsli && \
    cmake . && \
    make && \
    make install

# Install Python dependencies
RUN pip install --prefix=/install --no-cache-dir \
    -r requirements.txt gunicorn

# Setup the final image, copying installed packages from the builder stage
FROM base

WORKDIR /usr/src/app

# Install runtime libraries that were needed at build time
RUN apt-get update && apt-get install -y \
    libmariadb-dev-compat \
    libpng16-16 \
    libfreetype6 \
    libaec0 \
    libblosc1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy your application code
COPY deepcell_label ./deepcell_label
COPY application.py .

# Set environment variables
ENV PORT "5000"

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "application"]
