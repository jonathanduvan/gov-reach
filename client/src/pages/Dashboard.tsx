import { useEffect, useState } from "react";

interface User {
    name: string;
    email: string;
}

const Dashboard = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch("http://localhost:5000/user", { credentials: "include" })
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(() => setUser(null));
    }, []);

    return (
        <div>
            {user ? (
                <div>
                    <h1>Welcome, {user.name}</h1>
                    <p>Your email: {user.email}</p>
                    <a href="http://localhost:5000/logout">
                        <button>Logout</button>
                    </a>
                </div>
            ) : (
                <p>Loading user info...</p>
            )}
        </div>
    );
};

export default Dashboard;
