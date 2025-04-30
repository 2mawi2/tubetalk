# TubeTalk: AI Assistant for YouTube Videos

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![TubeTalk Promo Banner](extension/icons/promo/promo_1128x191.png)

TubeTalk is a Chrome extension that enhances your YouTube experience by providing AI-powered transcript analysis, summaries, and interactive chat capabilities directly on the YouTube page.

<!-- TODO: Add 1-3 screenshots or a GIF here showing the extension sidebar in action -->

## Features

*   **AI-Powered Summaries:** Get concise summaries of video content.
*   **Key Insights:** Extract the most important points and topics discussed in the video.
*   **Interactive Chat:** Ask questions about the video content and get answers from an AI assistant.
*   **Timestamp Navigation:** Click on timestamps in the chat or summary to jump directly to that part of the video.
*   **Multi-language Support:** Interface and summaries available in multiple languages.
*   **Customizable Models:** Choose from various large language models via OpenRouter.
*   **Screenshot Interaction:** Capture a frame from the video and ask questions about it.

## Installation

**1. Install from Chrome Web Store (Recommended)**

*   Visit the [TubeTalk page on the Chrome Web Store](https://chromewebstore.google.com/detail/tubetalk-youtube-ki-chat/cbclkjldgdhdnohefkdhlgmdogcnfhhj).
*   Click "Add to Chrome".

**2. Load Unpacked (for Development/Testing)**

If you want to run the latest development version or contribute to the project:

1.  **Download the code:** Clone this repository.
    ```bash
    git clone https://github.com/2mawi2/tubetalk.git
    cd tubetalk
    ```
2.  **Install dependencies:** Ensure you have Node.js, npm, and `just` installed (see [CONTRIBUTING.md](CONTRIBUTING.md#setting-up-the-development-environment)).
    ```bash
    just install
    ```
3.  **Build the extension:**
    ```bash
    just build
    ```
    This creates the necessary files in `extension/dist`.
4.  **Load in Chrome:**
    *   Open `chrome://extensions`.
    *   Enable "Developer mode".
    *   Click "Load unpacked" and select the `tubetalk/extension/dist` directory.

## Usage

1.  Navigate to any YouTube video page.
2.  Click the TubeTalk extension icon in your Chrome toolbar (or use the keyboard shortcut Alt+Y / Option+Y) to open the sidebar.
3.  The extension will automatically fetch the transcript and provide an initial summary (if configured).
4.  Interact with the AI by typing questions into the chat input at the bottom of the sidebar.

## Configuration

TubeTalk relies on API keys and specific environment variables to function correctly.

### 1. API Key Setup (Required)

TubeTalk uses [OpenRouter.ai](https://openrouter.ai/) to access various large language models. You need an OpenRouter API key for the extension to work.

*   **Get an OpenRouter API Key:** Sign up or log in at [OpenRouter.ai](https://openrouter.ai/) and generate an API key.
*   **Set the API Key:**
    *   **If installed from Chrome Web Store:** Open the TubeTalk sidebar on YouTube, click the Settings (gear) icon, and enter your API key there.
    *   **If loaded unpacked for development:** Follow the `.env` setup steps below.

*   **Development `.env` Setup:**
    1.  **Copy the example file:** In the `extension/` directory, copy `.env.example` to `.env`:
        ```bash
        cp extension/.env.example extension/.env
        ```
    2.  **Edit `.env`:** Open `extension/.env` and replace `your_openrouter_api_key_here` with your actual key.
        ```dotenv
        OPENROUTER_API_KEY=sk-or-v1-abc123xyz789... # <-- Paste your key here
        ```
    3.  **Rebuild:** Run `just build` and reload the extension in Chrome.
    *   **Security Note:** Never commit your `.env` file.

### 2. In-Extension Settings

Once the extension is running and has an API key, click the **Settings** (gear) icon in the sidebar to:

*   Verify or update your API key.
*   Select preferred AI models.
*   Choose interface and summary languages.
*   Toggle features like dark mode and suggested questions.

## Running Tests

To ensure the extension is working correctly:

*   **Unit Tests:** `just test` (runs tests within the `extension/` directory)
*   **End-to-End Tests:** `just test-e2e` (requires browser setup, see `CONTRIBUTING.md`)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on the process, coding standards, and workflow.

## Support and Bug Reports

If you encounter any issues or have questions, please file an issue on the [GitHub Issues page](https://github.com/2mawi2/tubetalk/issues).

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

