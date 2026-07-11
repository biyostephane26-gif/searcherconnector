require('dotenv').config();
const Groq = require('groq-sdk');

const groqKeys = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) groqKeys.push(key);
}
console.log("Keys found:", groqKeys.length);

async function test() {
  for (let key of groqKeys) {
    console.log("Testing key:", key.substring(0, 10) + "...");
    const client = new Groq({ apiKey: key });
    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{role: 'user', content: 'test'}],
      });
      console.log("Success:", response.choices[0].message.content);
      return;
    } catch (e) {
      console.error("Failed:", e.message);
    }
  }
}
test();
