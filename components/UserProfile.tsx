import React, { useState, useRef, useEffect } from 'react';
import { User, Message, MessageType } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, faSmile, faPaperclip, faImage, faFile, 
  faVideo, faMusic, faTimes, faSearch, faEllipsisV,
  faCheck, faCheckDouble, faClock, faThumbsUp,
  faPlay, faPause, faDownload, faExpand, faCompress
} from '@fortawesome/free-solid-svg-icons';
import Picker from 'emoji-picker-react';
import { EmojiClickData } from 'emoji-picker-react';

// Define GIF type if not in types
interface Gif {
  id: string;
  url: string;
  title: string;
}

// Define message attachment type
interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'video' | 'audio';
  url: string;
  name?: string;
  size?: string;
  thumbnail?: string;
}

interface MessagesProps {
  currentUser: User;
  selectedUser: User | null;
  users: User[];
  messages: Message[];
  onSendMessage: (text: string, attachments?: MessageAttachment[], gifUrl?: string, emoji?: string) => void;
  onSelectUser: (user: User) => void;
  onDeleteMessage: (messageId: string) => void;
  onReactToMessage: (messageId: string, reaction: string) => void;
  onTyping: (userId: number, isTyping: boolean) => void;
  onMarkAsRead: (messageId: string) => void;
  getUserStatus: (userId: number) => { isOnline: boolean; lastSeen: string };
  gifApiKey?: string; // Optional GIPHY API key
}

