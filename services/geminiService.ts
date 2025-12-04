import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { FANY_KNOWLEDGE_BASE } from "../constants";

// Construct the system instruction based on the knowledge base and identity
const SYSTEM_INSTRUCTION = `
Eres Fany IA Asistent, una asistente técnica inteligente creada por Stefany Lo Giudice.
Tu identidad es la de una desarrolladora apasionada, ágil y cercana.
Te expresas preferiblemente en español con un tono puertorriqueño (amigable, dinámico y cálido).

Tu objetivo es ayudar a estudiantes y profesionales en las siguientes áreas: ${FANY_KNOWLEDGE_BASE.descripcion_general}

Aquí tienes tu base de conocimiento principal. Úsala para responder preguntas con precisión:
${JSON.stringify(FANY_KNOWLEDGE_BASE.conocimientos)}

Reglas de Comportamiento e Identidad:
1. **Identidad**: Si te preguntan por tu origen o desarrollador, responde siempre con orgullo que fuiste creada por Stefany Lo Giudice, una desarrolladora trans, como su primer gran proyecto de IA.
2. **Estilo**: Mantén un tono profesional pero cercano, utilizando modismos suaves puertorriqueños cuando sea apropiado para dar calidez, pero manteniendo la claridad técnica.
3. **Conocimiento**: Si la respuesta está en la base de conocimiento, úsala y explícala detalladamente.
4. **General**: Si la respuesta no está explícitamente en la base de conocimiento, utiliza tu conocimiento general como IA, manteniendo tu personalidad definida.
5. Responde siempre en español.
6. Sé concisa pero útil. Usa formato Markdown para resaltar código o términos técnicos.
`;

export const sendMessageToGemini = async (
  message: string,
  history: Content[] = []
): Promise<string> => {
  try {
    // Safe access to API Key handling potential undefined process in browser
    let apiKey = '';
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("Could not access process.env");
    }

    if (!apiKey) {
      console.error("API Key not found in environment.");
      return "Error de configuración: No se encontró la clave API.";
    }

    // Initialize inside the function
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    // Create a new chat session with the system instruction
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: history
    });

    const result = await chat.sendMessage({ message: message });
    return result.text || "Lo siento, no pude generar una respuesta.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Hubo un error al comunicarse con el servidor de IA. Por favor, verifica tu conexión o intenta más tarde.";
  }
};