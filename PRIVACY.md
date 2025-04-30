# Privacy Policy for TubeTalk

## 1. Introduction
The TubeTalk project is committed to protecting your privacy. This policy explains how the TubeTalk Chrome extension handles your data. By using the TubeTalk extension, you consent to the data practices described in this policy.

## 2. Data Collection and Transmission
The extension accesses publicly available YouTube video transcripts, titles, and descriptions locally in your browser. When you use features requiring AI analysis (like summarization or chat), the relevant video transcript and other publicly available metadata are transmitted directly from your browser to the relevant third-party AI service's API (e.g., OpenAI) using your personal API key configured in the extension settings. The TubeTalk project does not collect or store this data on servers associated with the project.

If you use any chat or messaging features within the extension, those conversations are temporarily stored in your browser's local storage and are cleared when you close or reload the page, or manually clear them via the extension's interface. No conversation data is permanently stored or transmitted to servers associated with the TubeTalk project.

Your third-party API keys (e.g., OpenAI API key) are stored securely in Chrome's sync storage (or local storage, depending on your Chrome settings) and are never transmitted to servers associated with the TubeTalk project. They are used solely by the extension running in your browser to communicate directly with the respective third-party services (e.g., OpenAI) for transcript analysis or other AI-driven features.

## 3. Data Processing
All processing involving third-party AI services occurs directly between your browser and the service (e.g., OpenAI) using your personal API key. Video content (transcripts, titles, descriptions) is processed temporarily in your browser's memory and is never permanently stored or transmitted to servers associated with the TubeTalk project.

When using the image capture feature (if available), frames are captured locally, converted to base64 format, and stored temporarily in your browser's memory. These images are then transmitted directly from your browser to the configured AI service's API for processing. No images are stored permanently by the TubeTalk project or shared with other services beyond the configured AI provider.

## 4. Legal Basis for Processing
The extension's processing activities are based on:

*   Your explicit consent when configuring and using the extension's features that require third-party API access.
*   The necessity to provide the extension's functionality.
*   Compliance with YouTube's Terms of Service.

By using the extension's features that interact with third-party AI services, you consent to the transmission of video transcripts, associated metadata, and potentially image data (if applicable) to that service for processing under the terms of your agreement with that service provider.

## 5. Browser Permissions
The TubeTalk extension requires these Chrome permissions:

*   Access to youtube.com and potentially other video platform domains: To read video transcripts, titles, descriptions, and interact with the page.
*   Storage (local and sync): For storing settings (including API keys), temporary chat data, and enabling Chrome Sync for settings if available/enabled.
*   Context Menus: To provide quick actions via the right-click menu.
*   Declarative Net Request Feedback: May be used for specific network-related optimizations or features.

## 6. Technical Safeguards
The extension implements these technical measures:

*   Use of secure HTTPS connections for API communications where supported by the third-party service.
*   Processing data locally in your browser whenever possible.
*   No persistent storage of processed video content or conversation data on servers associated with the TubeTalk project.
*   User control over clearing local conversation data.

## 7. International Data Transfers
Data transmitted to third-party AI services (like OpenAI) may involve international data transfers. Please refer to the privacy policies of the specific AI service providers you configure regarding their international data safeguards. The TubeTalk project itself does not transfer data internationally.

## 8. Your Rights and Choices
You have the right to:

*   Withdraw consent by uninstalling the extension or disabling features that use third-party APIs.
*   Stop using the service at any time.
*   Control your API key usage or remove it from the extension's settings.
*   Request information about how the extension handles data by consulting this policy or contacting the project maintainers (though the project does not store personal data).

## 9. Third-Party Services
The TubeTalk extension interacts with:

*   **YouTube:** Subject to Google's Privacy Policy and Terms of Service.
*   **Third-Party AI Services (e.g., OpenRouter, OpenAI, Anthropic):** When configured by you, using your personal API key. The extension primarily facilitates interaction with services via OpenRouter. Please review the respective Privacy Policies of the services you use (e.g., [OpenRouter Privacy Policy](https://openrouter.ai/privacy), OpenAI Privacy Policy, Anthropic Privacy Policy) for information on how they handle your data.

## 10. Data Security
The extension implements appropriate security measures by:

*   Processing data locally in your browser where feasible.
*   Not storing personal information related to video content or conversations on servers associated with the TubeTalk project.
*   Using secure HTTPS connections for data transmission to third-party APIs when supported.
*   Never accessing or storing your API credentials on servers associated with the TubeTalk project; they remain within your browser's secure storage.

## 11. User Rights Under GDPR
As per the General Data Protection Regulation (GDPR), users have rights regarding their personal data, including the right to access, correct, or delete their data. Since the TubeTalk project does not collect or store your personal data related to video content processing or conversations, these rights are primarily exercised through your control over the extension (uninstalling, clearing data, managing API keys) and directly with the third-party services (e.g., YouTube, OpenRouter, OpenAI) you interact with.

## 12. Changes to Policy
This policy may be updated to reflect changes in the extension's practices or legal requirements. Significant changes will be notified through the Chrome Web Store listing or potentially within the extension interface. The latest version will always be available in the project's source code repository.

## 13. Contact
For privacy-related inquiries or to exercise your rights under data protection laws concerning the TubeTalk extension itself, please contact the project maintainers through the [project's GitHub issues page](https://github.com/mariusdotdev/tubetalk/issues). EU users may also contact their local data protection authority. For inquiries regarding data handled by third-party services (YouTube, OpenRouter, OpenAI, etc.), please contact those services directly. 