import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, SendHorizontal, ChevronLeft, User, Users, Globe, Bookmark, BookmarkCheck, X, Send, Image as ImageIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '../utils/axios';
import { Post } from './PostCard';
import { useVideoMute, useCurrentVideo } from './PostCard';
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
  const { currentPlayingId, setCurrentPlayingId } = useCurrentVideo();
  const [isHovering, setIsHovering] = useState(false);
  const wasManuallyPaused = useRef(false);
  
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
  
  // Function to get the proper image URL for profiles
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://localhost:3000${url}`;
  };
  
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
  
  // Update video playback controls
  useEffect(() => {
    if (!post?.mediaType || post.mediaType !== 'video' || !post?.id) return;
    
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    // Add Intersection Observer to handle visibility
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (entry.isIntersecting) {
        // If video is visible and not manually paused, play it
        if (!wasManuallyPaused.current) {
          videoElement.play()
            .then(() => {
              setIsPlaying(true);
              setCurrentPlayingId(post.id);
            })
            .catch(error => {
              console.log('Auto-play prevented:', error);
            });
        }
      } else {
        // Video is not visible, pause it
        videoElement.pause();
        setIsPlaying(false);
        // If this was the current playing video, reset the global state
        if (currentPlayingId === post.id) {
          setCurrentPlayingId(null);
        }
      }
    };
    
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      threshold: 0.5, // At least 50% of the video needs to be visible
    });
    
    if (postRef.current) {
      observer.observe(postRef.current);
    }
    
    // If another video starts playing, pause this one
    if (currentPlayingId !== null && currentPlayingId !== post.id && isPlaying) {
      videoElement.pause();
      setIsPlaying(false);
    }
    
    // Handle manual pause/play events
    const handlePause = () => {
      wasManuallyPaused.current = true;
      console.log('Video manually paused');
    };
    
    const handlePlay = () => {
      wasManuallyPaused.current = false;
      console.log('Video manually played');
    };
    
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('play', handlePlay);
    
    // Cleanup when component unmounts
    return () => {
      observer.disconnect();
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('play', handlePlay);
      if (currentPlayingId === post.id) {
        setCurrentPlayingId(null);
      }
    };
  }, [currentPlayingId, post?.id, post?.mediaType, isPlaying, setCurrentPlayingId]);
  
  // Update toggle play function
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || !post?.id) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      wasManuallyPaused.current = true; // Mark as manually paused
      if (currentPlayingId === post.id) {
        setCurrentPlayingId(null);
      }
    } else {
      // Reset manual pause flag when explicitly playing
      wasManuallyPaused.current = false;
      
      // If another video is playing, this will trigger the effect above to pause it
      setCurrentPlayingId(post.id);
      
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.log('Play prevented:', error);
          setIsPlaying(false);
        });
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
      <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
        {mediaLoading && <MediaLoading />}
        {post.mediaType === 'video' ? (
          <div 
            className="relative w-full h-full flex items-center justify-center"
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
              className="max-w-full max-h-full object-contain"
              style={{ 
                display: 'block', 
                margin: 'auto',
                width: 'auto',
                height: 'auto',
                maxHeight: '100%',
                maxWidth: '100%'
              }}
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
          <div className={`relative w-full h-full flex items-center justify-center p-2 ${darkMode ? 'bg-black' : 'bg-white'}`}>
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined}
                alt="Post content"
                className={`object-contain ${darkMode ? 'filter-none' : 'drop-shadow-sm'}`}
                style={{
                  display: 'block',
                  width: 'auto',
                  height: 'auto',
                  minHeight: '50%', 
                  minWidth: '50%',
                  maxWidth: '90%',
                  maxHeight: '90%',
                }}
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
          </div>
        )}
        {mediaError && <MediaErrorFallback onRetry={retryLoadMedia} />}
      </div>
    );
  };
  
  // Function to play video when detail view is opened
  useEffect(() => {
    // Play the video when PostDetail is opened and it has a video
    if (post?.mediaType === 'video' && videoRef.current) {
      // Clear any manual pause flag if it exists
      if (typeof wasManuallyPaused !== 'undefined') {
        wasManuallyPaused.current = false;
      }
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setCurrentPlayingId(post.id);
              console.log('Auto-playing video in PostDetail');
            })
            .catch(error => {
              console.log('Auto-play prevented in detail view:', error);
            });
        }
      }, 100); // Reduced delay for faster playback
      
      return () => clearTimeout(timer);
    }
  }, [post?.id, post?.mediaType, setCurrentPlayingId]);
  
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
    <div ref={postRef} className={`PostDetail ${isModal ? 'h-full overflow-hidden' : 'min-h-screen py-8'} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
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
          className={`absolute top-3 right-3 z-20 p-2 rounded-full ${darkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-md transition-colors`}
        >
          <X size={20} />
        </button>
      )}
      
      <div className={`${isModal ? 'h-full' : 'container mx-auto px-4'}`}>
        <div className={`flex flex-col lg:flex-row h-full w-full ${isModal ? 'overflow-hidden rounded-lg shadow-lg' : 'mt-16 rounded-lg shadow-md'} ${darkMode ? 'ring-1 ring-gray-700/50' : 'ring-1 ring-gray-200/70'}`}>
          {/* Left side - Media */}
          <div className={`${
            isModal 
              ? 'lg:w-[65%] md:h-[65%] h-[65%] lg:h-full flex-shrink-0' 
              : 'lg:flex-1'
          } flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} relative overflow-hidden`}>
            {renderMedia()}
          </div>
          
          {/* Right side - Details and Comments */}
          <div className={`${
            isModal 
              ? 'lg:w-[35%] md:h-[35%] h-[35%] lg:h-full flex-grow' 
              : 'lg:w-96'
          } flex flex-col ${darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-hidden`}>
            {/* Post author header */}
            <div className={`p-4 flex items-center border-b ${darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50/80'}`}>
              <div 
                onClick={() => handleProfileClick(post.author.username)}
                className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${darkMode ? 'bg-gray-700 ring-2 ring-gray-600' : 'bg-gray-100 ring-2 ring-gray-200'}`}
              >
                {post.author.userImage ? (
                  <img 
                    src={getImageUrl(post.author.userImage)} 
                    alt={post.author.username} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                      const fallback = document.createElement('div');
                      fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-400' : 'text-gray-500'}"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                      e.currentTarget.parentElement?.appendChild(fallback);
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
            {post?.content && (
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700/40' : 'border-gray-200/70'}`}>
                <p className={`whitespace-pre-line ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  <span 
                    onClick={() => handleProfileClick(post.author.username)}
                    className="font-semibold mr-2 cursor-pointer hover:underline"
                  >
                    {post.author.username}
                  </span>
                  {post.content}
                </p>
              </div>
            )}
            
            {/* Comments section */}
            <div className="flex-1 h-0 overflow-y-auto">
              {comments.length === 0 ? (
                <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex flex-col items-center justify-center h-full`}>
                  <div className="mb-2">
                    <MessageCircle className="h-8 w-8 mx-auto opacity-40" />
                  </div>
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-gray-700/40' : 'divide-gray-100/70'}`}>
                  {comments.map((comment) => (
                    <div key={comment.id} className={`p-3 ${darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50/70'} transition-colors`}>
                      <div className="flex items-start">
                        <div 
                          onClick={() => handleProfileClick(comment.author.username)}
                          className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                          {comment.author.userImage ? (
                            <img 
                              src={getImageUrl(comment.author.userImage)} 
                              alt={comment.author.username} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                const fallback = document.createElement('div');
                                fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${darkMode ? 'text-gray-400' : 'text-gray-500'}"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                                e.currentTarget.parentElement?.appendChild(fallback);
                              }}
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
            <div className={`p-3 pt-3 pb-2 border-t ${darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50/80'} flex-shrink-0`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-5">
                  <button 
                    onClick={handleLike}
                    className={`focus:outline-none p-1.5 rounded-full ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-100'} transition-colors`}
                  >
                    <Heart 
                      size={22} 
                      className={isLiked ? 'text-red-500 fill-red-500' : ''} 
                      fill={isLiked ? 'currentColor' : 'none'}
                    />
                  </button>
                  
                  <button 
                    onClick={() => commentInputRef.current?.focus()}
                    className={`focus:outline-none p-1.5 rounded-full ${darkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-100'} transition-colors`}
                  >
                    <MessageCircle size={22} />
                  </button>
                  
                  <button 
                    onClick={handleShare}
                    className={`focus:outline-none p-1.5 rounded-full ${darkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-100'} transition-colors`}
                  >
                    <Send size={22} className="transform rotate-20" />
                  </button>
                </div>
                
                <button 
                  onClick={handleSave}
                  className={`focus:outline-none p-1.5 rounded-full ${darkMode ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-100'} transition-colors`}
                >
                  {isSaved ? <BookmarkCheck size={22} fill="currentColor" className="text-yellow-500" /> : <Bookmark size={22} />}
                </button>
              </div>
              
              {likeCount > 0 && (
                <div className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {likeCount} like{likeCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <form onSubmit={handleCommentSubmit} className={`flex items-center p-3 pt-2 ${darkMode ? 'bg-gray-800 border-t border-gray-700/50' : 'bg-white border-t border-gray-200/70'}`}>
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-full text-sm outline-none transition-all duration-150 ${
                  darkMode 
                    ? 'bg-gray-700 focus:bg-gray-600 text-white placeholder:text-gray-400 focus:ring-1 focus:ring-blue-500/70' 
                    : 'bg-gray-100 focus:bg-white text-gray-800 placeholder:text-gray-500 border border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-200'
                }`}
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className={`ml-2 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  !newComment.trim()
                    ? darkMode 
                      ? 'bg-gray-700 text-gray-500' 
                      : 'bg-gray-100 text-gray-400'
                    : darkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
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