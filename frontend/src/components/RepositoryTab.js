import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { FileText, Folder, MoreHorizontal, Plus } from "lucide-react";

const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

const RepositoryTab = ({ projectId }) => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [content, setContent] = useState("");
    const [commits, setCommits] = useState([]);
    const [commitMessage, setCommitMessage] = useState("");
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [previewHTML, setPreviewHTML] = useState("");
    const [consoleOutput, setConsoleOutput] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [nameShift, setNameShift] = useState({});
    const nameRefs = useRef({});
    const previewFrameRef = useRef(null);
    const runIdRef = useRef(0);

    const token = localStorage.getItem("devlink_token");

    useEffect(() => {
        fetchFiles();
        fetchCommits();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== previewFrameRef.current?.contentWindow) return;

            const data = event.data || {};
            if (data.runId !== runIdRef.current) return;

            if (data.type === "console") {
                setConsoleOutput((prev) => prev + data.message + "\n");
                return;
            }

            if (data.type === "runtime-error") {
                setConsoleOutput((prev) => prev + `[runtime error] ${data.message}\n`);
                return;
            }

            if (data.type === "runner-ready") {
                setConsoleOutput((prev) => prev + "[runner] Preview initialized\n");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const fetchFiles = async () => {
        try {
            const res = await axios.get(`${API}/files/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFiles(res.data);
        } catch (err) {
            toast.error("Failed to load files");
        }
    };

    const selectFile = (file) => {
        if (file.isFolder) {
            return;
        }
        setOpenMenuId(null);
        setSelectedFile(file);
        setContent(file.content || "");
    };

    const getNodeMeta = (file) => {
        const cleanPath = file.path.endsWith("/") ? file.path.slice(0, -1) : file.path;
        const parts = cleanPath.split("/").filter(Boolean);
        const name = parts[parts.length - 1] || cleanPath;
        const depth = Math.max(parts.length - 1, 0);
        return {
            name: file.isFolder ? `${name}/` : name,
            fullPath: file.path,
            depth,
        };
    };

    const handleNameHover = (fileId) => {
        const textEl = nameRefs.current[fileId];
        if (!textEl || !textEl.parentElement) return;
        const containerEl = textEl.parentElement;
        const overflow = Math.max(textEl.scrollWidth - containerEl.clientWidth, 0);
        setNameShift((prev) => ({ ...prev, [fileId]: overflow }));
    };

    const resetNameHover = (fileId) => {
        setNameShift((prev) => ({ ...prev, [fileId]: 0 }));
    };

    const createNode = async (isFolder) => {
        const label = isFolder ? "folder" : "file";
        const input = window.prompt(`Enter ${label} path`, isFolder ? "src/components" : "src/components/NewFile.js");
        if (!input) return;

        try {
            const res = await axios.post(
                `${API}/files`,
                {
                    projectId,
                    path: input.trim(),
                    isFolder,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success(`${isFolder ? "Folder" : "File"} created`);
            await fetchFiles();
            if (!isFolder) {
                selectFile(res.data);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || `Failed to create ${label}`);
        }
    };

    const fetchCommits = async () => {
        try {
            const res = await axios.get(`${API}/commits/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setCommits(res.data);
        } catch (err) {
            console.error("Failed to fetch commits");
        }
    };

    const deleteNode = async (file) => {
        const itemType = file.isFolder ? "folder" : "file";
        const confirmed = window.confirm(`Delete this ${itemType}? ${file.path}`);
        if (!confirmed) return;

        try {
            await axios.delete(`${API}/files/${file._id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (selectedFile?._id === file._id) {
                setSelectedFile(null);
                setContent("");
            }

            setOpenMenuId(null);
            await fetchFiles();
            toast.success(`${itemType[0].toUpperCase()}${itemType.slice(1)} deleted`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete");
        }
    };

    const saveFile = async () => {
        if (!selectedFile) return;

        try {
            console.log("Sending message:", commitMessage);
            await axios.put(
                `${API}/files/${selectedFile._id}`,
                {
                    content,
                    message: commitMessage,   // 🔥 added
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success("File saved");
            setCommitMessage("");
            fetchFiles();     // refresh file list
            fetchCommits();   // 🔥 refresh commit history

        } catch (err) {
            toast.error("Failed to save file");
        }
    };
    
    const getLanguageFromPath = (path) => {
        if (!path) return "javascript";

        if (path.endsWith(".js")) return "javascript";
        if (path.endsWith(".ts")) return "typescript";
        if (path.endsWith(".json")) return "json";
        if (path.endsWith(".html")) return "html";
        if (path.endsWith(".css")) return "css";
        if (path.endsWith(".py")) return "python";

        return "javascript";
    };


    const findFileByName = (name) => {
        const lower = name.toLowerCase();
        return files.find((f) => {
            const p = String(f.path || "").toLowerCase();
            return p === lower || p.endsWith(`/${lower}`);
        });
    };

    const escapeScriptContent = (text) => String(text || "").replace(/<\/script/gi, "<\\/script");
    const escapeStyleContent = (text) => String(text || "").replace(/<\/style/gi, "<\\/style");

    const askAI = async () => {
        if (!aiPrompt) return;

        try {
            setAiLoading(true);

            const res = await axios.post(
                `${API}/ai/code-assist`,
                {
                    prompt: aiPrompt,
                    code: content || "",
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setAiResponse(res.data.result);

        } catch (err) {
            console.error("AI error:", err);
            toast.error(err?.response?.data?.message || "AI request failed");
        } finally {
            setAiLoading(false);
        }
    };
    const runProject = () => {
        const htmlFile = findFileByName("index.html");
        const cssFile = findFileByName("style.css");
        const jsFile = findFileByName("script.js");

        if (!htmlFile) {
            alert("No index.html found in project");
            return;
        }

        const runId = Date.now();
        runIdRef.current = runId;
        setConsoleOutput("");

        const safeCSS = escapeStyleContent(cssFile?.content || "");
        const safeJS = escapeScriptContent(jsFile?.content || "");

        const combinedHTML = `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      ${safeCSS}
    </style>
  </head>
  <body>
    ${htmlFile.content || ""}

    <script>
      (function () {
        const RUN_ID = ${runId};

        const stringifyArg = (value) => {
          if (typeof value === "string") return value;
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };

        const forward = (type, args) => {
          parent.postMessage(
            {
              type,
              runId: RUN_ID,
              message: (args || []).map(stringifyArg).join(" "),
            },
            "*"
          );
        };

        ["log", "info", "warn", "error"].forEach((method) => {
          const original = console[method];
          console[method] = (...args) => {
            forward("console", ["[" + method + "]", ...args]);
            if (typeof original === "function") {
              original.apply(console, args);
            }
          };
        });

        window.addEventListener("error", (e) => {
          parent.postMessage(
            {
              type: "runtime-error",
              runId: RUN_ID,
              message: e.message || "Unknown script error",
            },
            "*"
          );
        });

        window.addEventListener("unhandledrejection", (e) => {
          const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason || "Unhandled promise rejection");
          parent.postMessage(
            {
              type: "runtime-error",
              runId: RUN_ID,
              message: reason,
            },
            "*"
          );
        });

        parent.postMessage({ type: "runner-ready", runId: RUN_ID }, "*");
      })();
    </script>

    <script>
      ${safeJS}
    </script>
  </body>
</html>
`;

        setPreviewHTML(combinedHTML);
    };
    return (
        <div className="flex h-[70vh] gap-4">

            {/* File List */}
            <div className="w-72 border-r p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">Files</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => createNode(false)}
                            className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded flex items-center gap-1"
                        >
                            <Plus size={12} /> File
                        </button>
                        <button
                            onClick={() => createNode(true)}
                            className="text-xs bg-gray-700 text-white px-2.5 py-1.5 rounded flex items-center gap-1"
                        >
                            <Plus size={12} /> Folder
                        </button>
                    </div>
                </div>
                <div className="space-y-1">
                    {files.map((file) => (
                        <div key={file._id} className="group">
                            <div
                                className={`text-sm p-2 rounded flex items-center justify-between ${selectedFile?._id === file._id ? "bg-gray-200" : "hover:bg-gray-100"} ${file.isFolder ? "cursor-default" : "cursor-pointer"}`}
                                onMouseLeave={() => resetNameHover(file._id)}
                            >
                                <div
                                    className="flex items-center gap-2 min-w-0 flex-1"
                                    style={{ paddingLeft: `${Math.min(getNodeMeta(file).depth * 14, 56)}px` }}
                                    onClick={() => selectFile(file)}
                                    onMouseEnter={() => handleNameHover(file._id)}
                                >
                                    {file.isFolder ? (
                                        <Folder size={14} className="text-amber-600 shrink-0" />
                                    ) : (
                                        <FileText size={14} className="text-slate-500 shrink-0" />
                                    )}
                                    <div
                                        className="overflow-hidden whitespace-nowrap min-w-0 text-slate-800"
                                        title={getNodeMeta(file).fullPath}
                                    >
                                        <span
                                            ref={(el) => {
                                                nameRefs.current[file._id] = el;
                                            }}
                                            className="inline-block transition-transform duration-500 ease-out"
                                            style={{ transform: `translateX(-${nameShift[file._id] || 0}px)` }}
                                        >
                                            {getNodeMeta(file).name}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative ml-2 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId((prev) => (prev === file._id ? null : file._id));
                                        }}
                                        className="p-1 rounded hover:bg-slate-300 text-slate-600"
                                        aria-label="More options"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                    {openMenuId === file._id && (
                                        <div className="absolute right-0 mt-1 bg-white border rounded shadow z-20 min-w-24">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNode(file);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4 flex gap-4">
                {selectedFile ? (
                    <>
                        {/* LEFT SIDE — EDITOR */}
                        <div className="flex-1">
                            <h3 className="font-semibold mb-2">{selectedFile.path}</h3>

                            <Editor
                                height="400px"
                                language={getLanguageFromPath(selectedFile?.path)}
                                theme="vs-dark"
                                value={content}
                                onChange={(value) => setContent(value || "")}
                            />

                            <input
                                type="text"
                                placeholder="Commit message..."
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                className="w-full border p-2 rounded mb-2"
                            />

                            <button
                                onClick={saveFile}
                                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Save File
                            </button>

                            {/* COMMIT HISTORY */}
                            <div className="mt-6">
                                <h4 className="font-semibold mb-2">Commit History</h4>

                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {commits.map((commit) => (
                                        <div
                                            key={commit._id}
                                            className="text-xs border p-2 rounded bg-gray-50"
                                        >
                                            <p className="font-medium">{commit.message}</p>

                                            <p className="text-gray-600">
                                                By: {commit.userId?.name || "Unknown User"}
                                            </p>

                                            <p className="text-gray-500">
                                                {new Date(commit.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={runProject}
                                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Run Project
                            </button>

                            {previewHTML && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Live Preview</h4>

                                    <iframe
                                        ref={previewFrameRef}
                                        title="project-preview"
                                        srcDoc={previewHTML}
                                        sandbox="allow-scripts"
                                        className="w-full h-64 border rounded"
                                    />

                                    <h4 className="font-semibold mt-4 mb-2">Console Output</h4>
                                    <pre className="bg-gray-100 text-gray-800 p-2 h-32 overflow-y-auto rounded border">
                                        {consoleOutput}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDE — AI PANEL */}
                        <div className="w-80 bg-white text-gray-900 p-4 rounded border">
                            <h3 className="font-semibold mb-3">AI Assistant</h3>

                            <textarea
                                placeholder="Ask AI to improve or fix code..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-32 p-2 rounded border"
                            />

                            <button
                                onClick={askAI}
                                className="mt-3 bg-blue-600 text-white w-full py-2 rounded"
                            >
                                {aiLoading ? "Thinking..." : "Ask AI"}
                            </button>
                            {aiResponse && (
                                <div className="mt-4 bg-gray-100 border p-2 rounded text-sm overflow-y-auto max-h-40">
                                    <pre>{aiResponse}</pre>

                                    <button
                                        onClick={() => setContent(aiResponse)}
                                        className="mt-2 bg-blue-600 text-white w-full py-1 rounded"
                                    >
                                        Insert Into Editor
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p>Select a file to edit</p>
                )}
            </div>
        </div>
    );
};

export default RepositoryTab;   



