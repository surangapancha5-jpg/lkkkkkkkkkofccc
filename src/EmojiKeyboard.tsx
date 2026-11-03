import React, { useState } from 'react';
import { Search, X, Smile, Compass, Heart, Bell, Coffee, Flag, Activity } from 'lucide-react';

interface EmojiKeyboardProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'මුහුණු සහ හැඟීම්',
    icon: Smile,
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
      '😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓',
      '🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞',
      '😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'
    ]
  },
  {
    id: 'gestures',
    name: 'අභිනයන් සහ අත්',
    icon: Activity,
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂',
      '🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'
    ]
  },
  {
    id: 'hearts',
    name: 'ආදරය සහ හදවත්',
    icon: Heart,
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
      '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚'
    ]
  },
  {
    id: 'nature',
    name: 'සතුන් සහ සොබාදහම',
    icon: Compass,
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒',
      '🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜',
      '🌸','💮','🏵️','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂'
    ]
  },
  {
    id: 'food',
    name: 'කෑම සහ බීම',
    icon: Coffee,
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑',
      '🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳',
      '🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗',
      '☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹'
    ]
  },
  {
    id: 'objects',
    name: 'වස්තූන් සහ උපකරණ',
    icon: Bell,
    emojis: [
      '💡','🔦','🏮','🪔','🧱','🪵','🛖','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','📷','📸','📹','🎥','📽️','🎞️',
      '📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💸','💵',
      '🔥','✨','🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸'
    ]
  },
  {
    id: 'flags',
    name: 'ධජ (Flags)',
    icon: Flag,
    emojis: [
      '🇱🇰','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇮🇳','🇺🇸','🇬🇧','🇦🇺','🇨🇦','🇯🇵','🇩🇪','🇫🇷','🇮🇹','🇧🇷','🇷🇺'
    ]
  }
];

export const EmojiKeyboard: React.FC<EmojiKeyboardProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [search, setSearch] = useState('');

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const displayedEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : currentCategory.emojis;

  return (
    <div className="bg-[#141417] border-t border-[#27272e] flex flex-col h-64 select-none animate-in slide-in-from-bottom-2 shadow-2xl">
      {/* Category Tabs */}
      <div className="flex items-center justify-between border-b border-[#27272e] px-2 py-1.5 bg-[#0e0e11]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {EMOJI_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearch('');
                }}
                title={cat.name}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-[#e11d48]/20 text-[#e11d48] ring-1 ring-[#e11d48]/40' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer ml-2"
          title="වසන්න"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-[#27272e] bg-[#141417]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="සියලුම ඉමෝජි සොයන්න..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#1c1c21] border border-[#27272e] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
          />
        </div>
      </div>

      {/* Grid of Emojis */}
      <div className="flex-1 overflow-y-auto p-2.5 grid grid-cols-8 sm:grid-cols-10 gap-1.5 content-start">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}_${index}`}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 active:scale-125 rounded-lg transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
