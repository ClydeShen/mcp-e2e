// Basic echo script for stdio
process.stdin.on('data', (data) => {
  process.stdout.write(data);
});
