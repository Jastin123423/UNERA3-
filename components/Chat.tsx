import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { StickerPicker, EmojiPicker } from './Pickers';

interface ChatWindowProps {
    currentUser: User;
    recipient: User;
    messages: Message[];
    onClose: () => void;
    onSendMessage: (text: string, attachments?: any[], gifUrl?: string, emoji?: string) => void;
    isFullScreen?: boolean;
    onDeleteMessage?: (messageId: string) => void;
    onReactToMessage?: (messageId: string, reaction: string) => void;
    onTyping?: (isTyping: boolean) => void;
    onMarkAsRead?: (messageId: string) => void;
    getUserStatus?: (userId: number) => { isOnline: boolean; lastSeen: string; typing: boolean; formattedLastSeen?: string };
    gifApiKey?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
    currentUser, 
    recipient, 
    messages, 
    onClose, 
    onSendMessage, 
    isFullScreen = true,
    onDeleteMessage,
    onReactToMessage,
    onTyping,
    onMarkAsRead,
    getUserStatus,
    gifApiKey
}) => {
    const [inputText, setInputText] = useState('');
    const [showStickers, setShowStickers] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const scrollToBottom = () => { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    };
    
    useEffect(() => { 
        scrollToBottom(); 
    }, [messages, showStickers, showEmojis, showGifPicker]);

    // Handle typing indicator
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputText(value);
        
        // Show typing indicator when user starts typing
        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            if (onTyping) {
                onTyping(true);
            }
        }
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Set timeout to hide typing indicator after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                if (onTyping) {
                    onTyping(false);
                }
            }
        }, 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
            setShowEmojis(false);
            setShowStickers(false);
            setShowGifPicker(false);
            
            // Clear typing state
            setIsTyping(false);
            if (onTyping) {
                onTyping(false);
            }
        }
    };

    const handleStickerSelect = (url: string) => {
        onSendMessage('', undefined, url);
        setShowStickers(false);
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileUrl = URL.createObjectURL(file);
            onSendMessage(`Sent a file: ${file.name}`, [{
                id: Date.now().toString(),
                type: file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'document',
                url: fileUrl,
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            }]);
        }
    };

    const handleGifSelect = (gifUrl: string) => {
        onSendMessage('', undefined, gifUrl);
        setShowGifPicker(false);
    };

    // Check if message is only emojis (for large rendering)
    const isOnlyEmojis = (text: string) => {
        if (!text) return false;
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,3}$/u;
        return emojiRegex.test(text.trim());
    };

    // Format message timestamp
    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get message status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sending':
                return <i className="fas fa-clock text-[#8696a0] text-xs"></i>;
            case 'sent':
                return <i className="fas fa-check text-[#8696a0] text-xs"></i>;
            case 'delivered':
                return <i className="fas fa-check-double text-[#8696a0] text-xs"></i>;
            case 'read':
                return <i className="fas fa-check-double text-[#53bdeb] text-xs"></i>;
            default:
                return null;
        }
    };

    // Always full screen based on request
    const containerClasses = "fixed inset-0 z-[200] bg-black flex flex-col font-sans";

    return (
        <div className={containerClasses}>
            {/* Header - WhatsApp Style */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#202c33] border-b border-[#202c33] shadow-sm h-16">
                <div className="flex items-center gap-3">
                    <i className="fas fa-arrow-left text-[#E4E6EB] text-xl cursor-pointer mr-1" onClick={onClose}></i>
                    <div className="relative cursor-pointer">
                        <img src={recipient.profileImage} alt={recipient.name} className="w-10 h-10 rounded-full object-cover" />
                        {getUserStatus && getUserStatus(recipient.id).isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] rounded-full border-2 border-[#202c33]"></div>
                        )}
                    </div>
                    <div className="cursor-pointer">
                        <h4 className="font-semibold text-[17px] text-[#E4E6EB] leading-tight">{recipient.name}</h4>
                        <span className="text-[13px] text-[#8696a0] block leading-tight">
                            {getUserStatus ? (
                                getUserStatus(recipient.id).typing ? 'typing...' : 
                                getUserStatus(recipient.id).formattedLastSeen || 'online'
                            ) : 'online'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-[#8696a0]">
                    <i className="fas fa-video cursor-pointer text-xl"></i>
                    <i className="fas fa-phone-alt cursor-pointer text-lg"></i>
                    <i className="fas fa-ellipsis-v cursor-pointer text-lg"></i>
                </div>
            </div>

            {/* Messages Area - Black background */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-black bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-contain">
                <div className="flex flex-col items-center py-6 text-center bg-[#182229]/80 rounded-lg mb-4 p-4 self-center max-w-[80%]">
                    <p className="text-[#FFD279] text-xs uppercase font-bold mb-1">Security</p>
                    <p className="text-[#8696a0] text-xs">Messages and calls are end-to-end encrypted. No one outside of this chat, not even UNERA, can read or listen to them.</p>
                </div>
                
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const bigEmoji = isOnlyEmojis(msg.content || '');
                    
                    // Mark message as read when viewed
                    useEffect(() => {
                        if (!isMe && msg.status !== 'read' && onMarkAsRead) {
                            onMarkAsRead(msg.id);
                        }
                    }, [msg, isMe, onMarkAsRead]);
                    
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group`}>
                            {msg.gifUrl ? (
                                <div className="max-w-[75%]">
                                    <img src={msg.gifUrl} alt="GIF" className="max-w-full h-auto rounded-lg" />
                                    <div className="text-[11px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                        {formatMessageTime(msg.timestamp)}
                                        {isMe && getStatusIcon(msg.status)}
                                    </div>
                                </div>
                            ) : msg.stickerUrl ? (
                                <img src={msg.stickerUrl} alt="sticker" className="w-32 h-32 object-contain" />
                            ) : msg.attachments && msg.attachments.length > 0 ? (
                                <div className="max-w-[75%]">
                                    {msg.attachments.map(attachment => (
                                        <div key={attachment.id} className="bg-[#202c33] rounded-lg p-3 mb-2">
                                            {attachment.type === 'image' ? (
                                                <img src={attachment.url} alt={attachment.name} className="max-w-full h-auto rounded" />
                                            ) : attachment.type === 'video' ? (
                                                <video src={attachment.url} controls className="max-w-full h-auto rounded" />
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <i className="fas fa-file text-2xl text-[#8696a0]"></i>
                                                    <div>
                                                        <p className="text-[#E9EDEF] text-sm">{attachment.name}</p>
                                                        <p className="text-[#8696a0] text-xs">{attachment.size}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {msg.content && (
                                        <div className="px-3 py-1.5 rounded-lg text-[17px] bg-[#202c33] text-[#E9EDEF] mt-2">
                                            <span>{msg.content}</span>
                                        </div>
                                    )}
                                    <div className="text-[11px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                        {formatMessageTime(msg.timestamp)}
                                        {isMe && getStatusIcon(msg.status)}
                                    </div>
                                </div>
                            ) : msg.reaction ? (
                                <div className={`px-3 py-1.5 rounded-lg text-2xl ${isMe ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}>
                                    {msg.reaction}
                                    <div className="text-[11px] text-[#8696a0] text-right mt-1">
                                        {formatMessageTime(msg.timestamp)}
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[75%] px-3 py-1.5 rounded-lg text-[17px] shadow-sm relative ${isMe ? 'bg-[#005c4b] text-[#E9EDEF] rounded-tr-none' : 'bg-[#202c33] text-[#E9EDEF] rounded-tl-none'} ${bigEmoji ? 'bg-transparent !p-0 shadow-none' : ''}`}>
                                    {bigEmoji ? (
                                        <span className="text-6xl">{msg.content}</span>
                                    ) : (
                                        <>
                                            {/* FIXED: Changed msg.text to msg.content */}
                                            <span>{msg.content}</span>
                                            <div className="text-[11px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                                {formatMessageTime(msg.timestamp)}
                                                {isMe && getStatusIcon(msg.status)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {isTyping && !isMe && (
                    <div className="flex justify-start mb-1">
                        <div className="bg-[#202c33] text-[#E9EDEF] rounded-tl-none rounded-lg px-3 py-1.5 max-w-[75%]">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Pickers Area */}
            {showStickers && <StickerPicker onSelect={handleStickerSelect} />}
            {showEmojis && <EmojiPicker onSelect={handleEmojiSelect} />}
            {showGifPicker && gifApiKey && (
                <div className="absolute bottom-16 left-0 right-0 bg-[#202c33] p-3 max-h-64 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[#E9EDEF] text-sm">Search GIFs</span>
                        <i className="fas fa-times text-[#8696a0] cursor-pointer" onClick={() => setShowGifPicker(false)}></i>
                    </div>
                    <p className="text-[#8696a0] text-xs">GIF feature placeholder - implement with GIPHY API</p>
                </div>
            )}

            {/* Footer Input */}
            <div className="p-2 bg-[#202c33] flex items-end gap-2">
                <div className="flex gap-3 mb-3 ml-2">
                    <i 
                        className={`far fa-smile text-2xl cursor-pointer ${showEmojis ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                        onClick={() => { setShowEmojis(!showEmojis); setShowStickers(false); setShowGifPicker(false); }}
                    ></i>
                    <i 
                        className={`fas fa-gift text-2xl cursor-pointer ${showGifPicker ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                        onClick={() => { setShowGifPicker(!showGifPicker); setShowStickers(false); setShowEmojis(false); }}
                    ></i>
                    <i className="fas fa-plus text-[#8696a0] text-2xl cursor-pointer" onClick={() => fileInputRef.current?.click()}></i>
                </div>
                
                <div className="flex-1 relative bg-[#2a3942] rounded-lg flex items-center min-h-[42px] mb-1">
                    <input 
                        type="text" 
                        value={inputText} 
                        onChange={handleInputChange} 
                        onFocus={() => { setShowStickers(false); setShowEmojis(false); setShowGifPicker(false); }}
                        placeholder="Message" 
                        className="w-full bg-transparent px-4 py-2 text-[17px] outline-none text-[#d1d7db] placeholder-[#8696a0]" 
                    />
                    <div className="flex gap-3 mr-3">
                         <i className="fas fa-paperclip text-[#8696a0] text-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}></i>
                         <i 
                            className={`fas fa-sticky-note text-xl cursor-pointer ${showStickers ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                            onClick={() => { setShowStickers(!showStickers); setShowEmojis(false); setShowGifPicker(false); }}
                        ></i>
                    </div>
                </div>
                
                <button 
                    type="submit" 
                    onClick={handleSubmit} 
                    className="mb-2 bg-[#00a884] w-10 h-10 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
                    disabled={!inputText.trim()}
                >
                    {inputText.trim() ? (
                        <i className="fas fa-paper-plane text-white text-lg"></i>
                    ) : (
                        <i className="fas fa-microphone text-white text-lg"></i>
                    )}
                </button>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,application/pdf" multiple onChange={handleFileChange} />
            </div>
        </div>
    );
};
