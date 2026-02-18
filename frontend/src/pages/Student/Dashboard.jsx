import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Dashboard.css";
import "./Dashboard-purchases.css";
import { fetchPublishedCourses, fetchMyCourses } from "../../utils/api";
import DiscussionForum from "../../components/DiscussionForum/DiscussionForum";
import MockTestPage from "./MockTests/MockTestPage";
import StudentLiveClasses from "./LiveClasses/StudentLiveClasses";
import { fetchLiveClasses } from "../../utils/liveClassesApi";


 import { Link } from "react-router-dom";
import {
  getCache as getLiveCache,
  setCache as setLiveCache,
  shouldRevalidate as shouldRevalidateLive,
} from "../../utils/liveClassesCache";
import NextStepCard from "../../components/Student/NextStep/NextStepCard";
import {
  FiHome,
  FiBook,
  FiVideo,
  FiEdit3,
  FiTarget,
  FiBarChart2,
  FiMessageCircle,
  FiDownload,
  FiCalendar,
  FiBell,
  FiUser,
  FiSearch,
  FiMenu,
  FiX,
  FiChevronDown,
  FiPlay,
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiLogOut,
  FiPhone,
} from "react-icons/fi";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import logo from "../../images/tgLOGO.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lmsMainRef = useRef(null);

  const getInitialSection = () => {
    const params = new URLSearchParams(location.search);
    return params.get("section") || "dashboard";
  };

  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(null);
  const [userDetails, setUserDetails] = useState({
    name: "Student",
    email: "student@example.com",
    profileImage: null,
    streak: 15,
    totalPoints: 2850,
  });
  const [myCourses, setMyCourses] = useState([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);
  const [courseProgress, setCourseProgress] = useState({});
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [liveSessions, setLiveSessions] = useState({ upcoming: [], past: [] });
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Dashboard metrics state (real data)
  const [dashboardMetrics, setDashboardMetrics] = useState({
    testsTaken: 0,
    completionRate: 0,
    learningProgress: [],
    coursesEnrolled: 0,
    streak: 0,
  });
  const [dashboardMetricsLoading, setDashboardMetricsLoading] = useState(false);
  const [courseProgressData, setCourseProgressData] = useState({
    courses: [],
    summary: {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      chartData: [0, 0, 100],
    },
  });
  const [courseProgressLoading, setCourseProgressLoading] = useState(false);

  // Sanitize/clean HTML descriptions from editor (e.g., remove ql-cursor span, tags -> text)
  const cleanHtmlToText = (html) => {
    try {
      const withoutCursor = String(html || "")
        .replace(/<span[^>]*class=["']?ql-[^>]*>.*?<\/span>/gi, "")
        .replace(/<br\s*\/?>(?=\s*<)/gi, "\n");
      const div = document.createElement("div");
      div.innerHTML = withoutCursor;
      const text = div.textContent || div.innerText || "";
      return text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    } catch (e) {
      return typeof html === "string"
        ? html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";
    }
  };

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const previewRef = useRef(null);

  // Payment History and Receipts state
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const purchasesLoadedRef = useRef(false);

  // Receipt view modal state
  const [viewReceiptModal, setViewReceiptModal] = useState(false);
  const [viewReceiptHtml, setViewReceiptHtml] = useState("");
  const [viewReceiptLoading, setViewReceiptLoading] = useState(false);

  // Offline payment upload state
  const [offlineForm, setOfflineForm] = useState({
    courseId: "",
    amount: "",
    note: "",
  });
  const [offlineFile, setOfflineFile] = useState(null);
  const [offlineUploading, setOfflineUploading] = useState(false);

  const onOfflineField = (k, v) =>
    setOfflineForm((prev) => ({ ...prev, [k]: v }));

  const submitOfflinePayment = async (e) => {
    e.preventDefault();
    if (!offlineForm.courseId || !offlineForm.amount || !offlineFile) return;
    try {
      setOfflineUploading(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth");
      const fd = new FormData();
      fd.append("courseId", offlineForm.courseId);
      fd.append("amount", String(Math.round(Number(offlineForm.amount) * 100)));
      if (offlineForm.note) fd.append("note", offlineForm.note);
      fd.append("slip", offlineFile);

      const resp = await fetch("/api/payments/offline/submit", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      const contentType = resp.headers.get("content-type") || "";
      let body = null;
      try {
        if (!resp.bodyUsed) {
          const respClone = resp.clone();
          if (contentType.includes("application/json"))
            body = await respClone.json();
          else body = await respClone.text();
        } else {
          try {
            if (contentType.includes("application/json"))
              body = await resp.json();
            else body = await resp.text();
          } catch (innerErr) {
            console.warn(
              "Response body already used and could not parse:",
              innerErr,
            );
            body = null;
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse response body:", parseErr);
        body = null;
      }

      if (!resp.ok) {
        const msg =
          body && body.message
            ? body.message
            : typeof body === "string"
              ? body
              : "Upload failed";
        console.error("offline submit failed:", resp.status, msg);
        alert(msg);
        return;
      }

      alert("Offline slip uploaded successfully — pending review");
      setOfflineForm({ courseId: "", amount: "", note: "" });
      setOfflineFile(null);
      // Refresh lists
      loadPaymentHistory();
    } catch (err) {
      console.error("offline submit error:", err);
      alert(err.message || "Upload failed");
    } finally {
      setOfflineUploading(false);
    }
  };

  // Study Materials state
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialFilters, setMaterialFilters] = useState({
    subject: "All Subjects",
    type: "All Types",
  });
  const [materialViewerOpen, setMaterialViewerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialViewerLoading, setMaterialViewerLoading] = useState(false);
  const [materialPdfUrl, setMaterialPdfUrl] = useState(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementFilters, setAnnouncementFilters] = useState({
    type: "all",
  });

  // Analytics state for Analysis & Reports
  const [analyticsData, setAnalyticsData] = useState({
    summary: null,
    attempts: [],
    performanceTrend: [],
    sectionAnalysis: [],
    userRank: null,
    totalParticipants: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedTestForLeaderboard, setSelectedTestForLeaderboard] =
    useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    city: "",
    targetExam: "CAT 2024",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const profileImageInputRef = useRef(null);

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedAuthToken = localStorage.getItem("authToken");

    if (storedUser && storedAuthToken) {
      setUserDetails({
        name: storedUser.name || "Student",
        email:
          storedUser.email || storedUser.phoneNumber || "student@example.com",
        profileImage: storedUser.profilePic || null,
        streak: 15,
        totalPoints: 2850,
      });

      // Also update profile form
      setProfileForm({
        name: storedUser.name || "",
        email: storedUser.email || "",
        phoneNumber: storedUser.phoneNumber || "",
        city: storedUser.city || "",
        targetExam: storedUser.selectedExam || "CAT 2024",
      });
    }
  }, []);

  // Profile update handler
  const handleProfileUpdate = async () => {
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Please login first!");
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch("/api/user/update-details", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.status || data.success || response.ok) {
        // Backend returns user in data.data, not data.user
        const userData = data.data || data.user || {};

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("user")) || {};
        const updatedUser = { ...storedUser, ...userData };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update state with null checking
        if (userData && Object.keys(userData).length > 0) {
          setUserDetails((prev) => ({
            ...prev,
            name: userData.name || prev.name,
            email: userData.email || prev.email,
            profileImage: userData.profilePic || prev.profileImage,
          }));
        }

        alert("Profile updated successfully!");
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Profile image upload handler
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      alert("Please login first!");
      return;
    }

    setProfileImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);

      const response = await fetch("/api/user/upload-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.status || data.success) {
        // Backend returns profilePic in data.profilePic
        const imageUrl =
          data.profilePic || data.url || (data.data && data.data.profilePic);

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("user")) || {};
        storedUser.profilePic = imageUrl;
        localStorage.setItem("user", JSON.stringify(storedUser));

        // Update state
        setUserDetails((prev) => ({
          ...prev,
          profileImage: imageUrl,
        }));

        alert("Profile picture updated!");
      } else {
        alert(data.msg || data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Profile image upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setProfileImageUploading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Function to load courses (can be called for retry)
  const loadCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);

    // Test API connectivity first
    try {
      console.log("🔍 Testing API connectivity...");
      const testResponse = await fetch("/api/test");
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log("✅ API test successful:", testData);
      } else {
        console.log("❌ API test failed:", testResponse.status);
      }
    } catch (testError) {
      console.log("❌ API test error:", testError);
    }

    try {
      const response = await fetchPublishedCourses();
      if (response.success) {
        setCourses(response.courses || []);
      } else {
        setCoursesError("Failed to load courses");
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      console.error("Full error object:", error);

      // Set a more user-friendly error message
      if (error.message.includes("Cannot connect")) {
        setCoursesError(
          "Unable to load courses at the moment. Please check your internet connection and try again.",
        );
      } else {
        setCoursesError(error.message || "Failed to load courses");
      }

      // Don't set fallback data here - let backend handle it
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Function to load user's enrolled courses
  const loadMyCourses = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠️ No auth token found. User not logged in.");
      setMyCourses([]);
      return;
    }

    setMyCoursesLoading(true);
    console.log("🔄 loadMyCourses: Starting to fetch courses...");

    try {
      // Use centralized API helper which handles auth headers and network errors
      const data = await fetchMyCourses();
      console.log("📦 My Courses Response:", data);

      // Handle different response formats
      let coursesArray = [];
      if (Array.isArray(data.courses)) {
        coursesArray = data.courses;
        console.log("✅ Using data.courses array");
      } else if (Array.isArray(data)) {
        coursesArray = data;
        console.log("✅ Using data as array");
      } else if (data.data && Array.isArray(data.data)) {
        coursesArray = data.data;
        console.log("✅ Using data.data array");
      } else if (Array.isArray(data.enrolledCourses)) {
        coursesArray = data.enrolledCourses;
        console.log("✅ Using data.enrolledCourses");
      } else if (Array.isArray(data.unlockedCourses)) {
        coursesArray = data.unlockedCourses;
        console.log("✅ Using data.unlockedCourses");
      } else {
        console.warn("⚠️ No courses array found in response:", data);
      }

      console.log("📚 Final courses array:", coursesArray);
      console.log("📊 Setting courses count:", coursesArray.length);
      setMyCourses(coursesArray);

      // Load progress for each enrolled course
      try {
        const token = localStorage.getItem("authToken");
        await Promise.all(
          coursesArray.map(async (enr) => {
            const courseId =
              enr.courseId && typeof enr.courseId === "object"
                ? enr.courseId._id
                : enr.courseId || enr._id;
            if (!courseId) return;
            try {
              const resp = await fetch(`/api/progress/course/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (resp.ok) {
                const d = await resp.json();
                const percent = d?.progress?.overallProgress ?? 0;
                setCourseProgress((prev) => ({
                  ...prev,
                  [courseId]: Number(percent),
                }));
              }
            } catch (_) {}
          }),
        );
      } catch (err) {
        console.warn("Failed to load course progress", err);
      }
    } catch (error) {
      console.error("❌ Error fetching my courses:", error);

      // Don't show demo courses as fallback to avoid enrollment conflicts
      console.error("❌ Failed to load my courses - showing empty state");
      setMyCourses([]);
    } finally {
      setMyCoursesLoading(false);
    }
  };

  // Load real dashboard metrics
  const loadDashboardMetrics = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setDashboardMetricsLoading(true);
    try {
      const response = await fetch("/api/user/student/dashboard/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDashboardMetrics(data.data);
          setUserDetails((prev) => ({
            ...prev,
            streak: data.data.streak || prev.streak,
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to load dashboard metrics:", error);
    } finally {
      setDashboardMetricsLoading(false);
    }
  };

  // Load real course progress data
  const loadCourseProgressData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setCourseProgressLoading(true);
    try {
      const response = await fetch(
        "/api/user/student/dashboard/course-progress",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCourseProgressData(data.data);
        }
      }
    } catch (error) {
      console.warn("Failed to load course progress:", error);
    } finally {
      setCourseProgressLoading(false);
    }
  };

  // Load real upcoming classes
  const loadRealUpcomingClasses = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const response = await fetch(
        "/api/user/student/dashboard/upcoming-classes",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUpcomingClasses(data.data);
        }
      }
    } catch (error) {
      console.warn("Failed to load upcoming classes:", error);
    }
  };

  // Fetch published courses on component mount
  useEffect(() => {
    loadCourses();
    loadMyCourses();
    loadDashboardMetrics();
    loadCourseProgressData();
    loadRealUpcomingClasses();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [location.search]);

  useEffect(() => {
    if (lmsMainRef.current) {
      lmsMainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    hydrateLiveClasses();
  }, [myCourses.length]);

  const hydrateLiveClasses = async () => {
    const scope = "student-dashboard";
    const cached = getLiveCache(scope);
    setUpcomingClasses((cached.items || []).slice(0, 5));
    if (shouldRevalidateLive(scope)) {
      try {
        const data = await fetchLiveClasses({ role: "student" });
        setLiveCache(scope, data, {});
        setUpcomingClasses((data || []).slice(0, 5));
      } catch (_) {
        // silent fail, keep cache
      }
    }
  };

  const loadLiveSessions = async () => {
    setLiveSessionsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const allUpcoming = [];
      const allPast = [];
      const now = new Date();

      const fetchPromises = myCourses.map(async (enr) => {
        const courseId =
          enr.courseId && typeof enr.courseId === "object"
            ? enr.courseId._id
            : enr.courseId || enr._id;
        const courseName = enr.courseId?.name || enr.name || "Course";
        if (!courseId) return;

        try {
          const resp = await fetch(
            `/api/live-batches/student/schedule?courseId=${courseId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.data) {
              (data.data.upcoming || []).forEach((s) =>
                allUpcoming.push({ ...s, courseName }),
              );
              (data.data.past || []).forEach((s) =>
                allPast.push({ ...s, courseName }),
              );
            }
          }
        } catch (_) {}
      });

      const liveClassPromise = fetch("/api/live-classes", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (resp) => {
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.items) {
              data.items.forEach((lc) => {
                const session = {
                  _id: lc._id,
                  topic: lc.title,
                  date: lc.startTime,
                  startTime: new Date(lc.startTime).toLocaleTimeString(
                    "en-IN",
                    { hour: "2-digit", minute: "2-digit", hour12: false },
                  ),
                  endTime: new Date(lc.endTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }),
                  platform: lc.platform,
                  meetingLink: lc.joinLink,
                  courseName: lc.courseId?.name || "Live Class",
                  liveBatchId: {
                    name: lc.title,
                    subjectId: { name: lc.courseId?.name || "Live Class" },
                  },
                  description: lc.description,
                  status: lc.status,
                  isLiveClass: true,
                };
                const sessionEnd = new Date(lc.endTime);
                if (sessionEnd > now) {
                  allUpcoming.push(session);
                } else {
                  allPast.push(session);
                }
              });
            }
          }
        })
        .catch(() => {});

      await Promise.all([...fetchPromises, liveClassPromise]);

      allUpcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
      allPast.sort((a, b) => new Date(b.date) - new Date(a.date));

      setLiveSessions({ upcoming: allUpcoming, past: allPast });
    } catch (error) {
      console.error("Error loading live sessions:", error);
    } finally {
      setLiveSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveSessions();
  }, [myCourses]);

  const loadNotifications = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setNotificationsLoading(true);
    try {
      const resp = await fetch("/api/notifications?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Load Analytics Data for Analysis & Reports section
  const loadAnalyticsData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setAnalyticsLoading(true);
    try {
      const [summaryRes, sectionRes] = await Promise.all([
        fetch("/api/mock-tests/reports/summary", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/mock-tests/reports/section-analysis", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const summaryData = await summaryRes.json();
      const sectionData = await sectionRes.json();

      if (summaryData?.success) {
        setAnalyticsData((prev) => ({
          ...prev,
          summary: summaryData.summary,
          attempts: summaryData.attempts || [],
          performanceTrend: summaryData.performanceTrend || [],
        }));
      }

      if (sectionData?.success) {
        setAnalyticsData((prev) => ({
          ...prev,
          sectionAnalysis: sectionData.analysis || [],
          userRank: sectionData.userRank,
          totalParticipants: sectionData.totalParticipants || 0,
        }));
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load leaderboard for a specific test
  const loadLeaderboard = async (testId, testName) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setLeaderboardLoading(true);
    setSelectedTestForLeaderboard({ id: testId, name: testName });
    try {
      const resp = await fetch(
        `/api/mock-tests/reports/${testId}/leaderboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await resp.json();
      if (data?.success) {
        setLeaderboardData(data);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Load analytics when analysis section is active
  useEffect(() => {
    if (activeSection === "analysis") {
      loadAnalyticsData();
    }
  }, [activeSection]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const canJoinClass = (it) => {
    const now = new Date();
    const start = new Date(it.startTime);
    const end = new Date(it.endTime);
    return (
      now >= new Date(start.getTime() - 10 * 60000) &&
      now <= new Date(end.getTime() + 30 * 60000)
    );
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Handle payment success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showFromQuery =
      urlParams.get("showMyCourses") === "1" ||
      urlParams.get("showMyCourses") === "true";

    if (location.state?.showMyCourses || showFromQuery) {
      setActiveSection("my-courses"); // Navigate to My Courses section

      // Immediate refresh to show purchased course
      loadMyCourses();

      if (location.state?.refreshCourses || showFromQuery) {
        // Additional refresh after a delay to ensure data is updated
        setTimeout(() => {
          loadMyCourses();
          loadCourses(); // Also refresh available courses
        }, 1000);
      }

      // Clear the state and query param to prevent repeated refreshes
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (e) {
        // ignore
      }
    }

    if (location.state?.section === "mock-tests") {
      setActiveSection("mock-tests");
      if (location.state?.testId) {
        setTimeout(() => {
          const testElement = document.getElementById(
            `mock-test-${location.state.testId}`,
          );
          if (testElement) {
            testElement.scrollIntoView({ behavior: "smooth", block: "center" });
            testElement.style.boxShadow = "0 0 10px 3px rgba(37, 99, 235, 0.5)";
            setTimeout(() => {
              testElement.style.boxShadow = "";
            }, 2000);
          }
        }, 500);
      }
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (e) {
        // ignore
      }
    }
  }, [location.state]);

  // Removed periodic refresh - was causing infinite loop

  // Function to load payment history
  const loadPaymentHistory = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠�� No auth token found. Cannot load payment history.");
      setPaymentHistory([]);
      return;
    }

    setPaymentHistoryLoading(true);

    try {
      const response = await fetch("/api/user/payment/history", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Payment history API responded with status ${response.status}`,
        );
        setPaymentHistory([]);
        return;
      }

      const data = await response.json();
      console.log("📦 Payment History Response:", data);

      const payments = data.payments || data.data || [];
      if ((data.success || data.status) && Array.isArray(payments)) {
        setPaymentHistory(payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("❌ Error loading payment history:", error);
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  // Function to load receipts
  const loadReceipts = async () => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      console.warn("⚠️ No auth token found. Cannot load receipts.");
      setReceipts([]);
      return;
    }

    setReceiptsLoading(true);

    try {
      const response = await fetch("/api/user/receipts", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Receipts API responded with status ${response.status}`,
        );
        setReceipts([]);
        return;
      }

      const data = await response.json();
      console.log("📦 Receipts Response:", data);

      const receipts = data.receipts || data.data || [];
      if ((data.success || data.status) && Array.isArray(receipts)) {
        setReceipts(receipts);
      } else {
        setReceipts([]);
      }
    } catch (error) {
      console.error("❌ Error loading receipts:", error);
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  };

  // Function to download receipt
  const downloadReceipt = async (receiptId, format = "html") => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to download receipt");
      return;
    }

    try {
      const response = await fetch(
        `/api/user/receipt/${receiptId}/download?format=${format}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download receipt");
      }

      if (format === "html") {
        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === "text") {
        const text = await response.text();
        const blob = new Blob([text], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Failed to download receipt. Please try again.");
    }
  };

  // Function to view receipt inline in modal
  const viewReceipt = async (receiptId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to view receipt");
      return;
    }

    setViewReceiptLoading(true);
    setViewReceiptModal(true);
    setViewReceiptHtml("");

    try {
      const response = await fetch(
        `/api/user/receipt/${receiptId}/download?format=html`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load receipt");
      }

      const html = await response.text();
      setViewReceiptHtml(html);
    } catch (error) {
      console.error("Error viewing receipt:", error);
      alert("Failed to load receipt. Please try again.");
      setViewReceiptModal(false);
    } finally {
      setViewReceiptLoading(false);
    }
  };

  // Function to download PDF tax invoice
  const downloadTaxInvoice = async (paymentId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login to download invoice");
      return;
    }

    try {
      const response = await fetch(`/api/invoices/download/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TaxInvoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading tax invoice:", error);
      alert(
        error.message || "Failed to download tax invoice. Please try again.",
      );
    }
  };

  // Preview: open and load overview
  const openPreview = async (course) => {
    try {
      setPreviewOpen(true);
      setPreviewLoading(true);
      const resp = await fetch(
        `/api/courses/student/published-courses/${course._id}`,
      );
      if (resp.ok) {
        const d = await resp.json();
        setPreviewData(d.course || course);
      } else {
        setPreviewData(course);
      }
    } catch (_) {
      setPreviewData(course);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const downloadOverviewPdf = async () => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let y = 10;
    if (imgHeight <= pageHeight - 20) {
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
    } else {
      let hLeft = imgHeight;
      let position = 10;
      const imgHeightPx = canvas.height;
      const pageHeightPx = ((pageHeight - 20) * canvas.width) / imgWidth;
      let sY = 0;
      while (hLeft > 0) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageHeightPx, imgHeightPx - sY);
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          sY,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          canvas.width,
          pageCanvas.height,
        );
        const pageImg = pageCanvas.toDataURL("image/png");
        if (position !== 10) pdf.addPage();
        pdf.addImage(
          pageImg,
          "PNG",
          10,
          10,
          imgWidth,
          (pageCanvas.height * imgWidth) / canvas.width,
        );
        hLeft -= pageHeightPx;
        sY += pageHeightPx;
        position = 20;
      }
    }
    const fname = (previewData?.name || "course-overview")
      .replace(/\s+/g, "-")
      .toLowerCase();
    pdf.save(`${fname}-overview.pdf`);
  };

  // Handle demo purchase for testing
  const handleDemoPurchase = async (course) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
      alert("Please login first!");
      return;
    }

    try {
      // Simulate payment verification directly
      const response = await fetch("/api/user/payment/verify-and-unlock", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: "demo_order_" + Date.now(),
          razorpay_payment_id: "demo_payment_" + Date.now(),
          razorpay_signature: "demo_signature",
          courseId: course._id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Demo course purchased successfully!");
        // Refresh my courses
        setTimeout(() => {
          loadMyCourses();
          setActiveSection("my-courses"); // Switch to My Courses
        }, 1000);
      } else {
        alert("❌ Demo purchase failed: " + data.message);
      }
    } catch (error) {
      console.error("Demo purchase error:", error);
      alert("❌ Demo purchase error: " + error.message);
    }
  };

  // Handle enrollment with authentication check
  const handleEnrollNow = async (course) => {
    const authToken = localStorage.getItem("authToken");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    // Check if user is logged in
    if (!authToken || !storedUser) {
      // Store course details for after login
      localStorage.setItem("pendingCourse", JSON.stringify(course));
      alert("Please login to enroll in this course!");
      navigate("/login");
      return;
    }

    try {
      // Check if already enrolled
      const response = await fetch("/api/user/student/my-courses", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Checking enrollment for course:", course._id);
        console.log("📚 User enrolled courses:", data.courses);

        // Fix: Compare against courseId._id (populated course object) not c._id (enrollment ID)
        // Also filter out demo enrollments with fake IDs
        const realEnrollments = (data.courses || []).filter(
          (c) => c._id && !c._id.toString().startsWith("demo_"),
        );

        const alreadyEnrolled =
          course &&
          realEnrollments.some((c) => {
            const enrolledCourseId =
              (c.courseId && c.courseId._id) || c.courseId;
            const matches =
              enrolledCourseId &&
              enrolledCourseId.toString() === course._id.toString();
            console.log(
              `📋 Comparing ${enrolledCourseId} with ${course._id}: ${matches}`,
            );
            return matches;
          });

        console.log("✅ Final enrollment check result:", alreadyEnrolled);

        if (alreadyEnrolled) {
          alert("✅ You are already enrolled in this course!");
          setActiveSection("my-courses"); // Switch to My Courses section
          return;
        }
      }

      // Navigate to course purchase page with dynamic route
      navigate(`/course-purchase/${course._id}`, {
        state: {
          ...course,
          price: course.price || 30000,
          oldPrice: course.oldPrice || 120000,
          features: [
            "Complete CAT preparation material",
            "Live interactive classes",
            "Mock tests and practice sets",
            "Doubt clearing sessions",
            "Performance analysis",
            "Study materials download",
          ],
        },
      });
    } catch (error) {
      console.error("Error checking enrollment:", error);
      // If there's an error, still allow to proceed to purchase
      navigate(`/course-purchase/${course._id}`, {
        state: {
          ...course,
          price: course.price || 30000,
          oldPrice: course.oldPrice || 120000,
          features: [
            "Complete CAT preparation material",
            "Live interactive classes",
            "Mock tests and practice sets",
            "Doubt clearing sessions",
            "Performance analysis",
            "Study materials download",
          ],
        },
      });
    }
  };

  // Load study materials
  const loadStudyMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const authToken = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        ...(materialFilters.subject !== "All Subjects" && {
          subject: materialFilters.subject,
        }),
        ...(materialFilters.type !== "All Types" && {
          type: materialFilters.type,
        }),
      });

      const headers = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if we have a valid token
      if (authToken && authToken !== "null" && authToken !== "undefined") {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `/api/study-materials/student?${queryParams}`,
        {
          headers,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStudyMaterials(data.data);
          console.log("✅ Study materials loaded:", data.data.length);
        } else {
          console.error("❌ Failed to load study materials:", data.message);
          setStudyMaterials([]);
        }
      } else {
        console.error("❌ Study materials API error:", response.status);
        setStudyMaterials([]);
      }
    } catch (error) {
      console.error("❌ Error loading study materials:", error);
      setStudyMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // Handle material view
  const handleViewMaterial = async (material) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken || authToken === "null" || authToken === "undefined") {
      alert("Please login to view study materials!");
      navigate("/login");
      return;
    }

    setSelectedMaterial(material);
    setMaterialViewerOpen(true);
    setMaterialViewerLoading(true);

    try {
      // Fetch the PDF with auth headers and convert to blob URL for iframe
      const response = await fetch(
        `/api/study-materials/view/${material._id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setMaterialPdfUrl(url);
      } else {
        console.error("Failed to load material");
        alert("Failed to load material. Please try again.");
        setMaterialViewerOpen(false);
      }
    } catch (error) {
      console.error("Error loading material:", error);
      alert("Error loading material. Please try again.");
      setMaterialViewerOpen(false);
    } finally {
      setMaterialViewerLoading(false);
    }
  };

  const closeMaterialViewer = () => {
    setMaterialViewerOpen(false);
    setMaterialPdfUrl(null);
    setSelectedMaterial(null);
  };

  // Load announcements
  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const authToken = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        ...(announcementFilters.type !== "all" && {
          type: announcementFilters.type,
        }),
        limit: 20,
      });

      const headers = {
        "Content-Type": "application/json",
      };

      // Only add Authorization header if we have a valid token
      if (authToken && authToken !== "null" && authToken !== "undefined") {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `/api/announcements/student?${queryParams}`,
        {
          headers,
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.data);
          console.log("✅ Announcements loaded:", data.data.length);
        } else {
          console.error("❌ Failed to load announcements:", data.message);
          setAnnouncements([]);
        }
      } else {
        console.error("❌ Announcements API error:", response.status);
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("❌ Error loading announcements:", error);
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // Mark announcement as read
  const markAnnouncementAsRead = async (announcementId) => {
    const authToken = localStorage.getItem("authToken");

    if (!authToken || authToken === "null" || authToken === "undefined") {
      return; // Skip if no auth token
    }

    try {
      await fetch(`/api/announcements/mark-read/${announcementId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("❌ Error marking announcement as read:", error);
    }
  };

  // Load study materials when filters change
  useEffect(() => {
    if (activeSection === "materials") {
      loadStudyMaterials();
    }
  }, [materialFilters, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load announcements when filters change
  useEffect(() => {
    if (activeSection === "announcements") {
      loadAnnouncements();
    }
  }, [announcementFilters, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load purchases data when purchases section becomes active
  useEffect(() => {
    if (activeSection === "purchases" && !purchasesLoadedRef.current) {
      purchasesLoadedRef.current = true;
      loadPaymentHistory();
      loadReceipts();
    } else if (activeSection !== "purchases") {
      purchasesLoadedRef.current = false;
    }
  }, [activeSection]);

  // Helper functions for announcements
  const getAnnouncementIcon = (type) => {
    switch (type) {
      case "important":
        return "🚨";
      case "update":
        return "📢";
      case "reminder":
        return "⏰";
      case "maintenance":
        return "🔧";
      default:
        return "📄";
    }
  };

  const formatAnnouncementDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: FiHome },
    { id: "courses", label: "Available Courses", icon: FiBook },
    { id: "my-courses", label: "My Courses", icon: FiBook },
    { id: "live-classes", label: "Live Classes", icon: FiVideo },
    // { id: 'practice-tests', label: 'Practice Tests', icon: FiEdit3 },
    { id: "mock-tests", label: "Mock Tests", icon: FiTarget },
    { id: "analysis", label: "Analysis", icon: FiBarChart2 },
    { id: "doubts", label: "Doubts & Discussions", icon: FiMessageCircle },
    { id: "materials", label: "Study Materials", icon: FiDownload },
    // { id: 'schedule', label: 'Schedule', icon: FiCalendar },
    { id: "announcements", label: "Announcements", icon: FiBell },
    { id: "purchases", label: "Purchase History", icon: FiFileText },
    { id: "profile", label: "Profile", icon: FiUser },
  ];

  const renderPurchasesContent = () => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount / 100);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const getStatusColor = (status) => {
      switch (status) {
        case "paid":
          return "#27ae60";
        case "created":
          return "#f39c12";
        case "failed":
          return "#e74c3c";
        default:
          return "#7f8c8d";
      }
    };

    return (
      
      <div className="purchases-content">

        <div className="section-header">
          <h2>Purchase History</h2>
          <p>View your course purchases and download receipts</p>
        </div>

        <div className="purchases-section">

          <div className="section-title">
            <h3>Payment History</h3>
            {paymentHistoryLoading && (
              <span className="loading-indicator">Loading...</span>
            )}
          </div>

          <form className="offline-upload" onSubmit={submitOfflinePayment}>
            <div className="upload-row">


              <div className="upload-field">
                <label>Course</label>
                <select
                  value={offlineForm.courseId}
                  onChange={(e) => onOfflineField("courseId", e.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>



              <div className="upload-field">
                <label>Amount (INR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offlineForm.amount}
                  onChange={(e) => onOfflineField("amount", e.target.value)}
                />
              </div>




              <div className="upload-field">
                <label>Slip Photo</label>
                <input
                  type="file"
                  accept="image/*" />
                    </div>





                    <span className="progress-text">
                      {Math.round(courseProgress[course._id] || 0)}% Complete
                    </span>
                  </div>
</form>


                  <div className="course-actions">
                    <button
                      className="continue-btn primary"
                      onClick={() => {
                        if (course && course._id) {
                          navigate(`/student/course-content/${course._id}`);
                        } else {
                          console.error("Course ID not found:", course);
                        }
                      }}
                    >
                      <FiPlay /> Continue Learning
                    </button>
                  </div>

                </div>
               );
          
      
      
    </div>
  );

  const renderCoursesContent = () => (
    <div className="courses-content">
      <div className="section-header">
        <h2>Available Courses</h2>
        <div className="filter-buttons">
          <button className="filter-btn active">All Courses</button>
          <button className="filter-btn">Popular</button>
          <button className="filter-btn">Newest</button>
        </div>
      </div>

      {coursesLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading courses...</p>
        </div>
      ) : coursesError ? (
        <div className="error-state">
          <p className="error-message">⚠️ {coursesError}</p>
          <button
            className="retry-btn"
            onClick={loadCourses}
            disabled={coursesLoading}
          >
            {coursesLoading ? "Retrying..." : "Retry"}
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <FiBook className="empty-icon" />
          <h3>No courses available</h3>
          <p>Check back later for new courses!</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course._id} className="course-card">
              <div className="course-thumbnail">
                {course.thumbnail &&
                course.thumbnail !== "default-course.jpg" ? (
                  <img
                    src={`/uploads/${course.thumbnail}`}
                    alt={course.name}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="course-thumbnail-placeholder"
                  style={
                    course.thumbnail &&
                    course.thumbnail !== "default-course.jpg"
                      ? { display: "none" }
                      : {}
                  }
                >
                  <FiBook />
                </div>
              </div>
              <div className="course-details">
                <div className="course-header">
                  <h3>{course.name}</h3>
                  <span className="price-badge">
                    ₹{course.price?.toLocaleString("en-IN") || "Free"}
                  </span>
                </div>
                <p className="course-description">
                  {cleanHtmlToText(course.description) ||
                    "No description available"}
                </p>
                <div className="course-actions">
                  <button
                    className="enroll-btn"
                    onClick={() => handleEnrollNow(course)}
                  >
                    <FiPlay /> Enroll Now
                  </button>
                  <button
                    className="preview-btn"
                    onClick={() => openPreview(course)}
                  >
                    <FiEye /> Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLiveClassesContent = () => {
    return <StudentLiveClasses />;
  };

  const renderPracticeTestsContent = () => (
    <div className="practice-tests-content">
      <div className="section-header">
        <h2>Practice Tests</h2>
        <div className="test-filters">
          <select className="filter-select">
            <option>All Subjects</option>
            <option>Quantitative Aptitude</option>
            <option>Verbal Ability</option>
            <option>Data Interpretation</option>
          </select>
        </div>
      </div>

      <div className="tests-grid">
        {[
          {
            subject: "Quantitative Aptitude",
            tests: 25,
            attempted: 18,
            accuracy: 78,
          },
          { subject: "Verbal Ability", tests: 20, attempted: 15, accuracy: 82 },
          {
            subject: "Data Interpretation",
            tests: 18,
            attempted: 12,
            accuracy: 75,
          },
          {
            subject: "Logical Reasoning",
            tests: 22,
            attempted: 10,
            accuracy: 80,
          },
        ].map((test, index) => (
          <div key={index} className="test-subject-card">
            <div className="test-header">
              <h3>{test.subject}</h3>
              <span className="accuracy-badge">{test.accuracy}%</span>
            </div>
            <div className="test-stats">
              <div className="stat">
                <span className="stat-number">{test.tests}</span>
                <span className="stat-label">Total Tests</span>
              </div>
              <div className="stat">
                <span className="stat-number">{test.attempted}</span>
                <span className="stat-label">Attempted</span>
              </div>
              <div className="stat">
                <span className="stat-number">{test.accuracy}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
            </div>
            <button className="start-test-btn">Start Practice</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMockTestsContent = () => <MockTestPage />;

  const renderAnalysisContent = () => {
    const {
      summary,
      attempts,
      performanceTrend,
      sectionAnalysis,
      userRank,
      totalParticipants,
    } = analyticsData;
    const percentile =
      totalParticipants > 0 && userRank
        ? ((1 - userRank / totalParticipants) * 100).toFixed(1)
        : 0;

    if (analyticsLoading) {
      return (
        <div className="analysis-content">
          <div
            className="loading-state"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
            }}
          >
            <div className="loading-spinner"></div>
            <p style={{ marginLeft: "10px" }}>Loading your analytics...</p>
          </div>
        </div>
      );
    }

    return (

      <>
      <div className="analysis-content">
        <div className="section-header">
          <h2>Analysis & Reports</h2>
          <button
            className="refresh-btn"
            onClick={loadAnalyticsData}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              background: "#667eea",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

       
          </div>

        </>
          
          )
 

        


     
  