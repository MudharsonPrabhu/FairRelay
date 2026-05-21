const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => { console.log('SUCCESS: DB connected!'); return p.$disconnect(); })
  .catch(e => { console.error('FAILED:', e.message); process.exit(1); });
