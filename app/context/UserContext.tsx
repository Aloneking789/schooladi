
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
type UserRole = "teacher" | "student" | "principal" | "parents";

export interface User {
  role: UserRole;
  [key: string]: any; // Add other user fields as needed
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});


export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUserState(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to load user from storage', e);
      }
    };
    loadUser();
  }, []);

  // Save user to AsyncStorage whenever it changes
  const setUser = async (user: User | null) => {
    setUserState(user);
    try {
      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem('user');
      }
    } catch (e) {
      console.error('Failed to save user to storage', e);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easier usage
export const useUser = () => useContext(UserContext);

export { UserContext };