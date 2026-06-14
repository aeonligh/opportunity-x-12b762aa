import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseDeadline } from "./deadline";
import { sendDeadlineEmail } from "./email.server";

export async function runDeadlineIntelligenceCheck() {
  console.log("[Deadline Intelligence] Starting periodic scan...");
  try {
    const now = new Date();

    // 1. Get all active users
    const { data: users, error: userErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email_notifications");
    
    if (userErr) throw userErr;
    if (!users || users.length === 0) return;

    for (const user of users) {
      // 2. Get user's saved opportunities
      const { data: saved } = await supabaseAdmin
        .from("saved_opportunities")
        .select("opportunity_id, opportunity:opportunities(*)")
        .eq("user_id", user.id);

      // 3. Get user's applications
      const { data: apps } = await supabaseAdmin
        .from("applications")
        .select("opportunity_id, status, opportunity:opportunities(*)")
        .eq("user_id", user.id);

      const itemsMap = new Map<string, { opportunity: any; source: "saved" | "tracked" }>();
      
      if (saved) {
        for (const s of saved) {
          if (s.opportunity) {
            itemsMap.set(s.opportunity_id, { opportunity: s.opportunity, source: "saved" });
          }
        }
      }
      if (apps) {
        for (const a of apps) {
          if (a.opportunity) {
            // tracked applications take precedence
            itemsMap.set(a.opportunity_id, { opportunity: a.opportunity, source: "tracked" });
          }
        }
      }

      if (itemsMap.size === 0) continue;

      // Get user email from auth
      // We can query auth.users using supabaseAdmin
      const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (authUserErr || !authUserData?.user) {
        console.warn(`[Deadline Intelligence] Could not get auth user for ${user.id}`, authUserErr);
        continue;
      }
      const userEmail = authUserData.user.email;
      if (!userEmail) continue;

      // Fetch user's uploaded document types
      const { data: docs } = await supabaseAdmin
        .from("user_documents")
        .select("document_type")
        .eq("user_id", user.id);
      
      const uploadedTypes = new Set((docs ?? []).map((d) => d.document_type));

      // Standard expected documents for checklists
      const expectedDocs = ["CV", "Resume", "Transcript", "Statement of Purpose", "Motivation Letter"];
      const missingDocs: string[] = [];
      const matchingDocs: string[] = [];

      // Check if user has uploaded a CV or Resume
      if (uploadedTypes.has("CV") || uploadedTypes.has("Resume")) {
        matchingDocs.push("CV");
      } else {
        missingDocs.push("CV");
      }

      // Check for Transcript
      if (uploadedTypes.has("Transcript")) {
        matchingDocs.push("Transcript");
      } else {
        missingDocs.push("Transcript");
      }

      // Check for Statement of Purpose or Motivation Letter
      if (uploadedTypes.has("Statement of Purpose") || uploadedTypes.has("Motivation Letter")) {
        matchingDocs.push("SOP");
      } else {
        missingDocs.push("SOP");
      }

      // 4. Scan deadlines
      for (const [oppId, item] of itemsMap.entries()) {
        const { opportunity, source } = item;
        const deadlineDate = parseDeadline(opportunity.deadline);
        if (!deadlineDate) continue;

        const ms = deadlineDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(ms / 86400000);

        // Define our alert tiers: 30 days, 14 days, 7 days, 3 days, 1 day (24h)
        const tiers = [30, 14, 7, 3, 1];
        if (!tiers.includes(daysLeft)) continue;

        // Check if reminder was already sent for this specific tier
        const { data: sentBefore } = await supabaseAdmin
          .from("sent_reminders")
          .select("id")
          .eq("user_id", user.id)
          .eq("opportunity_id", opportunity.id)
          .eq("days_before", daysLeft)
          .maybeSingle();

        if (sentBefore) continue; // Already sent

        console.log(`[Deadline Intelligence] Alert triggered for user ${user.id} and opportunity ${opportunity.title} at ${daysLeft} days left.`);

        // A. Send in-app notification
        const missingText = missingDocs.length > 0 ? ` Missing: ${missingDocs.join(", ")}.` : "";
        await supabaseAdmin.from("notifications").insert({
          user_id: user.id,
          title: "Deadline Approaching",
          message: `"${opportunity.title}" closes in ${daysLeft} days.${missingText} Complete your application before the deadline!`,
          read: false,
        });

        // B. Send email reminder if opted in
        if (user.email_notifications) {
          await sendDeadlineEmail({
            userEmail,
            displayName: user.display_name ?? "",
            opportunityTitle: opportunity.title,
            deadlineStr: opportunity.deadline,
            savedOrTracked: source,
            missingDocs,
            matchingDocs,
          });
        }

        // C. Record reminder sent
        await supabaseAdmin.from("sent_reminders").insert({
          user_id: user.id,
          opportunity_id: opportunity.id,
          days_before: daysLeft,
        });
      }
    }
    console.log("[Deadline Intelligence] Periodic scan completed.");
  } catch (err) {
    console.error("[Deadline Intelligence] Error during deadline scan:", err);
  }
}
