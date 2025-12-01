import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/error-handler";

// Helper function to calculate age from DOB
function calculateAge(dob: string): number {
    const [day, month, year] = dob.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const voter = await prisma.voter.findUnique({
            where: { id: params.id },
        });

        if (!voter) {
            return NextResponse.json(
                { error: "Voter not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ voter });
    } catch (error) {
        return handleError(error, {
            endpoint: request.nextUrl.pathname,
            method: request.method,
        });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { 
            isActive, 
            name, 
            gender, 
            dob, 
            age, 
            email, 
            mulgam, 
            phone, 
            regionKarobari,
            regionYuvaPankh,
            regionTrustee
        } = body;

        // Check if voter exists
        const existingVoter = await prisma.voter.findUnique({
            where: { id: params.id },
        });

        if (!existingVoter) {
            return NextResponse.json(
                { error: "Voter not found" },
                { status: 404 }
            );
        }

        // Check for duplicate phone or voterId if they're being updated
        if (phone && phone !== existingVoter.phone) {
            const duplicatePhone = await prisma.voter.findFirst({
                where: { phone, id: { not: params.id } },
            });
            if (duplicatePhone) {
                return NextResponse.json(
                    { error: "Phone number already exists" },
                    { status: 400 }
                );
            }
        }


        // Calculate age if DOB is provided
        let calculatedAge = age;
        if (dob && dob !== existingVoter.dob) {
            calculatedAge = calculateAge(dob);
        }

        // Update voter
        const updatedVoter = await prisma.voter.update({
            where: { id: params.id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(name && { name }),
                ...(gender !== undefined && { gender }),
                ...(dob !== undefined && { dob }),
                ...(calculatedAge !== undefined && { age: calculatedAge }),
                ...(email !== undefined && { email }),
                ...(mulgam !== undefined && { mulgam }),
                ...(phone && { phone }),
                ...(regionKarobari !== undefined && { regionKarobari }),
                ...(regionYuvaPankh !== undefined && { regionYuvaPankh }),
                ...(regionTrustee !== undefined && { regionTrustee }),
            },
        });

        return NextResponse.json({
            message: "Voter updated successfully",
            voter: updatedVoter,
        });
    } catch (error) {
        return handleError(error, {
            endpoint: request.nextUrl.pathname,
            method: request.method,
        });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check if voter exists
        const existingVoter = await prisma.voter.findUnique({
            where: { id: params.id },
        });

        if (!existingVoter) {
            return NextResponse.json(
                { error: "Voter not found" },
                { status: 404 }
            );
        }

        // Check if voter has voted
        if (existingVoter.hasVoted) {
            return NextResponse.json(
                { error: "Cannot delete voter who has already voted" },
                { status: 400 }
            );
        }

        // Delete voter
        await prisma.voter.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            message: "Voter deleted successfully",
        });
    } catch (error) {
        return handleError(error, {
            endpoint: request.nextUrl.pathname,
            method: request.method,
        });
    }
}
