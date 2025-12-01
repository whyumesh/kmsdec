import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken, JWTError } from "@/lib/jwt";
import { handleError } from "@/lib/error-handler";

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("candidate-token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (jwtError) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 },
            );
        }

        // Get candidate's nomination from all candidate tables
        let yuvaPankhNomination = null;
        let karobariNomination = null;
        let trusteeNomination = null;

        try {
            [yuvaPankhNomination, karobariNomination, trusteeNomination] = await Promise.all([
                prisma.yuvaPankhCandidate.findFirst({
                    where: { userId: decoded.userId },
                    orderBy: { createdAt: "desc" },
                }),
                prisma.karobariCandidate.findFirst({
                    where: { userId: decoded.userId },
                    orderBy: { createdAt: "desc" },
                }),
                prisma.trusteeCandidate.findFirst({
                    where: { userId: decoded.userId },
                    orderBy: { createdAt: "desc" },
                })
            ]);
        } catch (dbError) {
            console.error("Database query error in candidate dashboard:", dbError);
            // Continue with null values if database query fails
        }

        // Find the most recent nomination
        const nominations = [yuvaPankhNomination, karobariNomination, trusteeNomination].filter(Boolean);
        const nomination = nominations.length > 0 
            ? nominations.reduce((latest, current) => 
                current && latest ? (new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest) : latest || current
              )
            : null;

        if (!nomination) {
            return NextResponse.json({ nomination: null });
        }

        // Parse the detailed nomination data from JSON fields
        let experienceData: any = {};
        let educationData: any = {};

        try {
            if (nomination.experience) {
                experienceData = JSON.parse(nomination.experience);
            }
            if (nomination.education) {
                educationData = JSON.parse(nomination.education);
            }
        } catch (parseError) {
            console.error("Error parsing nomination data:", parseError);
            // Continue with empty objects if parsing fails
        }

        // Get file keys from nomination record (prefer fileKeys, fallback to filePaths for backward compatibility)
        const fileKeys = experienceData?.fileKeys || experienceData?.filePaths || {};
        
        // Retrieve files from UploadedFile table and generate fresh URLs
        let filePaths: any = {};
        
        try {
            // Get all uploaded files for this user
            const uploadedFiles = await prisma.uploadedFile.findMany({
                where: {
                    userId: decoded.userId,
                    fileType: {
                        in: ['aadhaar', 'photo', 'proposer_aadhaar']
                    }
                },
                orderBy: {
                    uploadedAt: 'desc'
                }
            });

            // Map file types to fileKeys
            const fileTypeMap: { [key: string]: string } = {
                'aadhaar': 'candidateAadhaar',
                'photo': 'candidatePhoto',
                'proposer_aadhaar': 'proposerAadhaar'
            };

            // Return fileKeys (not URLs) so frontend can generate fresh URLs on demand
            for (const file of uploadedFiles) {
                const fileKey = fileKeys[fileTypeMap[file.fileType]] || file.filePath;
                if (fileKey) {
                    // If it's a URL, try to extract the fileKey
                    if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
                        const keyMatch = fileKey.match(/nominations\/[^?]+/);
                        if (keyMatch) {
                            filePaths[fileTypeMap[file.fileType]] = keyMatch[0];
                        } else {
                            // Keep as is if we can't extract
                            filePaths[fileTypeMap[file.fileType]] = fileKey;
                        }
                    } else {
                        // Already a fileKey
                        filePaths[fileTypeMap[file.fileType]] = fileKey;
                    }
                } else {
                    filePaths[fileTypeMap[file.fileType]] = '';
                }
            }

            // If no files found in UploadedFile, use fileKeys from nomination (legacy support)
            if (Object.keys(filePaths).length === 0) {
                filePaths = { ...fileKeys };
            }
        } catch (fileError) {
            console.error("Error retrieving files from database:", fileError);
            // Fallback to stored filePaths from nomination
            filePaths = { ...fileKeys };
        }

        const jsonResponse = NextResponse.json({
            nomination: {
                id: nomination.id,
                name: nomination.name || "",
                position: nomination.position || "",
                region: nomination.region || "",
                status: nomination.status || "PENDING",
                submittedAt: nomination.createdAt ? nomination.createdAt.toISOString() : new Date().toISOString(),
                rejectionReason: nomination.rejectionReason || null,
                // Detailed form data
                candidateDetails: {
                    name: nomination.name || "",
                    email: nomination.email || "",
                    phone: nomination.phone || "",
                    fatherSpouse: experienceData?.fatherSpouse || "",
                    alias: experienceData?.alias || "",
                    address: experienceData?.address || "",
                    gender: educationData?.gender || "",
                    birthDate: educationData?.birthDate || "",
                    filePaths: filePaths,
                },
                proposerDetails: educationData?.proposerDetails || {},
            },
        });
        
        // Add cache control headers to prevent caching
        jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        jsonResponse.headers.set('Pragma', 'no-cache');
        jsonResponse.headers.set('Expires', '0');
        jsonResponse.headers.set('Surrogate-Control', 'no-store');
        
        return jsonResponse;
    } catch (error) {
        return handleError(error, {
            endpoint: request.nextUrl.pathname,
            method: request.method,
        });
    }
}
