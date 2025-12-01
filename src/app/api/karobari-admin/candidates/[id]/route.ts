import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication using NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "KAROBARI_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Karobari Admin access required" },
        { status: 401 }
      );
    }

    const { status, rejectionReason } = await request.json();
    const candidateId = params.id;

    if (!status || !["PENDING", "SUBMITTED", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (status === "REJECTED" && !rejectionReason?.trim()) {
      return NextResponse.json(
        {
          error: "Rejection reason is required when rejecting a nomination",
        },
        { status: 400 }
      );
    }

    const candidate = await prisma.karobariCandidate.update({
      where: { id: candidateId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });

    return NextResponse.json({
      message: "Candidate status updated successfully",
      candidate: {
        id: candidate.id,
        name: candidate.name,
        status: candidate.status,
        rejectionReason: candidate.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Error updating candidate status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


