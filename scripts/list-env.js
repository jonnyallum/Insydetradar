// List all environment variables (excluding npm internals)
const env = process.env;
const keys = Object.keys(env).sort();

console.log('=== All Environment Variables ===\n');

keys.forEach(k => {
  // Skip npm/pnpm internal vars
  if (k.startsWith('npm_') || k.startsWith('_') || k.startsWith('PNPM')) return;
  
  const val = env[k];
  if (val) {
    // Truncate long values for display, mask sensitive ones
    let display = val;
    if (k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token')) {
      display = val.substring(0, 10) + '...[MASKED]';
    } else if (val.length > 50) {
      display = val.substring(0, 50) + '...';
    }
    console.log(`${k}: ${display}`);
  }
});
