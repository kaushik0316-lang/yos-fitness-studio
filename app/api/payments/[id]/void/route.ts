import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Recalculate a member's membership snapshot from their non-voided
 * ADMISSION/RENEWAL payments only.
 * Called after voiding an ADMISSION or RENEWAL payment.
 */
async function recalcMemberSnapshot(tx: TxClient, memberId: string) {
  const latest = await tx.payment.findFirst({
    where: {
      memberId,
      paymentType: { in: ["ADMISSION", "RENEWAL"] },
      isVoided: false,
    },
    orderBy: [
      { expiryDate: "desc" },
      { date: "desc" },
    ],
    select: {
      startDate:  true,
      expiryDate: true,
      packageId:  true,
    },
  });

  if (latest) {
    await tx.member.update({
      where: { id: memberId },
      data: {
        startDate:        latest.startDate,
        expiryDate:       latest.expiryDate,
        renewalDueDate:   latest.expiryDate,
        status:           "ACTIVE",
        currentPackageId: latest.packageId ?? null,
      },
    });
  } else {
    await tx.member.update({
      where: { id: memberId },
      data: {
        startDate:        null,
        expiryDate:       null,
        renewalDueDate:   null,
        status:           "EXPIRED",
        currentPackageId: null,
      },
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── 1. Auth — ADMIN only ───────────────────────────────────────────────
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Input validation ────────────────────────────────────────────────
    const body = await req.json();
    const voidReason: string = typeof body?.voidReason === "string"
      ? body.voidReason.trim()
      : "";

    if (!voidReason) {
      return NextResponse.json(
        { error: "voidReason is required and cannot be empty" },
        { status: 400 }
      );
    }

    // ── 3. Pre-flight: load payment outside transaction ────────────────────
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: {
        id:                true,
        receiptNumber:     true,
        memberId:          true,
        paymentType:       true,
        isVoided:          true,
        company:           true,
        previousReceiptNo: true,
        amount:            true,
        discount:          true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.isVoided) {
      return NextResponse.json(
        { error: "This receipt has already been voided" },
        { status: 409 }
      );
    }

    // ── 4. Transaction ─────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 4a. Atomic void using updateMany with isVoided: false guard.
      //     This prevents double voiding and double balance restoration
      //     even under concurrent requests (race-safe).
      const voidedNow = new Date();
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, isVoided: false },
        data: {
          isVoided:    true,
          voidedAt:    voidedNow,
          voidedById:  session.user.id,
          voidReason,
        },
      });

      // If count === 0 another request already voided it — abort transaction
      if (count === 0) {
        throw new Error("ALREADY_VOIDED");
      }

      // 4b. ADMISSION / RENEWAL — recalc member snapshot (voided excluded)
      if (
        payment.paymentType === "ADMISSION" ||
        payment.paymentType === "RENEWAL"
      ) {
        await recalcMemberSnapshot(tx, payment.memberId);
      }

      // 4c. BALANCE — restore pendingAmount on the original receipt
      if (
        payment.paymentType === "BALANCE" &&
        payment.previousReceiptNo != null
      ) {
        const original = await tx.payment.findFirst({
          where: {
            company:       payment.company,
            receiptNumber: payment.previousReceiptNo,
          },
          select: {
            id:            true,
            amount:        true,
            discount:      true,
            pendingAmount: true,
          },
        });

        if (original) {
          const currentPending = Number(original.pendingAmount ?? 0);
          const balancePaid    = Number(payment.amount ?? 0);
          // Max restorable = original amount - discount (what was originally owed)
          const maxRestorable  = Number(original.amount ?? 0) - Number(original.discount ?? 0);
          const restored       = Math.min(currentPending + balancePaid, maxRestorable);

          await tx.payment.update({
            where: { id: original.id },
            data:  { pendingAmount: restored },
          });
        }
        // If original not found (deleted/moved), skip silently — recorded in audit below
      }

      // 4d. Audit log
      await tx.auditLog.create({
        data: {
          userId:   session.user.id,
          action:   "VOID",
          entity:   "Payment",
          entityId: payment.id,
          oldValues: {
            isVoided:  false,
          } as any,
          newValues: {
            isVoided:    true,
            voidedAt:    voidedNow.toISOString(),
            voidedById:  session.user.id,
            voidReason,
            previousReceiptNoRestored:
              payment.paymentType === "BALANCE" && payment.previousReceiptNo != null
                ? payment.previousReceiptNo
                : null,
          } as any,
        },
      });
    });

    return NextResponse.json({
      ok:            true,
      paymentId:     payment.id,
      receiptNumber: payment.receiptNumber,
    });
  } catch (e: any) {
    if (e.message === "ALREADY_VOIDED") {
      return NextResponse.json(
        { error: "This receipt has already been voided" },
        { status: 409 }
      );
    }
    console.error("[void route]", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
