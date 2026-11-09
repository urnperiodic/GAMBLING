import React, { useEffect, useRef, useState } from 'react';
import {
  PlayerProfileData,
  PlayerConnectionItem,
  ChatMessage,
  MultiplayerRoom,
} from '../types/casino';
import {
  Send,
  UserPlus,
  Play,
  Users,
  MessageSquare,
  Smile,
  X,
  UserCheck,
  Crown,
  Gamepad2,
  Sparkles,
} from 'lucide-react';

interface SocialSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfileData;
  onlinePlayers: PlayerProfileData[];
  connections: PlayerConnectionItem[];
  rooms: MultiplayerRoom[];
  activeRoom: MultiplayerRoom | null;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onAddFriend: (targetUidOrName: string) => void;
  onRemoveFriend: (targetUid: string) => void;
  onInvitePlayer: (recipientId: string) => void;
  onJoinRoom: (roomId: string, role: 'player' | 'spectator') => void;
  socialNotice: string | null;
}

const REACTION_EMOJIS = ['🔥', '💎', '🎉', '🍀', '👑', '😱', '🤝', '🚀'];

export const SocialSidebar: React.FC<SocialSidebarProps> = ({
  isOpen,
  onClose,
  currentUser,
  onlinePlayers,
  connections,
  rooms,
  activeRoom,
  chatMessages,
  onSendChat,
  onSendReaction,
  onAddFriend,
  onRemoveFriend,
  onInvitePlayer,
  onJoinRoom,
  socialNotice,
}) => {
  // Main view toggle: 'online' or 'chat'
  const [sidebarView, setSidebarView] = useState<'online' | 'chat'>('online');
  const [onlineSubTab, setOnlineSubTab] = useState<'all' | 'table' | 'friends'>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState('');
  const [friendQuery, setFriendQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const friendsList = connections.filter((c) => c.relationType === 'friend');
  const seatedPlayers = activeRoom
    ? activeRoom.participants.filter((p) => p.role === 'player')
    : [];

  useEffect(() => {
    if (isOpen && sidebarView === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, isOpen, sidebarView]);

  if (!isOpen) {
    return null;
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const handleFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendQuery.trim()) return;
    onAddFriend(friendQuery.trim());
    setFriendQuery('');
  };

  // Ensure current user is included in the online count if not already
  const displayedOnline = onlinePlayers.length > 0 ? onlinePlayers : [currentUser];

  return (
    <>
      {/* Semi-transparent mobile / compact viewport backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 xl:hidden"
        aria-hidden="true"
      />

      <aside className="fixed xl:static top-0 right-0 bottom-0 z-50 w-80 sm:w-86 xl:w-84 h-full shrink-0 bg-[#07100c] border-l border-amber-500/20 flex flex-col overflow-hidden select-none shadow-2xl">
        {/* Top Header: Title + Online Count Indicator + Close */}
        <div className="px-3.5 py-3 border-b border-amber-500/15 bg-[#09140f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-xs font-black text-white tracking-wide truncate">
                  {displayedOnline.length} Patrons Online
                </span>
              </div>
              <span className="text-[10px] text-amber-300/80 font-medium truncate block">
                {activeRoom ? `${activeRoom.name} (${seatedPlayers.length}/5)` : 'Social Club Parlor'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-[#0d1c15] border border-stone-800 hover:border-rose-400/50 hover:bg-rose-500/15 flex items-center gap-1 text-stone-300 hover:text-rose-300 text-[11px] font-bold transition-colors cursor-pointer"
            title="Close Sidebar"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Primary Segmented Mode Switcher: [ 🟢 Online Patrons ] | [ 💬 Parlor Chat ] */}
        <div className="p-2 border-b border-amber-500/15 bg-[#050b08] shrink-0">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0a1610] rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setSidebarView('online')}
              className={`py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarView === 'online'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Patrons ({displayedOnline.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarView('chat')}
              className={`py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarView === 'chat'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Parlor Chat</span>
            </button>
          </div>
        </div>

        {/* Temporary Notice Banner */}
        {socialNotice && (
          <div className="bg-amber-400 text-stone-950 text-xs px-3 py-1.5 font-bold flex items-center justify-between shrink-0 shadow">
            <span>{socialNotice}</span>
          </div>
        )}

        {/* VIEW 1: ONLINE PATRONS DIRECTORY */}
        {sidebarView === 'online' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#07110d]">
            {/* Sub-filter tabs */}
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-1 border-b border-stone-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setOnlineSubTab('all')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer ${
                  onlineSubTab === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                All Online ({displayedOnline.length})
              </button>
              {activeRoom && (
                <button
                  type="button"
                  onClick={() => setOnlineSubTab('table')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer ${
                    onlineSubTab === 'table'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Table Seats ({seatedPlayers.length}/5)
                </button>
              )}
              <button
                type="button"
                onClick={() => setOnlineSubTab('friends')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors cursor-pointer ${
                  onlineSubTab === 'friends'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Friends ({friendsList.length})
              </button>
            </div>

            {/* Scrollable list of patrons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {onlineSubTab === 'table' && activeRoom ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-amber-300/80 font-bold mb-2">
                    5-Seat VIP Table ({activeRoom.name})
                  </div>
                  {Array.from({ length: 5 }).map((_, seatIdx) => {
                    const occupant = seatedPlayers[seatIdx];
                    return (
                      <div
                        key={seatIdx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          occupant
                            ? occupant.uid === currentUser.uid
                              ? 'bg-amber-400/15 border-amber-400'
                              : 'bg-emerald-950/60 border-emerald-500/40'
                            : 'bg-black/30 border-dashed border-stone-800 text-stone-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono-tabular text-[10px] font-bold text-amber-300">
                            Seat {seatIdx + 1}
                          </span>
                          {occupant ? (
                            <div className="truncate">
                              <span className="font-bold text-white">
                                {occupant.displayName}{' '}
                                {occupant.uid === currentUser.uid && '(You)'}
                              </span>
                              <span className="block text-[10px] text-emerald-300">
                                {occupant.lastAction || 'Playing hand'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic">Open Seat</span>
                          )}
                        </div>

                        {occupant ? (
                          <span className="font-mono text-[10px] text-stone-400 font-bold">
                            L{occupant.level}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOnlineSubTab('all')}
                            className="text-[10px] font-extrabold text-amber-300 hover:underline cursor-pointer"
                          >
                            + Invite Patron
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : onlineSubTab === 'friends' ? (
                <div className="space-y-2">
                  <form onSubmit={handleFriendSubmit} className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      placeholder="Enter Player Handle or ID..."
                      className="flex-1 bg-[#050b08] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="btn-arcade-gold px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer"
                    >
                      +Add
                    </button>
                  </form>

                  {friendsList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-400 leading-relaxed">
                      <p>You haven't added any friends yet.</p>
                      <p className="mt-1 text-stone-500">
                        Tap <span className="text-amber-300 font-bold">+Friend</span> on any online patron!
                      </p>
                    </div>
                  ) : (
                    friendsList.map((f) => {
                      const live = displayedOnline.find((p) => p.uid === f.targetUid);
                      return (
                        <div
                          key={f.targetUid}
                          className="p-2.5 rounded-xl bg-[#09140f] border border-stone-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{f.targetName}</div>
                            <div className="text-[10px] text-emerald-300 font-mono">
                              {live ? `Online · ${live.currentGame || 'Lobby'}` : 'Offline'}
                            </div>
                          </div>
                          {live && activeRoom && (
                            <button
                              type="button"
                              onClick={() => onInvitePlayer(live.uid)}
                              className="px-2.5 py-1 rounded bg-amber-400 text-stone-950 font-black text-[10px] cursor-pointer"
                            >
                              Invite
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* ALL ONLINE PATRONS LIST */
                <div className="space-y-1.5">
                  {displayedOnline.map((player) => {
                    const isMe = player.uid === currentUser.uid;
                    const isFriend = friendsList.some((f) => f.targetUid === player.uid);
                    const playerRoom = rooms.find((r) => r.id === player.currentRoomId);

                    return (
                      <div
                        key={player.uid}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isMe
                            ? 'bg-amber-400/10 border-amber-400/40'
                            : 'bg-[#091510] border-stone-800/90 hover:border-amber-400/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-stone-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {player.displayName[0]?.toUpperCase() || 'P'}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-white truncate block">
                                {player.displayName}{' '}
                                {isMe && <span className="text-amber-300">(You)</span>}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[10px] font-extrabold bg-stone-900 border border-stone-700 text-amber-300 px-1.5 py-0.5 rounded">
                              L{player.level}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-800/60 mt-1">
                          <span className="text-emerald-300/90 font-medium truncate">
                            {player.currentGame ? `Playing ${player.currentGame}` : playerRoom ? playerRoom.name : 'In Lounge'}
                          </span>
                          <span className="font-mono text-amber-200/80">
                            {(player.chips || 0).toLocaleString()} Chips
                          </span>
                        </div>

                        {!isMe && (
                          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-stone-800/40 justify-end">
                            {activeRoom && (
                              <button
                                type="button"
                                onClick={() => onInvitePlayer(player.uid)}
                                className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[10px] font-black hover:bg-amber-400 hover:text-stone-950 transition-colors cursor-pointer"
                              >
                                Invite to Table
                              </button>
                            )}

                            {player.currentRoomId && player.currentRoomId !== 'lobby' && (
                              <button
                                type="button"
                                onClick={() => onJoinRoom(player.currentRoomId, 'player')}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black hover:bg-emerald-500 hover:text-stone-950 transition-colors cursor-pointer"
                              >
                                Join Table
                              </button>
                            )}

                            {!isFriend && (
                              <button
                                type="button"
                                onClick={() => onAddFriend(player.uid)}
                                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Add to Friends"
                              >
                                <UserPlus className="w-2.5 h-2.5" />
                                <span>Friend</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: PARLOR LIVE CHAT */}
        {sidebarView === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#07110d]">
            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-xs text-stone-400 leading-relaxed">
                  <p>Welcome to the Velvet &amp; Brass Parlor!</p>
                  <p className="mt-1 text-stone-500">Say hello or share your jackpot rolls with the club.</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5 px-1">
                        <span className={`font-bold ${isMe ? 'text-amber-300' : 'text-stone-300'}`}>
                          {msg.senderName} {isMe && '(You)'}
                        </span>
                        <span className="text-[9px] text-stone-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-xs max-w-[88%] break-words ${
                          isMe
                            ? 'bg-amber-400 text-stone-950 font-semibold rounded-br-xs shadow-md'
                            : 'bg-[#0e2118] text-stone-100 border border-amber-500/20 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Emoji Reaction Bar */}
            <div className="px-3 py-1.5 bg-[#050b08] border-t border-stone-800 flex items-center justify-between gap-1 shrink-0">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendReaction(emoji)}
                  className="w-7 h-7 rounded-lg hover:bg-stone-800 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleChatSubmit}
              className="p-2.5 bg-[#08120e] border-t border-amber-500/20 flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message parlor table..."
                className="flex-1 bg-[#050b08] border border-stone-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-stone-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5 fill-stone-950" />
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
};
