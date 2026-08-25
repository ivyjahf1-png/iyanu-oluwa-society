require('dotenv').config();
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/coop-ai';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function probe(label, body) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  console.log(`[${label}] HTTP ${res.status}\n  ${(await res.text()).slice(0, 600)}\n`);
}

(async () => {
  // LEGACY contract — what the CURRENTLY DEPLOYED function expects.
  await probe('legacy {prompt,history}', {
    prompt: 'In one short sentence, what is a cooperative society?',
    history: [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello!' }],
  });
})();