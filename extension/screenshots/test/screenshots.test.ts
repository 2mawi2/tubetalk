import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import generateAllPromoImages from '../src/utils/generatePromoImages';
import type { VideoConfig } from '../src/configs/videoConfigs';
import { VIDEO_CONFIGS } from '../src/configs/videoConfigs';

// Custom test fixture for extension testing
const test = base.extend<{ context: BrowserContext }>({
    context: async ({ }, use) => {
        let context: BrowserContext | undefined;
        let userDataDir: string | undefined;

        try {
            const pathToExtension = path.join(process.cwd(), 'dist');
            userDataDir = path.join(process.cwd(), 'test-user-data-' + Math.random().toString(36).slice(2));
            await fs.mkdir(userDataDir, { recursive: true });

            context = await chromium.launchPersistentContext(userDataDir, {
                args: [
                    `--disable-extensions-except=${pathToExtension}`,
                    `--load-extension=${pathToExtension}`,
                    '--no-sandbox',
                    '--disable-dev-shm-usage'
                ],
                headless: false,
                viewport: { width: 1280, height: 800 }
            });

            await use(context);
        } finally {
            if (context) await context.close();
            if (userDataDir) await fs.rm(userDataDir, { recursive: true, force: true });
        }
    }
});

const VIEWPORT_CONFIG = { width: 1280, height: 800 };

const SELECTORS = {
    root: '#yt-sidebar-root',
    sidebar: '#yt-sidebar-root > div',
    settingsButton: '[data-testid="settings-button"]',
    settingsPanel: '[data-testid="settings-panel-container"]',
    apiKeyInput: 'input[type="password"]',
    saveButton: '[data-testid="save-api-key-button"]',
    languageSelect: '[data-testid="language-select"]',
    youtubeVideo: '#movie_player',
    consentDialog: 'ytd-consent-bump-v2-lightbox',
    acceptAllButton: 'button.yt-spec-button-shape-next--filled',
    imageButton: '[data-testid="image-button"]',
    inputArea: 'textarea',
    messageContainer: '.message-list-container'
};

// Translation map for "what's happening here?" in different languages
const WHAT_HAPPENING_HERE_TRANSLATIONS = {
    'en': "what's happening here?",
    'de': "was passiert hier?",
    'es': "¿qué está pasando aquí?",
    'fr': "que se passe-t-il ici?",
    'ja': "ここで何が起こっているの？",
    'ar': "ماذا يحدث هنا؟",
    'pt': "o que está acontecendo aqui?",
    'id': "apa yang terjadi di sini?",
    'hi': "यहां क्या हो रहा है?"
};

async function setupPageWithApiKey(page: any) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is required');

    await page.click(SELECTORS.settingsButton);
    await page.waitForSelector(SELECTORS.apiKeyInput);
    await page.fill(SELECTORS.apiKeyInput, apiKey);
    await page.click(SELECTORS.saveButton);
    await page.click(SELECTORS.settingsButton);
}

async function toggleSidebar(page: any) {
    await page.keyboard.press('Alt+y');
    await page.waitForSelector(SELECTORS.root, { state: 'attached', timeout: 10000 });
}

async function waitForYouTubeLoad(page: any) {
    try {
        // Wait for YouTube video player to be ready with increased timeout
        await page.waitForSelector(SELECTORS.youtubeVideo, { timeout: 60000 });
        // Wait a bit to ensure extension is loaded
        await page.waitForTimeout(2000);
    } catch (error) {
        console.error('Error waiting for YouTube to load:', error);
        throw error;
    }
}

async function handleCookieConsent(page: any) {
    try {
        console.log('Checking for cookie consent dialog...');
        // Wait for the consent dialog with a longer timeout
        const dialog = await page.waitForSelector('tp-yt-paper-dialog#dialog[role="dialog"]', { timeout: 10000 });
        if (dialog) {
            console.log('Found consent dialog, removing it...');
            // Remove both the dialog and the lightbox
            await page.evaluate(() => {
                const dialog = document.querySelector('tp-yt-paper-dialog#dialog[role="dialog"]');
                const lightbox = document.querySelector('ytd-consent-bump-v2-lightbox');
                if (dialog) dialog.remove();
                if (lightbox) lightbox.remove();
            });
            console.log('Consent dialog removed');
            // Wait for the dialog to be gone from the DOM
            await page.waitForSelector('tp-yt-paper-dialog#dialog[role="dialog"]', { state: 'detached', timeout: 5000 });
        }
    } catch (e) {
        console.log('Error handling cookie consent:', e);
    }
    
    // Additional wait to ensure the page is stable
    await page.waitForTimeout(2000);
}

