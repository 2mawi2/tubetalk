import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import type { VideoConfig } from '../configs/videoConfigs';
import { DEFAULT_VIDEO_CONFIG } from '../configs/videoConfigs';

// Canvas dimensions for the background
const DIMENSIONS = {
  width: 1280,
  height: 800
};

// Gradient color stops
const GRADIENT_COLORS = {
  start: '#1a1a2e',
  end: '#16213e'
};

// Attribution text style
const ATTRIBUTION = {
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.7)',
  bottomMargin: 20,
  maxWidth: 1000,
  leftMargin: 80
};

// Layout adjustments
const targetVideoWidth = 540;
const targetSidebarWidth = 500;
const gapBetweenImages = 20;
const textMaxWidth = 1100;
const topTextPosition = 20;
const topTextLeftOffset = 80;
const topYPosition = 280;
const headingSubheadingSpacing = 0;
const iconSize = 50;

/**
 * Ensures an image buffer does not exceed 1200×800
 * Scales down if needed using "fit: 'inside'".
 */
async function ensureWithinBaseSize(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const tooWide = (metadata.width || 0) > DIMENSIONS.width;
  const tooHigh = (metadata.height || 0) > DIMENSIONS.height;
  if (tooWide || tooHigh) {
    return sharp(buffer)
      .resize(DIMENSIONS.width, DIMENSIONS.height, { fit: 'inside' })
      .png()
      .toBuffer();
  }
  return buffer;
}

/**
 * Creates a black base canvas of 1200x800.
 */
