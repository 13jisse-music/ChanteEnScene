// Fix ChanteEnScène → chantenscene in all blog articles
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhcnJjaHNva3Vob2J3cXZjbmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI0NzQ2NSwiZXhwIjoyMDg2ODIzNDY1fQ.F2IFnRh55GE8IkeD6D572nFgbpPGBoaIxSY5oPR3Poo';
const BASE = 'https://xarrchsokuhobwqvcnkg.supabase.co/rest/v1/blog_posts';

async function run() {
  const res = await fetch(BASE + '?select=id,slug,title,content,excerpt', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  });
  const articles = await res.json();

  for (const a of articles) {
    const fix = (s) => s ? s.replace(/ChanteEnScène/g, 'chantenscene').replace(/ChanteEnScene/g, 'chantenscene') : s;
    const newTitle = fix(a.title);
    const newContent = fix(a.content);
    const newExcerpt = fix(a.excerpt);

    const changed = newTitle !== a.title || newContent !== a.content || newExcerpt !== a.excerpt;
    if (!changed) {
      console.log('SKIP: ' + a.slug + ' (aucun changement)');
      continue;
    }

    const body = {};
    if (newTitle !== a.title) body.title = newTitle;
    if (newContent !== a.content) body.content = newContent;
    if (newExcerpt !== a.excerpt) body.excerpt = newExcerpt;

    const upd = await fetch(BASE + '?id=eq.' + a.id, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body)
    });
    console.log(upd.ok ? 'OK: ' + a.slug + ' — ' + Object.keys(body).join(', ') : 'ERREUR: ' + a.slug);
  }
}
run();
