import React, { useState } from "react";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ForgotPasswordPage from "./ForgotPassword";
import Loader from "../components/Loader";
import { useAuth } from "../contexts/AuthContext";

const AuthPages = () => {
  // Remove onLogin prop since AuthContext handles it
  const [currentPage, setCurrentPage] = useState("login");
  const { isLoading } = useAuth();

  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "login":
        // Remove onLogin prop - LoginPage will use AuthContext directly
        return <LoginPage onNavigate={handleNavigation} />;
      case "register":
        return <RegisterPage onNavigate={handleNavigation} />;
      case "forgot":
        return <ForgotPasswordPage onNavigate={handleNavigation} />;
      default:
        return <LoginPage onNavigate={handleNavigation} />;
    }
  };

  return (
    <div>
      {renderCurrentPage()}
      <Loader loading={isLoading} />
    </div>
  );
};

export default AuthPages;
