import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("candidate-token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized - Please login first" },
                { status: 401 }
            );
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (jwtError) {
            return NextResponse.json(
                { error: "Invalid token - Please login again" },
                { status: 401 }
            );
        }

        const candidateId = decoded.candidateId;
        console.log("Checking rejection status for candidate ID:", candidateId);

        // Check if candidate has been rejected in any of the candidate tables
        const [yuvaPankhCandidate, karobariCandidate, trusteeCandidate] = await Promise.all([
            prisma.yuvaPankhCandidate.findFirst({
                where: {
                    userId: candidateId,
                    status: 'REJECTED'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.karobariCandidate.findFirst({
                where: {
                    userId: candidateId,
                    status: 'REJECTED'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.trusteeCandidate.findFirst({
                where: {
                    userId: candidateId,
                    status: 'REJECTED'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        const rejectedCandidate = yuvaPankhCandidate || karobariCandidate || trusteeCandidate;

        console.log("Rejection check results:", {
            candidateId,
            yuvaPankhFound: !!yuvaPankhCandidate,
            karobariFound: !!karobariCandidate,
            trusteeFound: !!trusteeCandidate,
            rejectedCandidateFound: !!rejectedCandidate
        });

        if (!rejectedCandidate) {
            console.log("No rejected candidate found for user:", candidateId);
            return NextResponse.json({
                isRejected: false,
                message: "No rejected nomination found"
            });
        }

        console.log("Found rejected candidate:", {
            userId: rejectedCandidate.userId,
            candidateId,
            email: rejectedCandidate.email,
            phone: rejectedCandidate.phone,
            rejectionReason: rejectedCandidate.rejectionReason
        });

        // CRITICAL: Double-check that the rejected candidate belongs to the current user
        if (rejectedCandidate.userId !== candidateId) {
            console.error("Security issue: Rejected candidate doesn't belong to current user", {
                rejectedCandidateUserId: rejectedCandidate.userId,
                currentUserId: candidateId
            });
            return NextResponse.json({
                isRejected: false,
                message: "No rejected nomination found for current user"
            });
        }

        // Parse the stored JSON data
        let experienceData = null;
        let educationData = null;

        try {
            experienceData = rejectedCandidate.experience
                ? JSON.parse(rejectedCandidate.experience)
                : null;
        } catch (error) {
            experienceData = rejectedCandidate.experience;
        }

        try {
            educationData = rejectedCandidate.education
                ? JSON.parse(rejectedCandidate.education)
                : null;
        } catch (error) {
            educationData = rejectedCandidate.education;
        }

        // Extract candidate details from the stored data
        const candidateDetails = {
            candidateName: experienceData?.candidateName || rejectedCandidate.name?.split(' ')[0] || "",
            candidateSurname: experienceData?.candidateSurname || rejectedCandidate.name?.split(' ').slice(1).join(' ') || "",
            candidateFatherSpouse: experienceData?.fatherSpouse || "",
            aliasNickname: experienceData?.alias || "",
            permanentAddress: experienceData?.address || "",
            gender: educationData?.gender || "",
            birthDate: educationData?.birthDate || "",
            mobileNumber: rejectedCandidate.phone || rejectedCandidate.user?.phone || "",
            emailId: rejectedCandidate.email || rejectedCandidate.user?.email || "",
            zone: rejectedCandidate.zoneId || "",
        };

        // Extract proposer details
        const proposerDetails = educationData?.proposerDetails || {};

        return NextResponse.json({
            isRejected: true,
            rejectionReason: rejectedCandidate.rejectionReason,
            candidateDetails,
            proposerDetails: {
                proposerName: proposerDetails.name?.split(' ')[0] || "",
                proposerSurname: proposerDetails.name?.split(' ').slice(1).join(' ') || "",
                proposerFatherSpouse: proposerDetails.fatherSpouse || "",
                proposerAddress: proposerDetails.address || "",
                proposerBirthDate: proposerDetails.birthDate || "",
                proposerMobile: proposerDetails.mobile || "",
                proposerEmail: proposerDetails.email || "",
                proposerZone: proposerDetails.zone || "",
            },
            // Don't include file URLs - candidate must upload again
            message: "Previous nomination was rejected. Please review and resubmit."
        });

    } catch (error) {
        console.error("Error checking rejected candidate:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
