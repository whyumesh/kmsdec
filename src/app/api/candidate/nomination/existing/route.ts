import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { handleError } from "@/lib/error-handler";

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("candidate-token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized - Please login first" },
                { status: 401 },
            );
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (jwtError) {
            return NextResponse.json(
                { error: "Invalid token - Please login again" },
                { status: 401 },
            );
        }

        // Get the most recent Yuva Pankh nomination for this candidate
        const nomination = await prisma.yuvaPankhCandidate.findFirst({
            where: { userId: decoded.userId },
            orderBy: { createdAt: "desc" },
        });

        if (!nomination) {
            return NextResponse.json(
                { error: "No existing nomination found" },
                { status: 404 },
            );
        }

        // Parse the stored JSON data
        let experienceData: any = {};
        let educationData: any = {};
        
        try {
            experienceData = nomination.experience ? JSON.parse(nomination.experience) : {};
            educationData = nomination.education ? JSON.parse(nomination.education) : {};
        } catch (error) {
            console.error("Error parsing nomination data:", error);
            // Continue with empty objects if parsing fails
        }

        // Extract candidate details from the stored data
        const candidateName = nomination.name ? nomination.name.split(' ')[0] : '';
        const candidateSurname = nomination.name ? nomination.name.split(' ').slice(1).join(' ') : '';
        
        const response = {
            candidateDetails: {
                candidateName,
                candidateSurname,
                candidateFatherSpouse: experienceData?.fatherSpouse || '',
                aliasNickname: experienceData?.alias || '',
                permanentAddress: experienceData?.address || '',
                gender: educationData?.gender || '',
                birthDate: educationData?.birthDate || '',
                mobileNumber: nomination.phone || '',
                emailId: nomination.email || '',
                zone: nomination.zoneId || '',
            },
            proposerDetails: {
                proposerName: educationData?.proposerDetails?.name ? 
                    educationData.proposerDetails.name.split(' ')[0] : '',
                proposerSurname: educationData?.proposerDetails?.name ? 
                    educationData.proposerDetails.name.split(' ').slice(1).join(' ') : '',
                proposerFatherSpouse: educationData?.proposerDetails?.fatherSpouse || '',
                proposerAddress: educationData?.proposerDetails?.address || '',
                proposerBirthDate: educationData?.proposerDetails?.birthDate || '',
                proposerMobile: educationData?.proposerDetails?.mobile || '',
                proposerEmail: educationData?.proposerDetails?.email || '',
                proposerZone: '', // This might need to be stored separately
            },
            fileUrls: {
                candidateAadhaarUrl: experienceData?.filePaths?.candidateAadhaar || '',
                candidatePhotoUrl: experienceData?.filePaths?.candidatePhoto || '',
                proposerAadhaarUrl: experienceData?.filePaths?.proposerAadhaar || '',
            },
            nominationId: nomination.id,
            status: nomination.status,
            rejectionReason: nomination.rejectionReason,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching existing nomination data:", error);
        return handleError(error, {
            endpoint: request.nextUrl.pathname,
            method: request.method,
        });
    }
}
