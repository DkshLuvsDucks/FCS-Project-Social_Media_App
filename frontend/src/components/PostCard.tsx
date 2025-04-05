import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, Lock, MoreHorizontal, User, Users, Globe, Bookmark, BookmarkCheck, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import axiosInstance from '../utils/axios';

interface Author {
  id: number;
  username: string;
  userImage: string | null;
}

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

export interface Post {
  id: number;
  content: string;
  authorId: number;
  createdAt: string;
  editedAt: string | null;
  isEncrypted: boolean;
  isPrivate: boolean;
  mediaHash?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  author: Author;
  _count?: {
    likes: number;
    comments: number;
  };
}

interface PostCardProps {
  post: Post;
  onPostClick?: (postId: number) => void;
  gridView?: boolean;
  refreshPosts?: () => void;
}

const MAX_COMMENTS_PREVIEW = 2; // Show only 2 comments in preview

// Add these interface definitions to handle API responses
interface LikeResponse {
  isLiked: boolean;
  count: number;
}

interface CommentResponse {
  comments: Comment[];
  totalCount: number;
}

interface SaveResponse {
  isSaved: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostClick, gridView = false, refreshPosts }) => {
  const { darkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  
  // Function to retry loading the media
  const retryLoadMedia = () => {
    if (mediaRetryCount < 3) {
      console.log(`Retrying media load for post ${post.id}, attempt ${mediaRetryCount + 1}`);
      setMediaError(false);
      setMediaLoading(true);
      setMediaRetryCount(prevCount => prevCount + 1);
    }
  };
  
  // For handling profile clicks
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${post.author.username}`);
  };
  
  // Handle post click navigation
  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(post.id);
    } else {
      navigate(`/post/${post.id}`);
    }
  };
  
  // Handle like action
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikeCount(prevCount => newIsLiked ? prevCount + 1 : prevCount - 1);
      
      await axiosInstance.post(`/api/posts/${post.id}/likes`, {
        action: newIsLiked ? 'like' : 'unlike'
      });
    } catch (error) {
      // Revert UI state if API call fails
      setIsLiked(!isLiked);
      setLikeCount(prevCount => !isLiked ? prevCount - 1 : prevCount + 1);
      console.error('Error toggling like:', error);
    }
  };
  
  // Handle comment action
  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPostClick) {
      onPostClick(post.id);
    } else {
      navigate(`/post/${post.id}`);
    }
  };
  
  // Handle share action
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Copy post URL to clipboard
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Post link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
  };
  
  // Handle save action
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const newIsSaved = !isSaved;
      setIsSaved(newIsSaved);
      
      await axiosInstance.post(`/api/posts/${post.id}/saved`, {
        action: newIsSaved ? 'save' : 'unsave'
      });
    } catch (error) {
      // Revert UI state if API call fails
      setIsSaved(!isSaved);
      console.error('Error toggling save:', error);
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
  
  // Move MediaErrorFallback inside the component
  const MediaErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
    <div className={`absolute inset-0 flex flex-col items-center justify-center ${darkMode ? 'bg-gray-800/80' : 'bg-gray-100/80'} rounded-lg`}>
      <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-center p-4`}>
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-700/20">
          <ImageIcon className="w-8 h-8 text-gray-500" />
        </div>
        <p className="font-medium">Media Not Available</p>
        <p className="text-sm mt-1 text-gray-500">The image could not be loaded</p>
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
  
  // Fetch likes, comments, and save status
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setLoading(true);
        
        // Fetch like status and count using the defined interface
        const response = await axiosInstance.get<LikeResponse>(`/api/posts/${post.id}/likes`);
        setIsLiked(response.data.isLiked);
        setLikeCount(response.data.count || post._count?.likes || 0);
        
        // Fetch comment count and preview using the defined interface
        const commentResponse = await axiosInstance.get<CommentResponse>(`/api/posts/${post.id}/comments`, {
          params: { limit: MAX_COMMENTS_PREVIEW }
        });
        setComments(commentResponse.data.comments || []);
        setCommentCount(commentResponse.data.totalCount || post._count?.comments || 0);
        
        // Fetch save status using the defined interface
        const saveResponse = await axiosInstance.get<SaveResponse>(`/api/posts/${post.id}/saved`);
        setIsSaved(saveResponse.data.isSaved);
      } catch (error) {
        console.error('Error fetching post data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostData();
  }, [post.id, post._count]);
  
  // Update the getMediaUrl function with additional fallback and more detailed logging
  const getMediaUrl = (url: string | null | undefined, hash: string | null | undefined): string | null => {
    if (!url && !hash) {
      console.log(`Post ${post.id}: No URL or hash available for media`);
      return null;
    }
    
    console.log(`Post ${post.id}: Resolving media URL - Original URL: "${url}", Hash: "${hash}"`);
    
    // Direct API endpoint - preferred method that should work everywhere
    if (hash) {
      const apiUrl = `/api/posts/media/${hash}`;
      console.log(`Post ${post.id}: Using API endpoint URL: ${apiUrl}`);
      return apiUrl;
    }
    
    // If we have a URL but no hash
    if (url) {
      // If it's already a direct uploads path
      if (url.startsWith('/uploads/')) {
        console.log(`Post ${post.id}: Using direct uploads path: ${url}`);
        return url;
      }
      
      // If it's an API path, try to extract the hash or filename
      if (url.includes('/api/media/') || url.includes('/api/posts/media/')) {
        const hashOrFilename = url.split('/').pop();
        if (hashOrFilename) {
          // Try API endpoint with the extracted hash
          const apiUrl = `/api/posts/media/${hashOrFilename}`;
          console.log(`Post ${post.id}: Converting API URL to direct API endpoint: ${apiUrl}`);
          return apiUrl;
        }
      }
      
      // If it's a full path to a file with filename
      if (url.includes('/uploads/posts/')) {
        const filename = url.split('/').pop();
        if (filename) {
          // Just return the original URL for filenames
          console.log(`Post ${post.id}: Using original uploads URL: ${url}`);
          return url;
        }
      }
      
      // Fallback - return the original URL
      console.log(`Post ${post.id}: Using original URL as fallback: ${url}`);
      return url;
    }
    
    console.log(`Post ${post.id}: No valid media URL could be determined`);
    return null;
  };

  // If in grid view, just show the media with minimal overlay
  if (gridView && post.mediaUrl) {
    return (
      <div 
        className={`aspect-square relative overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} cursor-pointer group`}
        onClick={handlePostClick}
      >
        {mediaLoading && <MediaLoading />}
        {post.mediaType === 'video' ? (
          <video 
            src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined} 
            className="w-full h-full object-cover"
            onLoadStart={() => setMediaLoading(true)}
            onLoadedData={() => setMediaLoading(false)}
            onError={(e) => {
              console.error(`Error loading video for post ${post.id}`);
              console.log('Attempted URL:', e.currentTarget.src);
              setMediaLoading(false);
              setMediaError(true);
            }}
            controls={!gridView}
          />
        ) : (
          <img 
            src={getMediaUrl(post.mediaUrl, post.mediaHash) || ''}
            alt={`Post by ${post.author.username}`} 
            className="w-full h-full object-cover"
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
        )}
        {mediaError && <MediaErrorFallback onRetry={retryLoadMedia} />}
        <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex items-center space-x-4 text-white">
            <div className="flex items-center">
              <Heart className="mr-2" fill="white" size={20} />
              <span>{likeCount}</span>
            </div>
            <div className="flex items-center">
              <MessageCircle className="mr-2" size={20} />
              <span>{commentCount}</span>
            </div>
          </div>
        </div>
        {post.isPrivate && (
          <div className="absolute top-2 right-2 p-1 rounded-full bg-black/50">
            <Users size={14} className="text-white" />
          </div>
        )}
      </div>
    );
  }
  
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-4 cursor-pointer`}
      onClick={handlePostClick}
    >
      {/* Header with user info */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div 
            onClick={handleProfileClick}
            className={`w-10 h-10 rounded-full overflow-hidden cursor-pointer ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
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
          <div>
              <div 
                onClick={handleProfileClick}
              className="font-semibold hover:underline"
              >
                {post.author.username}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formattedDate}
            </div>
          </div>
        </div>
        
        <div>
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
      
      {/* Media content - displayed full width */}
      <div className={`relative ${post.mediaType === 'video' ? 'aspect-video' : 'aspect-square'} overflow-hidden bg-black`}>
        {mediaLoading && <MediaLoading />}
        {post.mediaUrl ? (
          post.mediaType === 'video' ? (
            <video 
              src={getMediaUrl(post.mediaUrl, post.mediaHash) || undefined}
              className="w-full h-full object-contain"
              controls
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
            />
          ) : (
            <img 
              src={getMediaUrl(post.mediaUrl, post.mediaHash) || ''}
              alt="Post content" 
              className="w-full h-full object-cover"
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
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <p>No media available</p>
        </div>
      )}
        {mediaError && <MediaErrorFallback onRetry={retryLoadMedia} />}
        </div>
      
      {/* Actions Bar */}
      <div className="p-3 flex items-center justify-between">
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
            onClick={handleComment}
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
      
      {/* Like count */}
      <div className="px-3">
        <div className={`font-semibold text-sm`}>
            {likeCount} like{likeCount !== 1 ? 's' : ''}
          </div>
      </div>
      
      {/* Caption */}
      {post.content && (
        <div className="px-3 mt-1">
          <span className="inline-block">
            <span 
              onClick={handleProfileClick}
              className="font-semibold mr-1 cursor-pointer hover:underline"
            >
              {post.author.username}
            </span>
            <span>{post.content}</span>
          </span>
        </div>
      )}
      
      {/* Comments preview */}
      {commentCount > 0 && (
        <div className="px-3 mt-2">
          {commentCount > MAX_COMMENTS_PREVIEW && (
        <div 
              className={`text-sm cursor-pointer ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
          onClick={handleComment}
        >
              View all {commentCount} comments
            </div>
          )}
          
          <div className="mt-1">
            {comments.map(comment => (
              <div key={comment.id} className="text-sm mb-1">
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${comment.author.username}`);
                  }}
                  className="font-semibold mr-1 cursor-pointer hover:underline"
                >
                  {comment.author.username}
                </span>
                <span>{comment.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Post date */}
      <div className="px-3 pt-1 pb-3">
        <div className={`text-xs uppercase ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {formattedDate}
        </div>
      </div>
    </motion.div>
  );
};

export default PostCard; 