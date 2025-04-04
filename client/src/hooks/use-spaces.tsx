import { useQuery, useMutation } from "@tanstack/react-query";
import { Space, InsertSpace } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { create } from "zustand";
import { useWebSocket } from "@/lib/websocket-service";
import { useAuth } from "@/hooks/use-auth";

// Spaces store to maintain the currently selected space
interface SpaceStore {
  currentSpaceId: number | null;
  setCurrentSpaceId: (id: number | null) => void;
}

export const useSpaceStore = create<SpaceStore>((set) => ({
  currentSpaceId: 1, // Default to the default space
  setCurrentSpaceId: (id) => set({ currentSpaceId: id }),
}));

/**
 * Hook for spaces-related operations
 */
export function useSpaces() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscribe, switchSpace } = useWebSocket();
  const { currentSpaceId, setCurrentSpaceId } = useSpaceStore();
  const [switchingSpace, setSwitchingSpace] = useState(false);

  // Fetch all available spaces
  const { 
    data: spaces = [], 
    isLoading: isLoadingSpaces, 
    error: spacesError
  } = useQuery<Space[]>({
    queryKey: ['/api/spaces'],
    retry: 1,
    staleTime: 60000 // 1 minute
  });

  // Handle spaces error separately
  useEffect(() => {
    if (spacesError) {
      console.error('Error fetching spaces:', spacesError);
      toast({
        title: 'Error fetching spaces',
        description: spacesError.message,
        variant: 'destructive',
      });
    }
  }, [spacesError, toast]);

  // Fetch user's spaces
  const { 
    data: userSpaces = [], 
    isLoading: isLoadingUserSpaces,
    error: userSpacesError
  } = useQuery<Space[]>({
    queryKey: ['/api/spaces/user', user?.id],
    queryFn: async () => {
      if (!user || !user.id) {
        return [];
      }
      const response = await fetch(`/api/spaces/user?userId=${user.id}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch user spaces');
      }
      return response.json();
    },
    retry: 1,
    staleTime: 60000, // 1 minute
    enabled: !!user?.id // Only run the query if we have a user ID
  });
  
  // Handle user spaces error separately
  useEffect(() => {
    if (userSpacesError) {
      console.error('Error fetching user spaces:', userSpacesError);
      toast({
        title: 'Error fetching your spaces',
        description: userSpacesError.message,
        variant: 'destructive',
      });
    }
  }, [userSpacesError, toast]);

  // Create a new space
  const createSpaceMutation = useMutation({
    mutationFn: async (spaceData: Omit<InsertSpace, 'slug'>) => {
      if (!user || !user.id) {
        throw new Error("You must be logged in to create a space");
      }
      
      // Generate slug from name
      const slug = spaceData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const response = await apiRequest("POST", "/api/spaces", {
        ...spaceData,
        slug,
        userId: user.id // Include user ID so server can automatically add user to space
      });
      
      // Check if the response is valid JSON
      try {
        return await response.json();
      } catch (error) {
        // If JSON parsing fails, log the issue and return a formatted response
        console.error("Error parsing server response:", error);
        const text = await response.text();
        console.log("Raw response:", text);
        
        // Return a basic space object to prevent UI errors
        return {
          id: Date.now(), // Temporary ID until refresh
          name: spaceData.name,
          description: spaceData.description || '',
          slug: slug,
          settings: spaceData.settings || {},
          isPrivate: spaceData.isPrivate || false,
          logoUrl: spaceData.logoUrl || null
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spaces/user'] });
      toast({
        title: "Space created",
        description: "Your new space has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create space",
        description: error.message || "An error occurred while creating the space.",
        variant: "destructive",
      });
    },
  });

  // Join a space
  const joinSpaceMutation = useMutation({
    mutationFn: async (spaceId: number) => {
      if (!user || !user.id) {
        throw new Error("You must be logged in to join a space");
      }
      const response = await apiRequest("POST", `/api/spaces/${spaceId}/join`, {
        userId: user.id,
        role: "member"
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spaces/user'] });
      toast({
        title: "Space joined",
        description: "You have joined the space successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join space",
        description: error.message || "An error occurred while joining the space.",
        variant: "destructive",
      });
    },
  });

  // Leave a space
  const leaveSpaceMutation = useMutation({
    mutationFn: async (spaceId: number) => {
      if (!user || !user.id) {
        throw new Error("You must be logged in to leave a space");
      }
      const response = await apiRequest("POST", `/api/spaces/${spaceId}/leave`, {
        userId: user.id
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spaces/user'] });
      toast({
        title: "Space left",
        description: "You have left the space successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to leave space",
        description: error.message || "An error occurred while leaving the space.",
        variant: "destructive",
      });
    },
  });

  // Set up WebSocket subscriptions for space switching
  useEffect(() => {
    // Only set up WebSocket subscriptions if we have all the dependencies
    if (!subscribe || !toast) return;
    
    // Listen for space switch success events
    const unsubscribeSuccess = subscribe('space_switch_success', (event) => {
      if (event.space && event.space.id) {
        // Update state with the new space details
        setCurrentSpaceId(event.space.id);
        setSwitchingSpace(false);
        
        // Invalidate related queries to refresh data for the new space
        queryClient.invalidateQueries({ queryKey: ['/api/dashboards'] });
        queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
        queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
        
        toast({
          title: "Space changed",
          description: `You are now in ${event.space.name} space.`,
        });
      }
    });
    
    // Listen for space switch error events
    const unsubscribeError = subscribe('space_switch_error', (event) => {
      setSwitchingSpace(false);
      toast({
        title: "Failed to switch space",
        description: event.message || "An error occurred while switching spaces.",
        variant: "destructive",
      });
    });
    
    return () => {
      unsubscribeSuccess();
      unsubscribeError();
    };
  }, [subscribe, setCurrentSpaceId, toast, queryClient]);
  
  // Function to deselect the current space and show all content
  const deselectCurrentSpace = () => {
    // Set to null to indicate no specific space is selected
    setCurrentSpaceId(null);
    
    // Invalidate related queries to show all content
    queryClient.invalidateQueries({ queryKey: ['/api/dashboards'] });
    queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    queryClient.invalidateQueries({ queryKey: ['/api/widgets'] });
    
    toast({
      title: "All spaces selected",
      description: "Now showing content from all spaces.",
    });
  };

  // Function to switch spaces using WebSocket
  const switchToSpace = (spaceId: number) => {
    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to switch spaces.",
        variant: "destructive",
      });
      return;
    }
    
    setSwitchingSpace(true);
    switchSpace(user.id, spaceId);
    
    // Also update local state immediately for better UX
    setCurrentSpaceId(spaceId);
  };
  
  // Get current space
  const currentSpace = Array.isArray(spaces) && spaces.length > 0 && currentSpaceId
    ? spaces.find(space => space && space.id === currentSpaceId) || null
    : null;

  return {
    spaces,
    userSpaces, 
    isLoadingSpaces,
    isLoadingUserSpaces,
    spacesError,
    userSpacesError,
    createSpaceMutation,
    joinSpaceMutation,
    leaveSpaceMutation,
    currentSpaceId,
    currentSpace,
    setCurrentSpaceId,
    switchToSpace,
    deselectCurrentSpace,
    switchingSpace
  };
}