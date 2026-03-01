import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reservationId } = await params;

  const { data: result, error } = await supabase.rpc(
    "cancel_venue_reservation",
    { p_reservation_id: reservationId }
  );

  if (error) {
    return NextResponse.json(
      { error: "Could not cancel reservation." },
      { status: 500 }
    );
  }

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Reservation not found or already cancelled.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
