"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

function getItemId(item, tab) {
  if (!item) return null;
  if (tab === "matches") return item.match_id;
  if (tab === "teams") return item.team_id;
  if (tab === "players") return item.player_id;
  return null;
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("matches"); // "matches" | "teams" | "players"
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Audit Logs & Analytics States
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Options for dropdowns (teams, seasons)
  const [options, setOptions] = useState({ teams: [], seasons: [] });

  // Form State for editing or creating
  const [formData, setFormData] = useState({});

  // Load dropdown options
  const loadOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/options");
      if (res.ok) {
        const data = await res.json();
        setOptions({
          teams: data.teams || [],
          seasons: data.seasons || [],
        });
      }
    } catch (err) {
      console.error("Failed to load admin options:", err);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOptions();
  }, [isAdmin, loadOptions]);

  const selectItem = useCallback((item, tab = activeTab) => {
    setIsCreating(false);
    setSelectedItem(item);
    setConfirmDeleteId(null);
    setStatusMessage({ type: "", text: "" });
    if (tab === "matches") {
      setFormData({
        home_score: item.home_score ?? 0,
        away_score: item.away_score ?? 0,
        status: item.status || "FT",
        venue: item.venue || "",
        match_date: item.match_date ? new Date(item.match_date).toISOString().slice(0, 16) : "",
        home_possession: item.home_possession ?? 50,
        away_possession: item.away_possession ?? 50,
      });
    } else if (tab === "teams") {
      setFormData({
        name: item.name || "",
        short_name: item.short_name || "",
        stadium_name: item.stadium_name || "",
        manager_name: item.manager_name || "",
        history: item.history || "",
        logo_url: item.logo_url || "",
      });
    } else if (tab === "players") {
      setFormData({
        first_name: item.first_name || "",
        last_name: item.last_name || "",
        primary_position: item.primary_position || "",
        nationality: item.nationality || "",
        date_of_birth: item.date_of_birth ? new Date(item.date_of_birth).toISOString().slice(0, 10) : "",
        market_value_euros: item.market_value_euros ?? "",
        weight_cm: item.weight_cm ?? "",
        photo_url: item.photo_url || "",
        team_id: item.team_id ?? (options.teams[0]?.team_id || ""),
      });
    }
  }, [activeTab, options.teams]);

  // Start Creation Mode
  const startCreating = useCallback(() => {
    setIsCreating(true);
    setSelectedItem(null);
    setConfirmDeleteId(null);
    setStatusMessage({ type: "", text: "" });

    if (activeTab === "matches") {
      setFormData({
        home_team_id: options.teams[0]?.team_id || "",
        away_team_id: options.teams[1]?.team_id || options.teams[0]?.team_id || "",
        season_id: options.seasons[0]?.season_id || "",
        home_score: "",
        away_score: "",
        status: "UPCOMING",
        venue: "",
        match_date: new Date().toISOString().slice(0, 16),
        home_possession: "",
        away_possession: "",
      });
    } else if (activeTab === "teams") {
      setFormData({
        name: "",
        short_name: "",
        stadium_name: "",
        manager_name: "",
        history: "",
        logo_url: "",
      });
    } else if (activeTab === "players") {
      setFormData({
        first_name: "",
        last_name: "",
        primary_position: "",
        nationality: "",
        date_of_birth: "",
        market_value_euros: "",
        weight_cm: "",
        photo_url: "",
        team_id: options.teams[0]?.team_id || "",
      });
    }
  }, [activeTab, options]);

  // Fetch items based on activeTab and search
  const fetchItems = useCallback(async () => {
    if (!isAdmin || activeTab === "audit" || activeTab === "analytics") return;
    try {
      setLoadingItems(true);
      const res = await fetch(`/api/admin/search?type=${activeTab}&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setItems(results);
        if (results.length > 0 && !isCreating) {
          setSelectedItem((current) => {
            if (!current || !results.some(r => getItemId(r, activeTab) === getItemId(current, activeTab))) {
              selectItem(results[0], activeTab);
              return results[0];
            }
            return current;
          });
        } else if (!isCreating) {
          setSelectedItem(null);
          setFormData({});
        }
      }
    } catch (err) {
      console.error("Failed to load admin items:", err);
    } finally {
      setLoadingItems(false);
    }
  }, [activeTab, searchQuery, isAdmin, selectItem, isCreating]);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingAudit(true);
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [isAdmin]);

  const fetchAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data.analytics || null);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "analytics") {
      fetchAnalytics();
    } else {
      fetchItems();
    }
  }, [activeTab, fetchItems, fetchAuditLogs, fetchAnalytics]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: "", text: "" });

    try {
      if (isCreating) {
        // CREATE RECORD VIA POST
        const res = await fetch(`/api/admin/${activeTab}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatusMessage({
            type: "error",
            text: data.error || `Failed to create new ${activeTab.slice(0, -1)} in PostgreSQL database.`,
          });
        } else {
          const createdEntity = data.match || data.team || data.player;
          const newId = getItemId(createdEntity, activeTab);
          setStatusMessage({
            type: "success",
            text: `New ${activeTab.slice(0, -1).toUpperCase()} ID #${newId} successfully created in PostgreSQL database!`,
          });

          // Prepend to items list and select it
          setItems((prev) => [createdEntity, ...prev]);
          setIsCreating(false);
          setSelectedItem(createdEntity);

          if (activeTab === "teams") {
            loadOptions();
          }
        }
      } else {
        // UPDATE RECORD VIA PUT
        if (!selectedItem) return;

        const id = getItemId(selectedItem, activeTab);
        const res = await fetch(`/api/admin/${activeTab}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatusMessage({
            type: "error",
            text: data.error || "Failed to update record in PostgreSQL database.",
          });
        } else {
          setStatusMessage({
            type: "success",
            text: `${activeTab.slice(0, -1).toUpperCase()} ID #${id} successfully updated in PostgreSQL database!`,
          });
          // Update item in local list
          setItems((prev) =>
            prev.map((item) => (getItemId(item, activeTab) === id ? { ...item, ...formData } : item))
          );

          if (activeTab === "teams") {
            loadOptions();
          }
        }
      }
    } catch (err) {
      console.error("Error saving record:", err);
      setStatusMessage({ type: "error", text: "Network error while saving to database." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    const id = getItemId(selectedItem, activeTab);
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!selectedItem) return;
    const id = getItemId(selectedItem, activeTab);
    setIsDeleting(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const res = await fetch(`/api/admin/${activeTab}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || `Failed to delete ${activeTab.slice(0, -1)} from PostgreSQL database.`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: data.message || `${activeTab.slice(0, -1).toUpperCase()} #${id} was permanently deleted from PostgreSQL database!`,
        });

        const remainingItems = items.filter(
          (item) => getItemId(item, activeTab) !== id
        );
        setItems(remainingItems);
        setConfirmDeleteId(null);

        if (remainingItems.length > 0) {
          selectItem(remainingItems[0], activeTab);
        } else {
          setSelectedItem(null);
          setFormData({});
        }

        if (activeTab === "teams") {
          loadOptions();
        }
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      setStatusMessage({
        type: "error",
        text: "Network error while deleting from database.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="admin-page">
        <p className="admin-loading">Checking administrator privileges...</p>
      </main>
    );
  }

  // Access Denied if not admin
  if (!user || !isAdmin) {
    return (
      <main className="admin-page">
        <div className="admin-denied-box">
          <div className="denied-icon"><Icon name="shield" /></div>
          <h2>Administrator Access Required</h2>
          <p>
            You must be logged in with an administrator account to view and modify the Scoreকত? PostgreSQL database.
          </p>
          <div className="denied-actions">
            <Link href="/login" className="admin-login-btn">
              Go to Admin Login
            </Link>
            <Link href="/" className="admin-home-btn">
              Return to Matches
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      {/* ADMIN HEADER */}
      <section className="admin-header-section">
        <div>
          <span className="admin-badge-pill"><Icon name="shield" /> PostgreSQL Administrator Portal</span>
          <h1>Database Management Console</h1>
          <p>Direct SQL modification and record creation access for matches, teams, and players</p>
        </div>

        <div className="admin-user-tag">
          <span>Logged in as:</span>
          <strong>@{user.username} (Admin)</strong>
        </div>
      </section>

      {/* ADMIN TABS */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === "matches" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("matches");
            setSearchQuery("");
            setIsCreating(false);
            setSelectedItem(null);
          }}
        >
          <Icon name="football" /> Matches ({activeTab === "matches" && items.length > 0 ? `${items.length} viewed` : "10,526 in DB"})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "teams" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("teams");
            setSearchQuery("");
            setIsCreating(false);
            setSelectedItem(null);
          }}
        >
          <Icon name="shield" /> Teams ({activeTab === "teams" && items.length > 0 ? `${items.length} viewed` : "462 in DB"})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "players" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("players");
            setSearchQuery("");
            setIsCreating(false);
            setSelectedItem(null);
          }}
        >
          <Icon name="player" /> Players ({activeTab === "players" && items.length > 0 ? `${items.length} viewed` : "6,993 in DB"})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("audit");
            setIsCreating(false);
            setSelectedItem(null);
          }}
        >
          <Icon name="database" /> Audit Logs (Triggers)
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("analytics");
            setIsCreating(false);
            setSelectedItem(null);
          }}
        >
          <Icon name="target" /> Database Analytics
        </button>
      </div>

      {/* AUDIT LOGS VIEW (DATABASE TRIGGERS PROOF) */}
      {activeTab === "audit" && (
        <section className="admin-special-card">
          <div className="admin-special-header">
            <div>
              <h2><Icon name="database" /> PostgreSQL Shadow Audit Trail (Live Triggers)</h2>
              <p>Every administrative INSERT, UPDATE, and DELETE triggers <code>fn_audit_log_changes()</code>, capturing an immutable snapshot into <code>audit_log</code>.</p>
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              disabled={loadingAudit}
              className="admin-refresh-btn"
            >
              <Icon name="refresh" /> {loadingAudit ? "Refreshing..." : "Refresh Logs"}
            </button>
          </div>

          {loadingAudit ? (
            <p className="admin-items-loading">Querying audit_log table...</p>
          ) : auditLogs.length === 0 ? (
            <p className="admin-items-empty">No audit logs recorded yet.</p>
          ) : (
            <div className="admin-audit-table-wrapper">
              <table className="admin-audit-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Table</th>
                    <th>Operation</th>
                    <th>Record ID</th>
                    <th>Changed Data (JSONB Snapshot)</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={`log-${log.log_id}`}>
                      <td><strong>#{log.log_id}</strong></td>
                      <td style={{ whiteSpace: "nowrap" }}>{log.changed_at}</td>
                      <td><span className="admin-table-pill">{log.table_name}</span></td>
                      <td>
                        <span className={`admin-op-pill ${log.operation.toLowerCase()}`}>
                          {log.operation}
                        </span>
                      </td>
                      <td><code>{log.record_id}</code></td>
                      <td>
                        <pre className="admin-json-preview">
                          {JSON.stringify(log.changed_data, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* DATABASE ANALYTICS VIEW (3 COMPLEX QUERIES PROOF) */}
      {activeTab === "analytics" && (
        <section className="admin-special-card">
          <div className="admin-special-header">
            <div>
              <h2><Icon name="target" /> Complex Database Queries & Analytics</h2>
              <p>Live execution of the three CSE216 complex multi-table queries, window functions, and PL/pgSQL routines.</p>
            </div>
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loadingAnalytics}
              className="admin-refresh-btn"
            >
              <Icon name="refresh" /> {loadingAnalytics ? "Refreshing..." : "Re-run Queries"}
            </button>
          </div>

          {loadingAnalytics || !analyticsData ? (
            <p className="admin-items-loading">Executing complex SQL analytics queries...</p>
          ) : (
            <div className="admin-analytics-grid">
              {/* COMPLEX QUERY 1 */}
              <div className="admin-analytics-box">
                <div className="admin-analytics-box-header">
                  <h3>1. Standings & Performance Analytics</h3>
                  <span className="admin-sql-badge">4-Table JOIN + DENSE_RANK() + PL/pgSQL Functions</span>
                </div>
                <p className="admin-sql-desc">
                  Joins <code>team</code>, <code>team_season_stats</code>, <code>season</code>, <code>league</code>. Computes rank via <code>DENSE_RANK() OVER (...)</code>, and calls <code>fn_calculate_team_win_rate()</code> and <code>fn_get_team_recent_form()</code>.
                </p>
                <div className="admin-audit-table-wrapper">
                  <table className="admin-audit-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>League</th>
                        <th>Played</th>
                        <th>Pts</th>
                        <th>GD</th>
                        <th>Win % (SQL Fn)</th>
                        <th>Form (SQL Fn)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.standings || []).slice(0, 8).map((row, idx) => (
                        <tr key={`stand-${idx}`}>
                          <td><strong>#{row.league_rank}</strong></td>
                          <td><strong>{row.team_name}</strong></td>
                          <td>{row.league_name}</td>
                          <td>{row.matches_played}</td>
                          <td><strong>{row.points}</strong></td>
                          <td>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
                          <td><span className="admin-winrate-pill">{row.overall_win_percentage}%</span></td>
                          <td><code>{row.recent_form}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPLEX QUERY 2 */}
              <div className="admin-analytics-box">
                <div className="admin-analytics-box-header">
                  <h3>2. Top Scorers & Career Contributions</h3>
                  <span className="admin-sql-badge">3-Table JOIN + SUM() / AVG() + GROUP BY + HAVING</span>
                </div>
                <p className="admin-sql-desc">
                  Joins <code>player</code>, <code>team</code>, <code>player_season_stats</code>. Aggregates career goals, assists, and total contributions filtered by <code>HAVING SUM(goals + assists) &gt; 0</code>.
                </p>
                <div className="admin-audit-table-wrapper">
                  <table className="admin-audit-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Club</th>
                        <th>Apps</th>
                        <th>Goals</th>
                        <th>Assists</th>
                        <th>Total (G+A)</th>
                        <th>Avg Mins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.top_scorers || []).slice(0, 8).map((row, idx) => (
                        <tr key={`scorer-${idx}`}>
                          <td><strong>{row.player_name}</strong></td>
                          <td>{row.current_team || "Free Agent"}</td>
                          <td>{row.total_appearances}</td>
                          <td><strong style={{ color: "var(--mint)" }}>{row.total_goals}</strong></td>
                          <td>{row.total_assists}</td>
                          <td><strong>{row.total_contributions}</strong></td>
                          <td>{row.avg_minutes_played}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPLEX QUERY 3 */}
              <div className="admin-analytics-box">
                <div className="admin-analytics-box-header">
                  <h3>3. Team Rivalry & Head-to-Head Statistics</h3>
                  <span className="admin-sql-badge">Self-Joins + Conditional CASE WHEN Aggregations</span>
                </div>
                <p className="admin-sql-desc">
                  Analyzes head-to-head match encounters using conditional aggregations: <code>COUNT(CASE WHEN home_score &gt; away_score THEN 1 END)</code>, goal tallies, and average possession.
                </p>
                <div className="admin-audit-table-wrapper">
                  <table className="admin-audit-table">
                    <thead>
                      <tr>
                        <th>Home Club</th>
                        <th>Away Club</th>
                        <th>Encounters</th>
                        <th>Home Wins</th>
                        <th>Away Wins</th>
                        <th>Draws</th>
                        <th>Goals</th>
                        <th>Avg Poss.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.head_to_head || []).slice(0, 8).map((row, idx) => (
                        <tr key={`h2h-${idx}`}>
                          <td><strong>{row.home_team_name}</strong></td>
                          <td><strong>{row.away_team_name}</strong></td>
                          <td><strong>{row.total_encounters}</strong></td>
                          <td>{row.home_team_wins}</td>
                          <td>{row.away_team_wins}</td>
                          <td>{row.draws}</td>
                          <td>{row.total_home_goals} - {row.total_away_goals}</td>
                          <td>{row.avg_home_possession_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STANDARD CRUD WORKSPACE */}
      {(activeTab === "matches" || activeTab === "teams" || activeTab === "players") && (
        <div className="admin-workspace">
        {/* LEFT PANEL: SEARCH & SELECT LIST */}
        <aside className="admin-list-panel">
          {/* CREATE TRIGGER BUTTON */}
          <button
            type="button"
            onClick={startCreating}
            className="admin-create-trigger-btn"
          >
            <Icon name="sparkles" /> Create New {activeTab === "matches" ? "Match" : activeTab === "teams" ? "Team" : "Player"}
          </button>

          <div className="admin-search-box">
            <input
              type="text"
              placeholder={
                activeTab === "matches"
                  ? "Search by club name or match ID..."
                  : activeTab === "teams"
                  ? "Search by team name or code..."
                  : "Search by player name or team..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>

          <div className="admin-items-list">
            {loadingItems ? (
              <p className="admin-items-loading">Loading records from PostgreSQL...</p>
            ) : items.length === 0 ? (
              <p className="admin-items-empty">No records found matching &quot;{searchQuery}&quot;</p>
            ) : (
              items.map((item) => {
                const id = getItemId(item, activeTab);
                const isSelected = !isCreating && selectedItem && getItemId(selectedItem, activeTab) === id;

                return (
                  <div
                    key={id}
                    className={`admin-list-item ${isSelected ? "selected" : ""}`}
                    onClick={() => selectItem(item)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {activeTab === "matches" && (
                          <>
                            <div className="item-title">
                              <strong>{item.home_team}</strong> vs <strong>{item.away_team}</strong>
                            </div>
                            <div className="item-sub">
                              <span className="item-id">ID: #{item.match_id}</span>
                              <span className="item-score">{item.home_score} - {item.away_score}</span>
                              <span className="item-status">{item.status}</span>
                            </div>
                          </>
                        )}

                        {activeTab === "teams" && (
                          <>
                            <div className="item-title">
                              <strong>{item.name}</strong> ({item.short_name || "---"})
                            </div>
                            <div className="item-sub">
                              <span className="item-id">ID: #{item.team_id}</span>
                              <span>{item.stadium_name || "Stadium"}</span>
                            </div>
                          </>
                        )}

                        {activeTab === "players" && (
                          <>
                            <div className="item-title">
                              <strong>{item.first_name} {item.last_name}</strong>
                            </div>
                            <div className="item-sub">
                              <span className="item-id">ID: #{item.player_id}</span>
                              <span>{item.primary_position}</span>
                              <span>{item.team_name || "Team"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        className="admin-item-delete-btn"
                        title={`Delete ${activeTab.slice(0, -1)} #${id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectItem(item);
                          setConfirmDeleteId(id);
                        }}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: ATTRIBUTE EDITOR FORM */}
        <section className="admin-editor-panel">
          {isCreating ? (
            /* ============================================================
               CREATION FORM
               ============================================================ */
            <form onSubmit={handleSave} className="admin-edit-form">
              <div className="editor-top-bar">
                <h2>
                  <Icon name="sparkles" /> Create New {activeTab === "matches" ? "Match" : activeTab === "teams" ? "Team" : "Player"} in PostgreSQL
                </h2>

                <div className="editor-actions-group">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      if (items.length > 0) selectItem(items[0], activeTab);
                    }}
                    className="admin-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="admin-save-btn"
                  >
                    {isSaving ? "Creating..." : <><Icon name="sparkles" /> Create {activeTab.slice(0, -1).toUpperCase()}</>}
                  </button>
                </div>
              </div>

              {statusMessage.text && (
                <div className={`admin-status-banner ${statusMessage.type}`}>
                  <Icon name={statusMessage.type === "success" ? "check" : "alert"} /> {statusMessage.text}
                </div>
              )}

              {/* CREATE MATCH */}
              {activeTab === "matches" && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Home Team *</label>
                    <select
                      value={formData.home_team_id || ""}
                      onChange={(e) => handleInputChange("home_team_id", e.target.value)}
                      required
                    >
                      <option value="">-- Select Home Team --</option>
                      {options.teams.map((t) => (
                        <option key={`home-${t.team_id}`} value={t.team_id}>
                          {t.name} ({t.short_name || `#${t.team_id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Away Team *</label>
                    <select
                      value={formData.away_team_id || ""}
                      onChange={(e) => handleInputChange("away_team_id", e.target.value)}
                      required
                    >
                      <option value="">-- Select Away Team --</option>
                      {options.teams.map((t) => (
                        <option key={`away-${t.team_id}`} value={t.team_id}>
                          {t.name} ({t.short_name || `#${t.team_id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Season / Competition *</label>
                    <select
                      value={formData.season_id || ""}
                      onChange={(e) => handleInputChange("season_id", e.target.value)}
                      required
                    >
                      <option value="">-- Select Season / Competition --</option>
                      {options.seasons.map((s) => (
                        <option key={`season-${s.season_id}`} value={s.season_id}>
                          {s.league_name} ({s.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Match Status</label>
                    <select
                      value={formData.status || "UPCOMING"}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                    >
                      <option value="UPCOMING">UPCOMING (Scheduled)</option>
                      <option value="LIVE">LIVE (In Play)</option>
                      <option value="HT">HT (Half Time)</option>
                      <option value="FT">FT (Full Time)</option>
                      <option value="AET">AET (After Extra Time)</option>
                      <option value="PEN">PEN (Penalties)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Match Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.match_date || ""}
                      onChange={(e) => handleInputChange("match_date", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Venue / Stadium</label>
                    <input
                      type="text"
                      value={formData.venue || ""}
                      onChange={(e) => handleInputChange("venue", e.target.value)}
                      placeholder="e.g. Santiago Bernabéu, Anfield"
                    />
                  </div>

                  <div className="form-group">
                    <label>Home Score {formData.status === "FT" ? "*" : "(if completed)"}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.home_score ?? ""}
                      onChange={(e) => handleInputChange("home_score", e.target.value)}
                      required={formData.status === "FT"}
                    />
                  </div>

                  <div className="form-group">
                    <label>Away Score {formData.status === "FT" ? "*" : "(if completed)"}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.away_score ?? ""}
                      onChange={(e) => handleInputChange("away_score", e.target.value)}
                      required={formData.status === "FT"}
                    />
                  </div>

                  <div className="form-group">
                    <label>Home Possession (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.home_possession ?? ""}
                      onChange={(e) => handleInputChange("home_possession", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Away Possession (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.away_possession ?? ""}
                      onChange={(e) => handleInputChange("away_possession", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* CREATE TEAM */}
              {activeTab === "teams" && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Club Name *</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="e.g. Manchester United, Real Madrid"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Short Name / Code</label>
                    <input
                      type="text"
                      value={formData.short_name || ""}
                      onChange={(e) => handleInputChange("short_name", e.target.value)}
                      placeholder="e.g. MUN, RMA, ARS"
                    />
                  </div>

                  <div className="form-group">
                    <label>Stadium Name</label>
                    <input
                      type="text"
                      value={formData.stadium_name || ""}
                      onChange={(e) => handleInputChange("stadium_name", e.target.value)}
                      placeholder="e.g. Old Trafford"
                    />
                  </div>

                  <div className="form-group">
                    <label>Manager Name</label>
                    <input
                      type="text"
                      value={formData.manager_name || ""}
                      onChange={(e) => handleInputChange("manager_name", e.target.value)}
                      placeholder="e.g. Ruben Amorim, Carlo Ancelotti"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Logo CDN URL</label>
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      onChange={(e) => handleInputChange("logo_url", e.target.value)}
                      placeholder="https://media.api-sports.io/football/teams/33.png"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Club History</label>
                    <textarea
                      rows="4"
                      value={formData.history || ""}
                      onChange={(e) => handleInputChange("history", e.target.value)}
                      placeholder="Enter history and background of the club..."
                    />
                  </div>
                </div>
              )}

              {/* CREATE PLAYER */}
              {activeTab === "players" && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={formData.first_name || ""}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      placeholder="e.g. Jude"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={formData.last_name || ""}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      placeholder="e.g. Bellingham"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Club</label>
                    <select
                      value={formData.team_id || ""}
                      onChange={(e) => handleInputChange("team_id", e.target.value)}
                    >
                      <option value="">-- Free Agent (No Club) --</option>
                      {options.teams.map((t) => (
                        <option key={`pteam-${t.team_id}`} value={t.team_id}>
                          {t.name} ({t.short_name || `#${t.team_id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Primary Position</label>
                    <select
                      value={formData.primary_position || ""}
                      onChange={(e) => handleInputChange("primary_position", e.target.value)}
                    >
                      <option value="">-- Not recorded --</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                      <option value="Defender">Defender</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Attacker">Attacker</option>
                      <option value="Forward">Forward</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality || ""}
                      onChange={(e) => handleInputChange("nationality", e.target.value)}
                      placeholder="e.g. England, Argentina"
                    />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth || ""}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Market Value (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.market_value_euros ?? ""}
                      onChange={(e) => handleInputChange("market_value_euros", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight / Height (cm)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.weight_cm ?? ""}
                      onChange={(e) => handleInputChange("weight_cm", e.target.value)}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Photo URL</label>
                    <input
                      type="url"
                      value={formData.photo_url || ""}
                      onChange={(e) => handleInputChange("photo_url", e.target.value)}
                      placeholder="https://media.api-sports.io/football/players/1100.png"
                    />
                  </div>
                </div>
              )}
            </form>
          ) : !selectedItem ? (
            /* ============================================================
               NO ITEM SELECTED
               ============================================================ */
            <div className="admin-no-selection">
              <span className="icon"><Icon name="arrowLeft" /></span>
              <p>Select a record from the left panel to edit its attributes, or click <strong>&quot;+ Create New&quot;</strong> to add a new record.</p>
              <button
                type="button"
                onClick={startCreating}
                className="admin-create-trigger-btn"
                style={{ maxWidth: "260px", margin: "16px auto 0" }}
              >
                + Create New {activeTab === "matches" ? "Match" : activeTab === "teams" ? "Team" : "Player"}
              </button>
            </div>
          ) : (
            /* ============================================================
               EDIT EXISTING ITEM FORM
               ============================================================ */
            <form onSubmit={handleSave} className="admin-edit-form">
              <div className="editor-top-bar">
                <h2>
                  Editing {activeTab.slice(0, -1).toUpperCase()} #{getItemId(selectedItem, activeTab)}
                </h2>

                <div className="editor-actions-group">
                  <button
                    type="button"
                    onClick={startCreating}
                    className="admin-cancel-btn"
                    title="Switch to create a new item"
                  >
                    + Create New
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className="admin-delete-btn"
                    title={`Delete this ${activeTab.slice(0, -1)} from database`}
                  >
                    <Icon name="trash" /> Delete
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isDeleting}
                    className="admin-save-btn"
                  >
                    {isSaving ? "Saving to PostgreSQL..." : <><Icon name="save" /> Save Changes to Database</>}
                  </button>
                </div>
              </div>

              {confirmDeleteId === getItemId(selectedItem, activeTab) && (
                <div className="admin-delete-confirm-box">
                  <span>
                    ⚠️ Permanently delete <strong>{activeTab.slice(0, -1).toUpperCase()} #{confirmDeleteId}</strong>? All associated database entries will be removed.
                  </span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-delete-confirm-btn"
                      onClick={executeDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
                    </button>
                  </div>
                </div>
              )}

              {statusMessage.text && (
                <div className={`admin-status-banner ${statusMessage.type}`}>
                  <Icon name={statusMessage.type === "success" ? "check" : "alert"} /> {statusMessage.text}
                </div>
              )}

              {/* MATCH ATTRIBUTES */}
              {activeTab === "matches" && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Home Score</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.home_score ?? 0}
                      onChange={(e) => handleInputChange("home_score", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Away Score</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.away_score ?? 0}
                      onChange={(e) => handleInputChange("away_score", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Match Status</label>
                    <select
                      value={formData.status || "FT"}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                    >
                      <option value="FT">FT (Full Time)</option>
                      <option value="LIVE">LIVE (In Play)</option>
                      <option value="UPCOMING">UPCOMING (Scheduled)</option>
                      <option value="HT">HT (Half Time)</option>
                      <option value="AET">AET (After Extra Time)</option>
                      <option value="PEN">PEN (Penalties)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Venue / Stadium</label>
                    <input
                      type="text"
                      value={formData.venue || ""}
                      onChange={(e) => handleInputChange("venue", e.target.value)}
                      placeholder="e.g. Anfield, Santiago Bernabéu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Match Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.match_date || ""}
                      onChange={(e) => handleInputChange("match_date", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Home Possession (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.home_possession ?? 50}
                      onChange={(e) => handleInputChange("home_possession", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Away Possession (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.away_possession ?? 50}
                      onChange={(e) => handleInputChange("away_possession", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* TEAM ATTRIBUTES */}
              {activeTab === "teams" && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Club Name</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Short Name / Code</label>
                    <input
                      type="text"
                      value={formData.short_name || ""}
                      onChange={(e) => handleInputChange("short_name", e.target.value)}
                      placeholder="e.g. LIV, RMA, ARS"
                    />
                  </div>

                  <div className="form-group">
                    <label>Stadium Name</label>
                    <input
                      type="text"
                      value={formData.stadium_name || ""}
                      onChange={(e) => handleInputChange("stadium_name", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Manager Name</label>
                    <input
                      type="text"
                      value={formData.manager_name || ""}
                      onChange={(e) => handleInputChange("manager_name", e.target.value)}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Logo CDN URL</label>
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      onChange={(e) => handleInputChange("logo_url", e.target.value)}
                      placeholder="https://media.api-sports.io/football/teams/40.png"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Club History</label>
                    <textarea
                      rows="4"
                      value={formData.history || ""}
                      onChange={(e) => handleInputChange("history", e.target.value)}
                      placeholder="Enter history and background of the club..."
                    />
                  </div>
                </div>
              )}

              {/* PLAYER ATTRIBUTES */}
              {activeTab === "players" && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formData.first_name || ""}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name || ""}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Primary Position</label>
                    <select
                      value={formData.primary_position || ""}
                      onChange={(e) => handleInputChange("primary_position", e.target.value)}
                    >
                      <option value="">-- Not recorded --</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                      <option value="Defender">Defender</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Attacker">Attacker</option>
                      <option value="Forward">Forward</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality || ""}
                      onChange={(e) => handleInputChange("nationality", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth || ""}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Market Value (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.market_value_euros ?? 0}
                      onChange={(e) => handleInputChange("market_value_euros", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Weight / Height (cm)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.weight_cm ?? 0}
                      onChange={(e) => handleInputChange("weight_cm", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Club</label>
                    <select
                      value={formData.team_id || ""}
                      onChange={(e) => handleInputChange("team_id", e.target.value)}
                    >
                      <option value="">-- Free Agent (No Club) --</option>
                      {options.teams.map((t) => (
                        <option key={`edit-pteam-${t.team_id}`} value={t.team_id}>
                          {t.name} ({t.short_name || `#${t.team_id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Photo URL</label>
                    <input
                      type="url"
                      value={formData.photo_url || ""}
                      onChange={(e) => handleInputChange("photo_url", e.target.value)}
                      placeholder="https://media.api-sports.io/football/players/306.png"
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </section>
      </div>
      )}
    </main>
  );
}
