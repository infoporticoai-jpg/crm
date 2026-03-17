import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log("[Email] No RESEND_API_KEY configured. Would send to:", to, "Subject:", subject);
    return { success: true, mock: true };
  }
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "Portico <noreply@porticoai.net>",
    to,
    subject,
    html,
  });
  if (error) throw error;
  return { success: true, id: data?.id };
}
