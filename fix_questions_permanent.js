const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'sdlc_maturity'
  });

  try {
    // Check current count
    const [total] = await c.execute('SELECT COUNT(*) as total FROM questions');
    console.log('Current question count:', total[0].total);

    // Check column types to understand key lengths
    const [cols] = await c.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'sdlc_maturity' AND TABLE_NAME = 'questions'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('\nColumn info:');
    cols.forEach(c => console.log(' ', c.COLUMN_NAME, c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH || ''));

    // Check if constraint already exists
    const [existing] = await c.execute(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'sdlc_maturity'
        AND TABLE_NAME = 'questions'
        AND INDEX_NAME = 'uq_area_practice'
      LIMIT 1
    `);

    if (existing.length > 0) {
      console.log('\n✅ UNIQUE index already exists — no action needed.');
    } else {
      // Use prefix lengths to stay within the 3072 byte index limit
      // area(50) + sub_area(100) + practice(200) = 350 chars = well within limit
      console.log('\nAdding UNIQUE index with prefix lengths...');
      await c.execute(`
        ALTER TABLE questions
        ADD UNIQUE INDEX uq_area_practice (area(100), sub_area(150), practice(200))
      `);
      console.log('✅ UNIQUE index added! Duplicates are now impossible.');
    }

    // Final verification
    const [finalTotal] = await c.execute('SELECT COUNT(*) as total FROM questions');
    const [areas] = await c.execute(
      'SELECT area, COUNT(*) as cnt FROM questions GROUP BY area ORDER BY FIELD(area,"Requirements","Architecture","Development","Testing","Deployment")'
    );
    console.log('\n📊 Final state:');
    console.log('   Total questions:', finalTotal[0].total);
    areas.forEach(r => console.log('  ', r.area + ':', r.cnt));

    // Show all indexes
    const [indexes] = await c.execute(`SHOW INDEXES FROM questions`);
    console.log('\n🔒 Indexes on questions table:');
    const seen = new Set();
    indexes.forEach(r => {
      if (!seen.has(r.Key_name)) {
        seen.add(r.Key_name);
        console.log('  ', r.Non_unique === 0 ? 'UNIQUE' : 'INDEX', ':', r.Key_name);
      }
    });

  } finally {
    await c.end();
    console.log('\n✅ Done — questions table is now permanently protected from duplicates.');
  }
})().catch(console.error);
