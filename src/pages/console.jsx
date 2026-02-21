import React, { useEffect, useState, useRef } from "react";
import "@fortawesome/fontawesome-free/css/all.css";
import "tailwindcss/tailwind.css";
import "../components/styles/App.css";
import { useIsMobile } from "../hooks/use-mobile";
import { AppSidebar } from "./app-sidebar";
import { HiOutlineLightBulb } from "react-icons/hi";
import axios from "axios";
import { CustomQuickResponseDropdown } from "../components/ui/modebutton";
import MessageBubble from "../components/ui/message_markdown";
import {
  Lightbulb, GraduationCap, Sidebar, PanelLeftClose, NotepadText,
  PencilLine, HeartHandshake, LoaderCircle, Mic, Plus, Globe, X, Check
} from 'lucide-react';
import AssistantService from "../AssistantService";
import SendButton from '../components/ui/send_button'
import AnimatedKnot from "../components/ui/animated_knot";




const ChatUI = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState(() => Array.from({ length: 120 }, () => 3));
  const [toolStatus, setToolStatus] = useState("");
  const [userName, setUserName] = useState('');
  const [responseType, setResponseType] = useState("quick");
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [welcomeMounted, setWelcomeMounted] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const startAccumulatedResponseRef = useRef("");
  const speechRecognitionRef = useRef(null);
  const speechBaseInputRef = useRef("");
  const speechFinalTextRef = useRef("");
  const speechInterimTextRef = useRef("");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false)
  const [showAllChatsPanel, setShowAllChatsPanel] = useState(false);
  const [allChatsSessions, setAllChatsSessions] = useState([]);
  const [allChatsLoading, setAllChatsLoading] = useState(false);
  const [allChatsSearchTerm, setAllChatsSearchTerm] = useState("");

  const [logoutload, setLodoutLoad] = useState(false)

  const mergeSpeechText = (baseText, nextText) => {
    return [baseText?.trim(), nextText?.trim()]
      .filter(Boolean)
      .join(" ")
      .trimStart();
  };

  const buildSpeechInputText = () => {
    const speechChunk = mergeSpeechText(
      speechFinalTextRef.current,
      speechInterimTextRef.current
    );
    return mergeSpeechText(speechBaseInputRef.current, speechChunk);
  };

  const resetWaveform = () => {
    setWaveformLevels(Array.from({ length: 120 }, () => 3));
  };

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
    resetWaveform();
  };

  const startAudioLevelMonitoring = async () => {
    stopAudioLevelMonitoring();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const AudioContextApi = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextApi) return;

    const audioContext = new AudioContextApi();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    const tick = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i += 1) {
        sum += dataArrayRef.current[i];
      }
      const avg = sum / dataArrayRef.current.length;

      const normalized = Math.max(0, Math.min(1, avg / 85));
      const height = 3 + Math.round(normalized * 21);

      setWaveformLevels((prev) => [...prev.slice(1), height]);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const stopSpeechRecognition = (commitToInput = true) => {
    if (commitToInput) {
      setInput(buildSpeechInputText());
    }
    if (!speechRecognitionRef.current) return;
    try {
      speechRecognitionRef.current.stop();
    } catch (error) {
      console.error("Failed to stop speech recognition:", error);
    }
    stopAudioLevelMonitoring();
  };

  const handleSpeechResult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (finalText) {
      speechBaseInputRef.current = mergeSpeechText(speechBaseInputRef.current, finalText);
      speechFinalTextRef.current = mergeSpeechText(speechFinalTextRef.current, finalText);
    }

    speechInterimTextRef.current = interimText;
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert("Speech-to-text is not supported in this browser.");
      return;
    }

    if (!speechRecognitionRef.current) {
      const recognition = new SpeechRecognitionApi();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        startAudioLevelMonitoring().catch((error) => {
          console.error("Failed to start audio level monitoring:", error);
          resetWaveform();
        });
      };

      recognition.onresult = handleSpeechResult;

      recognition.onerror = (event) => {
        setIsListening(false);
        stopAudioLevelMonitoring();
        if (event.error !== "aborted") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        stopAudioLevelMonitoring();
      };

      speechRecognitionRef.current = recognition;
    }

    if (isListening) {
      stopSpeechRecognition(true);
      return;
    }

    speechBaseInputRef.current = input || "";
    speechFinalTextRef.current = "";
    speechInterimTextRef.current = "";
    try {
      speechRecognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
    }
  };

  const handleCancelVoiceInput = () => {
    setInput(speechBaseInputRef.current || "");
    stopSpeechRecognition(false);
  };

  const handleConfirmVoiceInput = () => {
    stopSpeechRecognition(true);
  };

  const renderVoiceWaveform = () => (
    <div className="h-14 w-full flex items-center overflow-hidden">
      <div className="h-full w-full flex items-center gap-px overflow-hidden">
        {waveformLevels.map((height, index) => (
          <span
            key={`wave-${index}`}
            className="flex-1 min-w-[1px] rounded-full bg-zinc-300/80 transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );

  const formatToolStatus = (toolPayload) => {
    if (!toolPayload) return "";
    if (toolPayload.status === "completed") return "Preparing a grounded answer...";

    const node = String(toolPayload.node || "").toLowerCase();
    if (node === "web_search" || node === "tools") return "Researching trusted web sources...";
    if (node.includes("hospital")) return "Checking healthcare facility information...";
    if (node.includes("appointment")) return "Reviewing appointment details...";
    if (node.includes("medical") || node.includes("info")) return "Reviewing clinical context...";

    return "Consulting specialized tools...";
  };

  const shouldAutoUseWebSearch = (text) => {
    if (!text) return false;
    const explicitWebSearchIntent =
      /\b(use|do|can|please)\b[\s\S]{0,40}\b(web\s*search|search\s+the\s+web|online\s+search|browse\s+the\s+web)\b/i.test(text) ||
      /\b(web\s*search|search\s+the\s+web|online\s+search|browse\s+the\s+web)\b[\s\S]{0,40}\b(please|use|do|can)\b/i.test(text);

    const freshnessIntent =
      /\b(latest|current|today|recent|new|newest|breaking|live|up[-\s]?to[-\s]?date|as of)\b/i.test(text) &&
      /\b(news|update|updates|status|price|prices|trend|trends|rate|rates|guideline|guidelines|policy|policies|announcement|announcements|outbreak|outbreaks|case|cases|score|scores|result|results|data|chart|graph|table|statistics|metrics)\b/i.test(text);

    const timeSensitiveQuestion =
      /\b(what'?s happening now|what is happening now|right now|this week|this month|this year)\b/i.test(text);

    const dataVisualizationIntent =
      /\b(chart|graph|table|statistics|statistical|data|dataset|metrics|trend|trends)\b/i.test(text);

    return explicitWebSearchIntent || freshnessIntent || timeSensitiveQuestion || dataVisualizationIntent;
  };



  useEffect(() => {
    const token = localStorage.getItem('token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    setUserName(payload.name)
    if (!token) {
      window.location.href = '/login';
      return;
    }
    scrollToBottom()
  }, [messages]);

  // Greeting the user as per time shift = (morning/afternoon/evening)
  const getGreetingUI = () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  // Holding the last message at the most of the end to get the recent ones in a chat session
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Create a new view if new_session button has clicked in the @app-sidebar
  const handleNewSession = () => {
    setMessages([]);
    setWelcomeMounted(true);
    setHistoryLoading(false);
    setToolStatus("");
    setShowAllChatsPanel(false);
  };

  const fetchAllChatsSessions = async () => {
    setAllChatsLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/chat-sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (response.data?.sessions) {
        const sortedSessions = [...response.data.sessions].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setAllChatsSessions(sortedSessions);
      } else {
        setAllChatsSessions([]);
      }
    } catch (error) {
      console.error('Error fetching all chats:', error);
      setAllChatsSessions([]);
    } finally {
      setAllChatsLoading(false);
    }
  };

  const handleOpenChatsPanel = async () => {
    setShowAllChatsPanel(true);
    setAllChatsSearchTerm("");
    await fetchAllChatsSessions();
  };

  const filteredAllChatsSessions = allChatsSessions.filter((session) => {
    const q = allChatsSearchTerm.trim().toLowerCase();
    if (!q) return true;
    const title = (session.session_title || `Chat Session ${session.session_id?.slice(-4) || ""}`).toLowerCase();
    const time = session.timestamp ? new Date(session.timestamp).toLocaleString().toLowerCase() : "";
    return title.includes(q) || time.includes(q);
  });

  // End the current session
  const handleEndSession = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/end-session`,
        {},
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }
      // Clear current session state
      setMessages([]);
      setMessages([]);

    } catch (error) {
      console.error('Error ending session:', error);
      throw error; // Propagate error to caller
    }
  };

  // Logout from the current session
  const handleLogout = async () => {
    setLodoutLoad(true)
    try {
      await handleEndSession(); // End the session before logging out
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Still proceed with logout even if session end fails
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    setLodoutLoad(false)
  }

  // Start the Server Side Events 
  const startSSE = async (e) => {
    if (isListening) {
      stopSpeechRecognition(true);
      return;
    }
    let messageToSend = null;

    if (e && e.target && e.target.textContent) {
      messageToSend = String(e.target.textContent);
    } else {
      messageToSend = input;
    }
    if (!messageToSend || !messageToSend.trim()) {
      return; // Do not proceed if message is empty or whitespace
    }
    const userMessage = {
      name: 'User',
      message: messageToSend,
    };

    if (welcomeMounted) {

      setTimeout(() => {
        setWelcomeMounted(false);
        if (!e?.skipUserMessage) {
          setMessages((prev) => [...prev, userMessage]);
        }
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = '20px';
        }
        setLoading(true);
      }, 200);
    } else {
      if (!e?.skipUserMessage) {
        setMessages((prev) => [...prev, userMessage]);
      }
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px';
      }
      setLoading(true)
    }
    try {
      setToolStatus("");
      const explicitWebSearchRequest = shouldAutoUseWebSearch(messageToSend);
      const effectiveQueryModeType =
        isWebSearchEnabled || explicitWebSearchRequest
          ? "web_search"
          : responseType;

      if (effectiveQueryModeType === "web_search") {
        setToolStatus("Researching trusted web sources...");
      }

      // Streaming API call
      const data = await AssistantService.createStreamingConversation(
        messageToSend,
        effectiveQueryModeType
      );
      setHasStarted(true)


      // Reset the accumulated response ref for this session
      startAccumulatedResponseRef.current = "";
      // setMessages((prev) => [...prev, ""])
      // setMessages((prevMessages) => [
      //   ...prevMessages,
      //   { name: 'Sathi', message: '' } // Initialize Sathi's message
      // ]);

      // Start streaming the response
      AssistantService.streamResponse(
        data.thread_id,
        (data) => {
          if (data?.tool) {
            setToolStatus(formatToolStatus(data.tool));
            return;
          }

          if (data && data.content) {
            // Update our ref with the new content
            startAccumulatedResponseRef.current += data.content;
            // setHasStarted(true)
            setLoading(false)
            setMessages((prev) => {
              const lastMessage = prev.length > 0 ? prev[prev.length - 1] : null;
              if (lastMessage && lastMessage.name === 'Sathi') {
                // If the last message is from Sathi, update it
                const updatedMessages = [...prev];
                updatedMessages[prev.length - 1] = {
                  ...lastMessage,
                  message: startAccumulatedResponseRef.current,
                };
                return updatedMessages;
              } else {
                // If the last message is not from Sathi, create a new message
                return [...prev, { name: 'Sathi', message: startAccumulatedResponseRef.current }];
              }
            });

          }
        },
        // Error callback
        (error) => {
          console.error("Streaming error:", error);
          const errorMessage = error && error.message ? error.message : "Unknown error";
          setLoading(false);
          setHasStarted(false);
          setToolStatus("");
          setMessages((prev) => [
            ...prev,
            {
              name: "Sathi",
              message: `Unable to finish response: ${errorMessage}. Please try again.`,
            },
          ]);
        },
        // Complete callback
        () => {
          console.log("Stream completed");
          setHasStarted(false)
          setToolStatus("");
          // Final history update is already handled in the message callback
        }

      );
    } catch (err) {
      const errorMessage = err && err.message ? err.message : "Unknown error";
      setLoading(false);
      setHasStarted(false);
      setToolStatus("");
      setMessages((prev) => [
        ...prev,
        {
          name: "Sathi",
          message: `Unable to start response: ${errorMessage}. Please try again.`,
        },
      ]);
    }

  };

  // Stop the Server Side Events 
  const stopSSE = async () => {
    AssistantService.stopStreaming();
    setHasStarted(false)
    setLoading(false)
    setToolStatus("");
  }

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onstart = null;
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // Refresh the chat_history if new chat_session has been created
  const handleSelectChatSession = (sessionId) => {
    setShowAllChatsPanel(false);
    setHistoryLoading(true);
    setLoading(false);
    setWelcomeMounted(false)
    setToolStatus("");
    fetch(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/chat-history/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.chat_history) {
          const formattedHistory = data.chat_history.map(msg => ({
            name: msg.type === 'user' ? 'User' : 'Sathi',
            message: msg.message,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedHistory);
        }
      })
      .catch(error => {
        console.error('Error fetching chat history:', error);
        setMessages([{
          name: 'Sathi',
          message: 'Failed to load chat history. Please try again.'
        }]);
      })
      .finally(() => {
        setLoading(false);
        setHistoryLoading(false);
      });
  };

  const toggleWebSearchMode = () => {
    setIsWebSearchEnabled((prev) => {
      const next = !prev;
      if (next) {
        setResponseType("quick");
      }
      return next;
    });
  };

  const handleResponseTypeChange = (mode) => {
    setResponseType(mode);
    if (mode !== "quick") {
      setIsWebSearchEnabled(false);
    }
  };


  // const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768)
  const desktopSidebarOffset = !isMobile && isOpen ? "16rem" : "0px";

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);
  const closeSidebar = () => setIsOpen(false);

  // useEffect(() => {
  //   const handleResize = () => {
  //     const mobile = window.innerWidth < 768
  //     setIsMobile(mobile)
  //     setIsOpen(!mobile)
  //   }

  //   window.addEventListener('resize', handleResize)
  //   return () => window.removeEventListener('resize', handleResize)
  // }, [])



  return (

    // <div className="h-screen w-full flex bg-[#0f1117] border-4 border-red-500" >
    <div className="h-screen w-screen flex bg-[#0f1117] overflow-hidden">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        {/* Top center animated glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-sky-400/10 via-blue-500/10 to-indigo-400/5 blur-[140px] animate-glow" />

        {/* Bottom right animated glow */}
        <div className="absolute bottom-[-200px] right-[-150px] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-400/10 via-blue-500/5 to-indigo-500/3 blur-[140px] animate-glow delay-2000" />

        {/* Bottom left animated glow */}
        <div className="absolute bottom-[-250px] left-[-150px] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-indigo-500/10 via-blue-400/5 to-sky-400/3 blur-[140px] animate-glow delay-4000" />
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={closeSidebar}
        />
      )}
      {/* Sidebar */}
      <div
        className={`w-64 h-full bg-muted flex flex-col transition-transform duration-300 fixed z-30 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        }
      >
        <AppSidebar
          onSelectChatSession={handleSelectChatSession}
          onNewSessionClick={handleNewSession}
          onCurrentSessionId={hasStarted}
          onOpenChatsPanel={handleOpenChatsPanel}
          onLogout={handleLogout}
          logoutLoading={logoutload}
        />
      </div>


      {/* Main content */}
      <div
        className="flex-1 flex flex-col bg-[#0f1117] text-white w-full relative h-full transition-all duration-300"
        style={{ marginLeft: desktopSidebarOffset }}
      >
        {/* Navbar */}
        <div
          className="fixed flex items-center top-0 right-0 z-10 pointer-events-none transition-all duration-300"
          style={{ left: desktopSidebarOffset }}
        >
          <div className="pointer-events-auto">
            {isMobile && (
              <>
                {isOpen ? (
                  null
                ) : (

                  <button
                    className="text-gray-200 top-0 left-0 m-1 ml-2 rounded-md p-2 z-40 focus:outline-none transition-colors hover:bg-[#02040a] hover:text-gray-100"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <PanelLeftClose size={16} strokeWidth={1.5} />
                  </button>
                )}
              </>
            )}
            {!isMobile && (
              <>
                {isOpen ? (
                  <button
                    className="text-gray-200 top-0 left-0 m-1 ml-2 rounded-md p-2 z-40 focus:outline-none transition-colors hover:bg-[#02040a] hover:text-gray-100"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <Sidebar size={16} strokeWidth={1.5} />
                  </button>
                ) : (

                  <button
                    className="text-gray-200 top-0 left-0 m-1 ml-2 rounded-md p-2 z-40 focus:outline-none transition-colors hover:bg-[#02040a] hover:text-gray-100"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <Sidebar size={16} strokeWidth={1.5} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>


        {/* Centered Welcome / Input Container */}
        {showAllChatsPanel ? (
          <div className="flex-1 overflow-y-auto pt-20 pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-100">Chats</h2>
                <button
                  type="button"
                  onClick={() => setShowAllChatsPanel(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  value={allChatsSearchTerm}
                  onChange={(e) => setAllChatsSearchTerm(e.target.value)}
                  placeholder="Search chats"
                  className="w-full rounded-lg bg-[#121722]/70 px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:bg-[#151d2b]"
                />
              </div>

              {allChatsLoading ? (
                <div className="flex items-center gap-2 text-zinc-300">
                  <LoaderCircle size={16} className="animate-spin" />
                  <span>Loading chats...</span>
                </div>
              ) : filteredAllChatsSessions.length === 0 ? (
                <div className="rounded-xl bg-[#121722]/70 p-6 text-sm text-zinc-400">
                  No chats found for that search.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAllChatsSessions.map((session) => {
                    const sessionId = session.session_id;
                    const title = session.session_title || `Chat Session ${sessionId?.slice(-4) || ""}`;
                    const time = session.timestamp ? new Date(session.timestamp).toLocaleString() : "Unknown time";

                    return (
                      <button
                        key={session._id || sessionId}
                        type="button"
                        onClick={() => handleSelectChatSession(sessionId)}
                        className="w-full rounded-lg px-4 py-3 text-left transition-colors hover:bg-[#02040a]"
                      >
                        <div className="truncate text-sm font-medium text-zinc-100">{title}</div>
                        <div className="mt-1 text-xs text-zinc-400">{time}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : messages.length === 0 && !historyLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 w-full h-full overflow-y-auto">
            <div className="w-full max-w-3xl flex flex-col items-center space-y-8">
              {/* Greeting */}
              <div className="flex flex-col items-center space-y-2">
                <AnimatedKnot className="w-24 h-24 sm:w-32 sm:h-32 mb-2" />
                <h1 className="text-white font-semibold text-2xl sm:text-4xl mt-4 px-4 text-center">
                  {getGreetingUI()}, {userName.split(" ")[0]}
                </h1>
                <h2 className="text-gray-400/80 font-medium text-xl">
                  What can I help you with today?
                </h2>
              </div>

              {/* Input Area (Centered) */}
              <div className="w-full max-w-2xl">
                <div className="bg-[#0B0E17] rounded-[24px] p-4 shadow-2xl border border-[#181B24] ring-1 ring-white/5">
                  {isListening ? (
                    renderVoiceWaveform()
                  ) : (
                    <div className="flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            startSSE()
                          }
                        }}
                        placeholder="Ask anything..."
                        rows={1}
                        className="pl-2 bg-transparent text-gray-200 w-full focus:outline-none text-base mb-2 placeholder-gray-500/70 resize-none overflow-hidden"
                        style={{ minHeight: '24px', maxHeight: '200px' }}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-1">
                      <CustomQuickResponseDropdown
                        value={responseType}
                        onChange={handleResponseTypeChange}
                      />
                      <button
                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 border border-white/10 hover:border-white/20"
                        title="Attach files"
                      >
                        <Plus className="w-5 h-5" strokeWidth={2.4} />
                      </button>
                      <button
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border ${isWebSearchEnabled
                            ? 'text-blue-400 bg-white/10 border-blue-400/50'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20'
                          }`}
                        title="Web search"
                        onClick={toggleWebSearchMode}
                      >
                        <Globe className="w-5 h-5" strokeWidth={2.4} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {isListening ? (
                        <>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-200 border-white/20 hover:bg-white/10"
                            title="Cancel voice input"
                            onClick={handleCancelVoiceInput}
                            type="button"
                          >
                            <X className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-100 border-white/35 hover:bg-white/10"
                            title="Confirm voice input"
                            onClick={handleConfirmVoiceInput}
                            type="button"
                          >
                            <Check className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-400 hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20"
                            title="Voice input"
                            onClick={toggleSpeechRecognition}
                            type="button"
                          >
                            <Mic className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                          <SendButton
                            isStarting={hasStarted}
                            input={input}
                            startSSE={startSSE}
                            stopSSE={stopSSE}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions Chips */}
              {/* Suggestions Chips */}
              <div className="flex w-full max-w-3xl justify-center px-4">
                <div className="flex w-fit flex-wrap items-center justify-center gap-1 rounded-2xl">
                  {[
                    { icon: Lightbulb, title: "Brainstorm", prompt: "Brainstorm creative solutions for..." },
                    { icon: HeartHandshake, title: "Health", prompt: "Give me some health tips for..." },
                    { icon: GraduationCap, title: "Learn", prompt: "Explain the concept of..." },
                    { icon: NotepadText, title: "Quiz", prompt: "Create a quiz about..." },
                    { icon: PencilLine, title: "Advice", prompt: "I need advice on..." },
                    { icon: HiOutlineLightBulb, title: "Plan", prompt: "Help me plan my day..." },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        if (item.prompt) {
                          startSSE({ target: { textContent: item.prompt } });
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-300 transition-colors duration-200 hover:bg-[#02040a] active:bg-[#000208] hover:text-zinc-100"
                    >
                      <item.icon className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium tracking-[0.01em]">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Chat Interface (Input at Bottom) */
          <>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-32">
              <div className="max-w-3xl mx-auto w-full pt-20 px-4">
                <div className="message-wrapper space-y-6">
                  {messages.map((msg, index) => {
                    const isLastAssistantMessage = index === messages.length - 1 && msg.name !== 'User';
                    return (typeof msg.message === 'string') ? (
                      <MessageBubble
                        key={index}
                        message={{
                          role: msg.name === 'User' ? 'user' : 'assistant',
                          content: msg.message
                        }}
                        isLast={isLastAssistantMessage}
                        isStreaming={hasStarted}
                        onRetry={(mode) => {
                          // 1. Set the response type mode
                          handleResponseTypeChange(mode === 'quick' ? 'quick' : 'think');

                          // 2. Find the last user message to re-send
                          // We need to look backwards from this message
                          let lastUserMessage = "";
                          for (let i = index - 1; i >= 0; i--) {
                            if (messages[i].name === 'User') {
                              lastUserMessage = messages[i].message;
                              break;
                            }
                          }

                          if (lastUserMessage) {
                            // 3. Remove this assistant message and any subsequent messages (if any)
                            // Actually, better to just reset messages to up to the point before this one
                            setMessages(prev => prev.slice(0, index));

                            // 4. Trigger SSE with the last user message
                            // We need to simulate the event object that startSSE expects
                            // Or if startSSE handles raw strings, we can pass it directly. 
                            // Looking at code, startSSE uses `input` state or the event textContent.
                            // Let's set input content and call startSSE
                            setInput(lastUserMessage);

                            // We need a slight timeout to allow state updates or just call logic directly
                            // However, startSSE might rely on 'input' state. 
                            // Safety: Let's assume startSSE needs to be called with the text.
                            // But startSSE definition isn't fully visible.
                            // Let's look at how suggestions use it: 
                            // startSSE({ target: { textContent: item.prompt } })
                            startSSE({ target: { textContent: lastUserMessage }, skipUserMessage: true });
                          }
                        }}
                      />
                    ) : null
                  })}
                  {loading && (
                    <div className="flex justify-start px-4">
                      {toolStatus ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121722]/75 border border-[#273247] text-sm text-gray-300">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span>{toolStatus}</span>
                        </div>
                      ) : (
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>
            </div>

            {/* Input Area (Bottom Fixed) */}
            <div
              className="fixed bottom-0 right-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117] to-transparent pt-10 pb-6 px-4 z-20 transition-all duration-300"
              style={{ left: desktopSidebarOffset }}
            >
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-[#0B0E17] rounded-[24px] p-4 shadow-2xl border border-[#181B24] ring-1 ring-white/5">
                  {isListening ? (
                    renderVoiceWaveform()
                  ) : (
                    <div className="flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onInput={e => {
                          e.target.style.height = 'auto'; // Reset height
                          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; // Set new height, max 200px
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            startSSE()
                          }
                        }}
                        placeholder="Ask anything..."
                        rows={1}
                        className="pl-2 bg-transparent text-gray-200 w-full focus:outline-none text-base mb-2 placeholder-gray-500/70 resize-none overflow-y-auto custom-scrollbar"
                        style={{ minHeight: '24px', maxHeight: '200px' }}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-1">
                      <CustomQuickResponseDropdown
                        value={responseType}
                        onChange={handleResponseTypeChange}
                      />
                      <button
                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 border border-white/10 hover:border-white/20"
                        title="Attach files"
                      >
                        <Plus className="w-5 h-5" strokeWidth={2.4} />
                      </button>
                      <button
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border ${isWebSearchEnabled
                            ? 'text-blue-400 bg-white/10 border-blue-400/50'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20'
                          }`}
                        title="Web search"
                        onClick={toggleWebSearchMode}
                      >
                        <Globe className="w-5 h-5" strokeWidth={2.4} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {isListening ? (
                        <>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-200 border-white/20 hover:bg-white/10"
                            title="Cancel voice input"
                            onClick={handleCancelVoiceInput}
                            type="button"
                          >
                            <X className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-100 border-white/35 hover:bg-white/10"
                            title="Confirm voice input"
                            onClick={handleConfirmVoiceInput}
                            type="button"
                          >
                            <Check className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 border text-zinc-400 hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20"
                            title="Voice input"
                            onClick={toggleSpeechRecognition}
                            type="button"
                          >
                            <Mic className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                          <SendButton
                            isStarting={hasStarted}
                            input={input}
                            startSSE={startSSE}
                            stopSSE={stopSSE}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-600">AI can make mistakes. Please verify important information.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div >
    </div >
  );
}


export default ChatUI;

// <div className="flex-1">
//   <div className="h-screen flex flex-col">
//     <div className="flex-1 overflow-y-auto">
//       <div className="mt-10 sm:p-4 sm:space-y-2 md:space-y-4 max-w-4xl mx-auto text-gray-200 text-[14px]">
//         <div className="message-wrapper">
//           {messages.map((msg, index) => (
//             (typeof msg.message === 'string') ? (
//               <MessageBubble
//                 message={{
//                   role: msg.name === 'User' ? 'user' : 'assistant',
//                   content: msg.message
//                 }}
//               />
//             ) : null))}
//           {loading && (
//             <div className="flex justify-start">
//               <div className="typing-indicator">
//                 <span></span>
//                 <span></span>
//                 <span></span>
//               </div>
//             </div>
//           )}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>
//     </div>
//   </div>
// </div>

// ... existing code ...


// export default function WrappedChatUI(props) {
//   return (
//     <SidebarProvider>
//       <ChatUI {...props} />
//     </SidebarProvider>
//   );
// }
// {Array.isArray(messages) ? (
//   messages.map((msg, index) => {
//     if (typeof msg.message === 'string') {
//       const trimmedMessage = msg.message.trim();
//       if (trimmedMessage !== "") {
//         return (
//           <MessageBubble
//             key={index}
//             message={{
//               role: msg.name === 'User' ? 'user' : 'assistant',
//               content: msg.message,
//             }}
//           />
//         );
//       }
//     }
//     return null;
//   })
// ) : (
//   null
// )}

// <div className="flex-1 overflow-y-auto scrollbar">
//   <div className="mb-[150px] p-6 space-y-6 max-w-4xl mx-auto text-gray-200 text-[14px]">
// {messages.map((msg, index) => {
//   if (typeof msg.message === 'string') {
//     const trimmedMessage = msg.message.trim();
//     if (trimmedMessage !== "") {
//       return (
//         <MessageBubble
//           key={index}
//           message={{
//             role: msg.name === 'User' ? 'user' : 'assistant',
//             content: msg.message,
//           }}
//         />
//       );
//     }
//   }
//   return null;
// })}

// {messages.map((msg, index) => (
//   (typeof msg.message && msg.message.trim() !== "") ? (
//     <MessageBubble
//       message={{
//         role: msg.name === 'User' ? 'user' : 'assistant',
//         content: msg.message
//       }}
//     />
//   ) : null

// <div className="flex-1 overflow-y-auto scrollbar">
//   <div className="mb-[150px] p-6 space-y-6 max-w-4xl mx-auto text-gray-200 text-[14px]">
//     {messages.map((msg, index) => (
//       (msg.message && msg.message.trim() !== "") ? (
//         <div key={index} className={`flex ${msg.name === 'User' ? 'justify-end' : 'justify-start'}`}>
//           <div className={`mt-2 mb-2  ${msg.name === 'User' ? 'px-3 py-2 shadow-lg max-w-[80%] break-words rounded-2xl bg-[#1e2942] bg-opacity-50' : ''}`}>
//             {msg.message}
//           </div>
//         </div>
//       ) : null
//     ))}


// ##############################################################################################################################################################
// ##############################################################################################################################################################
// const updateChatSessionsRef = useRef();
// // Function to update chat sessions in AppSidebar
// const handleUpdateChatSessions = useCallback((newSessions) => {
//   setChatSessions(newSessions);
// }, []);
// useEffect(() => {
//   updateChatSessionsRef.current = handleUpdateChatSessions;
// }, [handleUpdateChatSessions]);

// const refetchChatSessions = useCallback(() => {
//   fetch(`${process.env.REACT_APP_POINT_AGENT}/api/v1/generate-stream/chat-sessions`, {
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${localStorage.getItem('token')}`,
//     }
//   })
//     .then(response => response.json())
//     .then(data => {
//       if (data.sessions) {
//         const sortedSessions = data.sessions.sort((a, b) =>
//           new Date(b.timestamp) - new Date(a.timestamp)
//         );
//         // Call a function in AppSidebar to update the chat sessions
//         handleUpdateChatSessions(sortedSessions);
//       }
//     })
//     .catch(error => console.error('Error fetching chat sessions:', error));
// }, []);
