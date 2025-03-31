import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "@shared/schema";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, PieChart, ArrowUpRight, Clock, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export default function DashboardListPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "mine">("all");
  
  const { data: dashboards, isLoading } = useQuery<Dashboard[]>({
    queryKey: ["/api/dashboards"],
    enabled: !!user,
  });
  
  // Filter dashboards based on the selected filter
  const filteredDashboards = dashboards?.filter(dashboard => {
    if (filter === "all") return true;
    return dashboard.userId === user?.id;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboards</h1>
            <p className="text-muted-foreground mt-1">
              View, filter, and manage all your dashboards
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "mine")} className="mr-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="mine" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Mine
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-28 w-full rounded-md" />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </CardFooter>
              </Card>
            ))
          ) : filteredDashboards && filteredDashboards.length > 0 ? (
            filteredDashboards.map((dashboard) => (
              <Card key={dashboard.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{dashboard.name}</CardTitle>
                    <Badge variant={dashboard.isActive ? "default" : "outline"}>
                      {dashboard.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {dashboard.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted rounded-md flex items-center justify-center">
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full p-3">
                      <div className="bg-background/50 rounded"></div>
                      <div className="bg-background/50 rounded"></div>
                      <div className="bg-background/50 rounded"></div>
                      <div className="bg-background/50 rounded"></div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Updated {new Date((dashboard.updatedAt || dashboard.createdAt || new Date()) as Date).toLocaleDateString()}</span>
                  </div>
                  <Link href={`/dashboard/${dashboard.id}`}>
                    <Button variant="outline" size="sm">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted w-20 h-20 flex items-center justify-center mb-4">
                <PieChart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {filter === "mine" ? "You don't have any dashboards yet" : "No dashboards available"}
              </h3>
              <p className="text-muted-foreground max-w-md mb-4">
                {filter === "mine" 
                  ? "Create your first dashboard to start visualizing your data with powerful analytics and AI insights."
                  : "Create a new dashboard or switch to 'Mine' to see only your dashboards."}
              </p>
              <Link href="/dashboard/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Dashboard
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}