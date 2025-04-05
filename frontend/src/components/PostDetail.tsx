import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, X, User, Users, Globe, Bookmark, BookmarkCheck, ChevronLeft, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '../utils/axios';
import { Post } from './PostCard';

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
    userImage: string | null;
  };
}

interface PostDetailProps {
  postId?: number;
  onClose?: () => void;
  isModal?: boolean;
}

const PostDetail: React.FC<PostDetailProps> = ({ postId: propPostId, onClose, isModal = false }) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const resolvedPostId = propPostId || (paramId ? parseInt(paramId) : undefined);
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!resolvedPostId) return;
      
      try {
        setLoading(true);
        
        // Define response types for proper type checking - align with Post type
        interface PostResponse extends Post {}
        
        interface LikeResponse {
          isLiked: boolean;
          count: number;
        }
        
        interface SaveResponse {
          isSaved: boolean;
        }
        
        interface CommentListResponse {
          comments: Comment[];
          totalCount: number;
          page: number;
          limit: number;
        }
        
        // Fetch post details
        const postResponse = await axiosInstance.get<PostResponse>(`/api/posts/${resolvedPostId}`);
        setPost(postResponse.data);
        
        // Fetch like status
        const likeResponse = await axiosInstance.get<LikeResponse>(`/api/posts/${resolvedPostId}/likes`);
        setIsLiked(likeResponse.data.isLiked);
        setLikeCount(likeResponse.data.count);
        
        // Fetch save status
        const saveResponse = await axiosInstance.get<SaveResponse>(`/api/posts/${resolvedPostId}/saved`);
        setIsSaved(saveResponse.data.isSaved);
        
        // Fetch comments
        const commentResponse = await axiosInstance.get<CommentListResponse>(`/api/posts/${resolvedPostId}/comments`);
        setComments(commentResponse.data.comments || []);
      } catch (error) {
        console.error('Error fetching post details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostDetails();
  }, [resolvedPostId]);
  
  // Handle like toggling
  const handleLike = async () => {
    if (!post) return;
    
    try {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      
      // Update like status on server
      await axiosInstance.post(`/api/posts/${post.id}/likes`, {
        action: isLiked ? 'unlike' : 'like'
      });
    } catch (error) {
      // Revert UI if API call fails
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      console.error('Error toggling like:', error);
    }
  };
  
  // Handle save toggling
  const handleSave = async () => {
    if (!post) return;
    
    try {
      setIsSaved(!isSaved);
      
      // Update saved status on server
      await axiosInstance.post(`/api/posts/${post.id}/saved`, {
        action: isSaved ? 'unsave' : 'save'
      });
    } catch (error) {
      // Revert UI if API call fails
      setIsSaved(!isSaved);
      console.error('Error toggling save:', error);
    }
  };
  
  // Handle share
  const handleShare = () => {
    if (!post) return;
    
    // Copy URL to clipboard
    const url = window.location.origin + `/post/${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Post link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  };
  
  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim()) return;
    
    try {
      setSubmittingComment(true);
      
      // Define the expected response type
      interface CommentResponse extends Comment {}
      
      // Submit comment to server
      const response = await axiosInstance.post<CommentResponse>(`/api/posts/${post.id}/comments`, {
        content: newComment
      });
      
      // Add new comment to the list
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Handle profile navigation
  const handleProfileClick = (username: string) => {
    navigate(`/profile/${username}`);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  if (loading) {
    return (
      <div className={`flex justify-center items-center ${isModal ? 'h-full' : 'min-h-screen'} ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className={`flex justify-center items-center ${isModal ? 'h-full' : 'min-h-screen py-16'} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Post not found</h2>
          <p className="mb-4">The post you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => isModal ? onClose?.() : navigate('/')}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            {isModal ? 'Close' : 'Return to Home'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${isModal ? 'h-full overflow-hidden' : 'min-h-screen py-8'} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      {/* Navigation bar for standalone view */}
      {!isModal && (
        <div className={`fixed top-0 left-0 right-0 z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b px-4 py-2`}>
          <div className="flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-semibold ml-2">Post</h1>
          </div>
        </div>
      )}
      
      {/* Close button for modal view */}
      {isModal && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1 rounded-full bg-black/50 text-white"
        >
          <X size={24} />
        </button>
      )}
      
      <div className={`flex flex-col lg:flex-row max-w-screen-xl mx-auto ${isModal ? 'h-full' : 'mt-16'}`}>
        {/* Left side - Media */}
        <div className="lg:flex-1 flex items-center justify-center bg-black lg:max-h-screen">
          {post.mediaUrl ? (
            post.mediaType === 'video' ? (
              <video 
                src={post.mediaUrl} 
                controls
                className="max-h-[80vh] max-w-full object-contain"
              />
            ) : (
              <img 
                src={post.mediaUrl} 
                alt="Post media" 
                className="max-h-[80vh] max-w-full object-contain"
              />
            )
          ) : (
            <div className="p-8 text-center text-gray-500">
              This post has no media
            </div>
          )}
        </div>
        
        {/* Right side - Details and Comments */}
        <div className={`lg:w-96 flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} lg:h-full h-auto overflow-hidden`}>
          {/* Post author header */}
          <div className="p-4 flex items-center border-b border-gray-200 dark:border-gray-700">
            <div 
              onClick={() => handleProfileClick(post.author.username)}
              className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              {post.author.userImage ? (
                <img 
                  src={post.author.userImage} 
                  alt={post.author.username} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </div>
              )}
            </div>
            
            <div className="ml-3">
              <div 
                onClick={() => handleProfileClick(post.author.username)}
                className={`font-semibold cursor-pointer hover:underline`}
              >
                {post.author.username}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(post.createdAt)}
              </div>
            </div>
            
            <div className="ml-auto">
              {post.isPrivate ? (
                <div className="flex items-center text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                  <Users size={12} className="mr-1" />
                  <span>Followers</span>
                </div>
              ) : (
                <div className="flex items-center text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                  <Globe size={12} className="mr-1" />
                  <span>Public</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Post content */}
          {post.content && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <p>{post.content}</p>
            </div>
          )}
          
          {/* Comments section */}
          <div className="flex-1 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3">
                    <div className="flex items-start">
                      <div 
                        onClick={() => handleProfileClick(comment.author.username)}
                        className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                      >
                        {comment.author.userImage ? (
                          <img 
                            src={comment.author.userImage} 
                            alt={comment.author.username} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-2 flex-1">
                        <div className="flex items-baseline">
                          <span 
                            onClick={() => handleProfileClick(comment.author.username)}
                            className="font-medium text-sm mr-2 cursor-pointer hover:underline"
                          >
                            {comment.author.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action bar */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleLike}
                  className="focus:outline-none"
                >
                  <Heart 
                    size={24} 
                    className={isLiked ? 'text-red-500 fill-red-500' : ''} 
                    fill={isLiked ? 'currentColor' : 'none'}
                  />
                </button>
                
                <button 
                  onClick={() => commentInputRef.current?.focus()}
                  className="focus:outline-none"
                >
                  <MessageCircle size={24} />
                </button>
                
                <button 
                  onClick={handleShare}
                  className="focus:outline-none"
                >
                  <Share size={24} />
                </button>
              </div>
              
              <button 
                onClick={handleSave}
                className="focus:outline-none"
              >
                {isSaved ? <BookmarkCheck size={24} fill="currentColor" /> : <Bookmark size={24} />}
              </button>
            </div>
            
            {likeCount > 0 && (
              <div className="font-semibold text-sm mb-2">
                {likeCount} like{likeCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {/* Comment input */}
          <form 
            onSubmit={handleCommentSubmit} 
            className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center`}
          >
            <input
              ref={commentInputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className={`flex-1 ${
                darkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400 focus:ring-blue-600/50' 
                  : 'bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-blue-500/50'
              } rounded-full px-4 py-2 focus:outline-none focus:ring-2`}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submittingComment}
              className={`ml-2 p-2 rounded-full transition-colors ${
                !newComment.trim() || submittingComment
                  ? darkMode ? 'text-gray-500' : 'text-gray-400'
                  : darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'
              }`}
            >
              {submittingComment ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 