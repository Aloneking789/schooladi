import React, { useState, useEffect } from "react";
import { View, StyleSheet, Modal, TouchableWithoutFeedback, StatusBar } from "react-native";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  return (
    <View style={styles.container}>
      <StatusBar 
        hidden={true}
        translucent={false}
        showHideTransition="fade"
      />
      <Navbar toggleSidebar={toggleSidebar} />
      <View style={styles.content}>{children}</View>
      <Modal
        visible={isSidebarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSidebar}
      >
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <View style={styles.fullSidebar}>
          <Sidebar
            isExpanded={true}
            toggleSidebar={closeSidebar}
            userType={userType}
          />
        </View>
      </Modal>
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
    backgroundColor: "#fff",
    zIndex: 2,
    width: "100%",
    height: "100%",
    elevation: 5,
  },
});
