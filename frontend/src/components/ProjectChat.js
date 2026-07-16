import React from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import ProjectChatPanel from "./project/ProjectChat";

const ProjectChat = ({ user, onLogout }) => {
  const { projectId } = useParams();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} onLogout={onLogout} />

      <div className="max-w-4xl mx-auto p-6 flex flex-col h-[90vh]">
        <ProjectChatPanel
          projectId={projectId}
          user={user}
          canChat
          showHeader
        />
      </div>
    </div>
  );
};

export default ProjectChat;
