// Netlify version of api/chat.js (same behaviour, same env vars). The API key stays server-side.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { messages, mode, model: reqModel } = await req.json().catch(() => ({} as any));
    if (!Array.isArray(messages)) return json({ error: "messages must be an array" }, 400);
    const key = Netlify.env.get("EXPLABS_API_KEY");
    if (!key) return json({ error: "EXPLABS_API_KEY is not configured" }, 500);

    let model = Netlify.env.get("EXPLABS_MODEL");
    if (!model) {
      const modelRes = await fetch("https://api.experientiallabs.ai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      const modelData: any = await modelRes.json().catch(() => ({}));
      if (!modelRes.ok) return json({ error: modelData?.error?.message || "Could not discover an available AI model" }, modelRes.status);
      model = modelData?.data?.[0]?.id || modelData?.models?.[0]?.id;
      if (!model) return json({ error: "No available AI model was returned by Experiential Labs" }, 500);
    }

    const system = mode === "support"
      ? "You are the EventEase Support Assistant. Guide users step by step through EventEase (accounts stored in browser localStorage, Events/Guests/Tasks/Budget/Venue tabs, PWA install, AI needs EXPLABS_API_KEY set on the host) and troubleshoot problems. Be brief, numbered steps, never ask for passwords."
      : mode === "planner" ? "You generate complete event plans. Reply with ONLY valid JSON, no markdown, with keys: name, type, date (YYYY-MM-DD or empty), time (HH:MM or empty), location, guests (number), budget (number in INR), summary, tasks (array of {title, priority: High|Medium|Low, when}), budget_breakdown (array of {item, amount}), schedule (array of {time, activity}), invitation (warm invitation text). Tailor everything to the request and use INR."
      : "You are EventEase AI, a concise and helpful event planning assistant. Help with event schedules, checklists, guest management, venue planning and budgets. Be practical and friendly.";

    const upstream = await fetch("https://api.experientiallabs.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages.slice(-20)], temperature: 0.7 }),
    });
    const data: any = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: data?.error?.message || "Experiential Labs request failed" }, upstream.status);
    return json({ reply: data?.choices?.[0]?.message?.content || "No response returned.", model });
  } catch {
    return json({ error: "Unable to reach AI provider" }, 500);
  }
};

export const config = { path: "/api/chat" };
