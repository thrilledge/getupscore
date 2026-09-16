const {execSync} = require('child_process');
const fs = require('fs');

try {
  console.log('Running TypeScript check...');
  const output = execSync('npx --no-install tsc --noEmit 2>&1', {
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8',
    timeout: 120000
  });
  fs.writeFileSync('tsc-output.txt', output);

  const lines = output.split('\n');
  const errors = lines.filter(l => l.includes('error TS'));

  console.log('\n--- TypeScript Errors ---');
  if (errors.length === 0) {
    console.log('No TypeScript errors found!');
  } else {
    errors.slice(0, 30).forEach(l => console.log(l));
    console.log(`\nTotal errors: ${errors.length}`);
  }
} catch (e) {
  fs.writeFileSync('tsc-output.txt', e.stdout || e.message);
  console.log('TSC output saved to tsc-output.txt');
  if (e.stdout) {
    const lines = (e.stdout).split('\n');
    const errors = lines.filter(l => l.includes('error TS'));
    console.log('\n--- TypeScript Errors ---');
    if (errors.length === 0) {
      console.log('No TypeScript errors found!');
    } else {
      errors.slice(0, 30).forEach(l => console.log(l));
      console.log(`\nTotal errors: ${errors.length}`);
    }
  }
}
