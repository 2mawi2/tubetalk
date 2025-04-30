# Contributing to TubeTalk

First off, thank you for considering contributing to TubeTalk! It's people like you that make TubeTalk such a great tool.

We welcome contributions in various forms, including bug reports, feature requests, documentation improvements, and code contributions.

## Getting Started

### Setting Up the Development Environment

1.  **Fork the repository:** Click the "Fork" button on the top right of the [TubeTalk GitHub repository](https://github.com/2mawi2/tubetalk).
2.  **Clone your fork:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/tubetalk.git
    cd tubetalk
    ```
3.  **Install dependencies:** We use `just` as a command runner. Ensure you have it installed (`brew install just` or see [Just documentation](https://github.com/casey/just#installation)). Then run:
    ```bash
    just install
    ```
    This will install dependencies for both the extension and the server (if applicable).
4.  **Set up environment variables:** Copy the example environment file for the extension:
    ```bash
    cp extension/.env.example extension/.env
    ```
    Fill in the required variables in `extension/.env`, such as `OPENROUTER_API_KEY`. Refer to the [README.md](README.md#configuration) for details on obtaining keys.
5.  **Start the development server:**
    ```bash
    just dev # Runs the extension development server
    ```
6.  **Load the extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" in the top right corner.
    *   Click "Load unpacked".
    *   Select the `tubetalk/extension/dist` directory.

### Coding Standards

*   Please follow the existing code style and patterns.
*   Run the linter before committing: `just lint`
*   Ensure all tests pass: `just test`

## Contribution Workflow

1.  **Create a branch:** Create a new branch for your feature or bugfix from the `main` branch.
    ```bash
    git checkout main
    git pull origin main
    git checkout -b your-feature-or-bugfix-branch
    ```
2.  **Make your changes:** Implement your feature or fix the bug. Remember to add tests for new functionality.
3.  **Commit your changes:** Use clear and concise commit messages.
4.  **Push your branch:**
    ```bash
    git push origin your-feature-or-bugfix-branch
    ```
5.  **Open a Pull Request:** Go to the original TubeTalk repository and open a Pull Request from your fork's branch to the `main` branch.
    *   Provide a clear title and description for your PR.
    *   Link any relevant issues (e.g., "Closes #123").
    *   Explain the changes you've made and why.

## Reporting Bugs

*   Search existing [GitHub Issues](https://github.com/2mawi2/tubetalk/issues) to see if the bug has already been reported.
*   If not, create a new issue.
*   Provide a clear title and description, including steps to reproduce the bug, expected behavior, and actual behavior.
*   Include details about your environment (OS, Chrome version).

## Suggesting Features

*   Search existing [GitHub Issues](https://github.com/2mawi2/tubetalk/issues) to see if the feature has already been suggested.
*   If not, create a new issue.
*   Provide a clear title and description, explaining the proposed feature and its potential benefits.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand the expected standards of behavior.

Thank you for your contributions! 