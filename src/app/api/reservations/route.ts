import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CreateReservationBody {
  venueId: string;
  eventId?: string | null;
  eventDate: string; // "YYYY-MM-DD"
  startTime: string;
  durationHours: number;
  guestCount: number;
  pricePerHead: number;
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  specialRequests?: string;
  paymentMethod: "cash" | "gcash";
}

export interface CreateReservationResult {
  reservationId: string;
  referenceNumber: string;
  conflict: boolean;
}

function normalizePhilippineMobile(value: string): string | null {
  if (/[A-Za-z]/.test(value)) return null;

  const digits = value.replace(/\D/g, "");
  return /^09\d{9}$/.test(digits) ? digits : null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // Verify authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateReservationBody;
  try {
    body = (await req.json()) as CreateReservationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Basic validation
  const {
    venueId,
    eventId,
    eventDate,
    startTime,
    durationHours,
    guestCount,
    pricePerHead,
    totalAmount,
    contactName,
    contactPhone,
    specialRequests = "",
    paymentMethod,
  } = body;

  if (!venueId || !eventDate || !startTime || !contactName || !contactPhone) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (!["cash", "gcash"].includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Payment method must be cash or gcash." },
      { status: 400 }
    );
  }

  if (paymentMethod === "gcash") {
    const { data: venuePayment, error: venuePaymentError } = await supabase
      .from("venues")
      .select("gcash_number")
      .eq("id", venueId)
      .eq("is_active", true)
      .maybeSingle();

    const venueGcashNumber = normalizePhilippineMobile(
      (venuePayment as { gcash_number?: string | null } | null)?.gcash_number ?? ""
    );

    if (venuePaymentError || !venuePayment || !venueGcashNumber) {
      return NextResponse.json(
        {
          error:
            "This venue does not have a GCash receiving number yet. Please choose cash or contact the admin.",
        },
        { status: 400 }
      );
    }
  }

  if (guestCount < 1 || pricePerHead < 0 || totalAmount < 0 || durationHours < 1) {
    return NextResponse.json(
      { error: "Invalid numeric values." },
      { status: 400 }
    );
  }

  const phoneDigits = normalizePhilippineMobile(contactPhone);
  if (!phoneDigits) {
    return NextResponse.json(
      { error: "Please enter a valid 11-digit Philippine mobile number. Letters are not allowed." },
      { status: 400 }
    );
  }

  // Call the atomic DB function
  const { data, error } = await supabase.rpc("create_venue_reservation", {
    p_venue_id: venueId,
    p_event_id: eventId ?? null,
    p_event_date: eventDate,
    p_start_time: startTime,
    p_duration_hours: durationHours,
    p_guest_count: guestCount,
    p_price_per_head: pricePerHead,
    p_total_amount: totalAmount,
    p_contact_name: contactName.trim(),
    p_contact_phone: phoneDigits,
    p_special_requests: specialRequests.trim(),
    p_payment_method: paymentMethod,
  });

  if (error) {
    console.error("[POST /api/reservations] DB error:", error.message);
    return NextResponse.json(
      { error: "Could not create reservation. Please try again." },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return NextResponse.json(
      { error: "Unexpected database response." },
      { status: 500 }
    );
  }

  const result: CreateReservationResult = {
    reservationId: row.reservation_id as string,
    referenceNumber: row.reference_number as string,
    conflict: row.conflict as boolean,
  };

  if (result.conflict) {
    return NextResponse.json(
      {
        error:
          "This time slot overlaps with an existing reservation for that venue. Please choose a different start time or duration.",
        conflict: true,
      },
      { status: 409 }
    );
  }

  return NextResponse.json(result, { status: 201 });
}
