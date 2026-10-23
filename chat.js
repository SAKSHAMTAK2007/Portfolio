import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.5-flash-lite";
const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const requestLog = new Map();

const SYSTEM_INSTRUCTION = `You are a helpful assistant on Saksham Tak’s personal portfolio website.

Answer only from the facts below. If a question is off-topic or the answer is not listed, say you do not have that information and invite the visitor to ask about the About section, skills, or the five projects. Do not invent skills, achievements, education details, contact information, internships, or links. Do not provide personal contact details. Keep replies concise. When asked for a project link, provide the relevant GitHub repository and/or live website URL exactly as listed below.

Portfolio facts:
- Name: Saksham Tak
- Tagline: Computer Science Student | Aspiring Developer
- About: Computer Science Engineering student interested in programming, technology, and developing practical solutions. Enjoys exploring new technologies and improving problem-solving skills. Currently pursuing B.Tech at JECRC University, Jaipur, and gaining practical experience through hands-on projects.
- Location shown on the site: Ajmer
- Skills listed: AI Prompting; C Programming; C++ Programming; Python Programming; Git & GitHub

Projects (exactly five):
1. Python Programs Collection — A collection of Python programs demonstrating fundamental programming concepts, including Factorial, Fibonacci series, and Structure-to-Dictionary conversion. Repositories:
   - Fibonacci: https://github.com/SAKSHAMTAK2007/fibonacci_25bcon2414
   - Factorial: https://github.com/SAKSHAMTAK2007/factorial_python_basics_25bcon2414
   - Structure-to-Dictionary: https://github.com/SAKSHAMTAK2007/python_basis_25bcon2414_struct-to-dictionary
2. Python Code Optimization Using AI — Improved an unstructured Python script using AI assistance, focusing on code readability, organization, and maintainability. GitHub: https://github.com/SAKSHAMTAK2007/messy_python_SakshamTak_25bcon2414
3. AI-Assisted Code Debugging — Identified and corrected errors in a buggy program using Cursor AI, improving code correctness and functionality. GitHub: https://github.com/SAKSHAMTAK2007/messy_python_SakshamTak_25bcon2414
4. Interactive Quiz Application — Developed an interactive quiz application that allows users to answer questions, navigate quiz options, and receive feedback on their answers. Live website: https://quiz-five-wheat-26.vercel.app/ GitHub: https://github.com/SAKSHAMTAK2007/Quiz
5. Book Reading List Manager — Built a web application that allows users to add and manage books in a personal reading list through a simple and user-friendly interface. Live website: https://readinglist-phi.vercel.app/ GitHub: https://github.com/SAKSHAMTAK2007/readinglist`;

function json(status, payload) {
  return Response.json(payload, { status });
}

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return null;

  const cleaned = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== "object") continue;
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    if (!role || typeof item.text !== "string") continue;
    const text = item.text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (text) cleaned.push({ role, text });
  }

  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== "user") return null;
  return cleaned;
}

export async function POST(request) {
  try {
    if (isRateLimited(clientIp(request))) {
      return json(429, { error: "Too many questions in a short time. Please wait and try again." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(500, { error: "The assistant is not configured yet." });

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "Please send a valid question." });
    }

    const messages = normalizeMessages(payload?.messages);
    if (!messages) return json(400, { error: "Please send a valid question." });

    const contents = messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }]
    }));

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 500
      }
    });

    const reply = typeof response.text === "string" ? response.text.trim() : "";
    if (!reply) return json(502, { error: "The assistant returned an empty reply. Please try again." });
    return json(200, { reply });
  } catch (error) {
    console.error("Gemini request failed:", error?.name || "Error");
    return json(502, { error: "Couldn’t reach the assistant. Try again." });
  }
}

export async function GET() {
  return json(405, { error: "Method not allowed." });
}
