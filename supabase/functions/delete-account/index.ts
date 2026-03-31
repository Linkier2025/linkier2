import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check for unpaid rent (room_assignments with payment_status = 'unpaid' and status = 'active')
    const { data: unpaidAssignments } = await adminClient
      .from("room_assignments")
      .select("id")
      .eq("student_id", user.id)
      .eq("status", "active")
      .eq("payment_status", "unpaid");

    if (unpaidAssignments && unpaidAssignments.length > 0) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your account while you have unpaid rent." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel pending requests
    await adminClient
      .from("rental_requests")
      .update({ status: "cancelled" })
      .eq("student_id", user.id)
      .in("status", ["pending", "approved"]);

    await adminClient
      .from("property_viewings")
      .update({ status: "cancelled" })
      .eq("student_id", user.id)
      .in("status", ["pending", "scheduled"]);

    // Mark active assignments as moved_out
    await adminClient
      .from("room_assignments")
      .update({ status: "moved_out" })
      .eq("student_id", user.id)
      .eq("status", "active");

    // Mark active rentals as inactive
    await adminClient
      .from("rentals")
      .update({ status: "inactive" })
      .eq("student_id", user.id)
      .eq("status", "active");

    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete account: " + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
