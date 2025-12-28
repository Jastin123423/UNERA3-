

import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { StickerPicker, EmojiPicker } from './Pickers';

interface ChatWindowProps {
    currentUser: User;
    recipient: User;
    messages: Message[];
    onClose: () => void;
    onSendMessage: (text: string, stickerUrl?: string) => void;
    isFullScreen?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, recipient, messages, onClose, onSendMessage, isFullScreen = true }) => {
    const [inputText, setInputText] = useState('');
    const [showStickers, setShowStickers] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(() => { scrollToBottom(); }, [messages, showStickers, showEmojis]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
            setShowEmojis(false);
            setShowStickers(false);
        }
    };

    const handleStickerSelect = (url: string) => {
        onSendMessage('', url);
        setShowStickers(false);
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Mock sending an image by just sending text for now, in real app upload logic
            const file = e.target.files[0];
            onSendMessage(`Sent a file: ${file.name}`);
        }
    };

    // Check if message is only emojis (for large rendering)
    const isOnlyEmojis = (text: string) => {
        if (!text) return false;
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,3}$/u;
        return emojiRegex.test(text.trim());
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
                        {recipient.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] rounded-full border-2 border-[#202c33]"></div>}
                    </div>
                    <div className="cursor-pointer">
                        <h4 className="font-semibold text-[17px] text-[#E4E6EB] leading-tight">{recipient.name}</h4>
                        <span className="text-[13px] text-[#8696a0] block leading-tight">online</span>
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
                    const bigEmoji = isOnlyEmojis(msg.text);
                    
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group`}>
                            {msg.stickerUrl ? (
                                <img src={msg.stickerUrl} alt="sticker" className="w-32 h-32 object-contain" />
                            ) : (
                                <div className={`max-w-[75%] px-3 py-1.5 rounded-lg text-[17px] shadow-sm relative ${isMe ? 'bg-[#005c4b] text-[#E9EDEF] rounded-tr-none' : 'bg-[#202c33] text-[#E9EDEF] rounded-tl-none'} ${bigEmoji ? 'bg-transparent !p-0 shadow-none' : ''}`}>
                                    {bigEmoji ? <span className="text-6xl">{msg.text}</span> : (
                                        <>
                                            <span>{msg.text}</span>
                                            <div className="text-[11px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isMe && <i className="fas fa-check-double text-[#53bdeb]"></i>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Pickers Area */}
            {showStickers && <StickerPicker onSelect={handleStickerSelect} />}
            {showEmojis && <EmojiPicker onSelect={handleEmojiSelect} />}

            {/* Footer Input */}
            <div className="p-2 bg-[#202c33] flex items-end gap-2">
                <div className="flex gap-3 mb-3 ml-2">
                    <i 
                        className={`far fa-smile text-2xl cursor-pointer ${showEmojis ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                        onClick={() => { setShowEmojis(!showEmojis); setShowStickers(false); }}
                    ></i>
                    <i className="fas fa-plus text-[#8696a0] text-2xl cursor-pointer" onClick={() => fileInputRef.current?.click()}></i>
                </div>
                
                <div className="flex-1 relative bg-[#2a3942] rounded-lg flex items-center min-h-[42px] mb-1">
                    <input 
                        type="text" 
                        value={inputText} 
                        onChange={(e) => setInputText(e.target.value)} 
                        onFocus={() => { setShowStickers(false); setShowEmojis(false); }}
                        placeholder="Message" 
                        className="w-full bg-transparent px-4 py-2 text-[17px] outline-none text-[#d1d7db] placeholder-[#8696a0]" 
                    />
                    <div className="flex gap-3 mr-3">
                         <i className="fas fa-paperclip text-[#8696a0] text-xl cursor-pointer" onClick={() => fileInputRef.current?.click()}></i>
                         <i 
                            className={`fas fa-sticky-note text-xl cursor-pointer ${showStickers ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                            onClick={() => { setShowStickers(!showStickers); setShowEmojis(false); }}
                        ></i>
                    </div>
                </div>
                
                <button type="submit" onClick={handleSubmit} className="mb-2 bg-[#00a884] w-10 h-10 rounded-full flex items-center justify-center shadow-md">
                    {inputText.trim() ? (
                        <i className="fas fa-paper-plane text-white text-lg"></i>
                    ) : (
                        <i className="fas fa-microphone text-white text-lg"></i>
                    )}
                </button>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
            </div>
        </div>
    );
};
