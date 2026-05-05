import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PayBody {
  paymentMethod?: "cash" | "gcash";
  gcashNumber?: string;
  proofImageBase64?: string; // data URL: "data:image/...;base64,..."
}

async function uploadProofImage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  reservationId: string,
  dataUrl: string
): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const ext = mimeType.split("/")[1] ?? "jpg";
  const buffer = Buffer.from(match[2], "base64");
  const path = `${userId}/${reservationId}.${ext}`;

  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[uploadProofImage] Storage error:", error.message);
    return null;
  }

  const { data, error: signError } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !data?.signedUrl) return null;
  return data.signedUrl;
}

function makePaymentReference(paymentMethod: "cash" | "gcash") {
  const prefix = paymentMethod === "gcash" ? "GCASH" : "CASH";
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function normalizePhilippineMobile(value: string | undefined): string | null {
  if (!value || /[A-Za-z]/.test(value)) return null;

  const digits = value.replace(/\D/g, "");
  return /^09\d{9}$/.test(digits) ? digits : null;
}

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

  const { data: reservation, error: fetchError } = await supabase
    .from("venue_reservations")
    .select("id, user_id, payment_method, reservation_status, payment_status, venues ( gcash_number )")
    .eq("id", reservationId)
    .maybeSingle();

  if (fetchError || !reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
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
    body = {};
  }

  const paymentMethod: "cash" | "gcash" =
    body.paymentMethod === "cash" || body.paymentMethod === "gcash"
      ? body.paymentMethod
      : (reservation.payment_method as "cash" | "gcash");

  let gcashNumber: string | null = null;
  if (paymentMethod === "gcash") {
    const venueJoin = (reservation as {
      venues?: { gcash_number?: string | null } | { gcash_number?: string | null }[] | null;
    }).venues;
    const venueData = Array.isArray(venueJoin) ? venueJoin[0] ?? null : venueJoin ?? null;
    const venueGcashNumber = normalizePhilippineMobile(venueData?.gcash_number ?? "");

    if (!venueGcashNumber) {
      return NextResponse.json(
        {
          error:
            "This venue does not have a GCash receiving number yet. Please choose cash or contact the admin.",
        },
        { status: 400 }
      );
    }

    gcashNumber = normalizePhilippineMobile(body.gcashNumber);

    if (!gcashNumber) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 11-digit GCash number. Letters are not allowed.",
        },
        { status: 400 }
      );
    }

    if (!body.proofImageBase64) {
      return NextResponse.json(
        { error: "Please upload your GCash payment receipt before submitting." },
        { status: 400 }
      );
    }
  }

  let proofUrl: string | null = null;
  if (body.proofImageBase64) {
    proofUrl = await uploadProofImage(
      supabase,
      user.id,
      reservationId,
      body.proofImageBase64
    );

    if (!proofUrl) {
      return NextResponse.json(
        { error: "Could not upload payment proof. Please try another image." },
        { status: 500 }
      );
    }
  }

  const paymentReference = makePaymentReference(paymentMethod);

  const { error: submitError } = await supabase
    .from("venue_reservations")
    .update({
      payment_method: paymentMethod,
      payment_status: "pending",
      reservation_status: "pending_payment",
      gcash_number: gcashNumber,
      payment_reference: paymentReference,
      payment_proof_url: proofUrl,
      expires_at: null,
    })
    .eq("id", reservationId)
    .eq("user_id", user.id);

  if (submitError) {
    return NextResponse.json(
      { error: "Could not submit your payment for review. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      paymentReference,
      message:
        paymentMethod === "gcash"
          ? "GCash payment submitted. An admin will review the receipt before confirming your reservation."
          : "Cash payment reference submitted. An admin will verify the reference before confirming your reservation.",
    },
    { status: 200 }
  );
}
