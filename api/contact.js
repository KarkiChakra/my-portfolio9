const CONTACT_TO_EMAIL = "ck25304015@ga.ttc.ac.jp";

const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "許可されていない送信方法です。" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(res, 500, {
      ok: false,
      message: "メール送信サービスが設定されていません。VercelにRESEND_API_KEYを追加してください。",
    });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { name = "", email = "", message = "" } = body;
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim();
  const cleanMessage = String(message).trim();

  if (cleanName.length < 2 || !isValidEmail(cleanEmail) || cleanMessage.length < 10) {
    return json(res, 400, { ok: false, message: "入力内容を確認してください。" });
  }

  const fromEmail = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const toEmail = process.env.CONTACT_TO_EMAIL || CONTACT_TO_EMAIL;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: cleanEmail,
        subject: "New portfolio message",
        text: `Name: ${cleanName}\nEmail: ${cleanEmail}\n\n${cleanMessage}`,
      }),
    });

    const resendData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const resendMessage =
        resendData.message ||
        resendData.error ||
        "メール送信に失敗しました。送信元メールまたはドメイン設定を確認してください。";
      return json(res, 502, { ok: false, message: resendMessage });
    }

    return json(res, 200, { ok: true, message: "送信しました。ありがとうございます。" });
  } catch {
    return json(res, 502, {
      ok: false,
      message: "メール送信サービスに接続できませんでした。時間をおいて再度お試しください。",
    });
  }
};
