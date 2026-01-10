'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare, User as UserIcon } from 'lucide-react';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';

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
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentSide, setCommentSide] = useState<'yes' | 'no' | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { nicknames, fetchUsernamesBulk } = useNicknames();

  // Fetch comments from API
  const fetchComments = useCallback(async () => {
    if (!marketId) return;
    try {
      const res = await fetch(`/api/comments?marketId=${marketId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComments(data);

        // Fetch usernames for all commenters in bulk
        const uniqueAddresses = Array.from(new Set(data.map(c => c.user.toLowerCase())));
        if (uniqueAddresses.length > 0) {
          fetchUsernamesBulk(uniqueAddresses);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [marketId, fetchUsernamesBulk]);

  // Handle comment submission
  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !commentSide || !address || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          user: address,
          text: newComment.trim(),
          side: commentSide,
        }),
      });

      if (!response.ok) throw new Error('Failed to post');

      const savedComment = await response.json();
      setComments(prev => [savedComment, ...prev]);
      setNewComment('');
      setCommentSide(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newComment, commentSide, address, isSubmittingComment, marketId]);

  useEffect(() => {
    fetchComments();

    // Refresh comments every 10 seconds for a "live" feel
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  return (
    <div className="space-y-6">
      {/* Comment Input */}
      {isConnected && address ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-white/20 dark:border-white/5 shadow-xl"
        >
          <div className="flex gap-2 mb-4">
            <motion.button
              onClick={() => setCommentSide('yes')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm tracking-widest transition-all ${commentSide === 'yes'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              SIDE YES
            </motion.button>
            <motion.button
              onClick={() => setCommentSide('no')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 px-4 py-3 rounded-xl font-black text-sm tracking-widest transition-all ${commentSide === 'no'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              SIDE NO
            </motion.button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
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
                placeholder={commentSide ? `What's your take on ${commentSide.toUpperCase()}?` : "Choose a side to join the chat..."}
                className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition-all"
                disabled={!commentSide || isSubmittingComment}
              />
            </div>
            <motion.button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || !commentSide || isSubmittingComment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-12 px-6 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-black rounded-xl shadow-lg shadow-[#14B8A6]/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmittingComment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Post</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-8 border border-white/20 dark:border-white/5 text-center shadow-xl">
          <MessageSquare className="w-10 h-10 mx-auto mb-4 text-[#14B8A6] opacity-50" />
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2">Join the Conversation</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-0">Connect your wallet to share your thoughts on this market.</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#14B8A6]" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Chat...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16 bg-white/20 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 font-bold">The floor is yours.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">Be the first to comment!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {comments.map((comment, idx) => {
              const displayName = getDisplayName(comment.user, nicknames);
              const isUsername = nicknames[comment.user.toLowerCase()];

              return (
                <motion.article
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group"
                >
                  <div className={`p-5 rounded-2xl border backdrop-blur-sm shadow-sm transition-all hover:shadow-md ${comment.side === 'yes'
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30'
                      : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg ${comment.side === 'yes' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}>
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${isUsername ? 'text-gray-900 dark:text-white' : 'font-mono text-gray-500'}`}>
                              {isUsername ? `@${displayName}` : displayName}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${comment.side === 'yes'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                              }`}>
                              {comment.side}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed pl-13">
                      {comment.text}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
