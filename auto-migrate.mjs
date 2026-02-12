import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'generate'], {
  cwd: '/home/ubuntu/grt-implementation-plan',
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  
  // Auto-confirm by sending Enter for each prompt
  if (text.includes('create table') || text.includes('rename table') || text.includes('?')) {
    setTimeout(() => {
      child.stdin.write('\n');
    }, 100);
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});

// Send initial Enter after startup
setTimeout(() => {
  child.stdin.write('\n');
}, 2000);
