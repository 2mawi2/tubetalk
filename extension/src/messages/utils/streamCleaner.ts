export function cleanStreamedContent(content: string): string {
  // Early return for empty content
  if (!content) {
    return content;
  }
  
  // For very long content, use chunk-based processing
  if (content.length > 10000) {
    return processLargeContentInChunks(content);
  }
  
  return pipe(
    content,
    extractCodeContent,
    convertMarkdownHeadings,
    formatNumberedLists,
    convertBulletPointsToList,
    processTimestampsAndHtmlTags,
    removeTimestampsFromBulletPoints,
    convertAsteriskToStrong
  );
}

function processLargeContentInChunks(content: string): string {
  // First, handle code blocks and headings for the entire content
  // as they need context from the whole document
  let processedContent = extractCodeContent(content);
  processedContent = convertMarkdownHeadings(processedContent);
  
  // Find safe splitting points (prefer paragraph breaks)
  const chunks = splitContentIntoChunks(processedContent);
  
  // Process each chunk separately
  const processedChunks = chunks.map(chunk => {
    return pipe(
      chunk,
      formatNumberedLists,
      convertBulletPointsToList,
      processTimestampsAndHtmlTags,
      removeTimestampsFromBulletPoints,
      convertAsteriskToStrong
    );
  });
  
  // Join the processed chunks
  return processedChunks.join('');
}

function splitContentIntoChunks(content: string): string[] {
  // Split at paragraph boundaries with a maximum chunk size
  const MAX_CHUNK_SIZE = 5000;
  const chunks: string[] = [];
  
  // Use paragraph breaks as natural splitting points
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would make the chunk too large,
    // save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      // Otherwise, append to the current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the final chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function pipe(input: string, ...fns: Array<(s: string) => string>): string {
  return fns.reduce((value, fn) => fn(value), input);
}

function extractCodeContent(content: string): string {
  if (isGeminiCodeBlock(content)) {
    return extractGeminiCodeBlock(content);
  }
  
  if (content === '```') {
    return '';
  }

  let processedContent = content;

  processedContent = extractInlineCodeBlocks(processedContent);  
  processedContent = extractLanguageSpecificCodeBlocks(processedContent);
  processedContent = cleanUpIncompleteCodeBlocks(processedContent);
  
  return processedContent;
}

function isGeminiCodeBlock(content: string): boolean {
  return content.startsWith('```html\n') && content.endsWith('\n```');
}

function extractGeminiCodeBlock(content: string): string {
  const htmlBlockRegex = /^```html\s*\n([\s\S]*?)(\n```)?$/;
  const htmlMatch = content.match(htmlBlockRegex);
  
  if (htmlMatch) {
    return htmlMatch[1];
  }
  
  return content.substring(8, content.length - 4);
}

