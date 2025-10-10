import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  published: boolean;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
  estimated_time_minutes: number;
  chapter_id: string;
  quiz?: Quiz;
}

interface Quiz {
  id: string;
  lesson_id: string;
  quiz_json: {
    questions: QuizQuestion[];
  };
  passing_threshold: number;
  timer_minutes: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  tip?: string;
}

const AdminCourses = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCourses();
    }
  }, [isAdmin]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    const { data: coursesData, error } = await supabase
      .from("courses")
      .select(`
        *,
        chapters (
          *,
          lessons (
            *
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (coursesData) {
      // Fetch quizzes for all lessons
      const allLessonIds = coursesData.flatMap((course: any) =>
        course.chapters.flatMap((chapter: any) => chapter.lessons.map((lesson: any) => lesson.id))
      );

      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*")
        .in("lesson_id", allLessonIds);

      const quizzesByLesson = new Map(quizzesData?.map((q) => [q.lesson_id, q]) || []);

      const coursesWithQuizzes = coursesData.map((course: any) => ({
        ...course,
        chapters: course.chapters
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((chapter: any) => ({
            ...chapter,
            lessons: chapter.lessons
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((lesson: any) => ({
                ...lesson,
                quiz: quizzesByLesson.get(lesson.id),
              })),
          })),
      }));

      setCourses(coursesWithQuizzes);
    }
    setLoadingCourses(false);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This will also delete all chapters, lessons, and quizzes.")) {
      return;
    }

    const { error } = await supabase.from("courses").delete().eq("id", courseId);

    if (error) {
      toast({
        title: "Error deleting course",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Course deleted successfully",
    });
    fetchCourses();
  };

  const handleSaveCourse = async (course: Partial<Course>) => {
    if (editingCourse?.id) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: course.title,
          description: course.description,
          difficulty: course.difficulty,
          published: course.published,
        })
        .eq("id", editingCourse.id);

      if (error) {
        toast({
          title: "Error updating course",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Course updated successfully" });
    }
    setEditingCourse(null);
    fetchCourses();
  };

  const handleSaveChapter = async (chapter: Partial<Chapter>) => {
    if (editingChapter?.id) {
      const { error } = await supabase
        .from("chapters")
        .update({
          title: chapter.title,
          order_index: chapter.order_index,
        })
        .eq("id", editingChapter.id);

      if (error) {
        toast({
          title: "Error updating chapter",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Chapter updated successfully" });
    } else {
      // Create new chapter
      const { error } = await supabase.from("chapters").insert({
        title: chapter.title,
        order_index: chapter.order_index || 0,
        course_id: selectedCourseId,
      });

      if (error) {
        toast({
          title: "Error creating chapter",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Chapter created successfully" });
    }
    setEditingChapter(null);
    fetchCourses();
  };

  const handleSaveLesson = async (lesson: Partial<Lesson>) => {
    if (editingLesson?.id) {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: lesson.title,
          content: lesson.content,
          order_index: lesson.order_index,
          estimated_time_minutes: lesson.estimated_time_minutes,
        })
        .eq("id", editingLesson.id);

      if (error) {
        toast({
          title: "Error updating lesson",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Lesson updated successfully" });
    } else {
      // Create new lesson
      const { error } = await supabase.from("lessons").insert({
        title: lesson.title,
        content: lesson.content,
        order_index: lesson.order_index || 0,
        estimated_time_minutes: lesson.estimated_time_minutes || 5,
        chapter_id: lesson.chapter_id,
      });

      if (error) {
        toast({
          title: "Error creating lesson",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Lesson created successfully" });
    }
    setEditingLesson(null);
    fetchCourses();
  };

  const handleSaveQuiz = async (quiz: Partial<Quiz>, lessonId: string) => {
    if (editingQuiz?.id) {
      const { error } = await supabase
        .from("quizzes")
        .update({
          quiz_json: quiz.quiz_json as any,
          passing_threshold: quiz.passing_threshold,
          timer_minutes: quiz.timer_minutes,
        })
        .eq("id", editingQuiz.id);

      if (error) {
        toast({
          title: "Error updating quiz",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Quiz updated successfully" });
    } else {
      // Create new quiz
      const { error } = await supabase.from("quizzes").insert([{
        lesson_id: lessonId,
        quiz_json: quiz.quiz_json as any,
        passing_threshold: quiz.passing_threshold || 80,
        timer_minutes: quiz.timer_minutes || 5,
      }]);

      if (error) {
        toast({
          title: "Error creating quiz",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Quiz created successfully" });
    }
    setEditingQuiz(null);
    fetchCourses();
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              BitEdu Admin - Courses
            </span>
          </Link>
          <Link to="/admin">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Manage Courses</h1>
            <p className="text-muted-foreground">Edit courses, chapters, lessons, and quizzes</p>
          </div>
        </div>

        {loadingCourses ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => (
              <Card key={course.id} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">{course.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                          {course.difficulty}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-accent/10 text-accent">
                          {course.published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCourse(course)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Course</DialogTitle>
                          </DialogHeader>
                          <CourseEditForm
                            course={editingCourse}
                            onSave={handleSaveCourse}
                            onCancel={() => setEditingCourse(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Chapters & Lessons</h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setEditingChapter({ course_id: course.id } as Chapter);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Chapter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Chapter</DialogTitle>
                          </DialogHeader>
                          <ChapterEditForm
                            chapter={editingChapter}
                            onSave={handleSaveChapter}
                            onCancel={() => setEditingChapter(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      {course.chapters.map((chapter) => (
                        <AccordionItem key={chapter.id} value={chapter.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <span className="font-medium">{chapter.title}</span>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingChapter(chapter)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Chapter</DialogTitle>
                                    </DialogHeader>
                                    <ChapterEditForm
                                      chapter={editingChapter}
                                      onSave={handleSaveChapter}
                                      onCancel={() => setEditingChapter(null)}
                                    />
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pl-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingLesson({ chapter_id: chapter.id } as Lesson)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Lesson
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Add New Lesson</DialogTitle>
                                  </DialogHeader>
                                  <LessonEditForm
                                    lesson={editingLesson}
                                    onSave={handleSaveLesson}
                                    onCancel={() => setEditingLesson(null)}
                                  />
                                </DialogContent>
                              </Dialog>

                              {chapter.lessons.map((lesson) => (
                                <Card key={lesson.id} className="bg-background/50">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-medium mb-1">{lesson.title}</h4>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {lesson.content?.substring(0, 150)}...
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                          <span className="text-xs px-2 py-1 rounded bg-primary/10">
                                            {lesson.estimated_time_minutes} min
                                          </span>
                                          {lesson.quiz && (
                                            <span className="text-xs px-2 py-1 rounded bg-success/10 text-success">
                                              Quiz: {lesson.quiz.quiz_json.questions.length} questions
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setEditingLesson(lesson)}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                              <DialogTitle>Edit Lesson</DialogTitle>
                                            </DialogHeader>
                                            <LessonEditForm
                                              lesson={editingLesson}
                                              onSave={handleSaveLesson}
                                              onCancel={() => setEditingLesson(null)}
                                            />
                                          </DialogContent>
                                        </Dialog>

                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setEditingQuiz(lesson.quiz || ({ lesson_id: lesson.id, quiz_json: { questions: [] } } as Quiz))}
                                            >
                                              {lesson.quiz ? "Edit Quiz" : "Add Quiz"}
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                              <DialogTitle>{lesson.quiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
                                            </DialogHeader>
                                            <QuizEditForm
                                              quiz={editingQuiz}
                                              lessonId={lesson.id}
                                              onSave={handleSaveQuiz}
                                              onCancel={() => setEditingQuiz(null)}
                                            />
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Course Edit Form Component
const CourseEditForm = ({
  course,
  onSave,
  onCancel,
}: {
  course: Course | null;
  onSave: (course: Partial<Course>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: course?.title || "",
    description: course?.description || "",
    difficulty: course?.difficulty || "Beginner",
    published: course?.published || false,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>
      <div>
        <Label htmlFor="difficulty">Difficulty</Label>
        <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Beginner">Beginner</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          checked={formData.published}
          onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
        />
        <Label htmlFor="published">Published</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>Save Changes</Button>
      </DialogFooter>
    </div>
  );
};

// Chapter Edit Form Component
const ChapterEditForm = ({
  chapter,
  onSave,
  onCancel,
}: {
  chapter: Chapter | null;
  onSave: (chapter: Partial<Chapter>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: chapter?.title || "",
    order_index: chapter?.order_index || 0,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="chapter-title">Chapter Title</Label>
        <Input
          id="chapter-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="order-index">Order Index</Label>
        <Input
          id="order-index"
          type="number"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ ...formData, course_id: chapter?.course_id })}>
          Save Chapter
        </Button>
      </DialogFooter>
    </div>
  );
};

// Lesson Edit Form Component
const LessonEditForm = ({
  lesson,
  onSave,
  onCancel,
}: {
  lesson: Lesson | null;
  onSave: (lesson: Partial<Lesson>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: lesson?.title || "",
    content: lesson?.content || "",
    order_index: lesson?.order_index || 0,
    estimated_time_minutes: lesson?.estimated_time_minutes || 5,
    chapter_id: lesson?.chapter_id || "",
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lesson-title">Lesson Title</Label>
        <Input
          id="lesson-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="lesson-content">Content</Label>
        <Textarea
          id="lesson-content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={10}
          placeholder="Enter lesson content in markdown format..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lesson-order">Order Index</Label>
          <Input
            id="lesson-order"
            type="number"
            value={formData.order_index}
            onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="estimated-time">Estimated Time (minutes)</Label>
          <Input
            id="estimated-time"
            type="number"
            value={formData.estimated_time_minutes}
            onChange={(e) => setFormData({ ...formData, estimated_time_minutes: parseInt(e.target.value) })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>Save Lesson</Button>
      </DialogFooter>
    </div>
  );
};

// Quiz Edit Form Component
const QuizEditForm = ({
  quiz,
  lessonId,
  onSave,
  onCancel,
}: {
  quiz: Quiz | null;
  lessonId: string;
  onSave: (quiz: Partial<Quiz>, lessonId: string) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    passing_threshold: quiz?.passing_threshold || 80,
    timer_minutes: quiz?.timer_minutes || 5,
    questions: quiz?.quiz_json?.questions || [],
  });

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { question: "", options: ["", "", "", ""], correct: 0, tip: "" },
      ],
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="passing-threshold">Passing Threshold (%)</Label>
          <Input
            id="passing-threshold"
            type="number"
            value={formData.passing_threshold}
            onChange={(e) => setFormData({ ...formData, passing_threshold: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="timer">Timer (minutes)</Label>
          <Input
            id="timer"
            type="number"
            value={formData.timer_minutes}
            onChange={(e) => setFormData({ ...formData, timer_minutes: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Questions</h3>
          <Button onClick={addQuestion} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        <div className="space-y-6">
          {formData.questions.map((question, qIndex) => (
            <Card key={qIndex} className="p-4 bg-background/50">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <Label>Question {qIndex + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  placeholder="Enter question"
                  value={question.question}
                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                />

                <div className="space-y-2">
                  <Label>Options</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex gap-2 items-center">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correct === oIndex}
                        onChange={() => updateQuestion(qIndex, "correct", oIndex)}
                      />
                      <Input
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      />
                      {question.correct === oIndex && (
                        <span className="text-xs text-success">✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Hint/Tip (optional)</Label>
                  <Input
                    placeholder="Helpful tip for wrong answers"
                    value={question.tip || ""}
                    onChange={(e) => updateQuestion(qIndex, "tip", e.target.value)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            onSave(
              {
                passing_threshold: formData.passing_threshold,
                timer_minutes: formData.timer_minutes,
                quiz_json: { questions: formData.questions },
              },
              lessonId
            )
          }
        >
          Save Quiz
        </Button>
      </DialogFooter>
    </div>
  );
};

export default AdminCourses;
