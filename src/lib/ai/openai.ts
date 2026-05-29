type JsonSchema = Record<string, unknown>;

export type AiProvider = "openai" | "deterministic_fallback";

export type JsonModelResult<T> =
  | {
      ok: true;
      provider: "openai";
      model: string;
      value: T;
      rawText: string;
    }
  | {
      ok: false;
      provider: "deterministic_fallback";
      error: string;
    };

function modelName() {
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}

function extractOutputText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  return output
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const content = (item as Record<string, unknown>).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (typeof content !== "object" || content === null) return "";
      const recordContent = content as Record<string, unknown>;
      return typeof recordContent.text === "string"
        ? recordContent.text
        : typeof recordContent.output_text === "string"
          ? recordContent.output_text
          : "";
    })
    .join("");
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callOpenAiJson<T>(params: {
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
  timeoutMs?: number;
}): Promise<JsonModelResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      provider: "deterministic_fallback",
      error: "OPENAI_API_KEY is not configured"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName(),
        instructions: params.system,
        input: params.user,
        text: {
          format: {
            type: "json_schema",
            name: params.schemaName,
            strict: true,
            schema: params.schema
          }
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        provider: "deterministic_fallback",
        error: `OpenAI request failed with ${response.status}: ${text.slice(0, 400)}`
      };
    }

    const payload = (await response.json()) as unknown;
    const rawText = extractOutputText(payload);
    if (!rawText) {
      return {
        ok: false,
        provider: "deterministic_fallback",
        error: "OpenAI response did not include output text"
      };
    }

    return {
      ok: true,
      provider: "openai",
      model: modelName(),
      value: JSON.parse(rawText) as T,
      rawText
    };
  } catch (error) {
    return {
      ok: false,
      provider: "deterministic_fallback",
      error: error instanceof Error ? error.message : "Unknown OpenAI error"
    };
  } finally {
    clearTimeout(timeout);
  }
}
