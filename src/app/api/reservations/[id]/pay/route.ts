import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PayBody {
  gcashNumber?: string;
}

/** Mock payment confirmation.
 *
 * - Cash: instantly confirm the reservation.
 * - GCash: generate a mock reference, confirm the reservation.
 *
 * In production you'd call a real payment gateway (e.g. PayMongo) here.
 */
export async function POST(
  req: NextRequest,
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
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation ID." }, { status: 400 });
  }

  // Fetch the reservation to determine payment method and validate ownership
  const { data: reservation, error: fetchError } = await supabase
    .from("venue_reservations")
    .select("id, user_id, payment_method, reservation_status, payment_status")
    .eq("id", reservationId)
    .maybeSingle();

  if (fetchError || !reservation) {
    return NextResponse.json(
      { error: "Reservation not found." },
      { status: 404 }
    );
  }

  if (reservation.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (reservation.reservation_status !== "pending_payment") {
    return NextResponse.json(
      {
        error:
          reservation.reservation_status === "confirmed"
            ? "This reservation is already confirmed."
            : "This reservation has been cancelled.",
      },
      { status: 409 }
    );
  }

  let body: PayBody = {};
  try {
    body = (await req.json()) as PayBody;
  } catch {
    // body is optional for cash payments
  }

  const paymentMethod = reservation.payment_method as "cash" | "gcash";

  // --- GCash validation (basic) ---
  if (paymentMethod === "gcash") {
    const gcashNum = body.gcashNumber?.replace(/\D/g, "") ?? "";
    if (gcashNum.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid GCash number (e.g. 09XX-XXX-XXXX) to continue.",
        },
        { status: 400 }
      );
    }

    // Save the GCash number on the reservation
    const { error: updateErr } = await supabase
      .from("venue_reservations")
      .update({ gcash_number: gcashNum })
      .eq("id", reservationId)
      .eq("user_id", user.id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Could not save GCash number. Please try again." },
        { status: 500 }
      );
    }
  }

  // Generate a mock payment reference
  const mockRef =
    paymentMethod === "gcash"
      ? `GCASH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      : `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // --- Cash: do NOT auto-confirm. Keep status as pending_payment. ---
  // The reservation is locked in but payment must be settled on the event day.
  // We store the reference number so the user can show it at the venue.
  if (paymentMethod === "cash") {
    const { error: refErr } = await supabase
      .from("venue_reservations")
      .update({ payment_reference: mockRef })
      .eq("id", reservationId)
      .eq("user_id", user.id);

    if (refErr) {
      return NextResponse.json(
        { error: "Could not store your cash reference. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        paymentReference: mockRef,
        message:
          "Your venue slot is reserved. Please bring the full cash amount on your event day to confirm your booking.",
      },
      { status: 200 }
    );
  }

  // --- GCash: confirm the reservation via the DB function ---
  const { data: confirmed, error: confirmError } = await supabase.rpc(
    "confirm_reservation_payment",
    {
      p_reservation_id: reservationId,
      p_payment_reference: mockRef,
    }
  );

  if (confirmError || confirmed === false) {
    return NextResponse.json(
      {
        error:
          "Payment confirmation failed. The reservation may have expired. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      paymentReference: mockRef,
      message:
        paymentMethod === "gcash"
          ? "GCash payment received! Your venue is now reserved."
          : "Cash payment noted. Your venue is now reserved — please settle the amount on the day of your event.",
    },
    { status: 200 }
  );
}
