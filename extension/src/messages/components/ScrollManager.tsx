import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from './Messages';

interface ScrollManagerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
  isStreaming: boolean;
}

export enum ScrollState {
  AUTO_SCROLLING = 'auto_scrolling',
  USER_SCROLLED_AWAY = 'user_scrolled_away',
  MANUAL_SCROLLING = 'manual_scrolling'
}

const hasBeenMountedBefore = {current: false};

export const useScrollManager = ({
  containerRef,
  messages,
  isStreaming
}: ScrollManagerProps) => {
  const [scrollState, setScrollState] = useState<ScrollState>(ScrollState.AUTO_SCROLLING);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastScrollHeight = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);
  const lastMessageCount = useRef<number>(messages.length);
  const isInitialRender = useRef<boolean>(!hasBeenMountedBefore.current);
  const lastContainerWidth = useRef<number>(0);
  const lastContainerHeight = useRef<number>(0);
  const SCROLL_THRESHOLD = 100;
  const TOP_OFFSET = 20;
  
  useEffect(() => {
    hasBeenMountedBefore.current = true;
    
    if (containerRef.current) {
      lastContainerWidth.current = containerRef.current.clientWidth;
      lastContainerHeight.current = containerRef.current.clientHeight;
    }
    
    return () => {};
  }, []);

  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    
    const { scrollHeight, scrollTop, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, [containerRef]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        lastContainerWidth.current = entry.contentRect.width;
        lastContainerHeight.current = entry.contentRect.height;
      }
    });
    
    observer.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop } = container;
      
      const isUserInitiatedScroll = 
        Math.abs(scrollHeight - lastScrollHeight.current) < 10 && 
        Math.abs(scrollTop - lastScrollTop.current) > 5;
      
      if (isUserInitiatedScroll) {
        if (isNearBottom()) {
          setScrollState(ScrollState.AUTO_SCROLLING);
          setShowScrollButton(false);
        } else {
          setScrollState(ScrollState.USER_SCROLLED_AWAY);
          setShowScrollButton(true);
        }
      }
      
      lastScrollHeight.current = scrollHeight;
      lastScrollTop.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, isNearBottom]);

  const scrollToUserMessageNearTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const userMessages = Array.from(container.querySelectorAll('.message.user'));
    if (userMessages.length === 0) return;
    
    const latestUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
    if (!latestUserMessage) return;
    
    const messageBottom = latestUserMessage.offsetTop + latestUserMessage.offsetHeight;
    
    const isShortMessage = latestUserMessage.offsetHeight < container.clientHeight * 0.8;
    
    const scrollPosition = isShortMessage
      ? Math.max(0, latestUserMessage.offsetTop - TOP_OFFSET)
      : Math.max(0, messageBottom - container.clientHeight * 0.2);
    
    container.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
  }, [containerRef]);

  const scrollToBottom = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) return;
    
    const allMessages = Array.from(container.querySelectorAll('.message'));
    const suggestedQuestions = container.querySelectorAll('.suggested-questions');
    
    if (allMessages.length === 0) return;
    
    const lastMessage = allMessages[allMessages.length - 1] as HTMLElement;
    
    let lastContentBottom = lastMessage.offsetTop + lastMessage.offsetHeight;
    
    if (suggestedQuestions.length > 0) {
      const lastQuestions = suggestedQuestions[suggestedQuestions.length - 1] as HTMLElement;
      const questionsBottom = lastQuestions.offsetTop + lastQuestions.offsetHeight;
      
      lastContentBottom = Math.max(lastContentBottom, questionsBottom);
    }
    
    const viewportHeight = container.clientHeight;
    const scrollPosition = Math.max(0, lastContentBottom - viewportHeight + 60);
    
    container.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
    
    setScrollState(ScrollState.AUTO_SCROLLING);
    setShowScrollButton(false);
    
    lastScrollHeight.current = container.scrollHeight;
    lastScrollTop.current = container.scrollTop;
  }, [containerRef]);

  const scrollToTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    lastScrollHeight.current = container.scrollHeight;
    lastScrollTop.current = 0;
  }, [containerRef]);

  useEffect(() => {
    if (messages.length === 0) return;
    
    if (messages.length === lastMessageCount.current && !isInitialRender.current) {
      return;
    }
    
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    const newMessageAdded = messages.length > lastMessageCount.current;
    lastMessageCount.current = messages.length;
    
    if (!newMessageAdded) return;
    
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role === 'user') {
      setTimeout(() => {
        scrollToUserMessageNearTop();
      }, 10);
    } 
    else if (lastMessage.role === 'assistant' && !isStreaming) {
      if (scrollState === ScrollState.AUTO_SCROLLING || messages.length <= 2) {
        setTimeout(() => scrollToBottom(false), 10);
      }
    }
    
  }, [messages, scrollToUserMessageNearTop, scrollToBottom, scrollState, isStreaming]);

  return {
    scrollState,
    showScrollButton,
    scrollToBottom: () => scrollToBottom(true),
    scrollToTop,
    isNearBottom
  };
};