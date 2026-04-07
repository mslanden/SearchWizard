"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PlusIcon,
  PaperClipIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import VaultPickerPopover from './VaultPickerPopover';

// ── Message bubble ────────────────────────────────────────────────────────────

function UserBubble({ content, attachments = [], vaultSelections = [] }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[75%]">
        {/* Attachment chips */}
        {(attachments.length > 0 || vaultSelections.length > 0) && (
          <div className="flex flex-wrap gap-1.5 justify-end mb-1.5">
            {attachments.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-dark-bg-tertiary text-gray-600 dark:text-dark-text-secondary px-2 py-0.5 rounded-full">
                <PaperClipIcon className="w-3 h-3" />{f.name}
              </span>
            ))}
            {vaultSelections.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                <ArchiveBoxIcon className="w-3 h-3" />{a.name}
              </span>
            ))}
          </div>
        )}
        <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">
          {content}
        </div>
      </div>
    </div>
  );
}

function AndroBubble({ content, document: doc, isLoading }) {
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (doc) {
      blobUrlRef.current = URL.createObjectURL(
        new Blob([doc.content], { type: doc.mime_type || 'text/html' })
      );
    }
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [doc]);

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[75%]">
        {/* Andro label */}
        <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-muted mb-1 ml-1">Andro</p>
        <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border text-gray-800 dark:text-dark-text text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm">
          {isLoading ? (
            <span className="flex items-center gap-2 text-gray-400 dark:text-dark-text-muted">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </span>
          ) : (
            <>
              <div
                className="prose prose-sm max-w-none dark:prose-invert
                prose-p:my-1 prose-p:leading-relaxed
                prose-ul:my-1 prose-ul:pl-4
                prose-ol:my-1 prose-ol:pl-4
                prose-li:my-0.5
                prose-strong:font-semibold
                prose-a:text-blue-600 prose-a:underline
                prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-xs
                prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1"
                dangerouslySetInnerHTML={{ __html: marked(content || '') }}
              />
              {doc && blobUrlRef.current && (
                <a
                  href={blobUrlRef.current}
                  download={doc.name}
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  📄 Download: {doc.name}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Attachment chip strip (in input bar) ──────────────────────────────────────

function AttachmentChips({ attachments, vaultSelections, onRemoveFile, onRemoveVault }) {
  if (attachments.length === 0 && vaultSelections.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {attachments.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-dark-bg-tertiary text-gray-600 dark:text-dark-text-secondary px-2 py-0.5 rounded-full">
          <PaperClipIcon className="w-3 h-3" />{f.name}
          <button onClick={() => onRemoveFile(i)} className="ml-0.5 text-gray-400 hover:text-gray-600">×</button>
        </span>
      ))}
      {vaultSelections.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
          <ArchiveBoxIcon className="w-3 h-3" />{a.name}
          <button onClick={() => onRemoveVault(a.id)} className="ml-0.5 text-blue-400 hover:text-blue-600">×</button>
        </span>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function AndroChatModal({ projectId, onClose, onSend }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [attachments, setAttachments] = useState([]);     // { name, content }[]
  const [vaultSelections, setVaultSelections] = useState([]); // { id, name }[]

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-grow textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const lineHeight = 20; // px, matches text-sm
      const maxHeight = lineHeight * 5;
      el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    }
  };

  // File picker
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments((prev) => [...prev, { name: file.name, content: ev.target.result }]);
      };
      // Read as text for text files, base64 data URL for others
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  // Send message
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg = { role: 'user', content: text, attachments: [...attachments], vaultSelections: [...vaultSelections] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setVaultSelections([]);
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Placeholder loading bubble
    setMessages((prev) => [...prev, { role: 'andro', content: '', isLoading: true }]);

    try {
      const response = await onSend({
        message: text,
        history: messages.map((m) => ({ role: m.role === 'andro' ? 'assistant' : 'user', content: m.content })),
        attachments: userMsg.attachments,
        vault_artifact_ids: userMsg.vaultSelections.map((a) => a.id),
        web_search: webSearchEnabled,
      });

      setMessages((prev) => [
        ...prev.slice(0, -1), // remove loading bubble
        { role: 'andro', content: response.response, document: response.document || null },
      ]);
    } catch (err) {
      console.error('[AndroChatModal] send error:', err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'andro', content: 'Something went wrong. Please try again.', document: null },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, attachments, vaultSelections, messages, webSearchEnabled, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modalSize = isExpanded
    ? 'w-[90vw] h-[90vh]'
    : 'w-[67vw] h-[67vh]';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
    >
      <div
        className={`${modalSize} bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl flex flex-col transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ask Andro"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-dark-text">Ask Andro</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors text-gray-500 dark:text-dark-text-secondary"
              aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
            >
              {isExpanded
                ? <ArrowsPointingInIcon className="w-4 h-4" />
                : <ArrowsPointingOutIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors text-gray-500 dark:text-dark-text-secondary"
              aria-label="Close chat"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                Ask Andro anything about this project.
              </p>
              <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
                Andro has access to all project documents and context.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <UserBubble
                    key={i}
                    content={msg.content}
                    attachments={msg.attachments}
                    vaultSelections={msg.vaultSelections}
                  />
                ) : (
                  <AndroBubble
                    key={i}
                    content={msg.content}
                    document={msg.document}
                    isLoading={msg.isLoading}
                  />
                )
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-dark-border">
          {/* Web search active indicator */}
          {webSearchEnabled && (
            <div className="px-3 pt-2">
              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                <MagnifyingGlassIcon className="w-3 h-3" />Web Search on
                <button onClick={() => setWebSearchEnabled(false)} className="ml-0.5 text-blue-400 hover:text-blue-600">×</button>
              </span>
            </div>
          )}

          {/* Attachment chips */}
          <AttachmentChips
            attachments={attachments}
            vaultSelections={vaultSelections}
            onRemoveFile={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            onRemoveVault={(id) => setVaultSelections((prev) => prev.filter((a) => a.id !== id))}
          />

          {/* Input row */}
          <div className="flex items-end gap-2 px-3 py-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* + dropdown */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors mb-0.5"
                aria-label="Add attachment"
              >
                <PlusIcon className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" />
              </button>

              {dropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-md shadow-lg z-10">
                  <button
                    onClick={() => { fileInputRef.current?.click(); setDropdownOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                  >
                    <PaperClipIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    Upload files or photos
                  </button>
                  <button
                    onClick={() => { setVaultPickerOpen(true); setDropdownOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                  >
                    <ArchiveBoxIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    Select from Project Vault
                  </button>
                  <button
                    onClick={() => { setWebSearchEnabled(true); setDropdownOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    Web Search
                  </button>
                </div>
              )}

              {/* Vault picker popover */}
              {vaultPickerOpen && (
                <VaultPickerPopover
                  projectId={projectId}
                  selected={vaultSelections}
                  onConfirm={(selections) => { setVaultSelections(selections); setVaultPickerOpen(false); }}
                  onClose={() => setVaultPickerOpen(false)}
                />
              )}
            </div>

            {/* Auto-growing textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Andro for help with this project..."
              rows={1}
              disabled={isSending}
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-muted resize-none leading-5 py-1 disabled:opacity-50"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="flex-shrink-0 bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-md transition-colors mb-0.5"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