export const Messages: React.FC<MessagesProps> = ({
  currentUser,
  selectedUser,
  users,
  messages,
  onSendMessage,
  onSelectUser,
  onDeleteMessage,
  onReactToMessage,
  onTyping,
  onMarkAsRead,
  getUserStatus,
  gifApiKey = 'YOUR_GIPHY_API_KEY' // Default or env variable
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [searchGifQuery, setSearchGifQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout>();
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: string; url: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (selectedUser) {
      messages.forEach(msg => {
        if (msg.receiverId === currentUser.id && !msg.read) {
          onMarkAsRead(msg.id);
        }
      });
    }
  }, [selectedUser, messages]);

  // Fetch trending GIFs
  useEffect(() => {
    if (showGifPicker) {
      fetchTrendingGifs();
    }
  }, [showGifPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTrendingGifs = async () => {
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${gifApiKey}&limit=20`
      );
      const data = await response.json();
      const gifList = data.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        title: gif.title
      }));
      setGifs(gifList);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${gifApiKey}&q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      const gifList = data.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images.fixed_height.url,
        title: gif.title
      }));
      setGifs(gifList);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    // Prepare attachments for sending
    const messageAttachments: MessageAttachment[] = attachments.map((file, index) => {
      const url = URL.createObjectURL(file);
      const type = getFileType(file.type);
      
      return {
        id: `attachment-${Date.now()}-${index}`,
        type,
        url,
        name: file.name,
        size: formatFileSize(file.size),
        thumbnail: type === 'image' || type === 'video' ? url : undefined
      };
    });

    onSendMessage(newMessage, messageAttachments);
    
    // Clear inputs
    setNewMessage('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    
    // Revoke object URLs after sending (in real app, upload to server first)
    setTimeout(() => {
      messageAttachments.forEach(att => {
        if (att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });
    }, 1000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const maxSize = 25 * 1024 * 1024; // 25MB limit
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 25MB.`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  const getFileType = (mimeType: string): 'image' | 'document' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  const handleGifSelect = (gif: Gif) => {
    onSendMessage('', [], gif.url, 'gif');
    setShowGifPicker(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Notify typing status
    if (selectedUser) {
      setIsTyping(true);
      onTyping(currentUser.id, true);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      const timeout = setTimeout(() => {
        setIsTyping(false);
        onTyping(currentUser.id, false);
      }, 1000);
      
      setTypingTimeout(timeout);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderMessageContent = (message: Message) => {
    if (message.gifUrl) {
      return (
        <div className="relative group">
          <img 
            src={message.gifUrl} 
            alt="GIF" 
            className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer"
            onClick={() => setFullscreenMedia({ type: 'gif', url: message.gifUrl! })}
          />
          <div className="absolute top-2 right-2 hidden group-hover:block">
            <button
              onClick={() => setFullscreenMedia({ type: 'gif', url: message.gifUrl! })}
              className="bg-black/50 text-white p-1 rounded"
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          </div>
        </div>
      );
    }

    if (message.attachments && message.attachments.length > 0) {
      return (
        <div className="space-y-2">
          {message.attachments.map(att => (
            <div key={att.id} className="relative group">
              {att.type === 'image' && (
                <img 
                  src={att.url} 
                  alt={att.name || 'Image'} 
                  className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer"
                  onClick={() => setFullscreenMedia({ type: 'image', url: att.url })}
                />
              )}
              
              {att.type === 'video' && (
                <div className="relative">
                  <video 
                    controls 
                    className="max-w-[300px] max-h-[300px] rounded-lg"
                    poster={att.thumbnail}
                  >
                    <source src={att.url} type="video/mp4" />
                  </video>
                  <button
                    onClick={() => setFullscreenMedia({ type: 'video', url: att.url })}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded hidden group-hover:block"
                  >
                    <FontAwesomeIcon icon={faExpand} />
                  </button>
                </div>
              )}
              
              {att.type === 'audio' && (
                <div className="flex items-center gap-2 bg-[#3A3B3C] p-3 rounded-lg">
                  <button
                    onClick={() => {
                      if (playingAudio === att.id) {
                        setPlayingAudio(null);
                      } else {
                        setPlayingAudio(att.id);
                      }
                    }}
                    className="bg-[#1877F2] text-white p-2 rounded-full"
                  >
                    <FontAwesomeIcon icon={playingAudio === att.id ? faPause : faPlay} />
                  </button>
                  <div className="flex-1">
                    <div className="text-[#E4E6EB] font-medium truncate">
                      {att.name || 'Audio file'}
                    </div>
                    <div className="text-[#B0B3B8] text-sm">{att.size}</div>
                  </div>
                  <a 
                    href={att.url} 
                    download={att.name}
                    className="text-[#1877F2] p-2"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </a>
                </div>
              )}
              
              {att.type === 'document' && (
                <div className="flex items-center gap-3 bg-[#3A3B3C] p-3 rounded-lg">
                  <div className="bg-[#1877F2] text-white p-3 rounded">
                    <FontAwesomeIcon icon={faFile} size="lg" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[#E4E6EB] font-medium truncate">
                      {att.name || 'Document'}
                    </div>
                    <div className="text-[#B0B3B8] text-sm">{att.size}</div>
                  </div>
                  <a 
                    href={att.url} 
                    download={att.name}
                    className="text-[#1877F2] p-2"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </a>
                </div>
              )}
              
              <div className="text-[#B0B3B8] text-xs mt-1">
                {att.name}
                {att.size && ` • ${att.size}`}
              </div>
            </div>
          ))}
          {message.content && (
            <div className="text-[#E4E6EB] mt-2">{message.content}</div>
          )}
        </div>
      );
    }

    return <div className="text-[#E4E6EB]">{message.content}</div>;
  };

  const renderMessageStatus = (message: Message) => {
    if (message.senderId !== currentUser.id) return null;

    const statusStyles = {
      read: 'text-[#1877F2]',
      delivered: 'text-[#B0B3B8]',
      sent: 'text-[#65676B]',
      sending: 'text-[#65676B] animate-pulse'
    };

    return (
      <div className={`text-xs mt-1 ${statusStyles[message.status]}`}>
        {message.status === 'sending' && <FontAwesomeIcon icon={faClock} />}
        {message.status === 'sent' && <FontAwesomeIcon icon={faCheck} />}
        {message.status === 'delivered' && <FontAwesomeIcon icon={faCheckDouble} />}
        {message.status === 'read' && <FontAwesomeIcon icon={faCheckDouble} className={statusStyles.read} />}
        <span className="ml-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  };

  const renderReactionPicker = () => {
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    
    return (
      <div className="absolute bottom-full mb-2 left-0 bg-[#242526] border border-[#3E4042] rounded-lg shadow-lg p-2 z-50">
        <div className="flex gap-2">
          {reactions.map(reaction => (
            <button
              key={reaction}
              onClick={() => {
                if (selectedReaction) {
                  onReactToMessage(selectedReaction, reaction);
                  setSelectedReaction(null);
                }
              }}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {reaction}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLastSeen = (user: User) => {
    const status = getUserStatus(user.id);
    
    if (status.isOnline) {
      return (
        <div className="flex items-center gap-1 text-[#45BD62] text-xs">
          <div className="w-2 h-2 bg-[#45BD62] rounded-full"></div>
          <span>Online</span>
        </div>
      );
    }
    
    // Facebook-style last seen formatting
    const lastSeen = new Date(status.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    let timeText = '';
    if (diffMinutes < 1) {
      timeText = 'Just now';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffMinutes / 60);
      timeText = `${hours}h ago`;
    } else if (diffMinutes < 10080) { // 7 days
      const days = Math.floor(diffMinutes / 1440);
      timeText = `${days}d ago`;
    } else {
      timeText = lastSeen.toLocaleDateString();
    }
    
    return (
      <div className="text-[#B0B3B8] text-xs">
        Last seen {timeText}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#18191A] text-[#E4E6EB]">
      {/* Sidebar with conversations */}
      <div className="w-1/3 md:w-1/4 border-r border-[#3E4042] flex flex-col">
        <div className="p-4 border-b border-[#3E4042]">
          <h2 className="text-xl font-bold">Messages</h2>
          <div className="relative mt-3">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B0B3B8]"
            />
            <input
              type="text"
              placeholder="Search messages"
              className="w-full bg-[#3A3B3C] text-[#E4E6EB] pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.map(user => {
            const userMessages = messages.filter(m => 
              m.senderId === user.id || m.receiverId === user.id
            );
            const lastMessage = userMessages[userMessages.length - 1];
            const unreadCount = userMessages.filter(m => 
              m.receiverId === currentUser.id && !m.read
            ).length;
            const status = getUserStatus(user.id);

            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`p-4 border-b border-[#3E4042] hover:bg-[#3A3B3C] cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? 'bg-[#3A3B3C]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#242526] ${
                      status.isOnline ? 'bg-[#45BD62]' : 'bg-[#B0B3B8]'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold truncate">{user.name}</h3>
                      {lastMessage && (
                        <span className="text-xs text-[#B0B3B8]">
                          {new Date(lastMessage.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[#B0B3B8] truncate">
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-[#1877F2] text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-[#3E4042] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={selectedUser.profileImage}
                    alt={selectedUser.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#242526] ${
                    getUserStatus(selectedUser.id).isOnline ? 'bg-[#45BD62]' : 'bg-[#B0B3B8]'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    {selectedUser.name}
                    {selectedUser.isVerified && (
                      <i className="fas fa-check-circle text-[#1877F2]"></i>
                    )}
                  </h3>
                  {renderLastSeen(selectedUser)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-[#3A3B3C] rounded-full">
                  <FontAwesomeIcon icon={faVideo} />
                </button>
                <button className="p-2 hover:bg-[#3A3B3C] rounded-full">
                  <FontAwesomeIcon icon={faEllipsisV} />
                </button>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages
                .filter(m => 
                  (m.senderId === currentUser.id && m.receiverId === selectedUser.id) ||
                  (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
                )
                .map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="group relative max-w-[70%]">
                      <div
                        className={`rounded-lg p-3 ${message.senderId === currentUser.id
                          ? 'bg-[#1877F2] text-white rounded-tr-none'
                          : 'bg-[#3A3B3C] rounded-tl-none'
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedReaction(message.id);
                        }}
                      >
                        {renderMessageContent(message)}
                        {renderMessageStatus(message)}
                        
                        {message.reaction && (
                          <div className="absolute -bottom-2 right-2 bg-[#242526] rounded-full p-1 text-lg">
                            {message.reaction}
                          </div>
                        )}
                      </div>
                      
                      {/* Message options */}
                      <div className="absolute top-2 right-2 hidden group-hover:block">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedReaction(message.id)}
                            className="bg-black/50 text-white p-1 rounded"
                          >
                            <FontAwesomeIcon icon={faThumbsUp} />
                          </button>
                          <button
                            onClick={() => setMessageToDelete(message.id)}
                            className="bg-black/50 text-white p-1 rounded"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                      
                      {selectedReaction === message.id && renderReactionPicker()}
                    </div>
                  </div>
                ))}
              
              {isTyping && selectedUser && (
                <div className="flex justify-start">
                  <div className="bg-[#3A3B3C] rounded-lg p-3 rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-pulse delay-150"></div>
                      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-pulse delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-[#3E4042]">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="relative group">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : file.type.startsWith('video/') ? (
                        <div className="w-20 h-20 bg-[#3A3B3C] rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faVideo} className="text-2xl" />
                        </div>
                      ) : file.type.startsWith('audio/') ? (
                        <div className="w-20 h-20 bg-[#3A3B3C] rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faMusic} className="text-2xl" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-[#3A3B3C] rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon icon={faFile} className="text-2xl" />
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                      <div className="text-xs mt-1 truncate max-w-[80px]">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="p-4 border-t border-[#3E4042]">
              <div className="flex items-end gap-2">
                {/* Attachment menu */}
                {showAttachmentsMenu && (
                  <div className="absolute bottom-full mb-2 left-4 bg-[#242526] border border-[#3E4042] rounded-lg shadow-lg p-2 z-50">
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="flex flex-col items-center p-2 hover:bg-[#3A3B3C] rounded-lg"
                      >
                        <FontAwesomeIcon icon={faImage} className="text-xl mb-1" />
                        <span className="text-xs">Photo</span>
                      </button>
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="flex flex-col items-center p-2 hover:bg-[#3A3B3C] rounded-lg"
                      >
                        <FontAwesomeIcon icon={faVideo} className="text-xl mb-1" />
                        <span className="text-xs">Video</span>
                      </button>
                      <button
                        onClick={() => audioInputRef.current?.click()}
                        className="flex flex-col items-center p-2 hover:bg-[#3A3B3C] rounded-lg"
                      >
                        <FontAwesomeIcon icon={faMusic} className="text-xl mb-1" />
                        <span className="text-xs">Audio</span>
                      </button>
                      <button
                        onClick={() => documentInputRef.current?.click()}
                        className="flex flex-col items-center p-2 hover:bg-[#3A3B3C] rounded-lg"
                      >
                        <FontAwesomeIcon icon={faFile} className="text-xl mb-1" />
                        <span className="text-xs">File</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowAttachmentsMenu(!showAttachmentsMenu)}
                  className="p-3 hover:bg-[#3A3B3C] rounded-full"
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                </button>

                <button
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className="p-3 hover:bg-[#3A3B3C] rounded-full"
                >
                  GIF
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={textAreaRef}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full bg-[#3A3B3C] text-[#E4E6EB] rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#1877F2] resize-none max-h-[120px]"
                    rows={1}
                  />
                  
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 bottom-3 text-[#B0B3B8] hover:text-[#E4E6EB]"
                  >
                    <FontAwesomeIcon icon={faSmile} />
                  </button>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && attachments.length === 0}
                  className={`p-3 rounded-full ${
                    newMessage.trim() || attachments.length > 0
                      ? 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                      : 'bg-[#3A3B3C] text-[#B0B3B8] cursor-not-allowed'
                  }`}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <input
                type="file"
                ref={videoInputRef}
                className="hidden"
                accept="video/*"
                onChange={(e) => handleFileSelect(e, 'video')}
              />
              <input
                type="file"
                ref={audioInputRef}
                className="hidden"
                accept="audio/*"
                onChange={(e) => handleFileSelect(e, 'audio')}
              />
              <input
                type="file"
                ref={documentInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                multiple
                onChange={(e) => handleFileSelect(e, 'document')}
              />

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-50">
                  <Picker onEmojiClick={handleEmojiClick} />
                </div>
              )}

              {/* GIF Picker */}
              {showGifPicker && (
                <div className="absolute bottom-20 left-4 right-4 bg-[#242526] border border-[#3E4042] rounded-lg shadow-lg p-4 z-50 max-h-[400px] overflow-y-auto">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search GIFs..."
                      value={searchGifQuery}
                      onChange={(e) => {
                        setSearchGifQuery(e.target.value);
                        searchGifs(e.target.value);
                      }}
                      className="w-full bg-[#3A3B3C] text-[#E4E6EB] rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {gifs.map(gif => (
                      <div
                        key={gif.id}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => handleGifSelect(gif)}
                      >
                        <img
                          src={gif.url}
                          alt={gif.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // No chat selected view
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center p-8">
              <div className="w-24 h-24 bg-[#3A3B3C] rounded-full flex items-center justify-center mx-auto mb-6">
                <FontAwesomeIcon icon={faPaperPlane} className="text-4xl" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Your Messages</h3>
              <p className="text-[#B0B3B8]">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-4 right-4 text-white text-2xl bg-black/50 p-2 rounded-full"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
          {fullscreenMedia.type === 'image' && (
            <img
              src={fullscreenMedia.url}
              alt="Fullscreen"
              className="max-w-full max-h-full object-contain"
            />
          )}
          {fullscreenMedia.type === 'gif' && (
            <img
              src={fullscreenMedia.url}
              alt="GIF"
              className="max-w-full max-h-full object-contain"
            />
          )}
          {fullscreenMedia.type === 'video' && (
            <video
              src={fullscreenMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-[#242526] rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-2">Delete Message?</h3>
            <p className="text-[#B0B3B8] mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMessageToDelete(null)}
                className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-2.5 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteMessage(messageToDelete);
                  setMessageToDelete(null);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for typing indicator
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-[#B0B3B8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

export default Messages;
