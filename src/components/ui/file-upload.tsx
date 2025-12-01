"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    className?: string;
}

export function FileUpload({
    onFileSelect,
    accept,
    className,
}: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                } ${className}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileInput}
                className="hidden"
            />

            <div className="space-y-2">
                <Upload className="h-8 w-8 text-gray-500 mx-auto" />
                <div className="text-gray-700">
                    <p className="text-sm">
                        Drag and drop a file here, or{" "}
                        <button
                            type="button"
                            onClick={openFileDialog}
                            className="text-blue-600 hover:text-blue-700 underline"
                        >
                            browse
                        </button>
                    </p>
                    {accept && (
                        <p className="text-xs text-gray-500 mt-1">
                            Accepted formats: {accept}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
