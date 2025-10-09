import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Quiz from "@/components/Quiz";
import CertificateGenerator from "@/components/CertificateGenerator";

const CourseQuiz = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizPassed, setQuizPassed] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch course
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
        .eq("slug", slug)
        .single();

      if (courseData) {
        setCourse(courseData);

        // Get the last lesson's quiz (or any lesson with a quiz)
        const allLessonIds = courseData.chapters.flatMap((ch: any) =>
          ch.lessons.map((l: any) => l.id)
        );

        const { data: quizData } = await supabase
          .from("quizzes")
          .select("id, lesson_id")
          .in("lesson_id", allLessonIds)
          .limit(1)
          .maybeSingle();

        if (quizData) {
          setHasQuiz(true);
          setQuizLessonId(quizData.lesson_id);
        }
      }

      setLoading(false);
    };

    initialize();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!course || !hasQuiz || !quizLessonId) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="bg-gradient-card border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">No quiz available</h2>
          <p className="text-muted-foreground mb-4">This course doesn't have a quiz yet</p>
          <Link to={`/course/${slug}`}>
            <Button className="bg-gradient-primary hover:opacity-90">Back to Course</Button>
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
          <Link to={`/course/${slug}`}>
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Course Quiz</h1>
            <p className="text-xl text-muted-foreground">{course.title}</p>
          </div>

          {!quizPassed ? (
            <Quiz
              lessonId={quizLessonId}
              userId={user.id}
              onComplete={(passed) => {
                setQuizPassed(passed);
              }}
            />
          ) : (
            <div className="space-y-6">
              <CertificateGenerator
                courseTitle={course.title}
                userName={user.email}
                userId={user.id}
                courseId={course.id}
              />
              <div className="text-center">
                <Link to={`/course/${slug}`}>
                  <Button variant="outline">Back to Course</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseQuiz;
