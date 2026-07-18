// @ts-nocheck

export async function generateAiCaption({ prompt, product, style }: { prompt: string, product?: any, style?: string }) {
  try {
    const body = {
      prompt: [
        "Create a catchy, short, human-written marketing caption for social media for the following product or campaign.",
        product ? `Product: ${product.name}${product.category ? ` (${product.category})` : ""}${product.description ? `. ${product.description}` : ""}` : "",
        `Prompt Context: ${prompt}`,
        style ? `Preferred style: ${style}.` : "",
        "Less than 20 words. Use a warm brand voice."
      ].filter(Boolean).join(" "),
    };
    const response = await fetch("/api/ai-social-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data.caption || "";
  } catch {
    return "";
  }
}

export async function generateAiHashtags({ prompt, product, style }: { prompt: string, product?: any, style?: string }) {
  try {
    const body = {
      prompt: [
        "Give me up to 5 trending, relevant hashtags for this post. Only reply with the hashtags separated by spaces:",
        product ? `Product: ${product.name}${product.category ? ` (${product.category})` : ""}${product.description ? `. ${product.description}` : ""}` : "",
        `Prompt Context: ${prompt}`,
        style ? `Style: ${style}` : "",
      ].filter(Boolean).join(" "),
    };
    const response = await fetch("/api/ai-social-hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data.hashtags || "";
  } catch {
    return "";
  }
}

export async function generateAiCTA({ prompt, product }: { prompt: string, product?: any }) {
  try {
    const body = {
      prompt: [
        "Suggest a concise call to action encouraging engagement, tailored for this post.",
        product ? `Product: ${product.name}${product.category ? ` (${product.category})` : ""}${product.description ? `. ${product.description}` : ""}` : "",
        `Prompt Context: ${prompt}`,
        "E.g.: Learn More, Shop Now, Join Us"
      ].filter(Boolean).join(" "),
    };
    const response = await fetch("/api/ai-social-cta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data.cta || "";
  } catch {
    return "";
  }
}
