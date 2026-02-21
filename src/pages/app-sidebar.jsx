import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import "../styles/styles.css"
import "../components/styles/App.css";
import axios from 'axios';
import { Plus, Search, CalendarCheck2, LoaderCircle, Pencil, Trash2, MoreHorizontal, Star, LogOut, ChevronsUpDown } from "lucide-react"


export function AppSidebar({ onSelectChatSession, onNewSessionClick, onCurrentSessionId, onOpenChatsPanel, onLogout, logoutLoading }) {
  const [chatSessions, setChatSessions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => {
    try {
      const raw = localStorage.getItem("pinned_chat_sessions");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [customSessionTitles, setCustomSessionTitles] = useState(() => {
    try {
      const raw = localStorage.getItem("custom_chat_titles");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.sub);
      setUserName(payload.name);
      setUserId(payload.user_ehr_id);
      if (payload.picture) {
        setUserImage(payload.picture);
      }
      else {
        setUserImage('https://storage.googleapis.com/a1aa/image/WkpYEcLxO0KkSzrfJExcmisxBg5otmGO4IHGBHlju5Q.jpg')
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      window.location.href = '/login';
    }
  }, [token]);
  const [userImage, setUserImage] = useState('')

  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    localStorage.setItem("pinned_chat_sessions", JSON.stringify(pinnedSessionIds));
  }, [pinnedSessionIds]);

  useEffect(() => {
    localStorage.setItem("custom_chat_titles", JSON.stringify(customSessionTitles));
  }, [customSessionTitles]);

  const filteredSessions = useMemo(() => {
    return chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".session-menu-wrapper")) {
        setOpenMenuSessionId(null);
      }
      if (!target.closest(".account-menu-wrapper")) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const pinnedSessions = useMemo(
    () => filteredSessions.filter((s) => pinnedSessionIds.includes(s.session_id)),
    [filteredSessions, pinnedSessionIds]
  );

  const recentSessions = useMemo(
    () => filteredSessions.filter((s) => !pinnedSessionIds.includes(s.session_id)),
    [filteredSessions, pinnedSessionIds]
  );
  useEffect(() => {
    const fetchChatSessions = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/chat-sessions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        if (response.data && response.data.sessions) {
          const sortedSessions = response.data.sessions.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          setChatSessions(sortedSessions);
        } else {
          console.warn("No sessions data received or sessions is undefined");
        }
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
        if (error.response) {
          console.error('HTTP error:', error.response.status);
          console.error('Response data:', error.response.data);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error setting up the request:', error.message);
        }
      }
    };

    const fetchAppointments = async () => {
      try {
        const appointmentsResponse = await axios.post(`${process.env.REACT_APP_POINT_REC}/booked`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        const appointmentsData = await appointmentsResponse.data;
        console.log(appointmentsData)
        if (appointmentsData.data) {
          console.log('Appointments loaded:', appointmentsData.data);
          setAppointments(appointmentsData.data);
        }
      }
      catch (error) {
        console.error('Error fetching appointments:', error);
      }
    }

    if (token) {
      fetchChatSessions();
      fetchAppointments();
    }
    console.log("fetchChatSessions&fetchAppointments")
  }, [onCurrentSessionId, token])

  const newSession = async () => {
    setLoading(true)
    setSelectedSession(null)
    try {
      const createSession = await axios.post(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/new-session`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log("NewSessionCreated", createSession)
      if (onNewSessionClick) {
        onNewSessionClick();
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }
  const handleSelectChatSession = (sessionId) => {
    setSelectedSession(sessionId);
    onSelectChatSession(sessionId);
  };

  const togglePinSession = (sessionId) => {
    setPinnedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [sessionId, ...prev]
    );
  };

  const handleDeleteSession = (sessionId) => {
    setChatSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    setPinnedSessionIds((prev) => prev.filter((id) => id !== sessionId));
    setCustomSessionTitles((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    if (selectedSession === sessionId) {
      setSelectedSession(null);
    }
    setEditingSessionId((prev) => (prev === sessionId ? null : prev));
    setOpenMenuSessionId((prev) => (prev === sessionId ? null : prev));
  };

  const startRenameSession = (sessionId, currentTitle) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
    setOpenMenuSessionId(null);
  };

  const saveRenameSession = (sessionId) => {
    const nextTitle = editingTitle.trim();
    if (nextTitle) {
      setCustomSessionTitles((prev) => ({ ...prev, [sessionId]: nextTitle }));
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const renderSessionButton = (session) => {
    const sessionId = session.session_id;
    const isSelected = selectedSession === sessionId;
    const isPinned = pinnedSessionIds.includes(sessionId);
    const title = customSessionTitles[sessionId] || session.session_title || `Chat Session ${sessionId.slice(-4)}`;

    return (
      <div key={session._id || sessionId} className="relative session-menu-wrapper group">
        <button
          className={`group text-left w-full rounded-lg px-2 py-1.5 border transition-all duration-150 ${
            isSelected
              ? "bg-[#02040a] border-transparent"
              : "bg-transparent border-transparent hover:bg-[#02040a] hover:border-transparent"
          }`}
          onClick={() => handleSelectChatSession(sessionId)}
          type="button"
        >
          <div className="flex items-center gap-2 pr-8">
            {editingSessionId === sessionId ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => saveRenameSession(sessionId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRenameSession(sessionId);
                  if (e.key === "Escape") {
                    setEditingSessionId(null);
                    setEditingTitle("");
                  }
                }}
                className="flex-1 bg-[#111827] border border-[#2d3b55] rounded px-2 py-1 text-sm text-zinc-200 outline-none"
              />
            ) : (
              <span className={`flex-1 truncate text-[14px] ${isSelected ? "text-white font-medium" : "text-zinc-200 font-normal"}`}>
                {title}
              </span>
            )}
          </div>
        </button>
        {editingSessionId !== sessionId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuSessionId((prev) => (prev === sessionId ? null : sessionId));
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-300 transition-all duration-150 ${
              isSelected || openMenuSessionId === sessionId
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 hover:text-zinc-100"
            }`}
            title="More actions"
          >
            <MoreHorizontal size={15} />
          </button>
        )}
        {openMenuSessionId === sessionId && editingSessionId !== sessionId && (
          <div className="absolute right-1 top-[calc(100%+4px)] w-40 rounded-lg border border-white/20 bg-[linear-gradient(160deg,rgba(20,30,45,0.58),rgba(10,15,25,0.52))] backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.45)] z-20 py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePinSession(sessionId);
                setOpenMenuSessionId(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              <Star size={14} className={isPinned ? "text-amber-300" : "text-zinc-300"} fill={isPinned ? "currentColor" : "none"} />
              <span>{isPinned ? "Unstar" : "Star"}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startRenameSession(sessionId, title);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              <Pencil size={14} className="text-zinc-300" />
              <span>Rename</span>
            </button>
            <div className="mx-2 my-1 h-px bg-white/15" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSession(sessionId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-white/10"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="bg-[#141820] flex h-screen flex-col p-2 text-white" >
      <div>
        <button
          onClick={newSession}
          type="button"
          className="mb-1 flex h-10 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-[#d7dee8] transition-colors hover:bg-[#02040a]"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/90">
            <Plus size={14} strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-medium">New chat</span>
          {loading ? <LoaderCircle size={16} color="#fff" className="ml-auto animate-spin" /> : ''}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onOpenChatsPanel?.()}
        className="mb-1 flex h-10 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-zinc-300 transition-colors hover:bg-[#02040a]"
      >
        <Search size={18} className="opacity-80" />
        <span className="text-[15px] font-medium">Search</span>
      </button>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-side ">
        <div className="flex flex-col text-sm overflow-y-auto "
        >
          {chatSessions && chatSessions.length > 0 ? (
            <>
              {pinnedSessions.length > 0 && (
                <>
                  <div className="px-1 mt-1 mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    Pinned
                  </div>
                  {pinnedSessions.map(renderSessionButton)}
                </>
              )}
              {recentSessions.length > 0 && (
                <>
                  <div className="px-1 mt-2 mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    Recent
                  </div>
                  {recentSessions.map(renderSessionButton)}
                </>
              )}
              {filteredSessions.length === 0 && (
                <div className="px-2 py-2 text-xs text-zinc-500">No chats found.</div>
              )}
            </>
          ) : null}
        </div>
      </div>
      {appointments.length > 0 && (
        <>
          <div className="text-xs font-semibold text-white mb-1 mt-3 select-none">
            <div className="flex items-center text-xs text-gray-300 select-none font-semibold">
              Appointments <CalendarCheck2 className="ml-1" size={12} />
            </div>
          </div>
          <div className="mt-2 flex-shrink-0">
            <div className="flex flex-col space-y-3">
              {appointments.map((appointment) => (
                <button
                  key={appointment.date_slot}
                  className="text-xs w-full text-left px-2 py-1 hover:bg-[#1e2233] transition-all duration-200 rounded-md border border-gray-700/30 hover:border-gray-700/50 hover:shadow-lg " // Applied simplified styling
                  type="button"
                >
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400">Dr. {appointment.doctor_name.toUpperCase()}</span>
                      <span className="text-gray-400">
                        {appointment.specialization.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">
                        {appointment.hospital_name.toUpperCase()}
                      </span>
                      <span className="text-gray-100 ml-1">
                        {appointment.date_slot}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="mt-0 flex-shrink-0 relative account-menu-wrapper">
        {isAccountMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-lg border border-white/10 bg-[#1b202c] p-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#02040a] hover:text-zinc-100"
            >
              <LogOut size={14} className="text-zinc-400" />
              <span>Sign out</span>
              {logoutLoading ? <LoaderCircle size={14} className="ml-auto animate-spin text-zinc-300" /> : null}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          className="flex w-full items-center px-1 py-[2px] hover:bg-[#141820] bg-[#1e2233] transition-all duration-200 rounded-md border border-gray-700/30 hover:border-gray-700/50 hover:shadow-lg"
        >
          <img
            src={userImage}
            alt="User avatar"
            className="rounded-full w-9 h-9 mr-3"
            width="10"
            height="10"
          />
          <div className="min-w-0 text-left">
            <div className="text-gray-300 text-xs font-semibold">{userName}</div>
            <div className="text-gray-400 text-xs font-semibold">ID: {userId} | Free </div>
            <div className="text-gray-400 text-xs font-semibold">{userEmail}</div>
          </div>
          <ChevronsUpDown size={14} className="ml-auto text-zinc-400" />
        </button>
      </div>
    </aside>
  );
}
