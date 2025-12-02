import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Check authentication using NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "KAROBARI_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Karobari Admin access required" },
        { status: 401 }
      );
    }

    // Fetch statistics
    const total = await prisma.karobariCandidate.count();
    const pending = await prisma.karobariCandidate.count({
      where: { status: "PENDING" },
    });
    const approved = await prisma.karobariCandidate.count({
      where: { status: "APPROVED" },
    });
    const rejected = await prisma.karobariCandidate.count({
      where: { status: "REJECTED" },
    });

    return NextResponse.json({
      stats: {
        total,
        pending,
        approved,
        rejected,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