function extractInlineCodeBlocks(content: string): string {
  return content.replace(/```([^`\n]+)```/g, (_, codeContent) => codeContent);
}

function extractLanguageSpecificCodeBlocks(content: string): string {
  return content.replace(/```([a-zA-Z0-9_+#.-]*)\s*([\s\S]*?)\s*```/g, (_, __, codeContent) => codeContent.trim());
}

function cleanUpIncompleteCodeBlocks(content: string): string {
  let processedContent = content;
  
  processedContent = processedContent.replace(/^```([a-zA-Z0-9_+#.-]*)\s*\n/g, '');
  processedContent = processedContent.replace(/^```\s*/g, '');
  processedContent = processedContent.replace(/\s*```$/g, '');
  processedContent = processedContent.replace(/```/g, '');
  
  return processedContent;
}

function convertMarkdownHeadings(content: string): string {
  // Quick check without regex first for better performance
  if (!content.includes('#') || containsHtmlHeadings(content)) {
    return content;
  }
  
  // Use a single regex for all heading levels for better performance
  const headingRegex = /^(#{1,7})\s+(.+)$/gm;
  
  return content.replace(headingRegex, (match, hashes, text) => {
    // Store original hash length for h7 check
    const hashLength = hashes.length;
    
    // For HTML tags, cap at 6 since HTML only supports h1-h6
    const level = Math.min(hashLength, 6);
    
    // Special case for h7
    if (hashLength === 7) {
      return `<h6 class="h7">${text}</h6>`;
    }
    
    return `<h${level}>${text}</h${level}>`;
  });
}

function containsHtmlHeadings(content: string): boolean {
  return content.includes('<h1>') || content.includes('<h2>') || content.includes('<h3>') ||
         content.includes('<h4>') || content.includes('<h5>') || content.includes('<h6>');
}

function formatNumberedLists(content: string): string {
  if (alreadyContainsOrderedLists(content)) {
    return content;
  }
  
  if (!containsNumberedItems(content)) {
    return content;
  }
  
  const processedContent = content.includes('**') 
    ? convertAsteriskInContent(content)
    : content;
  
  return processLineByLineForNumberedLists(processedContent);
}

function alreadyContainsOrderedLists(content: string): boolean {
  return content.includes('<ol>') && content.includes('</ol>');
}

function containsNumberedItems(content: string): boolean {
  const basicNumberedPattern = /(?:^|\n)\d+\.\s+/;
  return basicNumberedPattern.test(content);
}

function processLineByLineForNumberedLists(content: string): string {
  const lines = content.split('\n');
  const resultLines = [];
  const processedListStarts = new Set<number>();
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const numberedItemMatch = line.match(/^(\d+)\.\s+(.*)/);
    
    if (isStartOfNumberedList(numberedItemMatch, i, lines) && !processedListStarts.has(i)) {
      processedListStarts.add(i);
      const { formattedList, endIndex } = processNumberedListSegment(lines, i);
      resultLines.push(formattedList);
      i = endIndex + 1;
    } else {
      resultLines.push(line);
      i++;
    }
  }
  
  return resultLines.join('\n');
}

function isStartOfNumberedList(numberedItemMatch: RegExpMatchArray | null, currentIndex: number, lines: string[]): boolean {
  if (!numberedItemMatch || currentIndex >= lines.length - 1) {
    return false;
  }
  
  let j = currentIndex + 1;
  while (j < lines.length) {
    const nextLine = lines[j].trim();
    if (nextLine.match(/^(\d+)\.\s+(.*)/)) {
      return true;
    }
    if (nextLine !== '') break;
    j++;
  }
  
  return false;
}

function processNumberedListSegment(lines: string[], startIndex: number): { formattedList: string; endIndex: number } {
  const numberedItems: Array<{title: string, content: string}> = [];
  let currentIndex = startIndex;
  let inBulletList = false;
  let bulletItems: string[] = [];
  const resultLines: string[] = [];
  
  const numberedItemRegex = /^(\d+)\.\s+(.*)/;
  const bulletPointRegex = /^[-*]\s+(.*)/;
  const titleColonRegex = /^([^:]+):\s*(.*)/;
  
  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();
    const numberedItemMatch = line.match(numberedItemRegex);
    
    if (numberedItemMatch) {
      if (inBulletList && bulletItems.length > 0) {
        addBulletListToResult(resultLines, bulletItems);
        bulletItems = [];
        inBulletList = false;
      }
      
      const title = numberedItemMatch[2].trim();
      const titleMatch = title.match(titleColonRegex);
      
      if (titleMatch) {
        const listTitle = titleMatch[1].trim();
        const listContent = titleMatch[2] ? titleMatch[2].trim() : '';
        
        numberedItems.push({
          title: listTitle,
          content: listContent
        });
      } else {
        numberedItems.push({
          title: '',
          content: title
        });
      }
      
      currentIndex++;
    } else if (line.match(bulletPointRegex)) {
      inBulletList = true;
      const bulletMatch = line.match(bulletPointRegex);
      bulletItems.push(bulletMatch?.[1] || '');
      currentIndex++;
    } else if (line === '') {
      currentIndex++;
    } else {
      break;
    }
  }
  
  if (numberedItems.length > 0) {
    addNumberedListToResult(resultLines, numberedItems);
  }
  
  if (inBulletList && bulletItems.length > 0) {
    addBulletListToResult(resultLines, bulletItems);
  }
  
  return {
    formattedList: resultLines.join('\n'),
    endIndex: currentIndex - 1
  };
}

