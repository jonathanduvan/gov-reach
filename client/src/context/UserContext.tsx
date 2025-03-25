// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect } from "react";

type Mode = "public" | "partner" | "embed";

export const UserContext = createContext<{
    user: any;
    setUser: (user: any) => void;
    mode: Mode;
    setMode: (mode: Mode) => void;
    partner?: string;
    setPartner: (partner: string) => void;
}>({
    user: null,
    setUser: () => { },
    mode: "public",
    setMode: () => { },
    setPartner: () => { }
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [mode, setMode] = useState<Mode>("public");
    const [partner, setPartner] = useState<string | undefined>(undefined);

    return (
        <UserContext.Provider value={{ user, setUser, mode, setMode, partner, setPartner }}>
            {children}
        </UserContext.Provider>
    );
};
