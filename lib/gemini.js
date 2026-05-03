const { GoogleGenerativeAI } = require('@google/generative-ai');

let client = null;

function getGemini() {
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

async function generateText(prompt, maxTokens = 2000) {
  const model = getGemini().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens }
  });
  return result.response.text();
}

module.exports = { generateText };
