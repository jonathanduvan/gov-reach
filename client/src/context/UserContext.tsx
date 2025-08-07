// src/context/UserContext.tsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  isAdmin: boolean;
  isPartner: boolean;
  isContributor: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  isAdmin: false,
  isPartner: false,
  isContributor: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
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
  }, []);
    // development fallback: if you want to force a user locally, uncomment:
    // useEffect(() => {
    //   if (!user && !loading) {
    //     setUser({
    //       id: "dev-admin",
    //       name: "Dev Admin",
    //       email: "dev@local",
    //       provider: "gmail",
    //       role: "admin",
    //     });
    //   }
    // }, [user, loading]);

    useEffect(() => {
        fetchUser();
    }, []);

    const isAdmin = user?.role === "admin";
    const isPartner = user?.role === "partner";
    const isContributor = user?.role === "contributor";
    return (
        <UserContext.Provider
        value={{
            user,
            loading,
            refreshUser: fetchUser,
            isAdmin,
            isPartner,
            isContributor,
        }}
        >
        {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);