/**
 * Server-only Resend Email service.
 * Connects directly to Resend REST API using process.env.RESEND_API_KEY.
 */

export async function sendDeadlineEmail({
  userEmail,
  displayName,
  opportunityTitle,
  deadlineStr,
  savedOrTracked,
  missingDocs = [],
  matchingDocs = [],
}: {
  userEmail: string;
  displayName: string;
  opportunityTitle: string;
  deadlineStr: string;
  savedOrTracked: "saved" | "tracked";
  missingDocs?: string[];
  matchingDocs?: string[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] RESEND_API_KEY is not configured in .env. Email reminder was skipped.");
    return false;
  }

  const subject = `Deadline Reminder: ${opportunityTitle}`;
  
  const checkListHtml = [
    ...matchingDocs.map((d) => `<li><span style="color: #4caf50; font-size: 16px;">✓</span> <strong>${d}</strong></li>`),
    ...missingDocs.map((d) => `<li><span style="color: #f44336; font-size: 16px;">✗</span> <strong>${d}</strong> (Missing)</li>`),
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0b0f19; color: #f8fafc;">
      <h2 style="color: #00E5FF; font-family: monospace; letter-spacing: -1px; margin-top: 0;">OPPORTUNITY X</h2>
      <p style="font-size: 16px; color: #cbd5e1;">Hello ${displayName || "Scholar"},</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">This is an automated deadline intelligence reminder for the opportunity you marked as <strong>${savedOrTracked}</strong>:</p>
      
      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #00E5FF;">
        <h3 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 18px;">${opportunityTitle}</h3>
        <p style="margin: 0; color: #cbd5e1; font-size: 14px;">⏳ <strong>Deadline:</strong> ${deadlineStr}</p>
      </div>
      
      ${checkListHtml ? `
        <h4 style="margin: 20px 0 10px 0; color: #f8fafc; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Document Checklist</h4>
        <ul style="list-style-type: none; padding-left: 0; margin: 0 0 24px 0; line-height: 1.8; color: #cbd5e1; font-size: 14px;">
          ${checkListHtml}
        </ul>
      ` : ""}

      <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 28px;">
        Complete your application before the deadline. You can use our **AI Copilot** tools inside the platform to check your eligibility, generate custom essays, and optimize your CV.
      </p>
      
      <p><a href="https://opportunity-x.lovable.app/dashboard" style="display: inline-block; background-color: #00E5FF; color: #0b0f19; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; transition: opacity 0.2s;">Go to Dashboard</a></p>
      
      <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0 20px 0;" />
      <p style="font-size: 11px; color: #64748b; line-height: 1.4;">
        You received this email because you opted in to receive deadline intelligence alerts. You can opt out at any time by updating the settings in your Profile page.
      </p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Opportunity X <onboarding@resend.dev>",
        to: [userEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Resend] API Error:", text);
      return false;
    }

    const data = await res.json();
    console.log("[Resend] Email sent successfully:", data);
    return true;
  } catch (err) {
    console.error("[Resend] Failed to send email:", err);
    return false;
  }
}
