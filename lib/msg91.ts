export async function sendSmsViaMsg91(to: string, text: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    console.error("MSG91_AUTH_KEY not set");
    return false;
  }

  // MSG91 expects the number without the leading '+'
  const cleanTo = to.startsWith("+") ? to.slice(1) : to;

  // We are using the Send SMS API (v4/v5). We can use the simple transactional route.
  // Note: For India, a DLT approved Sender ID and Template ID is usually required.
  // Assuming a generic template or testing setup for now.
  const payload = {
    sender: "RITHIK",
    route: "4", // Transactional route
    country: "0", // 0 means MSG91 determines from country code
    sms: [
      {
        message: text,
        to: [cleanTo]
      }
    ]
  };

  try {
    const res = await fetch("https://control.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: {
        "authkey": authKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    console.log("MSG91 API Raw Response:", responseText);

    if (!res.ok) {
      console.error("MSG91 API error:", res.status, responseText);
      return false;
    }

    try {
      const data = JSON.parse(responseText);
      if (data.type === "error") {
        console.error("MSG91 sending error:", data);
        return false;
      }
    } catch (e) {
      // Not JSON, but it was OK
    }
    console.log("MSG91 SMS successfully sent!");
    return true;
  } catch (err) {
    console.error("MSG91 fetch failed", err);
    return false;
  }
}
