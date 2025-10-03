import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import Navbar from "./Navbar";
import BottomBar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

type UserRole = "teacher" | "student" | "principal" | "parents";

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const Roledata = await AsyncStorage.getItem("role");
      setUser(Roledata ? JSON.parse(Roledata) : null);
    };
    fetchUser();
  }, []);

  const toggleSidebar = () => setSidebarVisible((prev) => !prev);
  const closeSidebar = () => setSidebarVisible(false);

  const userType: UserRole = user;

  // ensure Navbar is treated as a component that accepts the toggleSidebar prop
  const NavbarTyped = Navbar as React.ComponentType<{ toggleSidebar: () => void }>;

  return (
    <View style={styles.container}>
      <StatusBar 
        hidden={true}
        translucent={false}
        showHideTransition="fade"
      />
      <NavbarTyped toggleSidebar={toggleSidebar} />
      <View style={styles.content}>{children}</View>
      {/* Always show bottom bar at the bottom */}
      {userType && <BottomBar userType={userType} />}
    </View>
  );
};

export default Layout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f8f8",
    minHeight: "100%",
    paddingTop: 0,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1,
  },
  fullSidebar: {
    position: "absolute",
    top: 0, left: 0, bottom: 0, right: 0,
    backgroundColor: "#c84141ff",
    zIndex: 2,
    width: "100%",
    height: "100%",
    elevation: 5,
  },
});
