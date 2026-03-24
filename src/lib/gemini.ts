import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
  explanation: string;
  safeAlternatives: string[];
}

export async function analyzeContent(type: "email" | "sms" | "url", content: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are Phish Hunter AI, an expert cybersecurity analyst specializing in phishing and scam detection.
    Your task is to analyze the provided ${type} content and determine if it is a phishing attempt, scam, or malicious.
    
    For ${type === 'url' ? 'URLs' : 'text content'}:
    - Look for suspicious patterns, urgency, pressure tactics, and credential harvesting attempts.
    - For URLs, check for typosquatting, homoglyphs, and suspicious top-level domains.
    - Provide a risk score from 0 (Safe) to 100 (Extremely Dangerous).
    - Categorize the risk level as Low (0-30), Medium (31-70), or High (71-100).
    - List specific reasons for the classification.
    - Provide a clear, human-readable explanation.
    - Suggest safe alternatives or actions for the user.
    
    Return the result in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze this ${type}: ${content}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          explanation: { type: Type.STRING },
          safeAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["riskScore", "riskLevel", "reasons", "explanation", "safeAlternatives"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as AnalysisResult;
}

export interface ToolResult {
  title: string;
  summary: string;
  details: string;
  status: "Safe" | "Warning" | "Danger" | "Info";
  data?: any;
}

export async function runSecurityTool(tool: string, input: string): Promise<ToolResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are Phish Hunter AI, an expert cybersecurity tool.
    Your task is to simulate or perform a security check based on the tool requested: ${tool}.
    
    Tool context:
    - Unshorten: Analyze a shortened URL and predict its destination or risk.
    - Headers: Analyze HTTP headers for security vulnerabilities (CSP, HSTS, etc.).
    - WHOIS: Simulate a WHOIS lookup and identify suspicious registration patterns.
    - SSL Check: Analyze SSL/TLS configuration for weaknesses.
    - Fast Scan: Perform a quick heuristic analysis of a snippet or URL.
    - Live Feed: Generate a simulated "live feed" of recent security threats related to the input.
    - Auth ID: Analyze an authentication-related string (token, ID) for patterns.
    - AI Core: Provide a deep AI-driven security insight about the input.
    
    For the input: "${input}"
    
    Return a JSON object with:
    - title: The name of the tool and target.
    - summary: A brief 1-sentence summary of the finding.
    - details: A detailed markdown-formatted explanation.
    - status: One of "Safe", "Warning", "Danger", "Info".
    - data: Optional structured data related to the tool's output.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Run ${tool} on: ${input}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          details: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Safe", "Warning", "Danger", "Info"] },
          data: { type: Type.OBJECT },
        },
        required: ["title", "summary", "details", "status"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as ToolResult;
}
