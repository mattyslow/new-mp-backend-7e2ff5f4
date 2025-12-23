import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Phone, CreditCard, Calendar, Clock, MapPin } from "lucide-react";
import { usePlayer } from "@/hooks/usePlayers";
import { usePlayerRegistrations } from "@/hooks/useRegistrations";
import { PlayerDialog } from "@/components/dialogs/PlayerDialog";
import { format, parseISO, isAfter, startOfDay } from "date-fns";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: player, isLoading: playerLoading } = usePlayer(id ?? "");
  const { data: registrations, isLoading: regsLoading } = usePlayerRegistrations(id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = startOfDay(new Date());

  const { upcoming, past, levels, categories } = useMemo(() => {
    if (!registrations) return { upcoming: [], past: [], levels: [], categories: [] };

    const upcoming: typeof registrations = [];
    const past: typeof registrations = [];
    const levelSet = new Map<string, string>();
    const categorySet = new Map<string, string>();

    for (const reg of registrations) {
      if (reg.programs) {
        const programDate = parseISO(reg.programs.date);
        if (isAfter(programDate, today) || programDate.getTime() === today.getTime()) {
          upcoming.push(reg);
        } else {
          past.push(reg);
        }
        if (reg.programs.levels) {
          levelSet.set(reg.programs.levels.id, reg.programs.levels.name);
        }
        if (reg.programs.categories) {
          categorySet.set(reg.programs.categories.id, reg.programs.categories.name);
        }
      }
    }

    return {
      upcoming: upcoming.sort((a, b) => parseISO(a.programs!.date).getTime() - parseISO(b.programs!.date).getTime()),
      past: past.sort((a, b) => parseISO(b.programs!.date).getTime() - parseISO(a.programs!.date).getTime()),
      levels: Array.from(levelSet.values()),
      categories: Array.from(categorySet.values()),
    };
  }, [registrations, today]);

  if (playerLoading || regsLoading) {
    return (
      <Layout>
        <p className="text-muted-foreground">Loading...</p>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <p className="text-muted-foreground">Player not found.</p>
      </Layout>
    );
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes}${ampm}`;
  };

  const RegistrationCard = ({ reg }: { reg: typeof registrations[0] }) => {
    const program = reg.programs;
    if (!program) return null;

    return (
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <h4 className="font-medium">{program.name}</h4>
              {reg.packages && (
                <Badge variant="outline" className="text-xs">
                  via {reg.packages.name}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(parseISO(program.date), "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(program.start_time)} - {formatTime(program.end_time)}
              </span>
              {program.locations && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {program.locations.name}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              {program.levels && (
                <Badge variant="secondary" className="text-xs">
                  {program.levels.name}
                </Badge>
              )}
              {program.categories && (
                <Badge variant="outline" className="text-xs">
                  {program.categories.name}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/players")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Players
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>

        {/* Player Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {player.first_name} {player.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-muted-foreground">
              {player.email && (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {player.email}
                </span>
              )}
              {player.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {player.phone}
                </span>
              )}
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit: ${Number(player.credit).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Levels & Categories */}
        {(levels.length > 0 || categories.length > 0) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                {levels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Levels:</span>
                    <div className="flex gap-1">
                      {levels.map((level) => (
                        <Badge key={level} variant="secondary">{level}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {categories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Categories:</span>
                    <div className="flex gap-1">
                      {categories.map((cat) => (
                        <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Programs */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming Programs ({upcoming.length})</h3>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming programs.</p>
          ) : (
            <div className="grid gap-3">
              {upcoming.map((reg) => (
                <RegistrationCard key={reg.id} reg={reg} />
              ))}
            </div>
          )}
        </div>

        {/* Past Programs */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Past Programs ({past.length})</h3>
          {past.length === 0 ? (
            <p className="text-muted-foreground text-sm">No past programs.</p>
          ) : (
            <div className="grid gap-3">
              {past.map((reg) => (
                <RegistrationCard key={reg.id} reg={reg} />
              ))}
            </div>
          )}
        </div>
      </div>

      <PlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={player}
      />
    </Layout>
  );
}
