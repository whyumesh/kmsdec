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

    // Fetch all karobari candidates
    const candidates = await prisma.karobariCandidate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        zone: true,
      },
    });

    return NextResponse.json({
      candidates: candidates.map((candidate) => {
        // Parse experience JSON to get additional details
        let experienceData = null;
        try {
          experienceData = candidate.experience
            ? JSON.parse(candidate.experience)
            : null;
        } catch (e) {
          console.error("Error parsing experience data:", e);
        }

        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          status: candidate.status,
          rejectionReason: candidate.rejectionReason,
          region: candidate.region,
          position: candidate.position,
          zone: candidate.zone?.name || "N/A",
          zoneId: candidate.zoneId,
          createdAt: candidate.createdAt,
          experience: experienceData,
          // Additional candidate details from experience JSON
          candidateDetails: experienceData?.candidateDetails || null,
          supporter: experienceData?.supporter || null,
          officeUse: experienceData?.officeUse || null,
          photoFileKey: experienceData?.photoFileKey || null,
        };
      }),
    });
  } catch (error) {
    console.error("Candidates fetch error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