function addNumberedListToResult(resultLines: string[], items: Array<{title: string, content: string}>): void {
  resultLines.push('<ol>');
  for (const item of items) {
    if (item.title) {
      if (item.content) {
        resultLines.push(`<li><strong>${item.title}</strong>: ${item.content}</li>`);
      } else {
        resultLines.push(`<li><strong>${item.title}</strong>:</li>`);
      }
    } else {
      resultLines.push(`<li>${item.content}</li>`);
    }
  }
  resultLines.push('</ol>');
}

function addBulletListToResult(resultLines: string[], items: string[]): void {
  resultLines.push('<ul>');
  for (const item of items) {
    resultLines.push(`<li>${item}</li>`);
  }
  resultLines.push('</ul>');
}

function convertBulletPointsToList(content: string): string {
  if (!contentContainsBulletPoints(content)) {
    return content;
  }
  
  if (shouldSkipBulletPointProcessing(content)) {
    return content;
  }
  
  return processLineByLineForBulletPoints(content);
}

function contentContainsBulletPoints(content: string): boolean {
  return content.includes('- ') || content.includes('* ');
}

function shouldSkipBulletPointProcessing(content: string): boolean {
  if (!(content.includes('<ul>') && content.includes('</ul>'))) {
    return false;
  }
  
  const parts = content.split(/<\/?ul>/);
  
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i].includes('- ') || parts[i].includes('* ')) {
      return false;
    }
  }
  
  return true;
}

function processLineByLineForBulletPoints(content: string): string {
  const lines = content.split('\n');
  const resultLines = [];
  
  const bulletRegex = /^[-*]\s+(.*)/;
  const keyValueRegex = /^([^:]+):\s+(.*)/;
  const htmlTagsRegex = /<(?:ul|\/ul|ol|\/ol|li|\/li)>/;
  
  let bulletItems = [];
  let inBulletList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (htmlTagsRegex.test(line)) {
      resultLines.push(lines[i]);
      continue;
    }
    
    const bulletMatch = line.match(bulletRegex);
    
    if (bulletMatch) {
      inBulletList = true;
      bulletItems.push(bulletMatch[1]);
    } else {
      if (inBulletList && bulletItems.length > 0) {
        resultLines.push('<ul>');
        
        for (const item of bulletItems) {
          const keyValueMatch = item.match(keyValueRegex);
          if (keyValueMatch) {
            const key = keyValueMatch[1].trim();
            const value = keyValueMatch[2].trim();
            resultLines.push(`<li><strong>${key}</strong>: ${value}</li>`);
          } else {
            resultLines.push(`<li>${item}</li>`);
          }
        }
        
        resultLines.push('</ul>');
        
        bulletItems = [];
        inBulletList = false;
      }
      
      resultLines.push(lines[i]);
    }
  }
  
  if (inBulletList && bulletItems.length > 0) {
    processBulletItems(resultLines, bulletItems);
  }
  
  return resultLines.join('\n');
}

function processBulletItems(resultLines: string[], items: string[]): void {
  resultLines.push('<ul>');
  for (const item of items) {
    const keyValueMatch = item.match(/^([^:]+):\s+(.*)/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();
      resultLines.push(`<li><strong>${key}</strong>: ${value}</li>`);
    } else {
      resultLines.push(`<li>${item}</li>`);
    }
  }
  resultLines.push('</ul>');
}

