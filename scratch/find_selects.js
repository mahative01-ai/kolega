const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('<select') || content.includes('<Select')) {
    // Check if it's selecting a user, member, or staff
    if (content.toLowerCase().includes('user') || content.toLowerCase().includes('member') || content.toLowerCase().includes('mentor')) {
      console.log(file);
    }
  }
});
