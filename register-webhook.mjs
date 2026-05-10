import dotenv from "dotenv";

dotenv.config();

const publicUrl = process.env.WEBHOOK_PUBLIC_URL;
if (!publicUrl) {
  console.error("Set WEBHOOK_PUBLIC_URL to your HTTPS endpoint (e.g. https://abc.ngrok-free.app/webhook/sms)");
  process.exit(1);
}

const user = process.env.SMSGATE_CLOUD_USERNAME;
const pass = process.env.SMSGATE_CLOUD_PASSWORD;
const base = process.env.SMSGATE_CLOUD_BASE_URL;
const deviceId = process.env.SMSGATE_DEVICE_ID;

if (!user || !pass || !base) {
  console.error("Missing SMSGATE_CLOUD_USERNAME, SMSGATE_CLOUD_PASSWORD, or SMSGATE_CLOUD_BASE_URL");
  process.exit(1);
}

const auth = Buffer.from(`${user}:${pass}`).toString("base64");

const registration = {
  url: publicUrl.replace(/\/$/, ""),
  event: "sms:received",
  ...(deviceId ? { device_id: deviceId } : {}),
};

console.log("[register-webhook] POST body:", JSON.stringify(registration));

const res = await fetch(`${base.replace(/\/$/, "")}/3rdparty/v1/webhooks`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(registration),
});

const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
