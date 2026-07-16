import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${API_BASE}/api`;

const highlightMentions = (text) => {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("@")) {
      return (
        <span key={idx} className="text-blue-600 font-semibold">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

export default function ProjectChatPanel({
  projectId,
  user,
  canChat = true,
  showHeader = false,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const socketRef = useRef(null);

  const localUser = useMemo(() => {
    if (user) return user;
    const stored = localStorage.getItem("devlink_user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [user]);

  const userId = useMemo(
    () => localUser?.id || localUser?._id,
    [localUser]
  );

  const upsertMessage = (msg) => {
    if (!msg) return;
    setMessages((prev) => {
      const hasId = msg._id && prev.some((m) => m._id === msg._id);
      if (hasId) return prev;
      return [...prev, msg];
    });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchMessages();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const socket = io(API_BASE, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("joinProjectRoom", projectId);

    socket.on("receiveMessage", (msg) => {
      if (msg?.projectId && String(msg.projectId) !== String(projectId)) return;
      upsertMessage(msg);
    });

    return () => {
      socket.off("receiveMessage");
      socket.disconnect();
    };
  }, [projectId]);

  const handleReply = (msg) => {
    setReplyTo({
      _id: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
    });
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!canChat) return;

    try {
      const res = await axios.post(`${API}/chat/${projectId}`, {
        text: text.trim(),
        senderId: userId,
        senderName: localUser?.name || "Unknown",
        replyTo: replyTo?._id,
        replySenderId: replyTo?.senderId,
        replySenderName: replyTo?.senderName,
        replyText: replyTo?.text,
      });

      upsertMessage(res.data);
      setText("");
      setReplyTo(null);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <h2 className="text-2xl font-bold mb-4 text-center">
          Project Group Chat
        </h2>
      )}

      <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-y-auto mb-4">
        {loading && <p className="text-center">Loading...</p>}

        {!loading && messages.length === 0 && (
          <p className="text-gray-400 text-center">No messages yet</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg._id || i}
            className={`mb-3 flex ${
              msg.senderId === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs ${
                msg.senderId === userId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.replyTo && (
                <div className="mb-2 p-2 rounded bg-white/30 text-xs">
                  <p className="font-semibold">
                    Reply to @{msg.replySenderName || "user"}
                  </p>
                  <p className="line-clamp-2">{msg.replyText}</p>
                </div>
              )}

              <p className="text-xs font-bold mb-1 text-gray-700">
                {msg.senderName}
              </p>
              <p>{highlightMentions(msg.text)}</p>

              <button
                onClick={() => handleReply(msg)}
                className="text-xs mt-2 underline opacity-80"
                type="button"
              >
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="mb-2 px-3 py-2 bg-gray-100 rounded flex items-center justify-between">
          <div className="text-sm">
            Replying to <span className="font-semibold">@{replyTo.senderName}</span>
            : <span className="text-gray-600">{replyTo.text}</span>
          </div>
          <button
            className="text-sm underline"
            onClick={() => setReplyTo(null)}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={canChat ? "Type message..." : "Join the project to chat"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={!canChat}
        />

        <Button onClick={sendMessage} className="btn-primary" disabled={!canChat}>
          Send
        </Button>
      </div>
    </div>
  );
}
