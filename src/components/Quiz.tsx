import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  question: string;
  options: string[];
  correct: number;
  tip?: string;
}

interface QuizData {
  id: string;
  lesson_id: string;
  quiz_json: {
    questions: Question[];
  };
  passing_threshold: number;
  timer_minutes: number;
}

interface QuizProps {
  lessonId: string;
  userId: string;
  onComplete: (passed: boolean) => void;
}

const Quiz = ({ lessonId, userId, onComplete }: QuizProps) => {
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<
    Array<{ question: number; correct: boolean; tip?: string }>
  >([]);

  useEffect(() => {
    fetchQuiz();
    // fetchAttempts will be called after quiz is fetched (see fetchQuiz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz && !showResults && currentQuestion >= 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, showResults]);

  const fetchQuiz = async () => {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching quiz:", error);
      toast({
        title: "Error loading quiz",
        description: "Unable to load quiz data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const quizData = data && data.length > 0 ? data[0] : null;

    if (quizData && quizData.quiz_json) {
      // Normalize questions: accept either 'correct' or legacy 'correctAnswer'
      const rawQuestions = (quizData.quiz_json.questions || []) as any[];

      const normalizedQuestions: Question[] = rawQuestions.map((q, idx) => {
        // Defensive extraction
        const options = Array.isArray(q.options)
          ? q.options
          : q.answers && Array.isArray(q.answers)
          ? q.answers
          : [];
        const correctFromCorrect =
          typeof q.correct === "number" ? q.correct : undefined;
        const correctFromCorrectAnswer =
          typeof q.correctAnswer === "number" ? q.correctAnswer : undefined;
        const correct =
          correctFromCorrect !== undefined
            ? correctFromCorrect
            : correctFromCorrectAnswer !== undefined
            ? correctFromCorrectAnswer
            : 0; // default to 0 if missing (safer than undefined)
        const tip = q.tip || q.hint || "";

        return {
          question: q.question || `Question ${idx + 1}`,
          options,
          correct,
          tip,
        };
      });

      const normalizedQuiz: QuizData = {
        ...quizData,
        quiz_json: { questions: normalizedQuestions },
        passing_threshold: Number(quizData.passing_threshold || 80),
        timer_minutes: Number(quizData.timer_minutes || 5),
      };

      setQuiz(normalizedQuiz);
      setTimeLeft(normalizedQuiz.timer_minutes * 60);

      // After quiz is set, fetch attempts for this quiz id
      fetchAttempts(normalizedQuiz.id);
    } else {
      // No quiz found for this lesson
      toast({
        title: "No quiz available",
        description: "This lesson doesn't have a quiz yet.",
        variant: "destructive",
      });
      setQuiz(null);
    }
  };

  const fetchAttempts = async (quizId?: string) => {
    if (!quizId && !quiz) return;
    const id = quizId || (quiz as QuizData).id;
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", id)
      .eq("user_id", userId)
      .order("attempt_at", { ascending: false });

    if (data) {
      setAttempts(data);
    }
  };

  const handleSubmit = async () => {
    if (!quiz || isSubmitting) return;
    setIsSubmitting(true);

    const questions = quiz.quiz_json.questions;
    let correctCount = 0;
    const feedbackData: Array<{
      question: number;
      correct: boolean;
      tip?: string;
    }> = [];

    questions.forEach((q, idx) => {
      // answers[idx] is a number; q.correct is normalized to number
      const isCorrect = answers[idx] === q.correct;
      if (isCorrect) correctCount++;
      feedbackData.push({
        question: idx,
        correct: isCorrect,
        tip: isCorrect ? undefined : q.tip || "Review this topic again",
      });
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    const passed = finalScore >= quiz.passing_threshold;

    setScore(finalScore);
    setFeedback(feedbackData);
    setShowResults(true);

    // Save attempt
    const { error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        score: finalScore,
        passed,
        feedback: feedbackData,
      });

    if (attemptError) {
      console.error("Error saving attempt:", attemptError);
    }

    // Update bitcred balance
    const { data: userData } = await supabase
      .from("users")
      .select("bitcred_balance")
      .eq("id", userId)
      .single();

    if (userData) {
      const newBalance = passed
        ? Number(userData.bitcred_balance) + 0.5
        : Number(userData.bitcred_balance);

      await supabase
        .from("users")
        .update({ bitcred_balance: newBalance })
        .eq("id", userId);

      toast({
        title: passed ? "Quiz Passed! 🎉" : "Quiz Failed",
        description: passed
          ? `You scored ${finalScore}%! Earned 0.5 BitCred`
          : `You scored ${finalScore}%. Need ${quiz.passing_threshold}% to pass.`,
        variant: passed ? "default" : "destructive",
      });
    }

    setIsSubmitting(false);
    onComplete(passed);
  };

  const handleRetake = async () => {
    const { data: userData } = await supabase
      .from("users")
      .select("bitcred_balance")
      .eq("id", userId)
      .single();

    if (userData && Number(userData.bitcred_balance) < 2) {
      toast({
        title: "Insufficient BitCred",
        description: "You need 2 BitCred to retake the quiz",
        variant: "destructive",
      });
      return;
    }

    if (userData) {
      await supabase
        .from("users")
        .update({ bitcred_balance: Number(userData.bitcred_balance) - 2 })
        .eq("id", userId);
    }

    setShowResults(false);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(quiz!.timer_minutes * 60);
    setFeedback([]);
  };

  if (!quiz) {
    return (
      <Card className="bg-gradient-card border-primary/20">
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Loading quiz...</p>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const passed = score >= quiz.passing_threshold;
    return (
      <Card className="bg-gradient-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {passed ? (
              <Trophy className="h-16 w-16 text-success" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-center text-2xl">
            {passed ? "Congratulations!" : "Keep Trying!"}
          </CardTitle>
          <CardDescription className="text-center text-lg">
            Your Score: {score}% (Need {quiz.passing_threshold}% to pass)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!passed && (
            <div className="space-y-2">
              <h3 className="font-semibold">Review These Topics:</h3>
              {feedback
                .filter((f) => !f.correct)
                .map((f) => (
                  <Alert key={f.question}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Question {f.question + 1}:</strong> {f.tip}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          )}
          <div className="flex gap-4">
            {!passed && (
              <Button
                onClick={handleRetake}
                variant="outline"
                className="flex-1"
              >
                Retake Quiz (2 BitCred)
              </Button>
            )}
            <Button
              onClick={() => onComplete(passed)}
              className="flex-1 bg-gradient-primary"
            >
              {passed ? "Continue" : "Review Lesson"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const questions = quiz.quiz_json.questions;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Card className="bg-gradient-card border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="mb-4" />
        <CardTitle>{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={answers[currentQuestion]?.toString()}
          onValueChange={(value) =>
            setAnswers({ ...answers, [currentQuestion]: parseInt(value) })
          }
        >
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-3 p-4 rounded-lg border border-border/40 hover:bg-primary/5 transition-colors"
              >
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label
                  htmlFor={`option-${idx}`}
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex gap-4">
          {currentQuestion > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
            >
              Previous
            </Button>
          )}
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === undefined}
              className="bg-gradient-primary ml-auto"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={answers[currentQuestion] === undefined || isSubmitting}
              className="bg-gradient-primary ml-auto"
            >
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Quiz;
