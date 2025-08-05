# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TubeTalk is a Chrome extension that enhances YouTube videos with AI-powered transcript analysis, summaries, and interactive chat capabilities. It uses OpenRouter.ai to access various LLMs and provides a sidebar interface directly on YouTube pages.

## Development Commands

```bash
# Install dependencies
just install

# Development
just dev                    # Start development server with hot reload
just build                  # Create production build
just preview               # Preview production build

# Testing  
just test                   # Run unit tests
just test-watch            # Run tests in watch mode
just test-coverage         # Run tests with coverage report
just test-e2e              # Run end-to-end tests
just test-e2e-ui           # Run e2e tests with Playwright UI

# Code Quality
just lint                   # Run ESLint
just lint-fix              # Run ESLint with auto-fix

# Assets
just icons                  # Generate extension icons from SVG source
just screenshots           # Generate promotional screenshots

# Clean
just clean                 # Clean dist, screenshots, and test data
just distclean            # Clean everything including node_modules
```

## Architecture Overview

### Key Services

**VideoDataService** (`extension/src/common/services/VideoDataService.ts`):
- Central service for fetching video metadata and transcripts
- Implements multiple fallback strategies for transcript fetching:
  1. New YouTube API with auth headers
  2. Legacy API endpoints
  3. DOM extraction from YouTube UI
- Manages caching and token limit validation
- Current performance issue: Sequential fallback attempts with timeouts

**YouTubeTranscriptAPI** (`extension/src/common/services/YouTubeTranscriptAPI.ts`):
- Handles new YouTube API authentication and requests
- Generates SAPISIDHASH for API authorization

### Core Components

**Sidebar** (`extension/src/sidebar/Sidebar.tsx`):
- Main UI container injected into YouTube pages
- Manages settings, messages, and user interactions
- Adjusts YouTube layout to accommodate sidebar

**Messages** (`extension/src/messages/`):
- Handles chat functionality and streaming responses
- Manages conversation state with MobX stores

**Storage** (`extension/src/storage/`):
- Chrome storage abstraction layer
- Manages API keys, settings, and user preferences

### Extension Structure

```
extension/
├── manifest.json          # Chrome extension manifest
├── src/
│   ├── extension/        # Background script and content script
│   ├── common/           # Shared services, adapters, and utilities
│   ├── sidebar/          # Main sidebar component
│   ├── messages/         # Chat and messaging components
│   ├── settings/         # Settings UI and storage
│   └── storage/          # Chrome storage adapters
└── dist/                 # Built extension files
```

## Release Process

### Creating a Release

Releases are automated through GitHub Actions when pushing to the `release` branch:

1. **Ensure all tests and linters pass**:
   ```bash
   just test          # Run all tests (should show 385+ passing)
   just lint          # Ensure no linting errors
   ```

2. **Merge changes to release branch**:
   ```bash
   git checkout release
   git pull origin release
   git merge main
   git push origin release
   ```

3. **Automated Pipeline** will:
   - Run all tests
   - Build the extension
   - Publish to Chrome Web Store
   - Create GitHub release with changelog
   - Bump version for next release
   - Commit version bump back to release branch

4. **Monitor Progress**:
   - GitHub Actions: https://github.com/2mawi2/tubetalk/actions
   - Check workflow: `Publish Chrome Extension`

### Version Management

- Version is managed in `extension/manifest.json`
- Pipeline automatically bumps patch version after release
- Current version on `release` branch is what gets published
- Version format: `MAJOR.MINOR.PATCH` (e.g., 1.2.25)

## Key Considerations

- Extension runs in YouTube's content script context
- Uses Chrome storage API for persistence
- Requires OpenRouter API key for AI functionality
- Supports multiple languages via Chrome i18n
- Token limit: 128k tokens (minus 3k for output)
- Build system: Vite with CRXJS plugin
- State management: MobX for messages, Zustand for sidebar