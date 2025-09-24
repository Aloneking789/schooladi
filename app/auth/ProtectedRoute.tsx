// app/auth/ProtectedRoute.tsx
import React, { useEffect, ReactNode } from "react";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";

interface ProtectedRouteProps {
  children: ReactNode;
  userType: "principal" | "teacher" | "student" | "parents";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const token = localStorage.getItem(`${userType}_token`);
    if (!token) {
      navigation.replace("Login"); // Navigate to login if no token
    }
  }, []);

  return <View style={{ flex: 1 }}>{children}</View>;
};

export default ProtectedRoute;
