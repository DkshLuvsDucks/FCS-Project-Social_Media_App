import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, SendHorizontal, ChevronLeft, User, Users, Globe, Bookmark, BookmarkCheck, X, Send, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '../utils/axios';
import { Post } from './PostCard';
import { useVideoMute } from './PostCard';
import SharePostModal from './SharePostModal';

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
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const { isMuted, setIsMuted } = useVideoMute();
  const [isHovering, setIsHovering] = useState(false);
  
  // Function to retry loading the media
  const retryLoadMedia = () => {
    if (mediaRetryCount < 3) {
      console.log(`Retrying media load for post detail ${resolvedPostId}, attempt ${mediaRetryCount + 1}`);
      setMediaError(false);
      setMediaLoading(true);
      setMediaRetryCount(prevCount => prevCount + 1);
    }
  };
  
  // Add a media loading component
  const MediaLoading = () => (
    <div className={`absolute inset-0 flex items-center justify-center ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading media...</p>
      </div>
    </div>
  );
  
  // Media error fallback component
  const MediaErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
    <div className={`absolute inset-0 flex flex-col items-center justify-center ${darkMode ? 'bg-gray-800/80' : 'bg-gray-100/80'} rounded-lg`}>
      <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-center p-4`}>
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-700/20">
          <ImageIcon size={32} className="text-gray-500" />
        </div>
        <p className="font-medium">Media Not Available</p>
        <p className="text-sm mt-1 text-gray-500">The media could not be loaded</p>
        {mediaRetryCount < 3 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className={`mt-3 px-3 py-1 text-sm rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
  
  // Function to get the proper media URL
  const getMediaUrl = (url: string | null | undefined, hash: string | null | undefined): string | null => {
    if (!url && !hash) {
      console.log(`Post detail ${resolvedPostId}: No URL or hash available for media`);
      return null;
    }
    
    console.log(`Post detail ${resolvedPostId}: Resolving media URL - Original URL: "${url}", Hash: "${hash}"`);
    
    // Direct API endpoint - preferred method that should work everywhere
    if (hash) {
      const apiUrl = `/api/posts/media/${hash}`;
      console.log(`Post detail ${resolvedPostId}: Using API endpoint URL: ${apiUrl}`);
      return apiUrl;
    }
    
    // If we have a URL but no hash
    if (url) {
      // If it's already a direct uploads path
      if (url.startsWith('/uploads/')) {
        console.log(`Post detail ${resolvedPostId}: Using direct uploads path: ${url}`);
        return url;
      }
      
      // If it's an API path, try to extract the hash or filename
      if (url.includes('/api/media/') || url.includes('/api/posts/media/')) {
        const hashOrFilename = url.split('/').pop();
        if (hashOrFilename) {
          // Try API endpoint with the extracted hash
          const apiUrl = `/api/posts/media/${hashOrFilename}`;
          console.log(`Post detail ${resolvedPostId}: Converting API URL to direct API endpoint: ${apiUrl}`);
          return apiUrl;
        }
      }
      
      // If it's a full path to a file with filename
      if (url.includes('/uploads/posts/')) {
        const filename = url.split('/').pop();
        if (filename) {
          // Just return the original URL for filenames
          console.log(`Post detail ${resolvedPostId}: Using original uploads URL: ${url}`);
          return url;
        }
      }
      
      // Fallback - return the original URL
      console.log(`Post detail ${resolvedPostId}: Using original URL as fallback: ${url}`);
      return url;
    }
    
    console.log(`Post detail ${resolvedPostId}: No valid media URL could be determined`);
    return null;
  };
  
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
  
  // Handle share - updated to open modal
  const handleShare = () => {
    if (!post) return;
    setIsShareModalOpen(true);
  };
  
  // Toggle video mute state
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };
  
  // Toggle play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play()
          .then(() => {})
          .catch(error => console.log('Play prevented:', error));
      }
    }
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
  
  // Media section rendering
  const renderMedia = () => {
    if (!post || !post.mediaUrl) return null;
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        {mediaLoading && <MediaLoading />}
        {post.mediaType === 'video' ? (
          <div 
            className="relative flex items-center justify-center w-full h-full"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay(e);
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <video 
              ref={videoRef}
              src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined}
              className="max-w-[90%] max-h-[90%] object-contain"
              playsInline
              muted={isMuted}
              loop
              onLoadStart={() => setMediaLoading(true)}
              onLoadedData={() => setMediaLoading(false)}
              onError={(e) => {
                console.error(`Error loading video for post ${post.id}`);
                console.log('Attempted URL:', e.currentTarget.src);
                console.log('Post mediaUrl:', post.mediaUrl);
                console.log('Post mediaHash:', post.mediaHash);
                setMediaLoading(false);
                setMediaError(true);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Video Controls Overlay */}
            {!mediaLoading && !mediaError && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Play/Pause Button - Only show on hover or when paused */}
                {(isHovering || !isPlaying) && (
                  <button 
                    className="absolute center p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(e);
                    }}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>
                )}
                
                {/* Mute/Unmute Button - Always show */}
                <button 
                  className="absolute bottom-2 right-2 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute(e);
                  }}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined}
              alt="Post content"
              className="max-w-[90%] max-h-[90%] object-contain"
              onLoadStart={() => setMediaLoading(true)}
              onLoad={() => setMediaLoading(false)}
              onError={(e) => {
                console.error(`Error loading image for post ${post.id}`);
                console.log('Attempted URL:', e.currentTarget.src);
                console.log('Post mediaUrl:', post.mediaUrl);
                console.log('Post mediaHash:', post.mediaHash);
                setMediaLoading(false);
                setMediaError(true);
              }}
            />
          </div>
        )}
        {mediaError && <MediaErrorFallback onRetry={retryLoadMedia} />}
      </div>
    );
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
    <div ref={postRef} className={`${isModal ? 'h-full overflow-hidden' : 'min-h-screen py-8'} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
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
      
      <div className={`${isModal ? 'h-full' : 'container mx-auto px-4'}`}>
        <div className={`flex flex-col lg:flex-row max-w-screen-xl mx-auto ${isModal ? 'h-full' : 'mt-16'}`}>
          {/* Left side - Media */}
          <div className="lg:flex-1 flex items-center justify-center bg-black lg:max-h-screen relative">
            {renderMedia()}
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
                    <Send size={24} className="transform rotate-20" />
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
        
        {/* Interaction buttons */}
        <div className="flex items-center justify-between py-4 px-6">
          <div className="flex items-center space-x-4">
            {/* ... existing like and comment buttons ... */}
            
            {/* Share button */}
            <button 
              onClick={handleShare}
              className="focus:outline-none"
            >
              <Send size={24} className="transform rotate-20" />
            </button>
          </div>
          
          {/* ... existing save button ... */}
        </div>
      </div>
      
      {/* Share Modal */}
      <SharePostModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={post?.id || 0}
      />
    </div>
  );
};

export default PostDetail; 