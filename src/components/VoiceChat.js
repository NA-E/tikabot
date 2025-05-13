import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const VoiceChat = () => {
  // States for tracking conversation
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  
  // Use refs to maintain instance between renders
  const vapiClientRef = useRef(null);
  
  // Initialize Vapi client once
  useEffect(() => {
    console.log("Initializing Vapi client");
    if (!vapiClientRef.current) {
      vapiClientRef.current = new Vapi("9e52f417-f032-4619-8d8c-2b789d14a1fc");
      setupEventListeners();
    }
    
    // Cleanup function
    return () => {
      console.log("Component unmounting, cleaning up Vapi client");
      if (vapiClientRef.current && isActive) {
        try {
          vapiClientRef.current.stop();
          console.log("Vapi client stopped");
        } catch (err) {
          console.error("Error stopping Vapi client:", err);
        }
      }
    };
  }, []);
  
  // Setup event listeners separately to avoid recreation
  const setupEventListeners = () => {
    if (!vapiClientRef.current) {
      console.error("Cannot setup listeners - Vapi client not initialized");
      return;
    }
    
    const client = vapiClientRef.current;
    
    // Remove existing listeners if any (prevents duplicates)
    client.removeAllListeners();
    
    client.on("call-start", () => {
      console.log("Call started");
      setIsActive(true);
      setError(null);
    });
    
    client.on("call-end", () => {
      console.log("Call ended");
      setIsActive(false);
      setIsSpeaking(false);
      setVolumeLevel(0);
    });
    
    client.on("speech-start", () => {
      console.log("User started speaking");
      setIsSpeaking(true);
    });
    
    client.on("speech-end", () => {
      console.log("User stopped speaking");
      setIsSpeaking(false);
    });
    
    client.on("volume-level", (level) => {
      // Throttle volume updates to avoid too many renders
      if (Math.abs(level - volumeLevel) > 0.05) {
        setVolumeLevel(level);
      }
    });
    
    client.on("message", (message) => {
      console.log("Received message:", message);
      
      try {
        // Handle transcript messages (user speech)
        if (message.type === "transcript" && message.content) {
          const userMessage = {
            id: `user-${Date.now()}`,
            type: 'user',
            text: message.content
          };
          
          setMessages(prev => {
            // Check if this exact message already exists
            const exists = prev.some(m => 
              m.type === 'user' && m.text === message.content
            );
            
            return exists ? prev : [...prev, userMessage];
          });
        }
        
        // Handle conversation updates
        if (message.type === "conversation-update" && 
            message.conversation && 
            Array.isArray(message.conversation)) {
          
          // Process the whole conversation to ensure we have all messages
          const processedMessages = message.conversation
            .filter(msg => msg.role && msg.content) // Only messages with content
            .map(msg => ({
              id: `${msg.role}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: msg.role === "assistant" ? 'assistant' : 
                   msg.role === "user" ? 'user' : 'system',
              text: msg.content
            }));
          
          if (processedMessages.length > 0) {
            // Replace all messages to ensure consistency with server state
            setMessages(processedMessages);
          }
        }
      } catch (err) {
        console.error("Error processing message:", err, message);
        setError("Error processing message from assistant");
      }
    });
    
    client.on("error", (error) => {
      console.error("Vapi error:", error);
      setIsActive(false);
      setIsSpeaking(false);
      setError(error.error?.message || "An error occurred with the voice chat");
    });
    
    console.log("All event listeners setup successfully");
  };
  
  const toggleConversation = async () => {
    if (!vapiClientRef.current) {
      setError("Voice chat system not initialized. Please refresh the page.");
      return;
    }
    
    try {
      if (isActive) {
        // Stop the conversation
        console.log("Stopping conversation");
        await vapiClientRef.current.stop();
      } else {
        // Start the conversation
        setError(null);
        console.log("Starting conversation");
        await vapiClientRef.current.start("2244be56-5967-41eb-b4ae-b5981148aa06");
      }
    } catch (err) {
      console.error("Error toggling conversation:", err);
      setError(`Could not ${isActive ? 'stop' : 'start'} voice chat: ${err.message}`);
    }
  };
  
  // Calculate microphone animation based on volume
  const micScale = isSpeaking ? (1 + Math.min(volumeLevel * 0.8, 0.5)) : 1; 
  
  return (
    <div className="chat-container">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      <div className="status-indicator">
        {isActive && (
          <div className="active-status">
            <div className="status-dot" />
            <span>{isSpeaking ? "Listening..." : "Conversation active"}</span>
          </div>
        )}
      </div>
      
      <div className="chat-box">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Hello! I'm Tikabot</h2>
              <p>Click the microphone button to start talking with me</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <div className="message-avatar">
                  {msg.type === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-bubble">
                  <div className="message-content">{msg.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="controls">
        <button 
          onClick={toggleConversation} 
          className={`mic-button ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
          disabled={error && !isActive}
          style={{ transform: `scale(${micScale})`, transition: 'transform 0.1s ease-in-out' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
          <span className="mic-label">
            {isActive ? (isSpeaking ? 'Listening...' : 'Tap to end') : 'Talk to Tikabot'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default VoiceChat;