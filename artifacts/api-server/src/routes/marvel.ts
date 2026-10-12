import OpenAI from "openai";
import {
  SendMarvelMessageBody,
  SendMarvelMessageResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const systemInstruction = `You are a friendly guide to Marvel comics, characters, films, and television. Keep answers clear and conversational. When comic and screen continuities differ, say which one you mean. Be honest when a detail is uncertain or varies by version. For unrelated questions, briefly explain that you specialize in Marvel and invite a Marvel question. Do not reproduce long copyrighted passages, scripts, or comic text.`;

router.post("/marvel/chat", async (req, res): Promise<void> => {
  const parsed = SendMarvelMessageBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    req.log.error("OPENAI_API_KEY is not configured");
    res.status(500).json({ error: "The Marvel assistant is not configured." });
    return;
  }

  try {
    const ai = new OpenAI({ apiKey });
    const response = await ai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemInstruction },
        ...parsed.data.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const reply = response.choices[0]?.message.content?.trim();
    if (!reply) {
      req.log.warn("Marvel assistant returned an empty response");
      res.status(500).json({ error: "The assistant did not return an answer." });
      return;
    }

    res.json(SendMarvelMessageResponse.parse({ reply }));
  } catch (error) {
    req.log.error(
      { errorType: error instanceof Error ? error.name : "unknown" },
      "Marvel assistant request failed",
    );
    res.status(500).json({ error: "The Marvel assistant could not answer right now." });
  }
});

export default router;
