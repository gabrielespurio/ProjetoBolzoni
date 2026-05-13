const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node read_pdf2.cjs <path-to-pdf>');
  process.exit(1);
}

async function extractText(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n=== PÁGINA ${i} ===\n${pageText}\n`;
  }
  
  console.log(fullText);
}

extractText(filePath).catch(err => console.error('Error:', err.message));
