import { useEffect, useState } from "react";
import SendEmail from "../components/SendEmail";
import { API_BASE_URL } from "../config";

interface User {
    name: string;
    email: string;
    provider: "gmail" | "outlook";
}

const Dashboard = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/user`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                setUser(data);
            })
            .catch(() => setUser(null));
    }, []);

    const handleLogout = async () => {
        await fetch(`${API_BASE_URL}/logout`, { credentials: "include" });
        window.location.href = "/";
    };

    return (
        <div>
            {user ? (
                <div>
                    <h1>Welcome, {user.name}</h1>
                    <p>Your email: {user.email}</p>
                    <button onClick={handleLogout}>Logout</button>

                    <h3>Email Provider: {user.provider.toUpperCase()}</h3>

                    {/* Pass detected provider to SendEmail component */}
                    <SendEmail provider={user.provider} />
                </div>
            ) : (
                <p>Loading user info...</p>
            )}
        </div>
    );
};

export default Dashboard;
