import React, { useState, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";
import axios from "../../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import TGLOGO from "../../images/tgLOGO.png";
import "./MobileLogin.css";

const MobileLogin = ({ isOpen, onClose, setUser }) => {
  const [step, setStep] = useState("mobile"); // mobile, otp, existing
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef([]);

  const navigate = useNavigate();

  const handleClose = () => {
    setStep("mobile");
    setPhoneNumber("");
    setOtp(["", "", "", "", "", "", ""]);
    setError("");
    setIsNewUser(false);
    setResendTimer(0);
    onClose();
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber) {
      setError("Please enter your mobile number");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setIsLoading(true);
    try {
      // Check if user exists first
      const userResponse = await axios.post("/api/auth/phone/check-user", {
        phoneNumber
      });

      const userExists = userResponse.data.exists;
      setIsNewUser(!userExists);

      if (userExists) {
        // Existing user - send OTP for login
        const response = await axios.post("/api/auth/phone/send-otp", {
          phoneNumber
        });
        setStep("otp");
        startResendTimer();
      } else {
        // New user - redirect to signup with mobile number
        navigate("/signup", { state: { phoneNumber } });
        handleClose();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to process. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits of OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/api/auth/phone/mobileVerify-otp", {
        phoneNumber,
        otpCode: otpString
      });

      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (setUser && typeof setUser === 'function') {
        setUser(response.data.user);
      }

      // For existing users, go directly to dashboard
      // For new users, go to user-details (though this case shouldn't happen with current flow)
      if (!isNewUser) {
        navigate("/student/dashboard");
      } else {
        navigate("/user-details");
      }
      
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid OTP. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      await axios.post("/api/auth/phone/send-otp", {
        phoneNumber
      });
      startResendTimer();
      setError("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to resend OTP. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDontHaveAccount = () => {
    navigate("/user-details");
    handleClose();
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("mobile");
      setOtp("");
      setError("");
      setResendTimer(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-login-overlay" onClick={handleClose}>
      <div className="mobile-login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mobile-login-close" onClick={handleClose}>
          <X size={24} />
        </button>

        {step === "existing" && (
          <div className="existing-user-message">
            <h3>Account Already Exists</h3>
            <p>This mobile number is already registered. Please login with OTP.</p>
            <button onClick={() => setStep("otp")} className="btn-orange">
              Login with OTP
            </button>
          </div>
        )}

        {step !== "existing" && (
          <>
            <div className="mobile-login-left">
              <div className="mobile-login-logo">
                <img src={TGLOGO} alt="TathaGat Logo" />
                <p className="mobile-login-tagline">
                  Access Your Personalized <br />
                  <strong>Dashboard</strong> –{" "}
                  <span>
                    Where Preparation
                    <br />
                    Meets Performance.
                  </span>
                </p>
              </div>
            </div>

            <div className="mobile-login-right">
              {step === "mobile" && (
                <div className="mobile-login-form">
                  <div className="mobile-login-header">
                    {step !== "mobile" && (
                      <button className="back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                      </button>
                    )}
                    <h2>{isNewUser ? "Create Account" : "Welcome Back"}</h2>
                    <p>{isNewUser ? "Sign up with your mobile number" : "Login with your mobile number"}</p>
                  </div>

                  <form onSubmit={handleMobileSubmit}>
                    <div className="input-group">
                      <input
                        type="tel"
                        placeholder="Mobile Number"
                        className="mobile-input"
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhoneNumber(val);
                        }}
                        maxLength={10}
                      />
                    </div>

                    {error && (
                      <div className="error-message">
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="mobile-login-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </form>

                  <div className="mobile-login-footer">
                    <p>
                      {isNewUser ? "Already have an account?" : "Don't have an account?"}{" "}
                      <button 
                        className="link-btn" 
                        onClick={handleDontHaveAccount}
                      >
                        {isNewUser ? "Login" : "Sign Up"}
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {step === "otp" && (
                <div className="mobile-login-form">
                  <div className="mobile-login-header">
                    <button className="back-btn" onClick={handleBack}>
                      <ArrowLeft size={20} />
                    </button>
                    <h2>Enter OTP</h2>
                    <p>We've sent a 6-digit code to {phoneNumber.slice(0, 5)}XXXXX</p>
                  </div>

                  <form onSubmit={handleOtpSubmit}>
                    <div className="otp-input-container">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          type="text"
                          className="otp-digit-input"
                          maxLength={1}
                          value={otp[index] || ''}
                          onChange={(e) => handleOtpChange(e, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                          ref={(el) => {
                            if (el) {
                              otpInputRefs.current[index] = el;
                            }
                          }}
                        />
                      ))}
                    </div>

                    {error && (
                      <div className="error-message">
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="mobile-login-btn"
                      disabled={isLoading || otp.join("").length !== 6}
                    >
                      {isLoading ? "Verifying..." : "Verify & Login"}
                    </button>

                    <div className="resend-section">
                      <p>Didn't receive the code?</p>
                      <button
                        type="button"
                        className="resend-btn"
                        onClick={handleResendOtp}
                        disabled={resendTimer > 0 || isLoading}
                      >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileLogin;
