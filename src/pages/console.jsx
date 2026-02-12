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
  Lightbulb, GraduationCap, PanelLeftOpen, PanelRightOpen, NotepadText,
  PencilLine, HeartHandshake, LogOut, Loader
} from 'lucide-react';
import AssistantService from "../AssistantService";
import SendButton from '../components/ui/send_button'
import AnimatedKnot from "../components/ui/animated_knot";




const ChatUI = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [responseType, setResponseType] = useState("quick");
  const [welcomeMounted, setWelcomeMounted] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const startAccumulatedResponseRef = useRef("");
  const [hasStarted, setHasStarted] = useState(false)
  const [threadId, setThreadId] = useState('')
  const [logoutload, setLodoutLoad] = useState(false)




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
  };

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
      // Streaming API call
      const data = await AssistantService.createStreamingConversation(
        messageToSend,
        responseType
      );
      setHasStarted(true)
      setThreadId(data.thread_id);

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
          // Check if error has a message property before using it
          const errorMessage = error && error.message ? error.message : "Unknown error";
          alert("Streaming error: " + errorMessage);
          setHasStarted(false)
        },
        // Complete callback
        () => {
          console.log("Stream completed");
          setHasStarted(false)
          // Final history update is already handled in the message callback
        }

      );
    } catch (err) {
      setMessages("");
      // Check if error has a message property before using it
      const errorMessage = err && err.message ? err.message : "Unknown error";
      alert("Failed to contact backend: " + errorMessage);
      setHasStarted(false)
    }

  };

  // Stop the Server Side Events 
  const stopSSE = async () => {
    AssistantService.stopStreaming();
    setHasStarted(false)
    setLoading(false)
  }

  // Refresh the chat_history if new chat_session has been created
  const handleSelectChatSession = (sessionId) => {
    setMessages([]); // Clear current messages
    setLoading(false);
    setWelcomeMounted(false)
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
      });
  };


  // const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768)

  useEffect(() => {
    if (!isMobile) {
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
        />
      </div>


      {/* Main content */}
      <div className="flex-1 flex flex-col bg-[#0f1117] text-white w-full relative h-full">
        {/* Navbar */}
        <div className="fixed flex items-center top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            {isMobile && (
              <>
                {isOpen ? (
                  null
                ) : (

                  <button
                    className="text-gray-200 top-0 left-0 m-1 ml-2 p-3 z-40 focus:outline-none button-hover hover:text-cyan-400"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <PanelLeftOpen size={22} />
                  </button>
                )}
              </>
            )}
            {!isMobile && (
              <>
                {isOpen ? (
                  <button
                    className="translate-x-64 text-gray-200 top-0 left-0 m-1 ml-2 p-3 z-40 focus:outline-none "
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <PanelRightOpen size={22} />
                  </button>
                ) : (

                  <button
                    className="text-gray-200 top-0 left-0 m-1 ml-2 p-3 z-40 focus:outline-none button-hover hover:text-cyan-400"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <PanelLeftOpen size={22} />
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 m-1 mr-2 p-3 rounded-full pointer-events-auto">
            {logoutload ? <Loader size={20} className="loader" /> : <LogOut size={20} />}
          </button>
        </div>


        {/* Centered Welcome / Input Container */}
        {messages.length === 0 ? (
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
                      className="pl-2 bg-transparent text-gray-200 w-full focus:outline-none text-base mb-3 placeholder-gray-500/70 resize-none overflow-hidden"
                      style={{ minHeight: '24px', maxHeight: '200px' }}
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <CustomQuickResponseDropdown
                      value={responseType}
                      onChange={setResponseType}
                    />
                    <SendButton
                      isStarting={hasStarted}
                      input={input}
                      startSSE={startSSE}
                      stopSSE={stopSSE}
                    />
                  </div>
                </div>
              </div>

              {/* Suggestions Chips */}
              {/* Suggestions Chips */}
              <div className="w-full max-w-3xl px-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { icon: Lightbulb, color: "text-yellow-500", title: "Brainstorm", prompt: "Brainstorm creative solutions for..." },
                    { icon: HeartHandshake, color: "text-blue-500", title: "Health", prompt: "Give me some health tips for..." },
                    { icon: GraduationCap, color: "text-green-500", title: "Learn", prompt: "Explain the concept of..." },
                    { icon: NotepadText, color: "text-violet-500", title: "Quiz", prompt: "Create a quiz about..." },
                    { icon: PencilLine, color: "text-pink-500", title: "Advice", prompt: "I need advice on..." },
                    { icon: HiOutlineLightBulb, color: "text-cyan-500", title: "Plan", prompt: "Help me plan my day..." },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        if (item.prompt) {
                          startSSE({ target: { textContent: item.prompt } });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#161b22]/80 hover:bg-[#2d3342] border border-[#363b49] hover:border-gray-400 rounded-full transition-all duration-200 group"
                    >
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm font-medium text-gray-200 group-hover:text-white">{item.title}</span>
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
                        onRetry={(mode) => {
                          // 1. Set the response type mode
                          setResponseType(mode === 'quick' ? 'quick_response' : 'think_deeper');

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
                            startSSE({ target: { textContent: lastUserMessage } });
                          }
                        }}
                      />
                    ) : null
                  })}
                  {loading && (
                    <div className="flex justify-start px-4">
                      <div className="typing-indicator flex space-x-1">
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>
            </div>

            {/* Input Area (Bottom Fixed) */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117] to-transparent pt-10 pb-6 px-4 z-20">
              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-[#0B0E17] rounded-[24px] p-4 shadow-2xl border border-[#181B24] ring-1 ring-white/5">
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
                  <div className="flex justify-between items-center pt-2">
                    <CustomQuickResponseDropdown
                      value={responseType}
                      onChange={setResponseType}
                    />
                    <SendButton
                      isStarting={hasStarted}
                      input={input}
                      startSSE={startSSE}
                      stopSSE={stopSSE}
                    />
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
