// Script to extract all select/multiselect options from questions.js
const fs = require('fs');

// Read the questions file
const content = fs.readFileSync('src/data/questions.js', 'utf8');

// Remove comments
const noComments = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Find all sections and their questions
const results = [];

// First, find all section IDs and their positions
const sectionMatches = [];
const sectionRegex = /id:\s*'([^']+)'/g;
let match;
while ((match = sectionRegex.exec(noComments)) !== null) {
  sectionMatches.push({ id: match[1], index: match.index });
}

// Now find all questions with options
// Pattern: key: 'xxx', type: 'select|multiselect', options: [...]
// We need to handle multiline options arrays

// Find all key: 'xxx' positions
const keyRegex = /key:\s*'([^']+)'/g;
const keyPositions = [];
while ((match = keyRegex.exec(noComments)) !== null) {
  keyPositions.push({ key: match[1], index: match.index });
}

// Find all type: 'select' or 'multiselect' positions
const typeRegex = /type:\s*'(select|multiselect)'/g;
const typePositions = [];
while ((match = typeRegex.exec(noComments)) !== null) {
  typePositions.push({ type: match[1], index: match.index });
}

// Find all options: [ positions
const optionsRegex = /options:\s*\[/g;
const optionsPositions = [];
while ((match = optionsRegex.exec(noComments)) !== null) {
  optionsPositions.push({ index: match.index });
}

console.log(`Found ${sectionMatches.length} sections, ${keyPositions.length} keys, ${typePositions.length} types, ${optionsPositions.length} options arrays`);

// For each options array, find the corresponding key and section
optionsPositions.forEach(optPos => {
  // Find the closest key before this options array
  let questionKey = null;
  let questionType = null;
  
  for (let i = keyPositions.length - 1; i >= 0; i--) {
    if (keyPositions[i].index < optPos.index) {
      questionKey = keyPositions[i].key;
      break;
    }
  }
  
  // Find the closest type before this options array
  for (let i = typePositions.length - 1; i >= 0; i--) {
    if (typePositions[i].index < optPos.index) {
      questionType = typePositions[i].type;
      break;
    }
  }
  
  if (!questionKey || !questionType) return;
  
  // Find the section this belongs to
  let sectionId = 'unknown';
  for (let i = sectionMatches.length - 1; i >= 0; i--) {
    if (sectionMatches[i].index < optPos.index) {
      sectionId = sectionMatches[i].id;
      break;
    }
  }
  
  // Extract the options array - find the closing bracket
  let bracketCount = 0;
  let endIndex = -1;
  let inString = false;
  let stringChar = '';
  
  for (let i = optPos.index; i < noComments.length; i++) {
    const char = noComments[i];
    const prevChar = i > 0 ? noComments[i-1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
      if (char === '[') bracketCount++;
      else if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  if (endIndex === -1) return;
  
  const optionsStr = noComments.substring(optPos.index, endIndex + 1);
  
  try {
    // Clean up the options string
    const cleanStr = optionsStr
      .replace(/,\s*]/g, ']')  // Remove trailing commas
      .replace(/,\s*}/g, '}');
    
    const options = eval(cleanStr);
    
    if (Array.isArray(options) && options.length > 0) {
      results.push({ sectionId, questionKey, questionType, options });
    }
  } catch (e) {
    console.log(`Error parsing options for ${sectionId}.${questionKey}:`, e.message);
  }
});

console.log(`\nSuccessfully parsed ${results.length} questions with options:`);
results.forEach(r => {
  console.log(`  ${r.sectionId}.${r.questionKey} (${r.questionType}): ${r.options.length} options`);
});

// Generate translation entries
const enEntries = {};
const thEntries = {};

results.forEach(r => {
  const path = `questions.${r.sectionId}.${r.questionKey}.options`;
  enEntries[path] = r.options;
  // Thai placeholder - will be manually translated
  thEntries[path] = r.options.map(opt => `[TH] ${opt}`);
});

console.log('\n// English options translations');
console.log(JSON.stringify(enEntries, null, 2));

console.log('\n// Thai options translations (placeholders)');
console.log(JSON.stringify(thEntries, null, 2));

// Save to files for reference
fs.writeFileSync('extracted-options-en.json', JSON.stringify(enEntries, null, 2));
fs.writeFileSync('extracted-options-th.json', JSON.stringify(thEntries, null, 2));
console.log('\nSaved to extracted-options-en.json and extracted-options-th.json');