default:
    @just --list

install:
    @echo "Installing project dependencies..."
    cd extension && npm install 

# Development & Build tasks

dev:
    @echo "Starting development server..."
    cd extension && npm run dev

build:
    @echo "Creating production build..."
    cd extension && VITE_ENABLE_MODEL_SELECTION=false npm run build

preview:
    @echo "Previewing production build..."
    cd extension && npm run preview 

# Testing tasks

test *args:
    @echo "Running unit tests {{args}}..."
    cd extension && npm run test -- {{args}}

test-watch *args:
    @echo "Running unit tests in watch mode {{args}}..."
    cd extension && npm run test:watch -- {{args}}

test-coverage:
    @echo "Running unit tests with coverage..."
    cd extension && npm run test:coverage

test-e2e-install:
    @echo "Installing Playwright browsers..."
    cd extension && npm run test:e2e:install

test-e2e:
    @echo "Running E2E tests..."
    cd extension && npm run test:e2e

test-e2e-ui:
    @echo "Running E2E tests with UI..."
    cd extension && npm run test:e2e:ui

# Linting tasks

lint:
    @echo "Running ESLint..."
    cd extension && npm run lint || true

lint-fix:
    @echo "Running ESLint with auto-fix..."
    cd extension && npm run lint:fix || true

# Custom scripts

icons:
    @echo "Generating icons..."
    cd extension && npm run icons

screenshots:
    @echo "Generating promotional screenshots..."
    cd extension && npm run screenshots

screenshots-clean:
    @echo "Cleaning screenshot outputs..."
    cd extension && npm run screenshots:clean

# Benchmarking

benchmark:
    @echo "Running benchmarks..."
    cd extension && npm run benchmark

# Cleaning tasks

clean-dist:
    @echo "Cleaning dist directory..."
    rm -rf extension/dist

clean-screenshots:
    @echo "Cleaning screenshot outputs..."
    rm -rf extension/screenshots/output extension/promo

clean-test-data:
    @echo "Cleaning test user data directories..."
    rm -rf extension/test-user-data-*

clean: clean-dist clean-screenshots clean-test-data
    @echo "Project cleaned."

distclean:
    clean
    @echo "Cleaning node_modules..."
    rm -rf extension/node_modules

# Combined workflows

ci: install lint test test-e2e
    @echo "Running CI tasks..." 