"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Team, Question } from "@prisma/client";
import { TeamScoreModal } from "./TeamScoreModal";
import { QuestionViewModal } from "./QuestionViewModal";
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionInputProps {
  roundId: string;
  teams: Team[];
  eventId: string;
  onQuestionAdded: () => void;
  existingQuestions?: Array<{ id: string; number: number }>;
}

export function QuestionInput({ 
  roundId, 
  teams, 
  eventId, 
  onQuestionAdded, 
  existingQuestions = [] 
}: QuestionInputProps) {
  const [questionNumber, setQuestionNumber] = useState(
    existingQuestions.length > 0 ? Math.max(...existingQuestions.map(q => q.number)) + 1 : 1
  );
  const [loading, setLoading] = useState(false);

  const handleAddQuestion = async () => {
    setLoading(true);
    const res = await fetch("/api/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, number: questionNumber, eventId }),
    });

    if (res.ok) {
      onQuestionAdded();
      setQuestionNumber(questionNumber + 1);
    } else {
      console.error("Failed to add question");
      toast.error("A question with this number might already exist in this round.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Show existing questions with scoring options */}
      {existingQuestions.length > 0 && (
        <div className="space-y-2">
          {existingQuestions
            .sort((a, b) => a.number - b.number)
            .map((question) => (
            <div key={question.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800/50 border border-gray-700/60">
              <span className="font-medium text-gray-300">Question {question.number}</span>
              <div className="flex items-center gap-2">
                <QuestionViewModal 
                  teams={teams}
                  questionId={question.id}
                  questionNumber={question.number}
                />
                <TeamScoreModal 
                  teams={teams} 
                  questionId={question.id} 
                  eventId={eventId}
                  onScoreAdded={onQuestionAdded}
                  roundId={roundId}
                  questionNumber={question.number}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Button 
        onClick={handleAddQuestion} 
        disabled={loading}
        variant="outline"
        className="w-full border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
      >
        <Plus className="h-4 w-4 mr-2" />
        {loading ? "Adding..." : `Add Question ${questionNumber}`}
      </Button>
    </div>
  );
} 