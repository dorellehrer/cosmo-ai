'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShortcutBadge } from '@/components/ShortcutHint';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { NotificationBell } from '@/components/notifications';
import { MessageRenderer } from '@/components/MessageRenderer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { MODEL_LIST, DEFAULT_MODEL, getModelConfig, REASONING_LEVELS } from '@/lib/ai/models';
import type { ReasoningLevel } from '@/lib/ai/models';
import { useCapabilities } from '@/hooks/useCapabilities';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolStatus?: string; // e.g. "Searching the web..." or "Generating image..."
}

interface Conversation {
  id: string;
  title: string | null;
  pinned?: boolean;
  updatedAt: string;
  messages?: { content: string }[];
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id?.[0] as string | undefined;
  
  const t = useTranslations('chat');
  const common = useTranslations('common');
  const { openCommandPalette } = useKeyboardShortcuts();
  const { settings: voiceSettings } = useVoiceSettings();
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech(voiceSettings.language);
  const { isDesktop, canScreenshot } = useCapabilities();
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const suggestions = [
    { key: 'email', text: t('suggestions.email') },
    { key: 'calendar', text: t('suggestions.calendar') },
    { key: 'lights', text: t('suggestions.lights') },
    { key: 'music', text: t('suggestions.music') },
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [userIsPro, setUserIsPro] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningLevel>('low');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const streamBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((force = false) => {
    const main = mainRef.current;
    if (!main) return;
    // Only auto-scroll if user is near the bottom (within 150px) or forced
    const isNearBottom = main.scrollHeight - main.scrollTop - main.clientHeight < 150;
    if (isNearBottom || force) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Lock body scroll while on chat page
  useEffect(() => {
    document.body.classList.add('chat-active');
    return () => {
      document.body.classList.remove('chat-active');
    };
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async (query?: string) => {
    try {
      const url = query && query.length >= 2
        ? `/api/conversations?q=${encodeURIComponent(query)}`
        : '/api/conversations';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Debounced search for conversations
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      fetchConversations(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchConversations]);

  // Reset search: re-fetch all when query is cleared
  useEffect(() => {
    if (searchQuery === '') {
      fetchConversations();
    }
  }, [searchQuery, fetchConversations]);

  // Client-side filtered conversations
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title?.toLowerCase().includes(q) ||
          c.messages?.[0]?.content?.toLowerCase().includes(q)
        );
      })
    : conversations;

  // Load user's preferred model + credits
  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.preferredModel) setSelectedModel(data.preferredModel);
        if (data.isPro !== undefined) setUserIsPro(data.isPro);
        if (data.credits !== undefined) setUserCredits(data.credits);
        if (data.reasoningEffort) setReasoningEffort(data.reasoningEffort as ReasoningLevel);
      })
      .catch(() => {});
  }, []);

  // Close model picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-model-picker]')) setShowModelPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModelPicker]);

  // Local keyboard shortcuts (global ones like Cmd+K handled by KeyboardShortcutsContext)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Cmd/Ctrl + B for toggle sidebar (works in input too)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      
      // Skip other shortcuts when in input
      if (isInputField) return;
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Load conversation if ID is provided
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // New chat
      setMessages([]);
      setCurrentConversationId(null);
      setCurrentTitle(null);
      inputRef.current?.focus();
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      setLoadingChat(true);
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.id);
        setCurrentTitle(data.title);
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          }))
        );
      } else {
        // Conversation not found, redirect to new chat
        router.push('/chat');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      router.push('/chat');
    } finally {
      setLoadingChat(false);
      // Focus input after loading
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startNewChat = () => {
    router.push('/chat');
    setMessages([]);
    setCurrentConversationId(null);
    setCurrentTitle(null);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('deleteConversation'))) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const startRenaming = (id: string, currentTitle: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingConversationId(id);
    setRenameValue(currentTitle || '');
  };

  const cancelRenaming = () => {
    setRenamingConversationId(null);
    setRenameValue('');
  };

  const saveRename = async () => {
    if (!renamingConversationId || !renameValue.trim()) {
      cancelRenaming();
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${renamingConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });

      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === renamingConversationId ? { ...c, title: renameValue.trim() } : c
          )
        );
        if (currentConversationId === renamingConversationId) {
          setCurrentTitle(renameValue.trim());
        }
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    } finally {
      cancelRenaming();
    }
  };

  const togglePin = async (convId: string, currentPinned: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newPinned = !currentPinned;

    // Enforce max 5 pinned (soft limit)
    if (newPinned) {
      const pinnedCount = conversations.filter((c) => c.pinned).length;
      if (pinnedCount >= 5) return;
    }

    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, pinned: newPinned } : c))
    );

    try {
      await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      });
      // Re-fetch to get proper sort order
      fetchConversations();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      // Revert
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, pinned: currentPinned } : c))
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const valid = files.filter((f) => f.size <= maxSize);
    setAttachedFiles((prev) => [...prev, ...valid]);
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Desktop: Screenshot capture → attach as image
  const handleScreenshot = useCallback(async () => {
    const nd = window.novaDesktop;
    if (!nd) return;
    try {
      const dataUrl = await nd.captureWindow();
      if (!dataUrl) return;
      // Convert base64 data URL to File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
      setAttachedFiles((prev) => [...prev, file]);
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  }, []);

  const autoResizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  // Desktop: Paste image from clipboard → attach
  const handleClipboardPaste = useCallback(async () => {
    const nd = window.novaDesktop;
    if (nd) {
      // Desktop: use native clipboard read
      try {
        const imageData = await nd.clipboardReadImage();
        if (imageData) {
          const res = await fetch(imageData);
          const blob = await res.blob();
          const file = new File([blob], `clipboard-${Date.now()}.png`, { type: 'image/png' });
          setAttachedFiles((prev) => [...prev, file]);
          return;
        }
        // Fallback: try reading text from clipboard
        const clip = await nd.clipboardRead();
        if (clip.text) {
          setInput((prev) => prev + clip.text);
          setTimeout(autoResizeTextarea, 0);
        }
      } catch (err) {
        console.error('Clipboard read failed:', err);
      }
    } else {
      // Web: use browser clipboard API
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `clipboard-${Date.now()}.png`, { type: imageType });
            setAttachedFiles((prev) => [...prev, file]);
            return;
          }
        }
        // No image — paste text
        const text = await navigator.clipboard.readText();
        if (text) {
          setInput((prev) => prev + text);
          setTimeout(autoResizeTextarea, 0);
        }
      } catch {
        // Fallback
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            setInput((prev) => prev + text);
            setTimeout(autoResizeTextarea, 0);
          }
        } catch {
          // Clipboard unavailable
        }
      }
    }
  }, [autoResizeTextarea]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const doSend = useCallback(async (text: string, files: File[] = []) => {
    if ((!text.trim() && files.length === 0) || isLoading) return;

    const fileNames = files.map((f) => f.name);
    const displayContent = fileNames.length > 0
      ? `${text.trim()}${fileNames.length > 0 ? `\n\n📎 ${fileNames.join(', ')}` : ''}`
      : text.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent || `📎 ${fileNames.join(', ')}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Add placeholder for assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    // Force scroll when user sends a new message
    setTimeout(() => scrollToBottom(true), 50);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let response: Response;

      const isDesktopApp = isDesktop;

      if (files.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('messages', JSON.stringify(
          [...messages, { role: 'user', content: text.trim() }].map((m) => ({
            role: m.role,
            content: m.content,
          }))
        ));
        if (currentConversationId) formData.append('conversationId', currentConversationId);
        formData.append('model', selectedModel);
        formData.append('reasoningEffort', reasoningEffort);
        if (isDesktopApp) formData.append('desktopTools', 'true');
        for (const file of files) {
          formData.append('files', file);
        }
        response = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } else {
        // Standard JSON request
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            conversationId: currentConversationId,
            model: selectedModel,
            reasoningEffort,
            desktopTools: isDesktopApp,
          }),
          signal: controller.signal,
        });
      }

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                // Handle conversationId from new conversation
                if (parsed.conversationId && !currentConversationId) {
                  setCurrentConversationId(parsed.conversationId);
                  // Update URL without full navigation
                  window.history.replaceState(null, '', `/chat/${parsed.conversationId}`);
                }

                // Handle updated credits from server
                if (parsed.credits !== undefined) {
                  setUserCredits(parsed.credits);
                }

                // Handle title update
                if (parsed.title) {
                  setCurrentTitle(parsed.title);
                  // Update conversations list
                  fetchConversations();
                }

                // Handle tool status (e.g. "Searching the web...")
                if (parsed.toolStatus) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, toolStatus: parsed.toolStatus }
                        : m
                    )
                  );
                }

                // Handle desktop tool calls — execute client-side and send results back
                if (parsed.desktopToolCalls && parsed.pendingMessages) {
                  // Dynamic import to avoid bundling desktop-tools for web users
                  const { executeDesktopTool } = await import('@/lib/desktop-tools');

                  // Show tool status for each desktop tool
                  for (const tc of parsed.desktopToolCalls) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, toolStatus: tc.statusLabel }
                          : m
                      )
                    );
                  }

                  // Execute each desktop tool call
                  const toolResults: Array<{ callId: string; result: string }> = [];
                  for (const tc of parsed.desktopToolCalls) {
                    try {
                      const result = await executeDesktopTool(tc.name, tc.arguments);
                      toolResults.push({
                        callId: tc.callId,
                        result: typeof result === 'string' ? result : JSON.stringify(result),
                      });
                    } catch (err) {
                      toolResults.push({
                        callId: tc.callId,
                        result: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
                      });
                    }
                  }

                  // Send continuation request with tool results
                  const continuationResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                      })),
                      conversationId: currentConversationId || parsed.conversationId,
                      model: selectedModel,
                      reasoningEffort,
                      desktopTools: true,
                      toolResults,
                    }),
                    signal: controller.signal,
                  });

                  if (!continuationResponse.ok) throw new Error('Desktop tool continuation failed');

                  // Parse the continuation SSE stream
                  const contReader = continuationResponse.body?.getReader();
                  if (contReader) {
                    while (true) {
                      const { done: cDone, value: cValue } = await contReader.read();
                      if (cDone) break;

                      const cChunk = decoder.decode(cValue);
                      const cLines = cChunk.split('\n');
                      for (const cLine of cLines) {
                        if (cLine.startsWith('data: ')) {
                          const cData = cLine.slice(6);
                          if (cData === '[DONE]') continue;
                          try {
                            const cParsed = JSON.parse(cData);
                            if (cParsed.title) {
                              setCurrentTitle(cParsed.title);
                              fetchConversations();
                            }
                            if (cParsed.toolStatus) {
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === assistantId
                                    ? { ...m, toolStatus: cParsed.toolStatus }
                                    : m
                                )
                              );
                            }
                            if (cParsed.content) {
                              streamBufferRef.current += cParsed.content;
                              if (rafIdRef.current === null) {
                                rafIdRef.current = requestAnimationFrame(() => {
                                  const buffered = streamBufferRef.current;
                                  streamBufferRef.current = '';
                                  rafIdRef.current = null;
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === assistantId
                                        ? { ...m, content: m.content + buffered, toolStatus: undefined }
                                        : m
                                    )
                                  );
                                });
                              }
                            }
                          } catch {
                            // Ignore parse errors
                          }
                        }
                      }
                    }
                  }
                }

                // Handle content — buffer tokens and flush via RAF
                if (parsed.content) {
                  streamBufferRef.current += parsed.content;
                  if (rafIdRef.current === null) {
                    rafIdRef.current = requestAnimationFrame(() => {
                      const buffered = streamBufferRef.current;
                      streamBufferRef.current = '';
                      rafIdRef.current = null;
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: m.content + buffered, toolStatus: undefined }
                            : m
                        )
                      );
                    });
                  }
                }
              } catch {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      // Don't show error for user-initiated abort
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: t('errorMessage') }
            : m
        )
      );
    } finally {
      // Flush any remaining buffered content
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamBufferRef.current) {
        const remaining = streamBufferRef.current;
        streamBufferRef.current = '';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + remaining, toolStatus: undefined }
              : m
          )
        );
      }
      abortControllerRef.current = null;
      setIsLoading(false);
      // Refresh conversations list
      fetchConversations();
    }
  }, [isLoading, messages, currentConversationId, selectedModel, reasoningEffort, fetchConversations, t]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    doSend(input, [...attachedFiles]);
  };

  // Voice input
  const handleVoiceAutoSubmit = useCallback((transcript: string) => {
    doSend(transcript);
  }, [doSend]);

  const {
    isSupported: voiceSupported,
    isListening,
    transcript: voiceTranscript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(
    {
      language: voiceSettings.language,
      autoSubmit: voiceSettings.autoSubmit,
      autoSubmitDelay: voiceSettings.autoSubmitDelay,
    },
    handleVoiceAutoSubmit
  );

  // Sync voice transcript to input field
  useEffect(() => {
    if (isListening && (voiceTranscript || interimTranscript)) {
      setInput(voiceTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
      autoResizeTextarea();
    }
  }, [voiceTranscript, interimTranscript, isListening, autoResizeTextarea]);

  // Clear transcript after send completes
  useEffect(() => {
    if (!isLoading && voiceTranscript) {
      resetTranscript();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const copyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const regenerateLastResponse = useCallback(() => {
    if (isLoading || messages.length < 2) return;
    // Find last user message (the one before the last assistant message)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove last assistant message
    setMessages((prev) => prev.slice(0, -1));
    // Re-send last user message text (strip file markers)
    const cleanText = lastUserMsg.content.replace(/\n\n📎.*$/, '').trim();
    doSend(cleanText);
  }, [isLoading, messages, doSend]);

  const exportConversation = useCallback(() => {
    if (messages.length === 0) return;

    const title = currentTitle || 'Untitled';
    const date = new Date().toLocaleDateString();
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const dateStr = new Date().toISOString().split('T')[0];

    let md = `# ${title}\n*Exported from Nova AI on ${date}*\n\n---\n\n`;

    for (const msg of messages) {
      const label = msg.role === 'user' ? '**You**' : '**Nova**';
      md += `${label}:\n\n${msg.content}\n\n---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, currentTitle]);

  const startEditing = useCallback((messageId: string, content: string) => {
    // Strip file attachment markers for editing
    const cleanText = content.replace(/\n\n📎.*$/, '').trim();
    setEditingMessageId(messageId);
    setEditValue(cleanText);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingMessageId || !editValue.trim() || !currentConversationId || isLoading) return;

    const editedText = editValue.trim();
    cancelEditing();

    try {
      // Update message content on server
      await fetch(`/api/conversations/${currentConversationId}/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedText }),
      });

      // Delete all messages after the edited one on server
      await fetch(`/api/conversations/${currentConversationId}/messages/${editingMessageId}`, {
        method: 'DELETE',
      });

      // Update local state: keep messages up to and including the edited one, remove the rest
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === editingMessageId);
        if (idx === -1) return prev;
        const kept = prev.slice(0, idx + 1);
        kept[idx] = { ...kept[idx], content: editedText };
        return kept;
      });

      // Re-send with edited text to get new AI response
      doSend(editedText);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, [editingMessageId, editValue, currentConversationId, isLoading, cancelEditing, doSend]);

  const speakMessage = useCallback((messageId: string, content: string) => {
    if (isSpeaking && speakingMessageId === messageId) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      speak(content);
      setSpeakingMessageId(messageId);
    }
  }, [isSpeaking, speakingMessageId, speak, stopSpeaking]);

  // Clear speaking state when TTS finishes
  useEffect(() => {
    if (!isSpeaking) setSpeakingMessageId(null);
  }, [isSpeaking]);

  // Auto-speak completed responses when voice responses enabled
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // Streaming just finished — check if voice responses are enabled
      if (typeof window !== 'undefined' && localStorage.getItem('nova-voice-responses') === 'true') {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.content) {
          speak(lastMsg.content);
          setSpeakingMessageId(lastMsg.id);
        }
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t('today');
    if (days === 1) return t('yesterday');
    if (days < 7) return t('daysAgo', { days });
    return date.toLocaleDateString();
  };

  return (
    <div className="h-dvh bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex overflow-hidden">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-50 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-xl border-e border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:-translate-x-0'
        }`}
        role="navigation"
        aria-label="Conversations sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-white/10" data-drag-region>
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium transition-all shadow-lg shadow-violet-500/25 group"
              aria-label={t('newChat')}
              title="⌘N"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="flex-1">{t('newChat')}</span>
              <ShortcutBadge shortcut="⌘+N" className="opacity-60 group-hover:opacity-100" />
            </button>
          </div>

          {/* Conversation Search */}
          <div className="px-3 pt-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
                placeholder={t('searchConversations')}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={t('clearSearch')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8" role="status" aria-label={t('loadingConversations')}>
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="sr-only">{t('loadingConversations')}</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs sm:text-sm">
                {t('noConversations')}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs sm:text-sm">
                {t('noSearchResults')}
              </div>
            ) : (
              <nav aria-label="Conversation history">
                <ul className="space-y-1" role="list">
                  {filteredConversations.some((c) => c.pinned) && !searchQuery && (
                    <li className="px-3 py-1">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{t('pinned')}</span>
                    </li>
                  )}
                  {filteredConversations.map((conv, idx) => (
                    <li key={conv.id}>
                      {/* Divider between pinned and unpinned */}
                      {!searchQuery && idx > 0 && filteredConversations[idx - 1]?.pinned && !conv.pinned && (
                        <div className="border-t border-white/10 my-1 mx-2" />
                      )}
                      {renamingConversationId === conv.id ? (
                        <div className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg bg-white/15">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename();
                              if (e.key === 'Escape') cancelRenaming();
                            }}
                            onBlur={saveRename}
                            className="flex-1 bg-white/10 border border-white/20 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 min-w-0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <Link
                          href={`/chat/${conv.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg transition-all ${
                            currentConversationId === conv.id
                              ? 'bg-white/15 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                          aria-current={currentConversationId === conv.id ? 'page' : undefined}
                        >
                          <div className="flex-1 min-w-0"
                            onDoubleClick={(e) => startRenaming(conv.id, conv.title, e as unknown as React.MouseEvent)}
                          >
                            <p className="text-xs sm:text-sm font-medium truncate">
                              {conv.title || conv.messages?.[0]?.content?.slice(0, 30) || t('newChat')}
                              {!conv.title && conv.messages?.[0]?.content && conv.messages[0].content.length > 30 && '...'}
                            </p>
                            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">
                              {formatDate(conv.updatedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => togglePin(conv.id, !!conv.pinned, e)}
                              className={`p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors ${conv.pinned ? 'text-violet-400' : 'text-white/40 hover:text-white/70'}`}
                              aria-label={conv.pinned ? t('unpinConversation') : t('pinConversation')}
                              title={conv.pinned ? t('unpinConversation') : t('pinConversation')}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={conv.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 17v5" />
                                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => startRenaming(conv.id, conv.title, e)}
                              className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/70"
                              aria-label={t('renameConversation')}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => deleteConversation(conv.id, e)}
                              className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400"
                              aria-label={`Delete conversation: ${conv.title || 'Untitled'}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 sm:p-4 border-t border-white/10 space-y-1">
            <Link
              href="/integrations"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22v-5"/>
                <path d="M9 8V2"/>
                <path d="M15 8V2"/>
                <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
                <path d="M3 8h18"/>
              </svg>
              <span className="flex-1">Integrations</span>
            </Link>
            <Link
              href="/routines"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 8v4l3 3"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span className="flex-1">Routines</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
              title="⌘,"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="flex-1">{common('settings')}</span>
              <ShortcutBadge shortcut="⌘+," className="opacity-0 group-hover:opacity-100" />
            </Link>
            <Link
              href="/shortcuts"
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm group"
              title="?"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M8 16h8" />
              </svg>
              <span className="flex-1">Shortcuts</span>
              <ShortcutBadge shortcut="?" className="opacity-0 group-hover:opacity-100" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-10">
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
              aria-label={t('openSidebar')}
              aria-expanded={sidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity" aria-label="Nova AI homepage">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center" aria-hidden="true">
                <span className="text-lg sm:text-xl">✨</span>
              </div>
              <div className="hidden xs:block">
                <h1 className="text-lg sm:text-xl font-semibold text-white truncate max-w-[200px]">
                  {currentTitle || common('nova')}
                </h1>
                <p className="text-[10px] sm:text-xs text-white/60">
                  {currentTitle ? t('yourCompanion') : t('newConversation')}
                </p>
              </div>
            </Link>
            
            {/* Header Actions */}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {currentConversationId && messages.length > 0 && (
                <button
                  onClick={exportConversation}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={t('exportChat')}
                  title={t('exportChat')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </button>
              )}
              <button
                onClick={openCommandPalette}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/70 transition-all text-sm"
                aria-label="Open command palette"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] bg-white/10 rounded border border-white/20">⌘K</kbd>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0" role="main" aria-label="Chat messages">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {loadingChat ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse" role="status" aria-label={t('loadingConversation')}>
                {/* Loading skeleton for messages */}
                <div className="flex justify-end">
                  <div className="w-2/3 h-14 sm:h-16 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-3/4 h-20 sm:h-24 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                  <div className="w-1/2 h-10 sm:h-12 bg-white/10 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                  <div className="w-2/3 h-16 sm:h-20 bg-white/10 rounded-2xl" />
                </div>
                <span className="sr-only">{t('loadingConversation')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] sm:h-[60vh] text-center px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 sm:mb-6 animate-pulse" aria-hidden="true">
                  <span className="text-3xl sm:text-4xl">✨</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                  {t('greeting')}
                </h2>
                <p className="text-sm sm:text-base text-white/60 max-w-md mb-6 sm:mb-8">
                  {t('greetingDescription')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Suggested prompts">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.key}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="px-3 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-xs sm:text-sm transition-colors"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4" role="log" aria-live="polite" aria-atomic="false">
                {messages.map((message, index) => {
                  // Only animate newly appearing messages, not streaming updates
                  const shouldAnimate = !animatedIdsRef.current.has(message.id);
                  if (shouldAnimate) {
                    animatedIdsRef.current.add(message.id);
                  }
                  return (
                  <div
                    key={message.id}
                    className={`group/msg flex flex-col ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }${shouldAnimate ? ' animate-fade-in' : ''}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white/10 text-white/90 backdrop-blur-sm'
                      }`}
                      role="article"
                      aria-label={`${message.role === 'user' ? t('youSaid') : t('novaSaid')}`}
                    >
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEditing();
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                            className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                            >
                              {t('cancelEdit')}
                            </button>
                            <button
                              onClick={saveEdit}
                              disabled={!editValue.trim()}
                              className="px-3 py-1 text-xs rounded-lg bg-white/30 hover:bg-white/40 text-white font-medium transition-colors disabled:opacity-50"
                            >
                              {t('saveEdit')}
                            </button>
                          </div>
                        </div>
                      ) : message.content ? (
                        <>
                          <MessageRenderer content={message.content} role={message.role} />
                          <p
                            className={`text-[10px] sm:text-xs mt-1 ${
                              message.role === 'user'
                                ? 'text-white/60'
                                : 'text-white/40'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </>
                      ) : message.toolStatus ? (
                        <div className="flex items-center gap-2 text-sm text-violet-300/80 animate-pulse">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>{message.toolStatus}</span>
                        </div>
                      ) : (
                        <div className="flex gap-1" aria-label={t('typing')}>
                          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          />
                          <span
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span className="sr-only">{t('typing')}</span>
                        </div>
                      )}
                    </div>
                    {/* Message actions (user messages - edit) */}
                    {message.role === 'user' && message.content && !editingMessageId && !isLoading && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(message.id, message.content)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                          aria-label={t('editMessage')}
                          title={t('editMessage')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {/* Message actions (assistant messages with content) */}
                    {message.role === 'assistant' && message.content && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyMessage(message.id, message.content)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                          aria-label={copiedMessageId === message.id ? t('copied') : t('copyMessage')}
                          title={copiedMessageId === message.id ? t('copied') : t('copyMessage')}
                        >
                          {copiedMessageId === message.id ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => speakMessage(message.id, message.content)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                            isSpeaking && speakingMessageId === message.id
                              ? 'text-violet-400'
                              : 'text-white/40 hover:text-white/70'
                          }`}
                          aria-label={isSpeaking && speakingMessageId === message.id ? t('stopSpeaking') : t('speakMessage')}
                          title={isSpeaking && speakingMessageId === message.id ? t('stopSpeaking') : t('speakMessage')}
                        >
                          {isSpeaking && speakingMessageId === message.id ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          )}
                        </button>
                        {index === messages.length - 1 && !isLoading && (
                          <button
                            onClick={regenerateLastResponse}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                            aria-label={t('regenerate')}
                            title={t('regenerate')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );})}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <footer className="border-t border-white/10 backdrop-blur-sm bg-white/5 safe-area-inset">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            {/* Model selector + Credits + Reasoning */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Fancy model picker button */}
              <div className="relative" data-model-picker>
                <button
                  type="button"
                  onClick={() => setShowModelPicker((v) => !v)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                >
                  <span>{getModelConfig(selectedModel).icon}</span>
                  <span className="font-medium">{getModelConfig(selectedModel).label}</span>
                  {getModelConfig(selectedModel).creditCost > 0 && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">
                      {getModelConfig(selectedModel).creditCost}c
                    </span>
                  )}
                  <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                {/* Model picker dropdown */}
                {showModelPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-800/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2">
                      {MODEL_LIST.map((model) => {
                        const canAfford = model.creditCost === 0 || userCredits >= model.creditCost;
                        const isSelected = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setShowModelPicker(false);
                            }}
                            disabled={!canAfford}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all mb-0.5 ${
                              isSelected
                                ? 'bg-violet-500/20 border border-violet-500/40'
                                : canAfford
                                  ? 'hover:bg-white/5 border border-transparent'
                                  : 'opacity-40 cursor-not-allowed border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{model.icon}</span>
                                <div>
                                  <span className="text-sm font-medium text-white">{model.label}</span>
                                  <p className="text-[11px] text-white/40 mt-0.5">{model.description}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                                model.creditCost === 0
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : canAfford
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {model.costLabel}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Reasoning effort slider (only for supporting models) */}
              {getModelConfig(selectedModel).supportsReasoning && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-white/40 hidden sm:inline">Thinking:</span>
                  <div className="flex gap-0.5">
                    {REASONING_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setReasoningEffort(level)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize transition-all ${
                          reasoningEffort === level
                            ? level === 'low'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : level === 'medium'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'text-white/30 hover:text-white/50 border border-transparent'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit balance */}
              <div className="flex items-center gap-1 ml-auto text-xs">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 12a8 8 0 01-8 8m8-8a8 8 0 00-8-8m8 8h-8m0 8a8 8 0 01-8-8m8 8v-8m-8 0a8 8 0 018-8m-8 8h8m0-8v8" strokeWidth="1.5"/></svg>
                  <span className={`font-semibold tabular-nums ${userCredits > 10 ? 'text-white/70' : userCredits > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {userCredits}
                  </span>
                  <span className="text-white/30">credits</span>
                </div>
              </div>
            </div>
            {/* Voice error */}
            {voiceError && (
              <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                {voiceError}
              </div>
            )}
            {/* File preview chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80">
                    {file.type.startsWith('image/') ? (
                      <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"/><path d="m21 15-5-5L5 21" strokeWidth="2"/></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeWidth="2"/><path d="M14 2v6h6" strokeWidth="2"/></svg>
                    )}
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <span className="text-white/40">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form ref={formRef} onSubmit={sendMessage} className="flex items-end gap-2 sm:gap-3">
              <label htmlFor="chat-input" className="sr-only">{t('askAnything')}</label>
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.csv,.txt"
                multiple
                onChange={handleFileSelect}
                aria-label={t('attachFile')}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 disabled:opacity-50 transition-all border border-white/10 shrink-0"
                aria-label={t('attachFile')}
                title={t('attachFile')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {/* Screenshot button (desktop only) */}
              {canScreenshot && (
                <button
                  type="button"
                  onClick={handleScreenshot}
                  disabled={isLoading}
                  className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 disabled:opacity-50 transition-all border border-white/10 shrink-0"
                  aria-label="Take screenshot"
                  title="Take screenshot"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>
              )}
              {/* Clipboard paste button */}
              <button
                type="button"
                onClick={handleClipboardPaste}
                disabled={isLoading}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 disabled:opacity-50 transition-all border border-white/10 shrink-0"
                aria-label="Paste from clipboard"
                title="Paste from clipboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                </svg>
              </button>
              {/* Voice input button */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`p-2.5 sm:p-3 rounded-full transition-all border shrink-0 ${
                    isListening
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 border-white/10'
                  } disabled:opacity-50`}
                  aria-label={isListening ? t('listening') : t('voiceInput')}
                  title={isListening ? t('listening') : t('tapToSpeak')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </button>
              )}
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResizeTextarea();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                placeholder={attachedFiles.length > 0 ? t('addMessageToFiles') : t('askAnything')}
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none overflow-y-auto"
                style={{ maxHeight: 200 }}
                disabled={isLoading}
                autoComplete="off"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="p-2.5 sm:p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all shrink-0 border border-white/20"
                  aria-label={t('stopGenerating')}
                  title={t('stopGenerating')}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() && attachedFiles.length === 0}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white text-sm sm:text-base font-medium transition-all min-w-[60px] sm:min-w-[80px] shrink-0"
                  aria-label={common('send')}
                >
                  {common('send')}
                </button>
              )}
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
