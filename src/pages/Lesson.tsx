import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Quiz from "@/components/Quiz";
import CertificateGenerator from "@/components/CertificateGenerator";

interface LessonData {
  id: string;
  title: string;
  content: string;
  chapter: {
    title: string;
    order_index: number;
    lessons: Array<{ id: string; order_index: number }>;
    course: {
      id: string;
      slug: string;
      title: string;
    };
  };
}

const Lesson = () => {
  const { id: lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [nextLesson, setNextLesson] = useState<{ id: string } | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await checkUser();
      await fetchLesson();
    };
    initialize();
  }, [lessonId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchLesson = async () => {
    try {
      const { data: lessonData, error } = await supabase
        .from("lessons")
        .select(`
          id,
          title,
          content,
          chapter:chapters (
            title,
            order_index,
            lessons (
              id,
              order_index
            ),
            course:courses (
              id,
              slug,
              title
            )
          )
        `)
        .eq("id", lessonId)
        .single();

      if (error) throw error;

      const { data: courseData } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          slug,
          chapters (
            id,
            order_index,
            lessons (
              id,
              order_index
            )
          )
        `)
        .eq("id", lessonData.chapter.course.id)
        .single();

      const allLessons = lessonData.chapter.lessons.sort((a: any, b: any) => a.order_index - b.order_index);
      const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
      setNextLesson(currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null);

      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("user_id", user?.id)
        .maybeSingle();

      setCourse(courseData);
      setLesson(lessonData);
      setCompleted(!!progressData);

      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id")
        .eq("lesson_id", lessonId)
        .maybeSingle();

      setHasQuiz(!!quizData);

      if (user) {
        const allLessonIds = courseData.chapters.flatMap((ch: any) =>
          ch.lessons.map((l: any) => l.id)
        );

        const { data: allProgress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", allLessonIds);

        setAllLessonsCompleted(allProgress?.length === allLessonIds.length);
      }
    } catch (error) {
      console.error("Error fetching lesson:", error);
      toast({
        title: "Error",
        description: "Failed to load lesson",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!lesson || !user) return;

    try {
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
        }, {
          onConflict: 'user_id,lesson_id'
        });

      if (error) throw error;

      const { data: userData } = await supabase
        .from("users")
        .select("xp")
        .eq("id", user.id)
        .single();

      if (userData) {
        const newXP = userData.xp + 10;
        await supabase
          .from("users")
          .update({ xp: newXP })
          .eq("id", user.id);

        toast({
          title: "Lesson Completed!",
          description: `You earned 10 XP! Total: ${newXP} XP`,
        });
      }

      setCompleted(true);

      if (hasQuiz) {
        setShowQuiz(true);
      } else {
        setTimeout(() => {
          if (nextLesson) {
            navigate(`/lesson/${nextLesson.id}`);
          } else {
            navigate(`/course/${course.slug}`);
          }
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error completing lesson:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete lesson",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Lesson not found</h2>
          <Link to="/">
            <Button className="bg-gradient-primary hover:opacity-90">Back to Courses</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BitEdu
            </span>
          </Link>
          <Link to={`/course/${lesson.chapter.course.slug}`}>
            <Button variant="ghost">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <p className="text-muted-foreground mb-2">{lesson.chapter.title}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{lesson.title}</h1>
          </div>

          <Card className="bg-gradient-card border-primary/20 shadow-card mb-8">
            <CardContent className="p-8">
              <div className="prose prose-invert max-w-none mb-8">
                {lesson.content || "No content available for this lesson."}
              </div>

              {completed && hasQuiz && showQuiz && !quizPassed && (
                <div className="mb-8">
                  <Quiz
                    lessonId={lesson.id}
                    userId={user.id}
                    onComplete={(passed) => {
                      setQuizPassed(passed);
                      if (passed) {
                        setShowQuiz(false);
                      }
                    }}
                  />
                </div>
              )}

              {allLessonsCompleted && quizPassed && course && user && (
                <div className="mb-8">
                  <CertificateGenerator
                    courseTitle={course.title}
                    userName={user.email}
                    userId={user.id}
                    courseId={course.id}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/course/${course.slug}`)}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Course
                </Button>

                {!completed ? (
                  <Button
                    onClick={handleComplete}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    Mark as Complete
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                ) : showQuiz && hasQuiz ? (
                  <Button disabled className="bg-primary/50">
                    Complete Quiz to Continue
                  </Button>
                ) : nextLesson ? (
                  <Link to={`/lesson/${nextLesson.id}`}>
                    <Button className="bg-gradient-primary hover:opacity-90">
                      Next Lesson
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => navigate(`/course/${course.slug}`)}
                    className="bg-success hover:opacity-90"
                  >
                    Course Complete!
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
