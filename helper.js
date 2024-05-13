function extractStartingLineNumbers(diff) {
  const regex = /@@\s*-(\d+),\d+\s*\+(\d+),\d+\s*@@;
  const match = diff.match(regex);

  if (match) {
    const newFileStartLine = parseInt(match[2], 10);
    const newFileStartLine = parseInt(match[2], 10); 
    
    return {
      x,
      y,
      newFileStartLine,
    
    };
  } else {
    throw new Error("Invalid diff format", diff);
  }
}
