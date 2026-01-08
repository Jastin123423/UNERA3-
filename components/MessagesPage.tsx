
import React, { useState, useMemo, useEffect } from 'react';
import { User, Conversation, Message } from '../types';
import { ChatWindow } from './Chat';

interface MessagesPageProps {
    currentUser: User;
    conversations: Conversation[];
    messages: Message[];
    users: User[];
    onSendMessage: (conversationId: number, text: string, stickerUrl?: string) => void;
    onNavigateToProfile: (userId: number) => void;
    initialChatUserId?: number | null;
    onSetInitialChatUserId: (userId: number | null) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ 
    currentUser, conversations, messages, users, onSendMessage, onNavigateToProfile,
    initialChatUserId, onSetInitialChatUserId 
}) => {
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

    // If an initial user ID is provided (e.g., from clicking "Message" on a profile), find that conversation.
    useEffect(() => {
        if (initialChatUserId) {
            const convo = conversations.find(c => c.participants.includes(initialChatUserId));
            if (convo) {
                setActiveConversationId(convo.id);
            }
            // Clear the initial user ID after setting it
            onSetInitialChatUserId(null);
        } else if (!activeConversationId && conversations.length > 0) {
            // Default to the most recent conversation if none is selected
            setActiveConversationId(conversations[0].id);
        }
    }, [initialChatUserId, conversations, activeConversationId, onSetInitialChatUserId]);

    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === activeConversationId);
    }, [activeConversationId, conversations]);

    const activeMessages = useMemo(() => {
        if (!activeConversationId) return [];
        return messages.filter(m => m.conversationId === activeConversationId).sort((a,b) => a.timestamp - b.timestamp);
    }, [activeConversationId, messages]);

    const recipient = useMemo(() => {
        if (!activeConversation) return null;
        const recipientId = activeConversation.participants.find(pId => pId !== currentUser.id);
        return users.find(u => u.id === recipientId);
    }, [activeConversation, currentUser, users]);

    return (
        <div className="w-full h-[calc(100vh-56px)] flex font-sans animate-fade-in">
            {/* Left Panel: Conversation List */}
            <div className="w-full md:w-[360px] bg-[#242526] border-r border-[#3E4042] flex flex-col">
                <div className="p-4 border-b border-[#3E4042]">
                    <h2 className="text-2xl font-bold text-[#E4E6EB]">Chats</h2>
                    <div className="relative mt-3">
                        <input type="text" placeholder="Search Messenger" className="w-full bg-[#3A3B3C] rounded-full py-2 pl-10 pr-4 text-[#E4E6EB] outline-none" />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.sort((a,b) => b.lastMessageTimestamp - a.lastMessageTimestamp).map(convo => {
                        const otherUserId = convo.participants.find(pId => pId !== currentUser.id);
                        const otherUser = users.find(u => u.id === otherUserId);
                        if (!otherUser) return null;

                        const isActive = convo.id === activeConversationId;
                        const isUnread = convo.unreadCount > 0;

                        return (
                            <div 
                                key={convo.id}
                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isActive ? 'bg-[#263951]' : 'hover:bg-[#3A3B3C]'}`}
                                onClick={() => setActiveConversationId(convo.id)}
                            >
                                <div className="relative">
                                    <img src={otherUser.profileImage} className="w-14 h-14 rounded-full object-cover" alt={otherUser.name} />
                                    {otherUser.isOnline && <div className="absolute bottom-1 right-1 w-3 h-3 bg-[#31A24C] rounded-full border-2 border-[#242526]"></div>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className={`font-semibold truncate ${isUnread ? 'text-white' : 'text-[#E4E6EB]'}`}>{otherUser.name}</h4>
                                    <p className={`text-sm truncate ${isUnread ? 'text-white font-bold' : 'text-[#B0B3B8]'}`}>{convo.lastMessage}</p>
                                </div>
                                {isUnread && (
                                    <div className="w-4 h-4 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                        {convo.unreadCount}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Panel: Active Chat */}
            <div className="flex-1 hidden md:flex flex-col bg-[#18191A]">
                {recipient && activeConversation ? (
                    <ChatWindow
                        currentUser={currentUser}
                        recipient={recipient}
                        messages={activeMessages}
                        onSendMessage={(text, stickerUrl) => onSendMessage(activeConversation.id, text, stickerUrl)}
                        onNavigateToProfile={onNavigateToProfile}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#B0B3B8] gap-2">
                        <i className="fab fa-facebook-messenger text-6xl"></i>
                        <h3 className="text-xl font-bold text-[#E4E6EB]">Your Messages</h3>
                        <p>Select a chat to start a conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
