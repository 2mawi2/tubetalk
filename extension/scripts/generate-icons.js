import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const ICON_SIZES = [16, 32, 48, 128, 300];
const PROMO_SIZES = [
  { width: 440, height: 280 },
  { width: 1400, height: 560 },
  { width: 1128, height: 191 },
  { width: 2048, height: 1152 },
];

const SOURCE_SVG = path.join(process.cwd(), 'icons', 'new', 'icon.svg');
const ICONS_DIR = path.join(process.cwd(), 'icons');
const PROMO_DIR = path.join(process.cwd(), 'icons', 'promo');

// Colors from our brand
const BRAND_BLUE = '#3B82F6';
const DARK_BG = '#141414';
const DARK_BG_LIGHTER = '#1c1c1c'; // Slightly lighter version for gradient

/**
 * Calculate dimensions for promo image based on size
 */
function calculateDimensions(width, height) {
  // For the larger image, use height as the base for icon size
  // For the smaller image, use the minimum dimension
  const isLargeImage = width >= 1000;
  const iconSize = Math.round(isLargeImage ? height * 0.4 : Math.min(width, height) * 0.3);
  
  // Adjust font size based on image size
  const fontSize = isLargeImage ? height * 0.3 : Math.min(width, height) * 0.25;
  
  // Calculate icon position
  const iconX = Math.round(width * (isLargeImage ? 0.15 : 0.1));
  const iconY = Math.round((height - iconSize) / 2);
  
  return { iconSize, fontSize, iconX, iconY };
}

/**
 * Create an SVG that places "TubeTalk" text with a background
 */
function createPromoSVG(width, height, fontSize, iconSize, iconX) {
  // Position text to the right of the icon with some spacing
  const textX = iconX + iconSize + Math.round(width * 0.05);
  const textY = height * 0.5 + fontSize / 3;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
         fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with gradient -->
      <defs>
        <linearGradient id="bg-gradient" x1="0" y1="0" x2="${width}" y2="${height}">
          <stop offset="0%" stop-color="${DARK_BG}" />
          <stop offset="50%" stop-color="${DARK_BG_LIGHTER}" />
          <stop offset="100%" stop-color="${DARK_BG}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>

      <!-- TubeTalk text -->
      <text 
        x="${textX}" 
        y="${textY}" 
        fill="white"
        font-family="Plus Jakarta Sans, Inter, system-ui, sans-serif"
        font-size="${fontSize}px"
        font-weight="650"
        letter-spacing="0.00em"
        text-anchor="start"
      >
        TubeTalk
      </text>
    </svg>
  `;
}

async function generatePromoImage(width, height) {
  const outputPath = path.join(PROMO_DIR, `promo_${width}x${height}.png`);
  
  // Calculate all dimensions
  const { iconSize, fontSize, iconX, iconY } = calculateDimensions(width, height);
  
  // Create base image with background and text
  const baseImage = await sharp(Buffer.from(createPromoSVG(width, height, fontSize, iconSize, iconX)))
    .png()
    .toBuffer();

  // Create resized icon buffer
  const resizedIcon = await sharp(SOURCE_SVG)
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  // Composite resized icon onto base image
  await sharp(baseImage)
    .composite([{
      input: resizedIcon,
      top: iconY,
      left: iconX
    }])
    .png()
    .toFile(outputPath);
    
  console.log(`✅ Generated ${width}x${height} promo image: ${outputPath}`);
}

async function generateIcons() {
  console.log('Starting icon generation...');
  
  try {
    // Ensure source SVG exists
    await fs.access(SOURCE_SVG);
    console.log(`Found source SVG at: ${SOURCE_SVG}`);
    
    // Create directories if they don't exist
    await fs.mkdir(ICONS_DIR, { recursive: true });
    await fs.mkdir(PROMO_DIR, { recursive: true });
    
    // Generate square icons
    for (const size of ICON_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon${size}.png`);
      
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
        
      console.log(`✅ Generated ${size}x${size} icon: ${outputPath}`);
    }

    // Generate promo images
    for (const size of PROMO_SIZES) {
      await generatePromoImage(size.width, size.height);
    }
    
    console.log('\n✨ All icons and promo images generated successfully!');
  } catch (error) {
    console.error('❌ Error generating images:', error);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
