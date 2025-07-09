"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Team } from "@prisma/client";
import { TeamScoreModal } from "./TeamScoreModal";
import { QuestionViewModal } from "./QuestionViewModal";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuestionInputProps {
  roundId: string;
  teams: Team[];
  eventId: string;
  onQuestionAdded: () => void;
  existingQuestions?: Array<{ id: string; number: number }>;
}

function DeleteConfirmationModal({ questionId, onQuestionDeleted }: { questionId: string, onQuestionDeleted: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/question/${questionId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Question deleted successfully.');
                onQuestionDeleted();
            } else {
                const { error } = await res.json();
                toast.error(`Failed to delete question: ${error}`);
            }
        } catch (error) {
            toast.error('An unexpected error occurred.');
        } finally {
            setLoading(false);
            // The dialog should close automatically, but if not, manage state here
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500/80 hover:bg-red-500/10 hover:text-red-500 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. This will permanently delete the question and all associated scores.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                        {loading ? 'Deleting...' : 'Yes, delete it'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
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
                <DeleteConfirmationModal questionId={question.id} onQuestionDeleted={onQuestionAdded} />
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