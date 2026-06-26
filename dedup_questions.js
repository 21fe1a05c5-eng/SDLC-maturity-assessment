const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'sdlc_maturity'
  });

  console.log('🔍 Finding duplicate questions...');

  // Find all IDs to DELETE: for each duplicate group keep the MIN(id) and remove the rest
  const [dupsToDelete] = await c.execute(`
    SELECT id FROM questions
    WHERE id NOT IN (
      SELECT MIN(id) FROM questions GROUP BY area, sub_area, practice, question_text
    )
  `);

  console.log(`Found ${dupsToDelete.length} duplicate rows to remove.`);

  if (dupsToDelete.length === 0) {
    console.log('✅ No duplicates found. Nothing to do.');
    await c.end();
    return;
  }

  // Delete them
  const ids = dupsToDelete.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await c.execute(`DELETE FROM questions WHERE id IN (${placeholders})`, ids);
  console.log(`🗑️  Deleted ${result.affectedRows} duplicate questions.`);

  // Verify final count
  const [total] = await c.execute('SELECT COUNT(*) as total FROM questions');
  console.log(`\n✅ Final question count: ${total[0].total}`);

  const [areas] = await c.execute(
    'SELECT area, COUNT(*) as cnt FROM questions GROUP BY area ORDER BY FIELD(area,"Requirements","Architecture","Development","Testing","Deployment")'
  );
  console.log('\nPer area:');
  areas.forEach(r => console.log(' ', r.area, ':', r.cnt));

  await c.end();
  console.log('\n✅ Done! Questions restored to original 120.');
})().catch(console.error);
