// src/context/UserContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

export interface User {
    name: string;
    email: string;
    provider: "gmail" | "outlook";
    role: "admin" | "partner" | "contributor" | "user";
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    refreshUser: async () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/user`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Unauthorized");
            const data = await res.json();
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);