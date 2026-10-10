import * as dotenv from "dotenv";
dotenv.config();

// Fix fetch is not defined in ts-node if using older node
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("=== LATEST 5 DISPATCHER RUNS ===");
  const { data: runs, error: runsErr } = await supabase
    .from("dispatcher_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  if (runsErr) {
    console.error("runsErr:", runsErr);
  } else {
    for (const run of runs!) {
      console.log(`Run ${run.id} | ${run.started_at} | Counts:`, JSON.stringify(run.counts));
      if (run.errors.length > 0) {
        console.log("Errors:", JSON.stringify(run.errors));
      }
    }
  }

  console.log("\n=== LATEST 5 WAITLIST EVENTS (offer_group.created) ===");
  const { data: events, error: evtsErr } = await supabase
    .from("waitlist_events")
    .select("created_at, payload")
    .eq("event_type", "offer_group.created")
    .order("created_at", { ascending: false })
    .limit(5);

  if (evtsErr) {
    console.error("evtsErr:", evtsErr);
  } else {
    for (const e of events!) {
      console.log(`[${e.created_at}] Payload:`, JSON.stringify(e.payload));
    }
  }

  console.log("\n=== WAITING OFFERS ===");
  const { data: offers } = await supabase
    .from("waitlist_slot_offers")
    .select("waitlist_request_id, status, starts_at, dedupe_key")
    .order("created_at", { ascending: false })
    .limit(10);
    
  console.table(offers);
}

run().catch(console.error);
