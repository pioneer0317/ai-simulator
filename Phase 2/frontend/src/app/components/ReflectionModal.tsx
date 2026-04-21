import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Star } from 'lucide-react';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
  agentName: string;
}

export function ReflectionModal({ isOpen, onClose, onSubmit, agentName }: ReflectionModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, feedback);
    // Reset form
    setRating(0);
    setHoveredRating(0);
    setFeedback('');
    onClose();
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setFeedback('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Quick Reflection 💭
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            You just approved a response from <span className="font-semibold">{agentName}</span>. 
            Help us understand your decision!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Trust Rating */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-gray-800 block">
              How much did you trust the AI just now?
            </label>
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  <Star
                    className={`h-12 w-12 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Very Low Trust'}
              {rating === 2 && 'Low Trust'}
              {rating === 3 && 'Moderate Trust'}
              {rating === 4 && 'High Trust'}
              {rating === 5 && 'Very High Trust'}
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-gray-800 block">
              What made you trust or distrust them?
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your thoughts here... (e.g., 'The response seemed confident' or 'I wasn't sure about the details')"
              className="min-h-[120px] text-base border-2 border-gray-300 focus:border-blue-500 resize-none"
            />
            <p className="text-sm text-gray-500">
              {feedback.length} characters • Optional but helpful!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-6 py-5 text-base font-semibold border-2"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="px-6 py-5 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Submit Reflection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
