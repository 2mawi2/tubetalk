import { bench, describe } from 'vitest';
import { cleanStreamedContent } from './streamCleaner';

// Default benchmark options to ensure tests complete and exit
const benchOptions = {
  iterations: 100,        // Number of iterations
  time: 1000,             // Time limit in ms
  warmupIterations: 10    // Warmup iterations
};

function generateLargeContent(size: number): string {
  // Create a large document with mixed content types
  const paragraphs = [];
  const contentTypes = [
    () => "Normal paragraph with some text.",
    () => "# Heading level 1",
    () => "## Heading level 2",
    () => "1. First numbered item\n2. Second numbered item\n3. Third numbered item",
    () => "- Bullet point 1\n- Bullet point 2\n- Bullet point 3",
    () => "```\nconst x = 'code block';\nconsole.log(x);\n```",
    () => "Text with **bold** formatting",
    () => "§[00:30]§ This has a timestamp"
  ];
  
  for (let i = 0; i < size; i++) {
    const typeIndex = i % contentTypes.length;
    paragraphs.push(contentTypes[typeIndex]());
  }
  
  return paragraphs.join("\n\n");
}

describe('streamCleaner benchmarks', () => {
  const simpleText = "This is a simple text without any special formatting.";
  const codeBlockText = "```\nconst x = 'test';\nconsole.log(x);\n```";
  const markdownHeadings = "# Heading 1\n## Heading 2\n### Heading 3";
  const numberedLists = "1. First item\n2. Second item\n3. Third item";
  const bulletLists = "- Item 1\n- Item 2\n- Item 3";
  const timestamps = "§[00:10]§ First timestamp\n§[01:20]§ Second timestamp";
  const complexMixed = "# Main heading\n\n1. First item\n2. Second item\n\n- Bullet 1\n- Bullet 2\n\n```\nconst test = 'code';\n```\n\n§[01:20]§ Some timestamp";
  const longDocument = generateLargeContent(100);
  const veryLongDocument = generateLargeContent(300);
  const extremelyLongDocument = generateLargeContent(1000);
  
  bench('Simple text', () => {
    cleanStreamedContent(simpleText);
  }, benchOptions);
  
  bench('Code block text', () => {
    cleanStreamedContent(codeBlockText);
  }, benchOptions);
  
  bench('Markdown headings', () => {
    cleanStreamedContent(markdownHeadings);
  }, benchOptions);
  
  bench('Numbered lists', () => {
    cleanStreamedContent(numberedLists);
  }, benchOptions);
  
  bench('Bullet lists', () => {
    cleanStreamedContent(bulletLists);
  }, benchOptions);
  
  bench('Timestamps', () => {
    cleanStreamedContent(timestamps);
  }, benchOptions);
  
  bench('Complex mixed content', () => {
    cleanStreamedContent(complexMixed);
  }, benchOptions);
  
  bench('Long document (100 paragraphs)', () => {
    cleanStreamedContent(longDocument);
  }, benchOptions);
  
  bench('Very long document (300 paragraphs)', () => {
    cleanStreamedContent(veryLongDocument);
  }, benchOptions);
  
  bench('Extremely long document (1000 paragraphs)', () => {
    cleanStreamedContent(extremelyLongDocument);
  }, benchOptions);
}); 