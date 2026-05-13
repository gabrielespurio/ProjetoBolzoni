import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node read_pdf.mjs <path-to-pdf>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);
const data = await pdf(dataBuffer);
console.log(data.text);
