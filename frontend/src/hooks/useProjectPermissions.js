export function useProjectPermissions(project) {
  const user = JSON.parse(localStorage.getItem("devlink_user"));

  if (!project || !user) return {};

  const member = project.team_members.find(
    m => m.user === user._id
  );

  return {
    isOwner: member?.role === "owner",
    canEdit: member?.role === "owner",
    canChat: !!member,
  };
}
