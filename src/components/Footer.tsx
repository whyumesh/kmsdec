import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <p className="text-sm text-gray-600">
                        <Link 
                            href="https://www.teamfullstack.in" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                            Developed by{" "}
                            <span className="font-semibold">
                                Parth Piyush Gagdani
                            </span>
                            ,{" "}
                            <span className="font-semibold">
                                Team FullStack
                            </span>
                            , Thane
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}
