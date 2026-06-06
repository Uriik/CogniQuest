"use client";

import { PublicQuestion } from "@cogniquest/shared";
import { useEffect, useState } from "react";

interface QuestionModalProps {
  question: PublicQuestion | null;
  onAnswer: (questionId: string, answer: string) => void;
  answerFeedback?: { correctOptionId?: string, selectedOptionId?: string, correct: boolean } | null;
}

export function QuestionModal({ question, onAnswer, answerFeedback }: QuestionModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Reset local state when a new question appears
  useEffect(() => {
    if (question) {
      setSelectedOption(null);
    }
  }, [question]);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    if (question) {
      onAnswer(question.questionId, option);
    }
  };

  if (!question) {
    return null;
  }

  return (
    <div className={`question-modal-overlay ${question ? 'open' : ''}`}>
      <div className="question-modal-box">
        <div className="modal-top-bar">
          <span className="modal-subject-tag">Desafio</span>
          <span className="modal-age-tag">Atenção</span>
        </div>
        <div className="modal-main-content">
          <h3 className="modal-question-text">{question.prompt}</h3>
          <div className="modal-options-list">
            {question.options.map((opt, idx) => {
              let btnClass = "option-btn";
              
              if (answerFeedback) {
                if (answerFeedback.correct) {
                  if (opt.id === answerFeedback.selectedOptionId) {
                    btnClass += " feedback-correct";
                  }
                } else {
                  if (opt.id === answerFeedback.selectedOptionId) {
                    btnClass += " feedback-wrong";
                  } else if (opt.id === answerFeedback.correctOptionId) {
                    btnClass += " feedback-correct-answer";
                  }
                }
              } else if (selectedOption === opt.id) {
                btnClass += " active border-[var(--primary)] text-[var(--primary)]";
              }

              return (
                <button 
                  key={idx} 
                  className={btnClass}
                  onClick={() => handleSelect(opt.id)}
                  disabled={selectedOption !== null || !!answerFeedback}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}) </span>
                  <span className="option-text">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="modal-bottom-hint">
          Responda corretamente para confirmar o disparo do torpedo!
        </div>
      </div>
    </div>
  );
}
