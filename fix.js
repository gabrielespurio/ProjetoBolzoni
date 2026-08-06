const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('client/src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  if (content.includes('const user = JSON.parse(localStorage.getItem("user") || "{}");')) {
    content = content.replace(/const user = JSON\.parse\(localStorage\.getItem\("user"\) \|\| "{}"\);/g, 'const _userStr = localStorage.getItem("user"); const user = (_userStr && _userStr !== "undefined") ? JSON.parse(_userStr) : {};');
    changed = true;
  }
  
  if (content.match(/const userStr = localStorage\.getItem\("user"\);\s*const user = userStr \? JSON\.parse\(userStr\) : \{\};/)) {
    content = content.replace(/const userStr = localStorage\.getItem\("user"\);\s*const user = userStr \? JSON\.parse\(userStr\) : \{\};/g, 'const userStr = localStorage.getItem("user");\n  const user = (userStr && userStr !== "undefined") ? JSON.parse(userStr) : {};');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
console.log("Done");
