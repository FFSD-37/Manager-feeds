import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_MANAGER_API || "http://localhost:3001";

const TAB_CONFIG = {
  users: [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "channels", label: "Channels" },
  ],
  posts: [
    { id: "overview", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "moderation", label: "Moderation" },
  ],
  "feedback and revenue": [
    { id: "overview", label: "Overview" },
    { id: "feedback", label: "Feedback" },
    { id: "revenue", label: "Revenue" },
  ],
};

const TYPE_LABEL = {
  users: "Users Manager",
  posts: "Posts Manager",
  "feedback and revenue": "Feedback and Revenue Manager",
};

const REPORT_ID_LABEL = {
  1: "Normal/Kids Account",
  2: "Channel Account",
  3: "Normal/Kids Post",
  4: "Channel Post",
  5: "Normal Chat",
  6: "Channel Chat",
};

const normalizeManagerType = (rawType) => {
  if (!rawType) return "users";

  if (["users", "user", "kids", "channel", "channels"].includes(rawType)) {
    return "users";
  }
  if (["posts", "post"].includes(rawType)) {
    return "posts";
  }
  if (["feedback and revenue", "feedback_revenue", "revenue"].includes(rawType)) {
    return "feedback and revenue";
  }

  return "users";
};

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [overview, setOverview] = useState({
    usersCount: 0,
    usersPreview: [],
    channelsPreview: [],
    reports: null,
    content: null,
    revenue: 0,
    feedbackCount: 0,
  });

  const [reports, setReports] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [payments, setPayments] = useState([]);

  const [postId, setPostId] = useState("");
  const [removeReason, setRemoveReason] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportPost, setSelectedReportPost] = useState(null);
  const [reportOverlayOpen, setReportOverlayOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userOverlayOpen, setUserOverlayOpen] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [banReason, setBanReason] = useState("");

  const managerType = normalizeManagerType(me?.managerType);

  const tabs = useMemo(() => {
    return TAB_CONFIG[managerType] || TAB_CONFIG.users;
  }, [managerType]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  async function checkAuth() {
    try {
      const data = await api("/auth/status");
      setIsAuthenticated(Boolean(data?.isAuthenticated));
      setMe(data?.user || null);
    } catch {
      setIsAuthenticated(false);
      setMe(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await checkAuth();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage("");
    try {
      await api("/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setMe(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadOverview() {
    if (managerType === "users") {
      const [countData, usersData, channelsData] = await Promise.all([
        api("/home/getUserCount"),
        api("/home/getUsers"),
        api("/home/getChannels"),
      ]);

      setOverview((prev) => ({
        ...prev,
        usersCount: countData.count || 0,
        usersPreview: usersData.data || [],
        channelsPreview: channelsData.data || [],
      }));
      return;
    }

    if (managerType === "posts") {
      const [reportData, contentData] = await Promise.all([
        api("/home/reportData"),
        api("/home/contentActivityToday"),
      ]);

      setOverview((prev) => ({
        ...prev,
        reports: reportData.data || null,
        content: contentData.data || null,
      }));
      return;
    }

    const [revenueData, feedbackCountData] = await Promise.all([
      api("/home/getRevenue"),
      api("/home/getFeedbackCount"),
    ]);

    setOverview((prev) => ({
      ...prev,
      revenue: revenueData.rev || 0,
      feedbackCount: feedbackCountData.count || 0,
    }));
  }

  async function loadUsers() {
    const data = await api("/user/list");
    setUsers(data.data || []);
  }

  async function loadChannels() {
    const data = await api("/channel/list");
    setChannels(data.allchannels || []);
  }

  async function loadReports() {
    const data = await api("/report/list");
    setReports(data.reports || []);
  }

  async function openReportOverlay(reportId) {
    setBusy(true);
    setMessage("");
    try {
      const data = await api(`/report/${reportId}/details`);
      setSelectedReport(data.report || null);
      setSelectedReportPost(data.post || null);
      setReportOverlayOpen(true);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeReportOverlay() {
    setSelectedReport(null);
    setSelectedReportPost(null);
    setReportOverlayOpen(false);
  }

  async function updateReport(reportId, status) {
    setBusy(true);
    setMessage("");
    try {
      await api("/report/updateReportStatus", {
        method: "POST",
        body: JSON.stringify({ reportId, status }),
      });
      setMessage("Report status updated.");
      await loadReports();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removePostById(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/post/${postId.trim()}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: removeReason }),
      });
      setMessage("Post removed successfully.");
      setPostId("");
      setRemoveReason("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadFeedbacks() {
    const data = await api("/feedback/list");
    setFeedbacks(data.feedbacks || []);
  }

  async function loadRevenue() {
    const [revData, paymentsData] = await Promise.all([
      api("/home/getRevenue"),
      api("/payment/list"),
    ]);
    setOverview((prev) => ({ ...prev, revenue: revData.rev || 0 }));
    setPayments(paymentsData.payments || []);
  }

  async function openUserOverlay(user) {
    setBusy(true);
    setMessage("");
    try {
      setSelectedUser(user);
      const postsData = await api(`/moderation/user/${user.username}/posts`);
      setUserPosts(postsData.posts || []);
      setUserOverlayOpen(true);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeUserOverlay() {
    setSelectedUser(null);
    setUserPosts([]);
    setWarnReason("");
    setBanReason("");
    setUserOverlayOpen(false);
  }

  async function warnUser() {
    if (!selectedUser || !warnReason.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/user/${selectedUser.username}/warn`, {
        method: "POST",
        body: JSON.stringify({ reason: warnReason }),
      });
      setMessage("User warning recorded.");
      setWarnReason("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function banUser() {
    if (!selectedUser || !banReason.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/moderation/user/${selectedUser.username}/ban`, {
        method: "POST",
        body: JSON.stringify({ reason: banReason }),
      });
      setMessage("User ban action recorded.");
      setBanReason("");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadByTab(tabId) {
    setBusy(true);
    setMessage("");
    try {
      if (tabId === "overview") await loadOverview();
      if (tabId === "users") await loadUsers();
      if (tabId === "channels") await loadChannels();
      if (tabId === "reports") await loadReports();
      if (tabId === "feedback") await loadFeedbacks();
      if (tabId === "revenue") await loadRevenue();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [tabs, activeTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadByTab(activeTab);
  }, [activeTab, isAuthenticated, managerType]);

  if (!authChecked) {
    return <div className="loading-screen">Checking manager session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-shell">
        <div className="auth-orb auth-orb-a" />
        <div className="auth-orb auth-orb-b" />
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-title-wrap">
            <p className="eyebrow">Feeds Platform</p>
            <h1>Manager Control Desk</h1>
            <p>Sign in to access your assigned manager modules.</p>
          </div>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
          {loginError ? <div className="error-text">{loginError}</div> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-grid">
        <aside className="sidebar">
          <div className="brand">
            <p className="eyebrow">Manager Portal</p>
            <h2>Operational Hub</h2>
          </div>

          <div className="profile-box">
            <div className="avatar">{String(me?.username || "M").charAt(0).toUpperCase()}</div>
            <div>
              <strong>{me?.username || "Manager"}</strong>
              <p>{me?.email || "No email"}</p>
              <span className="type-chip">{TYPE_LABEL[managerType]}</span>
            </div>
          </div>

          <nav className="nav-list" aria-label="Manager modules">
            {tabs.map((tab) => (
              <button key={tab.id} className={activeTab === tab.id ? "nav-btn active" : "nav-btn"} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </nav>

          <button className="logout-btn" onClick={handleLogout} disabled={busy}>Logout</button>
        </aside>

        <main className="panel">
          <header className="panel-header">
            <div>
              <h1>{tabs.find((t) => t.id === activeTab)?.label || "Dashboard"}</h1>
              <p>{TYPE_LABEL[managerType]} workspace</p>
            </div>
            <button className="refresh-btn" onClick={() => loadByTab(activeTab)} disabled={busy}>{busy ? "Refreshing..." : "Refresh"}</button>
          </header>

          {message ? <div className="banner">{message}</div> : null}

          {activeTab === "overview" && managerType === "users" && (
            <section className="kpi-grid two-col">
              <article className="kpi-card">
                <h3>Total Managed Entities</h3>
                <p className="kpi-main">{overview.usersCount}</p>
                <p>Normal users + kids + channels</p>
              </article>
              <article className="kpi-card">
                <h3>Quick Preview</h3>
                <p>Users: {overview.usersPreview.length}</p>
                <p>Channels: {overview.channelsPreview.length}</p>
              </article>
            </section>
          )}

          {activeTab === "overview" && managerType === "posts" && (
            <section className="kpi-grid">
              <article className="kpi-card">
                <h3>Report Queue</h3>
                <p className="kpi-main">{overview.reports?.total ?? 0}</p>
                <p>Pending: {overview.reports?.pending ?? 0}</p>
                <p>Resolved Today: {overview.reports?.resolvedToday ?? 0}</p>
              </article>
              <article className="kpi-card">
                <h3>Content Today</h3>
                <p>Posts: {overview.content?.postsToday ?? 0}</p>
                <p>Reels: {overview.content?.reelsToday ?? 0}</p>
                <p>Stories: {overview.content?.storiesToday ?? 0}</p>
              </article>
            </section>
          )}

          {activeTab === "overview" && managerType === "feedback and revenue" && (
            <section className="kpi-grid two-col">
              <article className="kpi-card">
                <h3>Total Revenue</h3>
                <p className="kpi-main">INR {Number(overview.revenue || 0).toLocaleString()}</p>
              </article>
              <article className="kpi-card">
                <h3>Feedback Tickets</h3>
                <p className="kpi-main">{overview.feedbackCount}</p>
              </article>
            </section>
          )}

          {activeTab === "users" && (
            <section className="users-management">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search by username, email, name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <span className="result-count">{filteredUsers.length} users</span>
              </div>
              <div className="cards-list">
                {filteredUsers.map((u) => (
                  <article key={u._id} className="info-card user-card" onClick={() => openUserOverlay(u)}>
                    <strong>{u.username || "Unnamed"}</strong>
                    <p>{u.fullName || "-"}</p>
                    <p>{u.email || "-"}</p>
                    <p>Type: {u.type || "Normal"}</p>
                  </article>
                ))}
                {!filteredUsers.length ? <p className="empty">No users found.</p> : null}
              </div>
            </section>
          )}

          {activeTab === "channels" && (
            <section className="cards-list">
              {channels.map((c) => (
                <article key={c._id} className="info-card">
                  <strong>{c.channelName || "Unnamed channel"}</strong>
                  <p>{c.channelDescription || "-"}</p>
                  <p>Category: {Array.isArray(c.channelCategory) ? c.channelCategory.join(", ") : "-"}</p>
                </article>
              ))}
              {!channels.length ? <p className="empty">No channels found.</p> : null}
            </section>
          )}

          {activeTab === "reports" && (
            <section className="table-wrap">
              <div className="table-head table-row">
                <span>Report #</span>
                <span>Reported By</span>
                <span>Type</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {reports.map((r) => (
                <div className="table-row" key={r._id}>
                  <span>#{r.report_number || "-"}</span>
                  <span>{r.user_reported || "-"}</span>
                  <span>{REPORT_ID_LABEL[r.report_id] || `ID ${r.report_id || "-"}`}</span>
                  <span>
                    <span className={r.status === "Resolved" ? "pill done" : "pill pending"}>{r.status || "Pending"}</span>
                  </span>
                  <span className="btn-row">
                    <button onClick={() => openReportOverlay(r._id)} disabled={busy}>View</button>
                    <button onClick={() => updateReport(r._id, "Pending")} disabled={busy}>Pending</button>
                    <button onClick={() => updateReport(r._id, "Resolved")} disabled={busy}>Resolve</button>
                  </span>
                </div>
              ))}
              {!reports.length ? <p className="empty">No reports found.</p> : null}
            </section>
          )}

          {activeTab === "moderation" && (
            <section className="moderation-card">
              <h3>Remove Post</h3>
              <p>Enter Mongo post _id and reason.</p>
              <form className="mod-form" onSubmit={removePostById}>
                <input type="text" placeholder="Post _id" value={postId} onChange={(e) => setPostId(e.target.value)} required />
                <textarea placeholder="Reason" value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
                <button type="submit" disabled={busy}>{busy ? "Removing..." : "Remove Post"}</button>
              </form>
            </section>
          )}

          {activeTab === "feedback" && (
            <section className="cards-list">
              {feedbacks.map((f) => (
                <article key={f._id} className="info-card">
                  <strong>{f.name || "Unknown"}</strong>
                  <p>{f.email || "-"}</p>
                  <p>{f.subject || "-"}</p>
                  <p>{f.message || "-"}</p>
                </article>
              ))}
              {!feedbacks.length ? <p className="empty">No feedback found.</p> : null}
            </section>
          )}

          {activeTab === "revenue" && (
            <section className="table-wrap">
              <div className="table-head table-row revenue-row">
                <span>Payment Id</span>
                <span>User</span>
                <span>Status</span>
                <span>Amount</span>
              </div>
              {payments.map((p) => (
                <div className="table-row revenue-row" key={p._id}>
                  <span>{p.paymentId || p._id || "-"}</span>
                  <span>{p.username || p.user || "-"}</span>
                  <span><span className={p.status === "Completed" ? "pill done" : "pill pending"}>{p.status || "Pending"}</span></span>
                  <span>INR {Number(p.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              {!payments.length ? <p className="empty">No payments found.</p> : null}
            </section>
          )}
        </main>
      </div>

      {reportOverlayOpen ? (
        <div className="overlay-backdrop" onClick={closeReportOverlay}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3>Report Details</h3>
              <button className="overlay-close" onClick={closeReportOverlay}>Close</button>
            </div>
            <div className="overlay-grid">
              <div>
                <p><strong>Report #:</strong> {selectedReport?.report_number || "-"}</p>
                <p><strong>Status:</strong> {selectedReport?.status || "-"}</p>
                <p><strong>Report ID:</strong> {selectedReport?.report_id || "-"}</p>
                <p><strong>Type:</strong> {REPORT_ID_LABEL[selectedReport?.report_id] || "-"}</p>
                <p><strong>Reason:</strong> {selectedReport?.reason || "-"}</p>
                <p><strong>Scope:</strong> {selectedReport?.scopeType || "-"}</p>
              </div>
              <div>
                {selectedReport?.post_id === "On account" ? (
                  <div className="overlay-empty">Account-level report. No post preview.</div>
                ) : selectedReportPost?.url ? (
                  <div className="overlay-media-wrap">
                    {selectedReportPost?.type === "Reels" ? (
                      <video src={selectedReportPost.url} controls className="overlay-media" />
                    ) : (
                      <img src={selectedReportPost.url} alt="Reported post" className="overlay-media" />
                    )}
                    <p><strong>Author:</strong> {selectedReportPost?.author || "-"}</p>
                    <p><strong>Post ID:</strong> {selectedReportPost?.id || "-"}</p>
                    <p><strong>Content:</strong> {selectedReportPost?.content || "-"}</p>
                  </div>
                ) : (
                  <div className="overlay-empty">Post preview unavailable.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {userOverlayOpen ? (
        <div className="overlay-backdrop" onClick={closeUserOverlay}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h3>User Detail: {selectedUser?.username || "-"}</h3>
              <button className="overlay-close" onClick={closeUserOverlay}>Close</button>
            </div>
            <div className="overlay-grid">
              <div>
                <p><strong>Name:</strong> {selectedUser?.fullName || "-"}</p>
                <p><strong>Email:</strong> {selectedUser?.email || "-"}</p>
                <p><strong>Type:</strong> {selectedUser?.type || "-"}</p>
                <p><strong>Visibility:</strong> {selectedUser?.visibility || "-"}</p>
                <textarea placeholder="Warn reason" value={warnReason} onChange={(e) => setWarnReason(e.target.value)} />
                <button onClick={warnUser} disabled={busy}>Warn User</button>
                <textarea placeholder="Ban reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
                <button onClick={banUser} disabled={busy}>Ban User</button>
              </div>
              <div>
                <h4>Recent Posts</h4>
                <div className="cards-list">
                  {userPosts.map((p) => (
                    <article key={p._id || p.id} className="info-card">
                      <strong>{p.type || "Post"}</strong>
                      <p>{p.content || "-"}</p>
                      <p>Likes: {p.likes || 0}</p>
                    </article>
                  ))}
                  {!userPosts.length ? <p className="empty">No posts found.</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
