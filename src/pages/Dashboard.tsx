import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useDashboardStats, useUpcomingPrograms, useRecentRegistrations } from "@/hooks/useDashboardStats";
import { Users, Calendar, ClipboardList, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: upcomingPrograms } = useUpcomingPrograms();
  const { data: recentRegistrations } = useRecentRegistrations();

  return (
    <Layout>
      <PageHeader
        title="Dashboard"
        description="Welcome to Montclair Pickleball management"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Players"
          value={statsLoading ? "..." : stats?.players ?? 0}
          icon={Users}
        />
        <StatCard
          title="Programs"
          value={statsLoading ? "..." : stats?.programs ?? 0}
          icon={Calendar}
        />
        <StatCard
          title="Packages"
          value={statsLoading ? "..." : stats?.packages ?? 0}
          icon={Package}
        />
        <StatCard
          title="Registrations"
          value={statsLoading ? "..." : stats?.registrations ?? 0}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Upcoming Programs</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPrograms?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming programs</p>
            ) : (
              <div className="space-y-3">
                {upcomingPrograms?.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{program.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {program.locations?.name} • {program.categories?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(program.date), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {program.start_time} - {program.end_time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRegistrations?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent registrations</p>
            ) : (
              <div className="space-y-3">
                {recentRegistrations?.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {reg.players?.first_name} {reg.players?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reg.programs?.name ?? "Package registration"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reg.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
