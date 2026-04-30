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
    return json(res, 405, { ok: false, message: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(res, 500, {
      ok: false,
      message: "Email service is not configured. Add RESEND_API_KEY in Vercel.",
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
    return json(res, 400, { ok: false, message: "Please check the form fields." });
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
        "Resend rejected the message. Check your sender email/domain settings.";
      return json(res, 502, { ok: false, message: resendMessage });
    }

    return json(res, 200, { ok: true, message: "Message sent. Thank you!" });
  } catch {
    return json(res, 502, {
      ok: false,
      message: "Could not connect to the email service. Please try again later.",
    });
  }
};
