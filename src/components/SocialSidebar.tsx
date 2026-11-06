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
  ChevronRight,
  ChevronDown,
  Smile,
} from 'lucide-react';

interface SocialSidebarProps {
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

const AVATAR_RING_COLORS = [
  'border-amber-400 bg-amber-500/20 text-amber-200',
  'border-emerald-400 bg-emerald-500/20 text-emerald-200',
  'border-rose-400 bg-rose-500/20 text-rose-200',
  'border-teal-400 bg-teal-500/20 text-teal-200',
  'border-yellow-400 bg-yellow-500/20 text-yellow-200',
];

const BADGE_COLORS = [
  'bg-amber-500/25 text-amber-300 border-amber-400/40',
  'bg-emerald-500/25 text-emerald-300 border-emerald-400/40',
  'bg-rose-500/25 text-rose-300 border-rose-400/40',
  'bg-yellow-500/25 text-yellow-200 border-yellow-400/40',
];

function hashIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

export const SocialSidebar: React.FC<SocialSidebarProps> = ({
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
  const [directoryTab, setDirectoryTab] = useState<'party' | 'online' | 'friends' | 'recent'>('party');
  const [directoryOpen, setDirectoryOpen] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState('');
  const [friendQuery, setFriendQuery] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const friendsList = connections.filter((c) => c.relationType === 'friend');
  const recentList = connections.filter((c) => c.relationType === 'recent');
  const seatedPlayers = activeRoom
    ? activeRoom.participants.filter((p) => p.role === 'player')
    : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

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

  return (
    <aside className="w-full lg:w-80 xl:w-88 shrink-0 bg-[#07100c] border-t lg:border-t-0 lg:border-l border-amber-500/20 flex flex-col h-[540px] lg:h-full overflow-hidden select-none">
      {/* Top Header matching reference "Online Chat" bar */}
      <div className="px-4 py-3.5 border-b border-amber-500/15 bg-[#09140f] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-white tracking-wide block leading-none">
              {activeRoom ? activeRoom.name : 'Online Chat'}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              {activeRoom ? `${seatedPlayers.length}/5 Seated` : '1–5 Player Club Lounge'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online / Party Count Indicator */}
          <button
            type="button"
            onClick={() => setDirectoryOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d1c15] border border-emerald-500/30 hover:border-amber-400/50 transition-colors cursor-pointer"
            title="Toggle 1–5 Player Party & Friends Drawer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-mono-tabular text-xs font-bold text-stone-100">
              {onlinePlayers.length}
            </span>
            <span className="text-[10px] text-amber-300 font-bold ml-0.5">
              ({activeRoom ? `${seatedPlayers.length}/5` : 'Party'})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDirectoryOpen((prev) => !prev)}
            className="w-7 h-7 rounded-lg bg-[#0d1c15] border border-stone-800 hover:border-amber-400/40 flex items-center justify-center text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
            title={directoryOpen ? 'Hide 1–5 Player Party Drawer' : 'Show 1–5 Player Party & Friends'}
          >
            {directoryOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible 1–5 Player Party, Online, Friends & Recent Drawer */}
      {directoryOpen && (
        <div className="border-b border-amber-500/20 bg-[#08120e] shrink-0">
          <div className="px-3 pt-2.5 pb-1.5">
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#050b08] rounded-xl border border-stone-800">
              {[
                { id: 'party' as const, label: `Seats (${seatedPlayers.length || 1}/5)` },
                { id: 'online' as const, label: `Online (${onlinePlayers.length})` },
                { id: 'friends' as const, label: `Friends (${friendsList.length})` },
                { id: 'recent' as const, label: 'Recent' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDirectoryTab(t.id)}
                  className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer whitespace-nowrap truncate ${
                    directoryTab === t.id
                      ? 'bg-amber-400 text-stone-950'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-1.5">
            {directoryTab === 'party' && (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const seatPlayer = activeRoom
                    ? seatedPlayers[idx]
                    : idx === 0
                    ? {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName,
                        level: currentUser.level,
                        role: 'player' as const,
                      }
                    : undefined;

                  return (
                    <div
                      key={idx}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs ${
                        seatPlayer
                          ? 'bg-[#0d1f18] border-amber-500/30 text-stone-100'
                          : 'bg-black/25 border-dashed border-stone-800 text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono-tabular text-[10px] text-amber-400 font-bold">
                          Seat {idx + 1}
                        </span>
                        {seatPlayer ? (
                          <span className="font-bold text-white truncate">
                            {seatPlayer.displayName}{' '}
                            {seatPlayer.uid === currentUser.uid && '(You)'}
                          </span>
                        ) : (
                          <span className="text-[11px] italic">Open VIP Seat</span>
                        )}
                      </div>

                      {seatPlayer ? (
                        <span className="font-mono-tabular text-[10px] text-emerald-300 shrink-0">
                          L{seatPlayer.level}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDirectoryTab('online')}
                          className="text-[10px] font-bold text-amber-300 hover:underline cursor-pointer shrink-0"
                        >
                          +Invite
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {directoryTab === 'online' &&
              onlinePlayers.map((player) => {
                const isMe = player.uid === currentUser.uid;
                const isFriend = friendsList.some((f) => f.targetUid === player.uid);
                const playerRoom = rooms.find((r) => r.id === player.currentRoomId);
                return (
                  <div
                    key={player.uid}
                    className="p-2 rounded-xl bg-[#050b08] border border-stone-800/90 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-100 truncate">
                        {player.displayName} {isMe && '(You)'}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        L{player.level} · {playerRoom ? playerRoom.name : 'Lobby'}
                      </div>
                    </div>

                    {!isMe && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onInvitePlayer(player.uid)}
                          className="px-2 py-0.5 bg-amber-400 text-stone-950 rounded-md text-[10px] font-extrabold cursor-pointer"
                        >
                          Invite
                        </button>
                        {player.currentRoomId && player.currentRoomId !== 'lobby' && (
                          <button
                            type="button"
                            onClick={() => onJoinRoom(player.currentRoomId, 'player')}
                            className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            Join
                          </button>
                        )}
                        {!isFriend && (
                          <button
                            type="button"
                            onClick={() => onAddFriend(player.uid)}
                            className="p-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-md cursor-pointer"
                            title="Add Friend"
                          >
                            <UserPlus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {directoryTab === 'friends' && (
              <div className="space-y-2">
                <form onSubmit={handleFriendSubmit} className="flex gap-1">
                  <input
                    type="text"
                    value={friendQuery}
                    onChange={(e) => setFriendQuery(e.target.value)}
                    placeholder="Add Friend Handle or ID..."
                    className="flex-1 bg-[#050b08] border border-stone-700 rounded-lg px-2.5 py-1 text-[11px] text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="btn-arcade-gold px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer shrink-0"
                  >
                    +Add
                  </button>
                </form>

                {friendsList.length === 0 ? (
                  <div className="text-[11px] text-stone-400 py-1">
                    Share handle <strong className="text-amber-200">{currentUser.displayName}</strong> to invite 1–4 friends.
                  </div>
                ) : (
                  friendsList.map((f) => {
                    const liveFriend = onlinePlayers.find((p) => p.uid === f.targetUid);
                    return (
                      <div
                        key={f.targetUid}
                        className="p-2 rounded-xl bg-[#050b08] border border-stone-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {f.targetName}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {liveFriend ? `Online · ${liveFriend.currentGame}` : 'Offline'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {liveFriend && (
                            <>
                              <button
                                type="button"
                                onClick={() => onInvitePlayer(f.targetUid)}
                                className="px-2 py-0.5 bg-amber-400 text-stone-950 rounded text-[10px] font-extrabold cursor-pointer"
                              >
                                Invite
                              </button>
                              {liveFriend.currentRoomId &&
                                liveFriend.currentRoomId !== 'lobby' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onJoinRoom(liveFriend.currentRoomId, 'player')
                                    }
                                    className="p-1 bg-emerald-500/20 text-emerald-300 rounded cursor-pointer"
                                    title="Join Table"
                                  >
                                    <Play className="w-3 h-3" />
                                  </button>
                                )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemoveFriend(f.targetUid)}
                            className="text-[10px] text-stone-500 hover:text-rose-400 ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {directoryTab === 'recent' &&
              (recentList.length === 0 ? (
                <p className="text-[11px] text-stone-500 py-2">
                  Recent 1–5 player table-mates will appear here.
                </p>
              ) : (
                recentList.map((rec) => (
                  <div
                    key={rec.targetUid}
                    className="p-2 rounded-xl bg-[#050b08] border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-100">{rec.targetName}</div>
                      <div className="text-[10px] text-stone-400">
                        Played {rec.lastPlayedGame.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onInvitePlayer(rec.targetUid)}
                        className="px-2 py-0.5 bg-amber-400/20 text-amber-200 rounded text-[10px] cursor-pointer"
                      >
                        Invite
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddFriend(rec.targetUid)}
                        className="px-2 py-0.5 bg-stone-800 text-stone-200 rounded text-[10px] cursor-pointer"
                      >
                        +Friend
                      </button>
                    </div>
                  </div>
                ))
              ))}
          </div>
        </div>
      )}

      {socialNotice && (
        <div className="px-3.5 py-2 bg-amber-500/15 border-b border-amber-500/30 text-[11px] font-semibold text-amber-200 shrink-0">
          {socialNotice}
        </div>
      )}

      {/* Quick 1-5 Party Seat Strip (Always visible mini-bar under chat header) */}
      <div className="px-3 py-2 border-b border-stone-800/80 bg-[#08130e] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400">
          <Users className="w-3 h-3 text-amber-400" />
          <span>Table Party:</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, idx) => {
            const seatPlayer = activeRoom
              ? seatedPlayers[idx]
              : idx === 0
              ? currentUser
              : undefined;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDirectoryTab(seatPlayer ? 'party' : 'online');
                  setDirectoryOpen(true);
                }}
                title={
                  seatPlayer
                    ? `Seat ${idx + 1}: ${seatPlayer.displayName}`
                    : `Seat ${idx + 1}: Open (Click to invite)`
                }
                className={`w-6 h-6 rounded-full text-[9px] font-extrabold flex items-center justify-center border transition-transform hover:scale-105 cursor-pointer ${
                  seatPlayer
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                    : 'bg-black/40 border-dashed border-stone-700 text-stone-500 hover:border-amber-400/50'
                }`}
              >
                {seatPlayer ? seatPlayer.displayName.slice(0, 2).toUpperCase() : '+'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Message Feed — Styled as dark rounded cards with avatar, badge, time & text */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#060d0a]">
        {chatMessages.map((m) => {
          if (m.isSystem) {
            return (
              <div
                key={m.id}
                className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>{m.text}</span>
              </div>
            );
          }

          const isMe = m.senderId === currentUser.uid;
          const ringStyle = AVATAR_RING_COLORS[hashIndex(m.senderName, AVATAR_RING_COLORS.length)];
          const badgeStyle = BADGE_COLORS[hashIndex(m.senderName, BADGE_COLORS.length)];
          const badgeLetter = m.senderName.replace(/^Patron_/i, '').slice(0, 1).toUpperCase() || 'V';
          const formattedTime = new Date(m.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

          return (
            <div
              key={m.id}
              className={`p-3 rounded-2xl border transition-colors ${
                isMe
                  ? 'bg-[#0f221a] border-amber-400/35'
                  : 'bg-[#0b1712] border-stone-800/90 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Circular Avatar with Status Ring */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-display text-xs font-bold shrink-0 ${ringStyle}`}
                >
                  {m.senderName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-extrabold truncate ${
                        isMe ? 'text-amber-300' : 'text-stone-100'
                      }`}
                    >
                      {m.senderName}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono-tabular font-extrabold border ${badgeStyle}`}
                    >
                      {badgeLetter}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-stone-500">
                      {formattedTime}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 mt-1 leading-relaxed break-words">
                    {m.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Pop-up Emoji Reaction Bar */}
      {showEmojiPicker && (
        <div className="px-3 py-2 bg-[#0b1712] border-t border-amber-500/25 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Live Reactions
          </span>
          <div className="flex items-center gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSendReaction(emoji);
                  setShowEmojiPicker(false);
                }}
                className="w-6 h-6 rounded-lg hover:bg-stone-800 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Input Box matching reference ("Write message ..." + emoji icon + square send button) */}
      <div className="p-3 bg-[#08120e] border-t border-amber-500/15 shrink-0">
        <form
          onSubmit={handleChatSubmit}
          className="bg-[#0d1a14] border border-stone-800 focus-within:border-amber-400/50 rounded-2xl p-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Write message ..."
            maxLength={240}
            className="flex-1 bg-transparent px-2 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Send Table Emoji Reaction"
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              showEmojiPicker
                ? 'bg-amber-400/20 text-amber-300'
                : 'bg-stone-800/80 text-stone-400 hover:text-amber-300'
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="submit"
            title="Send Message"
            className="w-9 h-9 rounded-xl btn-arcade-gold flex items-center justify-center cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
