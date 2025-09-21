const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
const port = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());


const groq = process.env.GROQ_API_KEY

app.post('/generate-code', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        console.log(`Received prompt: "${prompt}"`);

        // 💡 Corrected system prompt: explicitly asks for a detailed explanation.
        // The correct system prompt
const systemPrompt = `You are a highly skilled code generation and explanation AI. Your task is to generate complete, correct, and well-commented code in the language requested by the user's prompt. Following the code block, provide a detailed, step-by-step explanation of how the code works.

Format your response as a single markdown document with the following structure:
- A single markdown code block for the code.
- A section with the heading "Explanation" followed by the detailed, step-by-step breakdown using headings and/or bullet points.`;



        // Make the API call to Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: prompt,
                }
            ],
            model: "llama-3.1-8b-instant", // A powerful and fast model
            temperature: 0.5,
            max_tokens: 2048, // 💡 Increased tokens to ensure full explanation
        });

        // The AI's response contains both code and explanation as one string.
        const generatedResponse = chatCompletion.choices[0]?.message?.content || "No content generated.";
        console.log("Generated response:", generatedResponse);

        // Send the complete markdown response back to the frontend.
        res.json({ code: generatedResponse });

    } catch (error) {
        console.error('Error generating code:', error);
        res.status(500).json({ error: 'Failed to generate content from AI model.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});



















