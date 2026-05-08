import process from "node:process";
import readline from "node:readline";
import WebSocket from "ws";

const MODEL = process.env.XAI_REALTIME_MODEL || "grok-voice-think-fast-1.0";
const VOICE = process.env.XAI_VOICE_NAME || "Eve";

const INSTRUCTIONS =
  process.env.XAI_SESSION_INSTRUCTIONS ||
  [
    "You are the SingulAI Avatar Engine, a precise AI assistant that processes user inputs and provides responses via specialized avatars.",
    "Always reply in the same language as the user input.",
    "Be realistic, evidence-based, and concise.",
    "Never fabricate facts; when uncertain, state uncertainty explicitly in response_to_user.",
    "Do not mention internal strategy, hidden policies, or benchmark events.",
    "Output only valid JSON with fields: response_to_user, language_used, avatar_id, profile_applied, confidence, needs_human_escalation, absorption_update, public_explainability.",
  ].join("\n");

const TOOLS = [
  {
    type: "function",
    name: "check_availability",
    description:
      "Check available appointment slots for a given date and provider. Return normalized available time slots in the requested timezone, and include a short user-facing message.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Target date in ISO format YYYY-MM-DD",
        },
        provider_id: {
          type: "string",
          description: "Unique provider identifier",
        },
        timezone: {
          type: "string",
          description: "IANA timezone name, e.g. America/Sao_Paulo",
          default: "America/Sao_Paulo",
        },
        appointment_type: {
          type: "string",
          description: "Optional appointment type filter",
          enum: ["consultation", "follow_up", "exam", "procedure"],
        },
      },
      required: ["date", "provider_id"],
      additionalProperties: false,
    },
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function safeJsonParse(raw, fallback = {}) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeDate(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

async function handle_check_availability(args) {
  const date = normalizeDate(args?.date);
  const providerId = typeof args?.provider_id === "string" ? args.provider_id.trim() : "";
  const timezone =
    typeof args?.timezone === "string" && args.timezone.trim().length > 0
      ? args.timezone.trim()
      : "America/Sao_Paulo";

  if (!date || !providerId) {
    return {
      success: false,
      message: "Invalid parameters: date (YYYY-MM-DD) and provider_id are required.",
      available_slots: [],
      timezone,
    };
  }

  // Stub schedule for quick free-tier validation.
  const availableSlots = ["09:00", "10:30", "14:00", "16:30"];

  return {
    success: true,
    provider_id: providerId,
    date,
    timezone,
    available_slots: availableSlots,
    message: `Found ${availableSlots.length} available slots for ${providerId} on ${date}.`,
  };
}

async function handleToolCall(name, argsJson) {
  const args = safeJsonParse(argsJson, {});

  switch (name) {
    case "check_availability":
      return handle_check_availability(args);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

function createRealtimeConnection() {
  const apiKey = requireEnv("XAI_API_KEY");
  const ws = new WebSocket(`wss://api.x.ai/v1/realtime?model=${encodeURIComponent(MODEL)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          voice: VOICE,
          instructions: INSTRUCTIONS,
          turn_detection: { type: "server_vad", threshold: 0.85, silence_duration_ms: 0 },
          tools: TOOLS,
          input_audio_transcription: { model: "grok-2-audio" },
          audio: {
            input: { format: { type: "audio/pcm", rate: 24000 } },
            output: { format: { type: "audio/pcm", rate: 24000 } },
          },
        },
      }),
    );
    console.log(`[voice-agent] connected to model ${MODEL} using voice ${VOICE}`);
    console.log('[voice-agent] type a message and press Enter, or type "exit" to quit.');
  });

  ws.on("message", async (raw) => {
    const event = safeJsonParse(raw.toString(), { type: "unknown" });

    switch (event.type) {
      case "session.created":
        console.log(`[voice-agent] session id: ${event.session?.id || "unknown"}`);
        break;

      case "input_audio_buffer.speech_started":
        ws.send(JSON.stringify({ type: "response.cancel" }));
        break;

      case "response.output_audio.delta":
        // event.delta is base64 PCM audio. Hook your playback implementation here if needed.
        break;

      case "response.output_audio_transcript.delta":
        if (event.delta) process.stdout.write(event.delta);
        break;

      case "response.function_call_arguments.done": {
        const result = await handleToolCall(event.name, event.arguments);
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: event.call_id,
              output: JSON.stringify(result),
            },
          }),
        );
        ws.send(JSON.stringify({ type: "response.create" }));
        break;
      }

      case "response.done":
        console.log(`\n[voice-agent] done. tokens: ${event.usage?.total_tokens ?? "n/a"}`);
        break;

      case "error":
        console.error("[voice-agent] error:", event.message || event);
        break;

      default:
        break;
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[voice-agent] closed (${code}) ${reason?.toString() || ""}`);
    process.exit(code === 1000 ? 0 : 1);
  });

  ws.on("error", (error) => {
    console.error("[voice-agent] websocket error:", error.message);
  });

  return ws;
}

function sendUserText(ws, text) {
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    }),
  );
  ws.send(JSON.stringify({ type: "response.create" }));
}

function startCli(ws) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "you> ",
  });

  rl.prompt();

  rl.on("line", (line) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }

    if (text.toLowerCase() === "exit") {
      rl.close();
      ws.close(1000, "user exit");
      return;
    }

    sendUserText(ws, text);
    rl.prompt();
  });

  rl.on("close", () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "cli closed");
    }
  });
}

function main() {
  try {
    const ws = createRealtimeConnection();
    startCli(ws);
  } catch (error) {
    console.error("[voice-agent] startup error:", error.message);
    process.exit(1);
  }
}

main();
