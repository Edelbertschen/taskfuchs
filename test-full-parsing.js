// Test the complete parsing logic
const PATTERNS = {
  markdownLink: /\[([^\]]+)\]\(([^)]+)\)/g,
  tags: /#([a-zA-ZäöüßÄÖÜ0-9_-]+)/g,
  time: /(?:^|\s)(\d+(?:\.\d+)?)\s*(m|min|h|std|stunden?|minuten?)/gi,
  priority: /(?:^|\s)(!!!|!!|!|hoch|mittel|niedrig|high|medium|low)(?:\s|$)/gi,
  date: /(?:^|\s)(heute|morgen|übermorgen|today|tomorrow|(\d{1,2})\.(\d{1,2})\.(?:(\d{4})|(\d{2}))?)/gi,
  description: /(?:^|\s)\b(n|note|beschreibung|desc)\b\s+(.+)$/gi,
  column: /(?:^|\s)@(inbox|heute|morgen|backlog|projekt|today|tomorrow|project)(?:\s|$)/gi
};

function fullParseTest(input) {
  console.log('=== FULL PARSE TEST ===');
  console.log('Input:', input);
  
  let title = input.trim();
  let description = undefined;
  let extractedLinks = [];
  
  // Extract markdown links first
  const linkMatches = [...input.matchAll(PATTERNS.markdownLink)];
  if (linkMatches.length > 0) {
    for (const linkMatch of linkMatches) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      
      console.log('LINK: Found link:', linkText, '->', linkUrl);
      
      // Replace the markdown link with just the text in the title
      title = title.replace(linkMatch[0], linkText);
      
      // Store the URL
      extractedLinks.push(linkUrl);
    }
    title = title.trim();
    console.log('After link extraction:', title);
  }
  
  // Extract tags
  const tagMatches = [...input.matchAll(PATTERNS.tags)];
  const tags = tagMatches.map(match => match[1].toLowerCase());
  
  // Remove tags from title
  title = title.replace(PATTERNS.tags, '').trim();
  console.log('After tag removal:', title);
  
  // Extract description BEFORE other processing
  const descMatches = [...title.matchAll(PATTERNS.description)];
  if (descMatches.length > 0) {
    const descMatch = descMatches[0];
    console.log('DESC: Found description match:', descMatch);
    if (descMatch[2]) {
      description = descMatch[2].trim();
      console.log('DESC: Extracted description:', description);
    }
    
    // Remove description part from title
    title = title.replace(descMatch[0], '').trim();
    console.log('DESC: Title after description removal:', title);
  }
  
  // Add extracted links to description
  if (extractedLinks.length > 0) {
    const linksSection = extractedLinks.map(url => `🔗 ${url}`).join('\n');
    if (description) {
      description = `${description}\n\n${linksSection}`;
    } else {
      description = linksSection;
    }
  }
  
  console.log('=== FINAL RESULT ===');
  console.log('Title:', title);
  console.log('Description:', description);
  console.log('Tags:', tags);
  console.log('Links:', extractedLinks);
  console.log('');
}

// Test cases
fullParseTest('[🎫 UNIQUE Helpdesk - #505050 - My introduction on wiki](https://unique.zammad.com/#ticket/zoom/5051)');
fullParseTest('Task with proper n description here');
fullParseTest('Another test n this should be in description #tag');
