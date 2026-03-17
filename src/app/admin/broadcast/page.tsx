"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

const LABELS = {
  en: {
    title: "Broadcast Message",
    subject: "Subject",
    message: "Message",
    send: "Send to All Companies",
    sending: "Sending...",
    preview: "Preview",
    info: "This message will be sent via email to all active companies on the platform.",
    success: "Broadcast sent successfully",
    error: "Failed to send broadcast",
    subjectPlaceholder: "Important update from Portico",
    messagePlaceholder: "Write your message here...",
  },
};

export default function BroadcastPage() {
  const t = LABELS.en;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    if (!confirm("Are you sure you want to send this broadcast to ALL companies?")) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) {
        toast.success(t.success);
        setSubject("");
        setMessage("");
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title={t.title}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-[#DC7418]/20 bg-[#DC7418]/5 p-4">
          <Megaphone className="h-5 w-5 text-[#DC7418] mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{t.info}</p>
        </div>

        {/* Compose */}
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label>{t.subject}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.message}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              className="min-h-[200px]"
            />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {sending ? t.sending : t.send}
          </Button>
        </div>

        {/* Preview */}
        {(subject || message) && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold mb-3">{t.preview}</h3>
            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="font-medium mb-2">{subject || "(No subject)"}</p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {message || "(No message)"}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
