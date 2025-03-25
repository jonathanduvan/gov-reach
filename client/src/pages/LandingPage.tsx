// src/pages/LandingPage.tsx
import { Link } from "react-router-dom";

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-md w-full">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    ⚡ Flash Activist
                </h1>
                <p className="text-gray-700 dark:text-gray-300 mb-8">
                    Take action instantly. Flash Activist lets you send powerful, personalized messages to public officials — without needing to know who to contact. All from your own email.
                </p>

                <div className="space-y-4 mb-6">
                    <a
                        href="https://flashactivist.us/auth/google"
                        className="block w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 font-semibold py-2 rounded shadow"
                    >
                        Login with Google
                    </a>
                    <a
                        href="https://flashactivist.us/auth/microsoft"
                        className="block w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2 rounded shadow"
                    >
                        Login with Microsoft
                    </a>
                </div>

                <hr className="border-gray-300 dark:border-gray-700 my-6" />

                <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">Are you part of an organization?</p>
                    <Link
                        to="/partner"
                        className="inline-block text-blue-600 hover:underline font-medium"
                    >
                        Submit a campaign request →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
