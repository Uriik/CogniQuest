const postgres = require('postgres');
const sql = postgres('postgresql://user:password@localhost:5432/cogniquest');
sql`UPDATE users SET email_verified_at = NOW() WHERE email = 'gabrielnieton966@gmail.com'`.then(() => {
  console.log('Updated');
  process.exit(0);
}).catch(console.error);