function processTimestampsAndHtmlTags(content: string): string {
  enum ParseState {
    NORMAL,
    IN_TIMESTAMP,
    IN_HTML_TAG
  }

  let state = ParseState.NORMAL;
  const resultParts: string[] = [];
    let timestampBuffer = '';
    let htmlTagBuffer = '';
  
  const length = content.length;
    let i = 0;
  
    while (i < length) {
    const char = content[i];
  
    if (state === ParseState.NORMAL) {
        if (char === '§') {
        if (isStartOfTimestamp(content, i)) {
          state = ParseState.IN_TIMESTAMP;
            timestampBuffer = '§[';
            i += 2;
          } else {
            resultParts.push(' ');
            i++;
          }
        } else if (char === '<') {
        state = ParseState.IN_HTML_TAG;
          htmlTagBuffer = '<';
          i++;
      } else {
        let endOfChunk = i;
        while (endOfChunk < length && 
               content[endOfChunk] !== '§' && 
               content[endOfChunk] !== '<') {
          endOfChunk++;
        }
        
        if (endOfChunk > i) {
          resultParts.push(content.substring(i, endOfChunk));
          i = endOfChunk;
        } else {
          resultParts.push(char);
          i++;
        }
      }
    } else if (state === ParseState.IN_TIMESTAMP) {
      if (isEndOfTimestamp(content, i)) {
          timestampBuffer += ']§';
        processTimestampEnd(resultParts, timestampBuffer);
        state = ParseState.NORMAL;
          timestampBuffer = '';
        i += 2;
      } else if (isValidTimestampChar(char)) {
          timestampBuffer += char;
          i++;
        } else {
          resultParts.push('  ');
        state = ParseState.NORMAL;
          timestampBuffer = '';
          i++;
        }
    } else if (state === ParseState.IN_HTML_TAG) {
        if (char === '>') {
          htmlTagBuffer += '>';
          resultParts.push(htmlTagBuffer);
          htmlTagBuffer = '';
        state = ParseState.NORMAL;
          i++;
        } else {
          htmlTagBuffer += char;
          i++;
        }
      }
    }
  
  if (state === ParseState.IN_TIMESTAMP) {
      resultParts.push('  ');
  } else if (state === ParseState.IN_HTML_TAG) {
    handleIncompleteHtmlTag(resultParts);
    }
  
    let result = resultParts.join('');
  result = cleanupSpacesAndFormatting(result, content);
  
    return result;
  }

function isStartOfTimestamp(content: string, index: number): boolean {
  return index + 1 < content.length && content[index + 1] === '[';
}

function isEndOfTimestamp(content: string, index: number): boolean {
  return content[index] === ']' && index + 1 < content.length && content[index + 1] === '§';
}

function isValidTimestampChar(char: string): boolean {
  return /[\d:]/.test(char);
}

function processTimestampEnd(resultParts: string[], buffer: string): void {
  const inner = buffer.slice(2, -2);
  const isValid = /^\d{1,2}(:\d{1,2}){1,2}$/.test(inner);
  if (isValid) {
    resultParts.push(buffer);
  } else {
    resultParts.push('  ');
  }
}

function handleIncompleteHtmlTag(resultParts: string[]): void {
  const currentResult = resultParts.join('');
  resultParts.length = 0;
  resultParts.push(currentResult.trimEnd(), ' ');
}

function cleanupSpacesAndFormatting(result: string, originalContent: string): string {
  result = result.replace(/\s{3,}/g, '  ').trim();
  result = result.replace(/(§\[[\d:]+\]§)([^\s])/g, '$1 $2');
  
  if (/<[^>]*$/.test(originalContent) && !result.endsWith(' ')) {
    result += ' ';
  }
  
  return result;
}

function removeTimestampsFromBulletPoints(content: string): string {
  return content.replace(
    /(<li[^>]*>)(.*?)(<span class="timestamp-link[^>]*>.*?<\/span>)(.*?)(<\/li>)/g,
    (_, liStart, beforeTimestamp, timestamp, afterTimestamp, liEnd) => {
      return `${liStart}${beforeTimestamp}${afterTimestamp}${liEnd}`;
    }
  );
}

function convertAsteriskToStrong(content: string): string {
  if (content.includes('<strong>') && content.includes('</strong>')) {
    return content;
  }

  return content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function convertAsteriskInContent(content: string): string {
  if (content.includes('<strong>') && content.includes('</strong>')) {
    return content;
  }
  
  return content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
  