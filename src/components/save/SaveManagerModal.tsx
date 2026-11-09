import React, { useState, useRef } from 'react';
import { PlayerProfileData, PlayerEstateData, ChipTransactionItem } from '../../types/casino';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import {
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  FileCode,
  Laptop,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface SaveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfileData;
  estate: PlayerEstateData;
  transactions: ChipTransactionItem[];
  onRestoreSave: (imported: {
    profile: PlayerProfileData;
    estate?: PlayerEstateData;
    transactions?: ChipTransactionItem[];
  }) => void;
}

export const SaveManagerModal: React.FC<SaveManagerModalProps> = ({
  isOpen,
  onClose,
  profile,
  estate,
  transactions,
  onRestoreSave,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const exportPayload = {
    app: 'Velvet & Brass Social Club',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    estate,
    transactions: transactions.slice(0, 50),
  };

  const exportJsonString = JSON.stringify(exportPayload, null, 2);

  const handleDownloadFile = () => {
    try {
      const blob = new Blob([exportJsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeAlias = profile.displayName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `velvet_brass_save_${safeAlias}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      sound.playGoldChime();
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      setStatusMessage({
        type: 'ok',
        text: 'Save file downloaded! Keep this JSON file safe or move it to your other computer.',
      });
    } catch {
      setStatusMessage({ type: 'err', text: 'Failed to initiate download.' });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportJsonString).then(() => {
      setCopied(true);
      sound.playChipClick();
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const processImportJson = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || !parsed.profile || typeof parsed.profile.chips !== 'number') {
        throw new Error('Invalid save file format. Expected a valid Velvet & Brass JSON backup.');
      }

      onRestoreSave({
        profile: {
          ...parsed.profile,
          uid: profile.uid, // Retain session identity or adopt saved
          updatedAt: new Date().toISOString(),
        },
        estate: parsed.estate || undefined,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : undefined,
      });

      sound.playUpgradeFanfare();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      setStatusMessage({
        type: 'ok',
        text: `Success! Restored progress: ${parsed.profile.chips.toLocaleString()} chips & Level ${parsed.profile.level}.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Invalid JSON file content.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processImportJson(content);
      }
    };
    reader.onerror = () => {
      setStatusMessage({ type: 'err', text: 'Error reading selected save file.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0f1713] border-2 border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-[#09100d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-amber-200">
                Save & Cross-Device Progress Backup
              </h2>
              <p className="text-xs text-stone-400">
                Easily download your game save as a JSON file and load it on any other computer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.type === 'ok'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-white text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Explanation Card */}
          <div className="p-4 rounded-2xl bg-[#0b1410] border border-amber-500/25 flex items-start gap-3.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-stone-300">
              <div className="font-bold text-white mb-0.5">How Does Saving Work?</div>
              Your chips, estate decorations, Gold Bullion, and progression are automatically saved in real time to your browser and local parlor server. To transfer your progress to another laptop or desktop, simply click <strong>Download Save (.json)</strong> below, and on your other computer, click <strong>Upload & Restore Save</strong>!
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400 uppercase">Virtual Chips</div>
              <div className="font-mono-tabular font-bold text-sm text-amber-300 mt-0.5">
                {profile.chips.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400 uppercase">Club Level</div>
              <div className="font-mono-tabular font-bold text-sm text-white mt-0.5">
                Level {profile.level}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400 uppercase">Estate Tier</div>
              <div className="font-bold text-xs text-emerald-300 mt-0.5 capitalize truncate">
                {estate.tier}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400 uppercase">Gold Bullion</div>
              <div className="font-mono-tabular font-bold text-sm text-amber-400 mt-0.5">
                {estate.goldBars} Bars
              </div>
            </div>
          </div>

          {/* Action 1: Download File */}
          <div className="p-5 rounded-2xl bg-[#09110d] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Download Save File (.json)</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Exports a file named <code className="text-amber-300 text-[11px]">velvet_brass_save_*.json</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="flex-1 sm:flex-initial px-5 py-2.5 btn-arcade-gold font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Download .JSON File</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                title="Copy JSON to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action 2: Upload File to Restore */}
          <div className="p-5 rounded-2xl bg-[#09110d] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Load Progress From Another Computer</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Select a downloaded <code className="text-emerald-300 text-[11px]">.json</code> file to restore instantly.
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 btn-arcade-emerald font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow"
            >
              <Laptop className="w-4 h-4" />
              <span>Upload &amp; Restore .JSON</span>
            </button>
          </div>

          {/* Action 3: Manual Text Paste Option */}
          <div className="p-4 rounded-2xl bg-[#080d0b] border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
              <span>Or Paste JSON Save Text Directly:</span>
              <FileCode className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder='Paste {"profile": ...} here'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={() => {
                  processImportJson(importText.trim());
                  setImportText('');
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 font-bold rounded-xl text-xs cursor-pointer whitespace-nowrap"
              >
                Restore Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
