import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonData {
  id: string;
  title: string;
  content: string;
  chapter: {
    title: string;
    course: {
      id: string;
      slug: string;
      title: string;
    };
  };
}

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchLesson();
  }, [id]);

  const fetchLesson = async () => {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          id,
          title,
          content,
          chapter:chapters (
            title,
            course:courses (
              id,
              slug,
              title
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setLesson(data);
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
    toast({
      title: "Lesson completed!",
      description: "+10 XP earned",
    });
    
    if (lesson?.chapter.course.slug) {
      navigate(`/course/${lesson.chapter.course.slug}`);
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
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
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
          <div>
            <p className="text-sm text-muted-foreground">
              {lesson.chapter.course.title} • {lesson.chapter.title}
            </p>
            <Progress value={progress} className="mt-2" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Lesson Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <BookOpen className="h-5 w-5" />
              <span>{lesson.chapter.title}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{lesson.title}</h1>
          </div>

          {/* Lesson Content */}
          <Card className="bg-gradient-card border-primary/20 shadow-card mb-8">
            <CardContent className="p-8">
              <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {lesson.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" className="border-primary/50">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous Lesson
            </Button>
            <Button
              onClick={handleComplete}
              className="bg-gradient-primary hover:opacity-90 shadow-glow"
            >
              Complete & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
