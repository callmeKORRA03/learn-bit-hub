import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GraduationCap, BookOpen, Clock, CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CourseData {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  chapters: Array<{
    id: string;
    title: string;
    order_index: number;
    lessons: Array<{
      id: string;
      title: string;
      order_index: number;
      estimated_time_minutes: number;
    }>;
  }>;
}

const Course = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchCourse();
  }, [slug]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      checkEnrollment(user.id);
    }
  };

  const fetchCourse = async () => {
    try {
      const { data: courseData, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          difficulty,
          chapters (
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              order_index,
              estimated_time_minutes
            )
          )
        `)
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Sort chapters and lessons
      courseData.chapters = courseData.chapters
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((chapter: any) => ({
          ...chapter,
          lessons: chapter.lessons.sort((a: any, b: any) => a.order_index - b.order_index),
        }));

      setCourse(courseData);
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({
        title: "Error",
        description: "Failed to load course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async (userId: string) => {
    if (!course) return;

    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", course.id)
      .single();

    setEnrolled(!!data);
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!course) return;

    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

      if (existingEnrollment) {
        toast({
          title: "Already enrolled",
          description: "You're already enrolled in this course!",
        });
        setEnrolled(true);
        return;
      }

      // Create new enrollment
      const { error } = await supabase.from("enrollments").insert({
        user_id: user.id,
        course_id: course.id,
        progress_percent: 0,
        active: true,
      });

      if (error) throw error;

      setEnrolled(true);
      toast({
        title: "Enrolled!",
        description: "You're now enrolled in this course. Start learning!",
      });

      // Navigate to first lesson
      if (course.chapters[0]?.lessons[0]) {
        setTimeout(() => {
          navigate(`/lesson/${course.chapters[0].lessons[0].id}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Enrollment error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to enroll. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Course not found</h2>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist</p>
          <Link to="/">
            <Button className="bg-gradient-primary hover:opacity-90">Back to Courses</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const totalLessons = course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const totalTime = course.chapters.reduce(
    (acc, ch) => acc + ch.lessons.reduce((sum, l) => sum + l.estimated_time_minutes, 0),
    0
  );

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
          <Link to="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Badge className="bg-primary/20 text-primary">{course.difficulty}</Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{totalLessons} Lessons</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{Math.floor(totalTime / 60)}h {totalTime % 60}m</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
          <p className="text-xl text-muted-foreground mb-6">{course.description}</p>

          {!enrolled ? (
            <Button
              size="lg"
              onClick={handleEnroll}
              className="bg-gradient-primary hover:opacity-90 shadow-glow"
            >
              Enroll Now - Free
            </Button>
          ) : (
            <Button size="lg" className="bg-success hover:opacity-90" disabled>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Enrolled
            </Button>
          )}
        </div>

        {/* Course Curriculum */}
        <Card className="bg-gradient-card border-primary/20 shadow-card">
          <CardHeader>
            <CardTitle>Course Curriculum</CardTitle>
            <CardDescription>
              {course.chapters.length} chapters • {totalLessons} lessons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {course.chapters.map((chapter) => (
                <AccordionItem key={chapter.id} value={chapter.id}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{chapter.title}</span>
                      <Badge variant="outline" className="ml-auto">
                        {chapter.lessons.length} lessons
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-8">
                      {chapter.lessons.map((lesson) => (
                        <Link
                          key={lesson.id}
                          to={enrolled ? `/lesson/${lesson.id}` : "#"}
                          className={enrolled ? "" : "pointer-events-none"}
                        >
                          <div
                            className={`flex items-center justify-between p-3 rounded-lg border border-border/40 transition-all ${
                              enrolled
                                ? "hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
                                : "opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {enrolled ? (
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span>{lesson.title}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {lesson.estimated_time_minutes}min
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Course;