// Add a function to seek the YouTube video to a specific time
async function seekVideoToTime(page: any, timeInSeconds: number) {
    console.log(`Seeking video to ${timeInSeconds} seconds...`);
    try {
        // Use JavaScript to seek the YouTube player to the specified time
        await page.evaluate((time) => {
            const player = document.querySelector('#movie_player');
            if (player && typeof (player as any).seekTo === 'function') {
                (player as any).seekTo(time);
                // Also play the video to ensure the frame is loaded
                (player as any).playVideo();
            } else {
                console.error('YouTube player not found or seekTo not available');
            }
        }, timeInSeconds);
        
        // Wait for a short time to ensure the seek has completed
        await page.waitForTimeout(500);
        
        // Pause the video at the desired position
        await page.evaluate(() => {
            const player = document.querySelector('#movie_player');
            if (player && typeof (player as any).pauseVideo === 'function') {
                (player as any).pauseVideo();
            }
        });
        
        // Wait for video to be paused
        await page.waitForTimeout(500);
        
        console.log(`Video successfully positioned at ${timeInSeconds} seconds`);
    } catch (error) {
        console.error(`Error seeking video to time ${timeInSeconds}:`, error);
    }
}

test.describe('Generate Promotional Screenshots', () => {
    test('generate screenshots for all languages and videos', async ({ context }) => {
        // Increase test timeout
        test.setTimeout(500000);

        // Ensure screenshots directory exists
        const screenshotsDir = path.join(process.cwd(), 'screenshots', 'output');
        await fs.mkdir(screenshotsDir, { recursive: true });

        // Iterate through all video configurations
        for (const videoConfig of Object.values(VIDEO_CONFIGS)) {
            try {
                console.log(`\nProcessing video configuration: ${videoConfig.id}`);
                const page = await context.newPage();
                await page.setViewportSize(VIEWPORT_CONFIG);

                try {
                    // Navigate and set up
                    await page.goto(videoConfig.youtubeUrl, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 60000 
                    });
                    await handleCookieConsent(page);
                    await waitForYouTubeLoad(page);

                    // Try toggling sidebar multiple times if needed
                    let sidebarToggled = false;
                    for (let i = 0; i < 3; i++) {
                        try {
                            await toggleSidebar(page);
                            sidebarToggled = true;
                            break;
                        } catch (e) {
                            console.log(`Attempt ${i + 1} to toggle sidebar failed, retrying...`);
                            await page.waitForTimeout(2000);
                        }
                    }

                    if (!sidebarToggled) {
                        throw new Error('Failed to toggle sidebar after multiple attempts');
                    }

                    await setupPageWithApiKey(page);

                    // Take screenshots for each language
                    for (const lang of videoConfig.languages) {
                        try {
                            // Set language
                            await page.click(SELECTORS.settingsButton);
                            await page.waitForSelector(SELECTORS.languageSelect);
                            await page.selectOption(SELECTORS.languageSelect, lang.code);
                            await page.waitForSelector('[data-testid="summary-language-select"]');
                            await page.selectOption('[data-testid="summary-language-select"]', lang.code);
                            await page.click(SELECTORS.settingsButton);

                            // Close settings and refresh
                            await page.click('[data-testid="refresh-button"]');
                            
                            // Wait for UI to settle and content to refresh
                            await page.waitForTimeout(10000);

                            // Wait for and get the visible sidebar element
                            const sidebar = await page.waitForSelector(SELECTORS.sidebar, { 
                                state: 'visible',
                                timeout: 10000 
                            });
                            
                            if (!sidebar) {
                                console.error(`Could not find visible sidebar element for ${videoConfig.id} - ${lang.code}`);
                                continue;
                            }

                            // Get the bounding box of the sidebar
                            const box = await sidebar.boundingBox();
                            if (!box) {
                                console.error(`Could not get sidebar dimensions for ${videoConfig.id} - ${lang.code}`);
                                continue;
                            }

                            // Create video-specific screenshot directory
                            const videoScreenshotsDir = path.join(screenshotsDir, videoConfig.id);
                            await fs.mkdir(videoScreenshotsDir, { recursive: true });

                            // Take screenshot with fixed width
                            await page.screenshot({
                                path: path.join(videoScreenshotsDir, `tubetalk_${lang.code}.png`),
                                type: 'png',
                                clip: {
                                    x: box.x,
                                    y: box.y,
                                    width: 450,
                                    height: box.height
                                }
                            });
                        } catch (langError) {
                            console.error(`Error processing language ${lang.code} for video ${videoConfig.id}:`, langError);
                            continue;
                        }
                    }

                    console.log(`\nStarting promotional image generation for ${videoConfig.id}...`);
                    // Generate promotional images after all screenshots are taken
                    await generateAllPromoImages(videoConfig);
                    console.log(`Promotional image generation completed for ${videoConfig.id}!`);

                } catch (pageError) {
                    console.error(`Error processing video ${videoConfig.id}:`, pageError);
                } finally {
                    await page.close();
                }
            } catch (videoError) {
                console.error(`Fatal error processing video ${videoConfig.id}:`, videoError);
                continue;
            }
        }
    });

    // Test for interaction screenshots with "what's happening here?" message
    test('generate interaction screenshots with message input', async ({ context }) => {
        // Increase test timeout
        test.setTimeout(300000);

        // Select a specific video configuration for this test (reusing last video)
        const videoConfig = VIDEO_CONFIGS.chat_with_any_video;
        console.log(`\nProcessing interactive screenshots for: ${videoConfig.id}`);
        
        // Ensure screenshots directory exists
        const screenshotsDir = path.join(process.cwd(), 'screenshots', 'output');
        const interactionDir = path.join(screenshotsDir, 'interaction');
        await fs.mkdir(interactionDir, { recursive: true });

        const page = await context.newPage();
        await page.setViewportSize(VIEWPORT_CONFIG);

        try {
            // Navigate and set up
            await page.goto(videoConfig.youtubeUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            await handleCookieConsent(page);
            await waitForYouTubeLoad(page);

            // Toggle sidebar
            await toggleSidebar(page);
            await setupPageWithApiKey(page);

            // Take interactive screenshots for each language
            for (const lang of videoConfig.languages) {
                try {
                    console.log(`Processing interactive screenshot for ${lang.name} (${lang.code})`);
                    
                    // Set language
                    await page.click(SELECTORS.settingsButton);
                    await page.waitForSelector(SELECTORS.languageSelect);
                    await page.selectOption(SELECTORS.languageSelect, lang.code);
                    await page.waitForSelector('[data-testid="summary-language-select"]');
                    await page.selectOption('[data-testid="summary-language-select"]', lang.code);
                    await page.click(SELECTORS.settingsButton);

                    // Close settings and refresh
                    await page.click('[data-testid="refresh-button"]');
                    await page.waitForTimeout(10000);

                    // Wait for sidebar to be visible
                    const sidebar = await page.waitForSelector(SELECTORS.sidebar, { 
                        state: 'visible',
                        timeout: 10000 
                    });
                    
                    if (!sidebar) {
                        console.error(`Could not find visible sidebar element for interaction - ${lang.code}`);
                        continue;
                    }

                    // Type "what's happening here?" in the appropriate language
                    await page.waitForSelector(SELECTORS.inputArea);
                    await page.fill(SELECTORS.inputArea, WHAT_HAPPENING_HERE_TRANSLATIONS[lang.code] || "what's happening here?");
                    
                    // Seek the video to 1:59 (119 seconds) before capturing the screenshot
                    await seekVideoToTime(page, 119);
                    
                    // Click the image capture button
                    await page.waitForSelector(SELECTORS.imageButton);
                    await page.click(SELECTORS.imageButton);
                    
                    // Wait for image to be captured and processed
                    await page.waitForTimeout(1000);
                    
                    // Get the bounding box of the sidebar for a targeted screenshot
                    const box = await sidebar.boundingBox();
                    if (!box) {
                        console.error(`Could not get sidebar dimensions for interaction - ${lang.code}`);
                        continue;
                    }

                    // Calculate position for the lower part of the sidebar
                    // We'll target the bottom 60% of the sidebar to show the message input area
                    const lowerHeight = Math.floor(box.height * 0.6);
                    const lowerY = box.y + box.height - lowerHeight;
                    
                    // Take screenshot of the lower part of the sidebar
                    await page.screenshot({
                        path: path.join(interactionDir, `interaction_${lang.code}.png`),
                        type: 'png',
                        clip: {
                            x: box.x,
                            y: lowerY,
                            width: 450,
                            height: lowerHeight
                        }
                    });
                    
                    console.log(`✅ Interactive screenshot captured for ${lang.name}`);
                    
                    // Clear the input for the next language
                    await page.fill(SELECTORS.inputArea, '');
                    
                    // If there's an image preview, remove it
                    try {
                        const removeButton = await page.waitForSelector('.image-preview .remove-button', { timeout: 1000 });
                        if (removeButton) {
                            await removeButton.click();
                        }
                    } catch (e) {
                        // It's okay if there's no remove button
                    }
                    
                } catch (langError) {
                    console.error(`Error processing interaction screenshot for ${lang.code}:`, langError);
                    continue;
                }
            }
        } catch (pageError) {
            console.error(`Error in interaction screenshots:`, pageError);
        } finally {
            await page.close();
        }

        // Generate promotional images from the interaction screenshots
        console.log('\nStarting promotional image generation for interaction screenshots...');
        await generateAllPromoImages(); // This will generate both regular and interaction promo images
        console.log('Interaction promotional images generated successfully!');
    });
}); 