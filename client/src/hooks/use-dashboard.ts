import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dashboard, InsertDashboard } from "@shared/schema";
import { useSpaceStore } from "@/hooks/use-spaces";

/**
 * Hook for dashboard-related operations
 */
export function useDashboard(id?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentSpaceId } = useSpaceStore();

  // Fetch all dashboards filtered by the current space
  const dashboardsQuery = useQuery({
    queryKey: ['/api/dashboards', { spaceId: currentSpaceId }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards?spaceId=${currentSpaceId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboards');
      return res.json();
    },
    enabled: !!currentSpaceId,
  });

  // Fetch a specific dashboard if ID is provided
  const dashboardQuery = useQuery({
    queryKey: ['/api/dashboards', id],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}/${queryKey[1]}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    enabled: !!id,
  });

  // Create a new dashboard
  const createDashboard = useMutation({
    mutationFn: async (dashboard: InsertDashboard) => {
      // Ensure the dashboard is created in the current space
      const dashboardWithSpace = {
        ...dashboard,
        spaceId: currentSpaceId || undefined
      };
      return apiRequest('POST', '/api/dashboards', dashboardWithSpace);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', { spaceId: currentSpaceId }] });
      toast({
        title: "Dashboard created",
        description: "Your dashboard has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create dashboard: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update a dashboard
  const updateDashboard = useMutation({
    mutationFn: async ({ id, dashboard }: { id: number; dashboard: Partial<Dashboard> }) => {
      return apiRequest('PUT', `/api/dashboards/${id}`, dashboard);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', { spaceId: currentSpaceId }] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', variables.id] });
      toast({
        title: "Dashboard updated",
        description: "Your dashboard has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update dashboard: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete a dashboard
  const deleteDashboard = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/dashboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', { spaceId: currentSpaceId }] });
      toast({
        title: "Dashboard deleted",
        description: "Your dashboard has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete dashboard: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update dashboard layout (widget positions)
  const updateLayout = useMutation({
    mutationFn: async ({ id, layout }: { id: number; layout: any }) => {
      return apiRequest('PUT', `/api/dashboards/${id}`, { layout });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', variables.id] });
    },
    // No toast for layout updates to avoid spamming the user
  });

  return {
    dashboards: dashboardsQuery.data || [],
    dashboard: dashboardQuery.data,
    isLoading: dashboardsQuery.isLoading || dashboardQuery.isLoading,
    isError: dashboardsQuery.isError || dashboardQuery.isError,
    createDashboard: createDashboard.mutate,
    updateDashboard: updateDashboard.mutate,
    deleteDashboard: deleteDashboard.mutate,
    updateLayout: updateLayout.mutate,
    isPending: 
      createDashboard.isPending || 
      updateDashboard.isPending || 
      deleteDashboard.isPending || 
      updateLayout.isPending
  };
}

export default useDashboard;
