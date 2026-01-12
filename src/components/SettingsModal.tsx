import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Lock, Save, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, secret: string) => void;
  initialKey?: string;
  initialSecret?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialKey = '',
  initialSecret = ''
}) => {
  const [apiKey, setApiKey] = useState(initialKey);
  const [apiSecret, setApiSecret] = useState(initialSecret);

  // Update state if props change (e.g. from localStorage)
  useEffect(() => {
    setApiKey(initialKey);
    setApiSecret(initialSecret);
  }, [initialKey, initialSecret, isOpen]);

  const handleSave = () => {
    onSave(apiKey, apiSecret);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            // Close if clicking the backdrop
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-[#FDF6E3] rounded-xl shadow-2xl border border-[#E6DCC8] p-6 relative"
            onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold text-[#2C2C2C] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#8B5E3C]" />
                API Configuration
              </h2>
              <button 
                onClick={onClose}
                className="text-[#8B8B8B] hover:text-[#2C2C2C] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Your keys are stored locally in your browser and are never sent to our servers. They are only used to communicate directly with Higgsfield AI.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4A4A4A] block">Higgsfield API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B]" />
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API Key"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4C5A9] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4A4A4A] block">Higgsfield API Secret</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8B8B]" />
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API Secret"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#D4C5A9] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="vintage" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
