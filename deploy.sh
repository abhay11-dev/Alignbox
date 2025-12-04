#!/bin/bash

# Alignbox Deployment Script
# This script automates the deployment of Alignbox to production

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"

    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git is installed"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    print_success "Node.js is installed ($(node -v))"
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"

    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        if [ -f env.example ]; then
            cp env.example .env
            print_success ".env file created"
        else
            print_error ".env file and env.example not found"
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi

    # Create data directories
    mkdir -p data/mysql data/redis logs uploads
    print_success "Created data directories"

    # Check if environment variables are set
    if grep -q "CHANGE_ME\|your_password\|your_secret" .env; then
        print_error "Please update .env file with your configuration values"
        echo "Edit .env and set the following variables:"
        echo "  - DB_PASSWORD"
        echo "  - JWT_SECRET"
        echo "  - CORS_ORIGIN"
        exit 1
    fi
    print_success "Environment variables are configured"
}

# Build application
build_app() {
    print_header "Building Application"

    # Build frontend
    print_info "Building frontend..."
    cd client
    npm install
    npm run build
    cd ..
    print_success "Frontend built successfully"

    # Build Docker images
    print_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    print_success "Docker images built successfully"
}

# Start application
start_app() {
    print_header "Starting Application"

    print_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 10

    # Check service health
    if docker-compose -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost &> /dev/null; then
        print_success "MySQL is healthy"
    else
        print_error "MySQL is not responding"
        exit 1
    fi

    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not responding"
        exit 1
    fi

    if curl -s http://localhost:3000/health > /dev/null; then
        print_success "Application is healthy"
    else
        print_error "Application is not responding"
        exit 1
    fi
}

# Initialize database
init_database() {
    print_header "Initializing Database"

    print_info "Running database setup..."
    docker-compose -f docker-compose.prod.yml exec -T app npm run db:setup
    print_success "Database setup completed"

    print_info "Seeding database..."
    docker-compose -f docker-compose.prod.yml exec -T app npm run db:seed
    print_success "Database seeded"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"

    # Check container status
    print_info "Checking container status..."
    docker-compose -f docker-compose.prod.yml ps

    # Check logs
    print_info "Recent logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=20 app

    # Check application
    print_info "Testing API endpoint..."
    if curl -s -f http://localhost:3000/health > /dev/null; then
        print_success "API endpoint is responding"
    else
        print_error "API endpoint is not responding"
    fi
}

# Main deployment flow
main() {
    print_header "Alignbox Deployment Script"
    echo ""

    # Check deployment mode
    if [ "$1" == "dev" ]; then
        echo "Deployment mode: Development"
        docker-compose up -d
    elif [ "$1" == "prod" ]; then
        echo "Deployment mode: Production"
        
        check_prerequisites
        echo ""
        
        setup_environment
        echo ""
        
        build_app
        echo ""
        
        start_app
        echo ""
        
        init_database
        echo ""
        
        verify_deployment
        echo ""
        
        print_success "Deployment completed successfully!"
        echo ""
        echo "Application is running at:"
        echo "  - Frontend: http://localhost:80"
        echo "  - API: http://localhost:3000"
        echo ""
        echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f app"
        echo "To stop services: docker-compose -f docker-compose.prod.yml down"
    else
        print_error "Invalid deployment mode. Use 'dev' or 'prod'"
        echo "Usage: ./deploy.sh [dev|prod]"
        exit 1
    fi
}

# Run main function
main "$@"
