// AssistantService.js
// Centralized service for assistant session/conversation API calls

// const BASE_URL = "http://localhost:8000";
const BASE_URL = process.env.REACT_APP_POINT_AGENT 

export default class AssistantService {
  // Original blocking API methods
  static async startConversation(human_request) {
    const response = await fetch(`${BASE_URL}/api/v1/generate-stream/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ human_request })
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  }


  static async createStreamingConversation(messageToSend, responseType) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/api/v1/generate-stream/create`, {  // Corrected path
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`  // Add the Authorization header
      },
      body: JSON.stringify({
        "query": messageToSend,
        "queryModeType": responseType
      })
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  }

    static streamResponse(thread_id, onMessageCallback, onErrorCallback, onCompleteCallback) {
    // Create a new EventSource connection to the streaming endpoint
    const eventSource = new EventSource(`${BASE_URL}/api/v1/generate-stream/${thread_id}`);
    AssistantService.currentEventSource = eventSource
    let streamSettled = false;

    const settleComplete = () => {
      if (streamSettled) return;
      streamSettled = true;
      eventSource.close();
      if (AssistantService.currentEventSource === eventSource) {
        AssistantService.currentEventSource = null;
      }
      onCompleteCallback();
    };

    const settleError = (error) => {
      if (streamSettled) return;
      streamSettled = true;
      eventSource.close();
      if (AssistantService.currentEventSource === eventSource) {
        AssistantService.currentEventSource = null;
      }
      onErrorCallback(error);
    };

    // Handle token events (content streaming)
    eventSource.addEventListener('token', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageCallback({ content: data.content });
      } catch (error) {
        console.error("Error parsing token event:", error, "Raw data:", event.data);
        onErrorCallback(error);
      }
    });
    
    // Handle status events (user_feedback, finished)
    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageCallback({ status: data.status });
        
        // Mark that we've received a status event for this connection
        // This helps us distinguish between normal completion and errors
        if (!window._hasReceivedStatusEvent) {
          window._hasReceivedStatusEvent = {};
        }
        window._hasReceivedStatusEvent[eventSource.url] = true;
        console.log("Received status event, marking connection for normal closure");
        if (data.status === "finished") {
          settleComplete();
        }
      } catch (error) {
        console.error("Error parsing status event:", error, "Raw data:", event.data);
        settleError(error);
      }
    });

    // Handle tool execution events
    eventSource.addEventListener('tool', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Tool event received:", data);
        onMessageCallback({ tool: data });
      } catch (error) {
        console.error("Error parsing tool event:", error, "Raw data:", event.data);
        settleError(error);
      }
    });

    // Handle source citation events
    eventSource.addEventListener('sources', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageCallback({ sources: data.sources || [] });
      } catch (error) {
        console.error("Error parsing sources event:", error, "Raw data:", event.data);
        settleError(error);
      }
    });
    
    // Handle start/resume events
    eventSource.addEventListener('start', (event) => {
      console.log("Stream started:", event.data);
    });
    
    eventSource.addEventListener('resume', (event) => {
      console.log("Stream resumed:", event.data);
    });

    eventSource.addEventListener('close', () => {
      console.log("Received close event from server");
      settleComplete();
    });
    
    // Handle errors
    eventSource.onerror = (error) => {
      if (streamSettled) {
        return;
      }
      console.log("SSE connection state change - readyState:", eventSource.readyState);
      
      // Check if we've received a status event indicating completion
      const hasReceivedStatusEvent = window._hasReceivedStatusEvent && window._hasReceivedStatusEvent[eventSource.url];
      
      if (hasReceivedStatusEvent) {
        console.log("Stream completed normally after receiving status event");
        settleComplete();
        return;
      }
      
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("Stream closed");
        settleComplete();
        return;
      }

      // CONNECTING is usually transient auto-reconnect; do not fail immediately.
      if (eventSource.readyState === EventSource.CONNECTING) {
        console.log("Stream reconnecting...");
        return;
      }

      // Only call the error callback if it's a real error.
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.error("SSE connection error:", error);
        settleError(new Error("Connection error or server disconnected"));
      }
    };
    
    // Return the eventSource so it can be closed externally if needed
    return eventSource;
  }

  static stopStreaming() {
    if (AssistantService.currentEventSource) {
      AssistantService.currentEventSource.close();
      console.log("Streaming stopped");
      AssistantService.currentEventSource = null; // Clear the reference
    } else {
      console.log("No active stream to stop");
    }
  }
}
