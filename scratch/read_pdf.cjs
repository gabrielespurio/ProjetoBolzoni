const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node read_pdf.cjs <path-to-pdf>');
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const uint8 = new Uint8Array(buffer);
const pdfParser = new PDFParse(uint8);

pdfParser.load().then(async function() {
  const info = pdfParser.getInfo();
  console.log('PDF Info:', JSON.stringify(info, null, 2));
  
  // Try getText for all pages
  for (let i = 1; i <= 10; i++) {
    try {
      const pageText = await pdfParser.getPageText(i);
      if (pageText && pageText.trim()) {
        console.log(`\n=== PAGE ${i} ===`);
        console.log(pageText);
      }
    } catch(e) {
      // no more pages
      break;
    }
  }
  
  // Also try getText directly
  try {
    const allText = await pdfParser.getText();
    if (allText && allText.trim()) {
      console.log('\n=== ALL TEXT (getText) ===');
      console.log(allText);
    }
  } catch(e) {
    console.log('getText failed:', e.message);
  }
}).catch(function(err) {
  console.error('Load Error:', err.message);
});
