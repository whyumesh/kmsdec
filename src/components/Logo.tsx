import React from "react";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
    const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-24 h-24",
        lg: "w-32 h-32",
        xl: "w-40 h-40",
    };

    const imageSizes = {
        sm: 64,
        md: 96,
        lg: 128,
        xl: 160,
    };

    const currentSize = imageSizes[size];

    return (
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200">
            <div className={`${className} flex items-center space-x-2`}>
                {/* First Logo */}
                <div className={`${sizeClasses[size]} relative`}>
                    <div className="w-full h-full rounded-full bg-white shadow-lg border-4 border-gray-200 flex items-center justify-center relative overflow-hidden">
                        <Image
                            src="/logo.jpg"
                            alt="KMS Election Logo"
                            width={currentSize}
                            height={currentSize}
                            className="rounded-full object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Second Logo */}
                <div className={`${sizeClasses[size]} relative`}>
                    <div className="w-full h-full rounded-full bg-white shadow-lg border-4 border-gray-200 flex items-center justify-center relative overflow-hidden">
                        <Image
                            src="/logo2.jpg"
                            alt="KMS Election Logo 2"
                            width={currentSize}
                            height={currentSize}
                            className="rounded-full object-cover"
                            priority
                        />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default Logo;
