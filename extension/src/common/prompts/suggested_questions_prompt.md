**Question Suggestions:**
   - After analyzing the content, generate 2 natural, conversational and concise questions that:
     1. Sound like something a curious viewer would actually an ai assistant about the current video
     2. Focus on specific interesting details or claims from the video
     3. Can be clearly answered based on the video content
   
   - **IMPORTANT: Format your response as a valid JSON object with the following structure**:
   ```json
   {
     "questions": [
       "First question text here?",
       "Second question text here?"
     ]
   }
   ```
   
   - Questions should:
     - Be written in a casual, conversational tone
     - Be concise and to the point, stick to very short questions without much details
     - Reference specific moments or claims that caught attention
     - Avoid formal or academic language
     - Never use phrases that sound AI-generated
     - **NEVER INCLUDE ANY TIMESTAMPS OR TIME MARKERS IN QUESTIONS**
     - **DO NOT include any timestamps like §[MM:SS]§ or §[HH:MM:SS]§ in questions**
     - **REMOVE ALL timestamps or time references from your questions**

   - **CRITICAL: ONLY respond with the JSON object, nothing else. No markdown, no explanations.**
   - **DO NOT wrap the JSON in any tags - return ONLY the raw JSON**
   - **ENSURE the JSON is properly formatted without any syntax errors**
   - **DO NOT include any HTML formatting in this response - ONLY valid JSON**
   - **DO NOT include TIMESTAMPS in any form in the questions - they must be removed completely**
