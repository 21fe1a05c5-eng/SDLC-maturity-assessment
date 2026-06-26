/**
 * init_mysql.js
 * Run this script once to initialize the MySQL database schema and seed data.
 * Usage: node init_mysql.js
 *
 * Make sure MySQL is running and .env.local has the correct credentials.
 */

const fs = require('fs');
const path = require('path');

// Load .env.local manually (Next.js env is only available in the app context)
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key) process.env[key.trim()] = rest.join('=').trim();
      }
    });
  }
}

loadEnv();

const mysql = require('mysql2/promise');

async function main() {
  const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
  let connection;
  try {
    if (connectionUri) {
      console.log(`\n🚀 Connecting to MySQL using connection URI...`);
      connection = await mysql.createConnection({
        uri: connectionUri,
        multipleStatements: true,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } else {
      const config = {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'password',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sdlc_maturity',
        multipleStatements: true,
        ssl: {
          rejectUnauthorized: false
        }
      };
      console.log(`\n🚀 Connecting to MySQL at ${config.host}:${config.port} as '${config.user}'...`);
      connection = await mysql.createConnection(config);
    }
    console.log('✅ Connected successfully!\n');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL:', err.message);
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'mysql_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ mysql_schema.sql not found!');
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('📋 Running schema and seed SQL...');
  try {
    await connection.query(schema);
    console.log('✅ Schema created and data seeded successfully!\n');
  } catch (err) {
    console.error('❌ Error running schema:', err.message);
    await connection.end();
    process.exit(1);
  }

  // Verify tables
  const [tables] = await connection.query('SHOW TABLES');
  console.log(`📊 Tables in database:`);
  tables.forEach(row => {
    const tableName = Object.values(row)[0];
    console.log(`   ✓ ${tableName}`);
  });

  // Count questions
  const [[{ count }]] = await connection.query('SELECT COUNT(*) as count FROM questions');
  console.log(`\n📝 Questions seeded: ${count}`);

  // Verify admin user
  const [[adminUser]] = await connection.query("SELECT id, email, role FROM users WHERE email = 'admin@sdlc.com'");
  if (adminUser) {
    console.log(`👤 Admin user: ${adminUser.email} (role: ${adminUser.role})`);
  }

  // Check settings
  const [[settings]] = await connection.query('SELECT active_ai_provider, ollama_model FROM settings WHERE id = 1');
  if (settings) {
    console.log(`⚙️  Default AI Provider: ${settings.active_ai_provider} (model: ${settings.ollama_model})`);
  }

  await connection.end();
  console.log('\n🎉 Database initialization complete!');
  console.log('   You can now run: npm run dev\n');
  console.log('   Default login: admin@sdlc.com / admin123\n');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
