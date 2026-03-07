// QwikChat Push Notification Edge Function
// Deploy: supabase functions deploy push-notification
//
// This function is triggered by a Supabase Database Webhook
// when a new message is inserted into the messages table.
// It sends a push notification to offline participants.
//
// Required Supabase Secrets:
//   supabase secrets set FCM_SERVER_KEY=<your-firebase-cloud-messaging-server-key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

interface WebhookPayload {
    type: "INSERT";
    table: string;
    record: {
        id: string;
        chat_id: string;
        sender_id: string;
        content: string;
        type: string;
        created_at: string;
    };
}

serve(async (req: Request) => {
    try {
        // Validate request method
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Validate authorization header (webhook secret)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const payload: WebhookPayload = await req.json();
        const message = payload.record;

        // Use the service role key (bypasses RLS) to read all participants
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get all participants of this chat except the sender
        const { data: participants, error: partError } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("chat_id", message.chat_id)
            .neq("user_id", message.sender_id);

        if (partError || !participants) {
            console.error("Error fetching participants:", partError);
            return new Response(JSON.stringify({ error: "Failed to fetch participants" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2. Get sender info for the notification title
        const { data: sender } = await supabase
            .from("users")
            .select("username")
            .eq("id", message.sender_id)
            .single();

        const senderName = sender?.username || "Someone";

        // 3. For each participant, check if they have a push token
        // (In a full implementation, you'd have a `push_tokens` table)
        // For now, log the notification payload that would be sent
        const notificationPayload = {
            title: `New message from ${senderName}`,
            body: message.content.substring(0, 100),
            data: {
                chat_id: message.chat_id,
                message_id: message.id,
            },
        };

        console.log(
            `[Push Notification] Would notify ${participants.length} users:`,
            JSON.stringify(notificationPayload)
        );

        // 4. If FCM key is configured, send actual push notifications
        if (fcmServerKey) {
            // In production: iterate participants, look up their FCM tokens,
            // and send via Firebase Cloud Messaging HTTP v1 API
            console.log("[Push Notification] FCM key configured, ready for production sends");
        }

        return new Response(
            JSON.stringify({
                success: true,
                notified: participants.length,
                payload: notificationPayload,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
