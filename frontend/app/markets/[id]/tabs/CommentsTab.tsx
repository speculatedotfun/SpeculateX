'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare } from 'lucide-react';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  side?: 'yes' | 'no';
}

interface CommentsTabProps {
  marketId: string;
  isConnected: boolean;
  address?: string;
}

export function CommentsTab({ marketId, isConnected, address }: CommentsTabProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSide, setCommentSide] = useState<'yes' | 'no' | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const commentsStorageKey = marketId
    ? `comments_v1_${process.env.NEXT_PUBLIC_CHAIN_ID ?? 'unknown'}_${marketId}`
    : null;

  // Load comments from localStorage
  const loadComments = useCallback(() => {
    if (!commentsStorageKey) return;
    try {
      const stored = localStorage.getItem(commentsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setComments(parsed);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [commentsStorageKey]);

  // Save comments to localStorage
  const saveComments = useCallback((newComments: Comment[]) => {
    if (!commentsStorageKey) return;
    try {
      localStorage.setItem(commentsStorageKey, JSON.stringify(newComments));
      setComments(newComments);
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }, [commentsStorageKey]);

  // Handle comment submission
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !commentSide || !address || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const newCommentObj = {
        id: `${Date.now()}_${address.slice(0, 8)}`,
        user: address,
        text: newComment.trim(),
        timestamp: Date.now(),
        side: commentSide,
      };
      const updatedComments = [newCommentObj, ...comments];
      saveComments(updatedComments);
      setNewComment('');
      setCommentSide(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newComment, commentSide, address, isSubmittingComment, comments, saveComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return (
    <div className="space-y-6">
      {/* Comment Input */}
      {isConnected && address ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          role="form"
          aria-label="Post a comment"
        >
          <div className="flex gap-2 mb-4" role="group" aria-label="Select comment sentiment">
            <motion.button
              onClick={() => setCommentSide('yes')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                commentSide === 'yes'
                  ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              role="radio"
              aria-checked={commentSide === 'yes'}
              aria-label="Comment in favor of YES outcome"
            >
              YES
            </motion.button>
            <motion.button
              onClick={() => setCommentSide('no')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                commentSide === 'no'
                  ? 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              role="radio"
              aria-checked={commentSide === 'no'}
              aria-label="Comment in favor of NO outcome"
            >
              NO
            </motion.button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder={commentSide ? `Comment on ${commentSide.toUpperCase()}...` : "Select YES or NO to comment"}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 font-medium"
              disabled={!commentSide || isSubmittingComment}
              aria-label="Comment text"
              aria-required="true"
            />
            <motion.button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || !commentSide || isSubmittingComment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label={isSubmittingComment ? 'Posting comment' : 'Post comment'}
            >
              {isSubmittingComment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Post
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center"
          role="status"
          aria-label="Wallet not connected"
        >
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">Connect wallet to comment</p>
        </motion.div>
      )}

      {/* Comments List */}
      <div className="space-y-4" role="feed" aria-label="Comments">
        {comments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            role="status"
            aria-label="No comments yet"
          >
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold">No comments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Be the first to share your thoughts!</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {comments
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((comment, idx) => (
                <motion.article
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl border-2 ${
                    comment.side === 'yes'
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                      : comment.side === 'no'
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                  aria-label={`Comment by ${comment.user.slice(0, 6)}...${comment.user.slice(-4)} on ${comment.side?.toUpperCase()} at ${new Date(comment.timestamp).toLocaleString()}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        comment.side === 'yes'
                          ? 'bg-green-500'
                          : comment.side === 'no'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`} aria-hidden="true">
                        {comment.user.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                            {comment.user.slice(0, 6)}...{comment.user.slice(-4)}
                          </span>
                          {comment.side && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              comment.side === 'yes'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {comment.side.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <time className="text-xs text-gray-500 dark:text-gray-400 font-medium" dateTime={new Date(comment.timestamp).toISOString()}>
                          {new Date(comment.timestamp).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                </motion.article>
              ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}






