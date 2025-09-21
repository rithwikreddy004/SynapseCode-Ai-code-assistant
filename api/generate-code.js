// api/generate-code.js
import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log(`Received prompt: "${prompt}"`);

    const systemPrompt = `You are a highly skilled code generation and explanation AI. 
Your task is to generate complete, correct, and well-commented code in the language requested by the user's prompt. 
Following the code block, provide a detailed, step-by-step explanation of how the code works.

Format your response as a single markdown document with the following structure:
- A single markdown code block for the code.
- A section with the heading "Explanation" followed by the detailed, step-by-step breakdown using headings and/or bullet points.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 2048,
    });

    const generatedResponse =
      chatCompletion.choices[0]?.message?.content || "No content generated.";

    console.log("Generated response:", generatedResponse);

    return res.status(200).json({ code: generatedResponse });
  } catch (error) {
    console.error("Error generating code:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate content from AI model." });
  }
}











