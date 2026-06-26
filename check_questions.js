const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'sdlc_maturity'
  });

  // Total count
  const [total] = await c.execute('SELECT COUNT(*) as total FROM questions');
  console.log('TOTAL questions in DB:', total[0].total);

  // Count per area
  const [areas] = await c.execute(
    'SELECT area, COUNT(*) as cnt FROM questions GROUP BY area ORDER BY FIELD(area,"Requirements","Architecture","Development","Testing","Deployment")'
  );
  console.log('\nPer area:');
  areas.forEach(r => console.log(' ', r.area, ':', r.cnt));

  // Check for duplicates by question_text
  const [dups] = await c.execute(`
    SELECT question_text, COUNT(*) as cnt 
    FROM questions 
    GROUP BY question_text 
    HAVING cnt > 1 
    LIMIT 5
  `);
  console.log('\nDuplicate question_text entries (first 5):', dups.length);
  dups.forEach(d => console.log('  [x' + d.cnt + ']', d.question_text.substring(0, 80) + '...'));

  // Check for duplicates by practice+area
  const [dupPractice] = await c.execute(`
    SELECT area, practice, COUNT(*) as cnt 
    FROM questions 
    GROUP BY area, practice 
    HAVING cnt > 1 
    LIMIT 5
  `);
  console.log('\nDuplicate area+practice entries (first 5):', dupPractice.length);
  dupPractice.forEach(d => console.log('  [x' + d.cnt + ']', d.area, '/', d.practice));

  await c.end();
})().catch(console.error);