async function createBlackBase(): Promise<Buffer> {
  return sharp({
    create: {
      width: DIMENSIONS.width,
      height: DIMENSIONS.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
}

/**
 * Creates a 1200x800 gradient overlay from the given color stops.
 */
async function createGradientOverlay(): Promise<Buffer> {
  const gradientSvg = Buffer.from(`
    <svg width="${DIMENSIONS.width}" height="${DIMENSIONS.height}">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${GRADIENT_COLORS.start}" />
          <stop offset="100%" stop-color="${GRADIENT_COLORS.end}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" />
    </svg>
  `);

  let gradientBuffer = await sharp(gradientSvg)
    .png()
    .toBuffer();

  return ensureWithinBaseSize(gradientBuffer);
}

/**
 * Attempts to load and resize the icon, if present.
 */
async function loadIcon(iconPath: string): Promise<Buffer | undefined> {
  try {
    await fs.access(iconPath);
    const iconBuffer = await sharp(iconPath)
      .resize(iconSize, iconSize, { fit: 'contain' })
      .png()
      .toBuffer();
    console.log('Icon found and resized to 64x64');
    return iconBuffer;
  } catch {
    console.log('No icon found (icon128.png). Skipping icon overlay...');
    return undefined;
  }
}

/**
 * Loads and resizes the main video frame image.
 */
async function loadVideoFrameBuffer(videoFramePath: string): Promise<Buffer> {
  let buffer = await sharp(videoFramePath)
    .resize(targetVideoWidth, null, { fit: 'contain' })
    .png()
    .toBuffer();
  buffer = await ensureWithinBaseSize(buffer);
  return buffer;
}

/**
 * Loads and resizes the sidebar screenshot for a specific language.
 */
async function loadSidebarBuffer(sidebarPath: string): Promise<Buffer> {
  let buffer = await sharp(sidebarPath)
    .resize({ width: targetSidebarWidth, fit: 'inside' })
    .png()
    .toBuffer();
  buffer = await ensureWithinBaseSize(buffer);
  return buffer;
}

/**
 * Creates the heading + subheading text (white + shadow).
 */
async function createHeadingAndShadowText(lang: { heading: string; subheading: string }): Promise<{
  mainTextBuffer: Buffer;
  shadowTextBuffer: Buffer;
}> {
  const textContent = `
<span size="48000" font_family="sans" font_weight="bold" foreground="white">
${lang.heading}
</span>
<span size="36000" foreground="white">\n${lang.subheading}</span>
`;

  // Main text
  let mainTextBuffer = await sharp({
    text: {
      text: textContent,
      width: textMaxWidth,
      align: 'centre',
      rgba: true,
      spacing: headingSubheadingSpacing
    }
  })
    .png()
    .toBuffer();
  mainTextBuffer = await ensureWithinBaseSize(mainTextBuffer);

  // Shadow text
  const shadowTextContent = textContent
    .replace('foreground="white"', 'foreground="#000000"')
    .replace('foreground="white"', 'foreground="#444444"');

  let shadowTextBuffer = await sharp({
    text: {
      text: shadowTextContent,
      width: textMaxWidth,
      align: 'centre',
      rgba: true,
      spacing: headingSubheadingSpacing
    }
  })
    .png()
    .toBuffer();
  shadowTextBuffer = await ensureWithinBaseSize(shadowTextBuffer);

  return { mainTextBuffer, shadowTextBuffer };
}

/**
 * Creates the attribution text (channel + title), plus its shadow.
 */
async function createAttributionBuffers(channel: string, title: string): Promise<{
  attributionBuffer: Buffer;
  attributionShadowBuffer: Buffer;
}> {
  const attributionContent = `
<span size="18000" font_family="sans" foreground="white">${channel}</span>
<span size="15000" foreground="white">\n${title}</span>
`;

  // Main
  let attributionBuffer = await sharp({
    text: {
      text: attributionContent,
      width: 500,
      align: 'left',
      rgba: true,
      spacing: 0
    }
  })
    .png()
    .toBuffer();

  // Shadow
  const attributionShadowContent = attributionContent
    .replace('foreground="white"', 'foreground="#000000"')
    .replace('foreground="white"', 'foreground="#444444"');

  let attributionShadowBuffer = await sharp({
    text: {
      text: attributionShadowContent,
      width: 500,
      align: 'left',
      rgba: true,
      spacing: 0
    }
  })
    .png()
    .toBuffer();

  return { attributionBuffer, attributionShadowBuffer };
}

/**
 * Main function to generate promo images for all languages in a given video config.
 */
async function generatePromoImages(videoConfig: VideoConfig = DEFAULT_VIDEO_CONFIG) {
  console.log('Starting promotional image generation...');
  const screenshotsDir = path.join(process.cwd(), 'screenshots', 'output', videoConfig.id);
  const promoBaseDir = path.join(process.cwd(), 'screenshots', 'output', 'promo');
  const videoFramePath = videoConfig.frameImagePath;
  const iconPath = path.join(process.cwd(), 'screenshots', 'assets', 'icon128.png');

  console.log(`Creating base promo directory: ${promoBaseDir}`);
  await fs.mkdir(promoBaseDir, { recursive: true });

  // Create locale-specific directories
  for (const lang of videoConfig.languages) {
    const localeDir = path.join(promoBaseDir, lang.code);
    await fs.mkdir(localeDir, { recursive: true });
  }

  console.log(`Looking for video frame at: ${videoFramePath}`);
  try {
    await fs.access(videoFramePath);
    console.log('Video frame found successfully');
  } catch (error) {
    console.error('Video frame not found. Please check the path or file.');
    throw error;
  }

  // Try to load the icon
  const iconBuffer = await loadIcon(iconPath);

  // Create base black background
  const blackBase = await createBlackBase();

  // Create gradient overlay
  const gradientBuffer = await createGradientOverlay();

  // Prepare video frame
  const videoFrameBuffer = await loadVideoFrameBuffer(videoFramePath);
  const videoFrameMetadata = await sharp(videoFrameBuffer).metadata();
  const videoFrameHeight = videoFrameMetadata.height || 0;

  // Compute horizontal centering for video + sidebar
  const groupWidth = targetVideoWidth + targetSidebarWidth + gapBetweenImages;
  const leftOffset = Math.round((DIMENSIONS.width - groupWidth) / 2);

  // Loop over each language
  for (const lang of videoConfig.languages) {
    console.log(`\nProcessing language: ${lang.name} (${lang.code})`);
    const sidebarPath = path.join(screenshotsDir, `tubetalk_${lang.code}.png`);
    const localeDir = path.join(promoBaseDir, lang.code);

    // Check if sidebar is present
    try {
      await fs.access(sidebarPath);
    } catch (error) {
      console.error(`❌ Sidebar screenshot not found at: ${sidebarPath}. Skipping...`);
      continue;
    }

    // Load & resize the sidebar
    const sidebarBuffer = await loadSidebarBuffer(sidebarPath);

    // Create heading + subheading text
    const { mainTextBuffer, shadowTextBuffer } = await createHeadingAndShadowText(lang);

    // Create attribution text
    const { channel, title } = videoConfig.attribution;
    const { attributionBuffer, attributionShadowBuffer } = await createAttributionBuffers(channel, title);

    try {
      // Step A: Base + gradient
      let composedImage = await sharp(blackBase)
        .composite([{ input: gradientBuffer, left: 0, top: 0 }])
        .toBuffer();

      // Step B: Place shadow text, then real text
      const textLeft = Math.round((DIMENSIONS.width - textMaxWidth) / 2) + topTextLeftOffset;

      // Shadow offset
      composedImage = await sharp(composedImage)
        .composite([{ input: shadowTextBuffer, top: topTextPosition + 2, left: textLeft + 2 }])
        .toBuffer();

      // Main text
      composedImage = await sharp(composedImage)
        .composite([{ input: mainTextBuffer, top: topTextPosition, left: textLeft }])
        .toBuffer();

      // Icon in top-right
      if (iconBuffer) {
        const iconLeft = DIMENSIONS.width - iconSize - 20;
        composedImage = await sharp(composedImage)
          .composite([{ input: iconBuffer, top: topTextPosition, left: iconLeft }])
          .toBuffer();
      }

      // Step C: Composite video frame
      composedImage = await sharp(composedImage)
        .composite([{ input: videoFrameBuffer, left: leftOffset, top: topYPosition }])
        .toBuffer();

      // Step D: Composite sidebar
      composedImage = await sharp(composedImage)
        .composite([
          {
            input: sidebarBuffer,
            left: leftOffset + targetVideoWidth + gapBetweenImages,
            top: topYPosition
          }
        ])
        .toBuffer();

      // Step E: Add bottom-left attribution text
      const attributionTop = topYPosition + videoFrameHeight + 10;
      const attributionLeft = leftOffset;

      // Shadow offset
      composedImage = await sharp(composedImage)
        .composite([
          {
            input: attributionShadowBuffer,
            top: attributionTop + 2,
            left: attributionLeft + 2
          }
        ])
        .toBuffer();

      // Actual text
      composedImage = await sharp(composedImage)
        .composite([
          {
            input: attributionBuffer,
            top: attributionTop,
            left: attributionLeft
          }
        ])
        .toBuffer();

      // Write final output
      const finalOutputPath = path.join(localeDir, `${videoConfig.id}.png`);
      await sharp(composedImage).toFile(finalOutputPath);
      console.log(`✅ Successfully generated promo image for ${lang.name}: ${finalOutputPath}`);
    } catch (err) {
      console.error(`❌ Error generating promo image for ${lang.name}:`, err);
    }
  }

  console.log('\n✨ All promotional images generated successfully!');
}

/**
 * Generate interaction promo images that include the "what's happening here?" message in the input
 * and show the lower part of the sidebar.
 */
async function generateInteractionPromoImages() {
  console.log('Starting interaction promo image generation...');
  
  const interactionDir = path.join(process.cwd(), 'screenshots', 'output', 'interaction');
  const promoBaseDir = path.join(process.cwd(), 'screenshots', 'output', 'promo');
  const iconPath = path.join(process.cwd(), 'screenshots', 'assets', 'icon128.png');
  
  // Translation map for headings and subheadings in different languages
  const INTERACTION_TRANSLATIONS = {
    'en': {
      heading: "Get Instant Video Insights",
      subheading: "Ask questions about any moment in the video"
    },
    'de': {
      heading: "Sofortige Video-Erkenntnisse",
      subheading: "Stelle Fragen zu jedem Moment im Video"
    },
    'es': {
      heading: "Obtén información instantánea",
      subheading: "Pregunta sobre cualquier momento del video"
    },
    'fr': {
      heading: "Obtenez des réponses instantanées",
      subheading: "Posez des questions sur n'importe quel moment de la vidéo"
    },
    'ja': {
      heading: "即座に動画の洞察を得る",
      subheading: "動画の任意の瞬間について質問する"
    },
    'ar': {
      heading: "احصل على رؤى فورية للفيديو",
      subheading: "اطرح أسئلة حول أي لحظة في الفيديو"
    },
    'pt': {
      heading: "Obtenha insights instantâneos",
      subheading: "Faça perguntas sobre qualquer momento do vídeo"
    },
    'id': {
      heading: "Dapatkan Wawasan Video Instan",
      subheading: "Ajukan pertanyaan tentang momen apapun dalam video"
    },
    'hi': {
      heading: "तुरंत वीडियो अंतर्दृष्टि प्राप्त करें",
      subheading: "वीडियो के किसी भी क्षण के बारे में प्रश्न पूछें"
    }
  };
  
  console.log(`Looking for interaction screenshots in: ${interactionDir}`);
  
  // Try to access the interaction directory
  try {
    await fs.access(interactionDir);
    console.log('Interaction directory found');
  } catch (error) {
    console.error(`Interaction screenshots directory not found at ${interactionDir}. Please run the interaction screenshot test first.`);
    return;
  }
  
  // Try to load the icon
  const iconBuffer = await loadIcon(iconPath);
  
  // Create base black background
  const blackBase = await createBlackBase();
  
  // Create gradient overlay
  const gradientBuffer = await createGradientOverlay();
  
  // Get all interaction screenshots
  const interactionFiles = await fs.readdir(interactionDir);
  const interactionScreenshots = interactionFiles.filter(file => file.startsWith('interaction_'));
  
  if (interactionScreenshots.length === 0) {
    console.error('No interaction screenshots found in the interaction directory.');
    return;
  }
  
  console.log(`Found ${interactionScreenshots.length} interaction screenshots: ${interactionScreenshots.join(', ')}`);
  
  // Process each interaction screenshot
  for (const screenshotFile of interactionScreenshots) {
    // Extract language code from filename (interaction_en.png -> en)
    const langCode = screenshotFile.replace('interaction_', '').replace('.png', '');
    
    console.log(`\nProcessing interaction promo for language: ${langCode}`);
    
    // Find matching language in video config
    const lang = DEFAULT_VIDEO_CONFIG.languages.find(l => l.code === langCode);
    if (!lang) {
      console.error(`No language configuration found for code: ${langCode}`);
      continue;
    }
    
    const screenshotPath = path.join(interactionDir, screenshotFile);
    console.log(`Using screenshot from: ${screenshotPath}`);
    
    try {
      // Verify the screenshot exists
      await fs.access(screenshotPath);
      
      // Load interaction screenshot
      const interactionBuffer = await sharp(screenshotPath)
        .resize({ width: targetSidebarWidth, fit: 'inside' })
        .png()
        .toBuffer();
      
      // Get heading and subheading in the current language
      const textContent = INTERACTION_TRANSLATIONS[langCode] || INTERACTION_TRANSLATIONS['en'];
      
      // Create heading + subheading text
      const { mainTextBuffer, shadowTextBuffer } = await createHeadingAndShadowText(textContent);
      
      // Start composing the image
      let composedImage = await sharp(blackBase)
        .composite([{ input: gradientBuffer, left: 0, top: 0 }])
        .toBuffer();
      
      // Add heading text
      const textLeft = Math.round((DIMENSIONS.width - textMaxWidth) / 2) + topTextLeftOffset;
      
      // Shadow offset
      composedImage = await sharp(composedImage)
        .composite([{ input: shadowTextBuffer, top: topTextPosition + 2, left: textLeft + 2 }])
        .toBuffer();
      
      // Main text
      composedImage = await sharp(composedImage)
        .composite([{ input: mainTextBuffer, top: topTextPosition, left: textLeft }])
        .toBuffer();
      
      // Icon in top-right
      if (iconBuffer) {
        const iconLeft = DIMENSIONS.width - iconSize - 20;
        composedImage = await sharp(composedImage)
          .composite([{ input: iconBuffer, top: topTextPosition, left: iconLeft }])
          .toBuffer();
      }
      
      // Center the interaction screenshot
      const interactionLeft = Math.round((DIMENSIONS.width - targetSidebarWidth) / 2);
      
      // Add the interaction screenshot
      composedImage = await sharp(composedImage)
        .composite([
          {
            input: interactionBuffer,
            left: interactionLeft,
            top: topYPosition
          }
        ])
        .toBuffer();
      
      // Write final output to language folder
      const langDir = path.join(promoBaseDir, langCode);
      
      // Create language directory if it doesn't exist
      await fs.mkdir(langDir, { recursive: true });
      
      const outputFileName = `interaction.png`;
      const finalOutputPath = path.join(langDir, outputFileName);
      await sharp(composedImage).toFile(finalOutputPath);
      console.log(`✅ Successfully generated interaction promo image for ${lang.name}: ${finalOutputPath}`);
      
    } catch (err) {
      console.error(`❌ Error generating interaction promo image for ${langCode}:`, err);
    }
  }
  
  console.log('\n✨ All interaction promo images generated successfully!');
}

/**
 * Main export that generates both standard promo images and interaction promo images
 */
async function generateAllPromoImages(videoConfig: VideoConfig = DEFAULT_VIDEO_CONFIG) {
  await generatePromoImages(videoConfig);
  await generateInteractionPromoImages();
}

export default generateAllPromoImages;
