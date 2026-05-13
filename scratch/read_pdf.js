const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node read_pdf.js <path-to-pdf>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);
pdf(dataBuffer).then(function(data) {
  console.log(data.text);
}).catch(function(err) {
  console.error('Error:', err.message);
});
