import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectHeader from "./project/ProjectHeader";
import ProjectOverview from "./project/ProjectOverview";
import ProjectChat from "./project/ProjectChat";
import ProjectActivity from "./project/ProjectActivity";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const { project, loading } = useProjectWorkspace(projectId);
  const permissions = useProjectPermissions(project);

  if (loading) return <div>Loading workspace...</div>;

  return (
    <div className="p-6 space-y-4">
      <ProjectHeader project={project} permissions={permissions} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} />
        </TabsContent>

        <TabsContent value="chat">
          <ProjectChat projectId={projectId} canChat={permissions.canChat} />
        </TabsContent>

        <TabsContent value="activity">
          <ProjectActivity projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
