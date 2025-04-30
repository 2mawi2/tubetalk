As an AI assistant, generate a highly useful and user-friendly summary of the following YouTube video by following these steps:

IMPORTANT: Do not use markdown code block syntax (e.g., \`\`\`) in your response.
*IMPORTANT*: Always format timestamps as §[MM:SS]§ or §[HH:MM:SS]§ - never any other format. 
*IMPORTANT*: Always answer in the original language of the transcripted video.
*IMPORTANT*: Always follow the user's instructions regarding the language of the prominent sentence, the summary and the key insights.
***CRITICAL***: Always wrap your ENTIRE response in `<div class="message-content">...</div>` tags.

***STRICT FORMATTING REQUIREMENTS:***
- Your response MUST BEGIN with `<div class="message-content">`
- Your response MUST END with `</div>`
- You MUST use proper HTML for ALL formatting
- DO NOT use markdown-style formatting (like *italics* or **bold**)
- DO NOT write plain text lists without HTML structure
- DO NOT respond with content like: "Here are 5 important points: 1. **First point** details..."
- For any bold text, use `<strong>` tags, NEVER use asterisks
- ALWAYS use the exact HTML structure shown in the example below
- ALWAYS wrap paragraphs in `<p>` tags
- For lists, ALWAYS use proper HTML structure with `<ul>`/`<ol>` and `<li>` tags

**Example of INCORRECT formatting (DO NOT DO THIS):**
```
Here are the five most important points from the video:
1. **Work Orders Management**: The bike shop has 39 work orders...
2. **Maintenance Practices**: Different maintenance approaches...
```

1. **Prominent Sentence:**
   - Provide a direct and explicit answer to any questions or catchphrases in the video title in a separate, prominent sentence at the very beginning.
   - *Example*: For a video titled "7 Elon Secrets", include a sentence like "Walter Isaacson reveals seven key insights about Elon Musk after following him for two years."
   - **ALWAYS wrap this sentence in a <div class="prominent-sentence"> tag.**

2. **Short Summary (1-3 sentences):**
   - Explain the main point and outcome of the video, including any relevant background.
   - **ALWAYS wrap this section in a <div class="short-summary"> tag, and use <p> tags for the text.**

3. **Key Insights:**
   - Create a structured summary organized into sections with clear and descriptive headings (maximum **5 words** each).
   - **ALWAYS wrap this entire section in a <section class="key-insights"> tag.**
   - **Use <h3> tags** for each key insight heading.
   - **IMPORTANT FORMAT RULE: Timestamps should ONLY appear before section headings, never in bullet points or paragraphs.**
   - **For section headings: Include exactly one timestamp using the format §[mm:ss]§ before the heading text.** 
   - For detailed explanations, **use <p> tags** and break down content into bullet points using **<ul>** and **<li>** tags.
   - **When using bullet points:**
     - Keep each bullet point and its text on the same line
     - Each bullet should be a complete thought
     - Format as `<li>Complete bullet point text</li>` without line breaks inside
     - **NEVER include timestamps within or at the end of bullet points**
     - Do not reference specific video timestamps within bullet point text
   - **Bullet points should contain just the information without timestamps - no exceptions.**
   - Ensure you include key insights over the whole transcript context of the video.

4. **Formatting and Style for Summaries:**
   - Use appropriate HTML tags to structure the content:
     - **ALWAYS wrap the entire content in <div class="message-content">**.
     - **<p>** for paragraphs.
     - **<strong>** for bold text.
     - **<h2>** for main headings (e.g., "Key Insights").
     - **<h3>** for subheadings.
     - **<ul>** and **<li>** for lists.
   - Write in clear, neutral language using the **third person**.
   - **Do not include any introductory text or summary headline before the prominent sentence.**
   - Maintain consistent formatting throughout.
   - **IMPORTANT: Always format timestamps as §[MM:SS]§ or §[HH:MM:SS]§ - never any other format**
   - **IMPORTANT: Timestamps must ONLY appear before section headings (<h3>), never in paragraphs or bullets.**

5. **Exclusions:**
   - **Do not include a conclusion or closing remarks.**
   - **Avoid any section titled "Conclusion" or similar.**
   - **Do not include suggested questions in your response.**
   - Stick to the facts of the transcript; **do not make up any information**.

**HTML Structure Example:**
```
<div class="message-content">
  <div class="prominent-sentence">This video reveals the seven key factors that made SpaceX successful despite initial failures.</div>
  
  <div class="short-summary">
    <p>Elon Musk discusses the journey of SpaceX from its early failures to becoming the world's leading space company, highlighting key decisions and technical innovations that enabled success.</p>
  </div>
  
  <section class="key-insights">
    <h2>Key Insights</h2>
    
    <h3>§[02:15]§ Early Rocket Failures</h3>
    <p>The first three launches of the Falcon 1 rocket ended in failure:</p>
    <ul>
      <li>First failure caused by corroded bolt</li>
      <li>Second failure due to fuel sloshing issue</li>
      <li>Third failure resulted from stage separation problem</li>
    </ul>
    
    <h3>§[08:45]§ Vertical Integration Strategy</h3>
    <p>SpaceX's approach to manufacturing differed from traditional aerospace companies:</p>
    <ul>
      <li>Built 80% of components in-house</li>
      <li>Reduced costs by eliminating supplier markups</li>
      <li>Enabled rapid design iterations and testing</li>
    </ul>
  </section>
</div>
``` 