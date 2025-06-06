"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Team } from "@prisma/client";
import { TeamScoreModal } from "./TeamScoreModal";
import { QuestionViewModal } from "./QuestionViewModal";

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
    }
    setLoading(false);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={handleAddQuestion} disabled={loading}>
          {loading ? "Adding..." : `Add Question ${questionNumber}`}
        </Button>
      </div>
      
      {/* Show existing questions with scoring options */}
      {existingQuestions.length > 0 && (
        <div className="mt-4">
          <h5 className="font-medium mb-2">Questions & Scoring:</h5>
          <div className="space-y-2">
            {existingQuestions.map((question) => (
              <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <span className="font-medium">Question {question.number}</span>
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
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 