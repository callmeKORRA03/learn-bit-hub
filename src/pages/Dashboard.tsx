import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, TrendingUp, Award, Coins, BookOpen, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  xp: number;
  bitcred_balance: number;
  active_course_count: number;
}

interface Enrollment {
  id: string;
  progress_percent: number;
  course: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUser(user);
    await fetchProfile(user.id);
    await fetchEnrollments(user.id);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchEnrollments = async (userId: string) => {
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        id,
        progress_percent,
        course:courses(id, slug, title, difficulty)
      `)
      .eq("user_id", userId)
      .eq("active", true);

    if (data) {
      setEnrollments(data as any);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "Come back soon!",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BitEdu
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost">Browse Courses</Button>
            </Link>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.username || "Learner"}!
          </h1>
          <p className="text-muted-foreground">Continue your blockchain education journey</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-primary/20 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total XP</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{profile?.xp || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Experience Points</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">BitCred</CardTitle>
              <Coins className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {profile?.bitcred_balance?.toFixed(1) || "0.0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Platform Currency</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">In Progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 bg-gradient-primary bg-clip-text" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Courses */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Your Active Courses</h2>
          {enrollments.length === 0 ? (
            <Card className="bg-gradient-card border-primary/20 p-8 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No active courses yet</h3>
              <p className="text-muted-foreground mb-4">
                Start learning by enrolling in a course
              </p>
              <Link to="/">
                <Button className="bg-gradient-primary hover:opacity-90">
                  Browse Courses
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  to={`/course/${enrollment.course.slug}`}
                >
                  <Card className="bg-gradient-card border-primary/20 shadow-card hover:shadow-glow transition-all hover:scale-105">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-primary/20 text-primary">
                          {enrollment.course.difficulty}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(enrollment.progress_percent)}% Complete
                        </span>
                      </div>
                      <CardTitle className="text-xl">{enrollment.course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={enrollment.progress_percent} className="mb-4" />
                      <Button className="w-full bg-primary/10 hover:bg-primary/20">
                        Continue Learning
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
