import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useSendMarvelMessage } from '@workspace/api-client-react';
import type { MarvelChatMessage } from '@workspace/api-client-react';
import { ArrowUp, BookOpen, MessageCircle, Shield } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const starterQuestions = [
  'Where should I start with the X-Men comics?',
  'How are the Avengers different in the comics?',
  'What makes Spider-Man such a great hero?',
];

function Home() {
  const [messages, setMessages] = useState<MarvelChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [requestMessages, setRequestMessages] = useState<MarvelChatMessage[] | null>(null);
  const [errorText, setErrorText] = useState('');
  const mutation = useSendMarvelMessage();
  const conversationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' });
  }, [messages, mutation.isPending, errorText]);

  async function ask(messagesForRequest: MarvelChatMessage[], alreadyShown: boolean) {
    setRequestMessages(messagesForRequest);
    setErrorText('');
    try {
      const result = await mutation.mutateAsync({ data: { messages: messagesForRequest } });
      if (alreadyShown) setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch {
      setErrorText('The signal got lost on the way. Your question is still here — give it another try.');
    }
  }

  async function sendMessage(value = draft) {
    const content = value.trim();
    if (!content || mutation.isPending) return;
    const userMessage: MarvelChatMessage = { role: 'user', content: content.slice(0, 2000) };
    const nextMessages = [...messages, userMessage].slice(-16);
    setMessages(nextMessages);
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await ask(nextMessages, true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function onDraftChange(value: string) {
    setDraft(value.slice(0, 2000));
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Marvel Field Notes home" data-testid="link-home">
          <span className="brand-mark" aria-hidden="true"><BookOpen size={21} strokeWidth={2.2} /></span>
          <span>
            <span className="brand-name">Marvel Field Notes</span>
            <span className="brand-caption">A fan's guide to the universe</span>
          </span>
        </a>
        <div className="topbar-right" data-testid="status-assistant-online">
          <span className="live-dot" aria-hidden="true" />
          <span>Ready when you are</span>
        </div>
      </header>

      <main className="main-area">
        <section className="chat-layout" aria-label="Marvel fan chat">
          <div className="intro">
            <div>
              <div className="eyebrow">Your friendly neighborhood fan guide</div>
              <h1>Big universe.<br /><span>Quick answers.</span></h1>
            </div>
            <div className="intro-note">Characters, comic runs, movie moments — pull up a chair and ask away.</div>
          </div>

          <section className="chat-frame" aria-label="Conversation">
            <div className="frame-rule" />
            <div className="conversation" ref={conversationRef} data-testid="region-conversation">
              {messages.length === 0 ? (
                <div className="welcome" data-testid="panel-welcome">
                  <div className="welcome-kicker">Issue No. 001 · The conversation starts here</div>
                  <h2 className="welcome-title">Curious about the Marvel universe? <em>You're in the right place.</em></h2>
                  <p className="welcome-copy">Ask about a character, find your next comic run, or untangle a movie moment. I’ll keep it friendly, clear, and spoiler-aware when you ask.</p>
                  <div className="suggestion-label">Need a first question?</div>
                  <div className="suggestions">
                    {starterQuestions.map((question, index) => (
                      <button
                        className="suggestion"
                        key={question}
                        type="button"
                        onClick={() => void sendMessage(question)}
                        disabled={mutation.isPending}
                        data-testid={`button-starter-question-${index + 1}`}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="messages" aria-live="polite">
                  {messages.map((message, index) => (
                    <article className={`message-row ${message.role}`} key={`${index}-${message.role}`} data-testid={`message-${message.role}-${index}`}>
                      <div className="avatar" aria-hidden="true">{message.role === 'assistant' ? <Shield size={16} /> : 'YOU'}</div>
                      <div className="message-content">
                        <div className="message-meta">{message.role === 'assistant' ? 'FIELD GUIDE' : 'YOU'}</div>
                        <div className="bubble" data-testid={`text-message-content-${index}`}>{message.content}</div>
                      </div>
                    </article>
                  ))}
                  {mutation.isPending && (
                    <article className="message-row assistant" aria-label="Assistant is writing" data-testid="status-assistant-typing">
                      <div className="avatar" aria-hidden="true"><Shield size={16} /></div>
                      <div className="message-content">
                        <div className="message-meta">FIELD GUIDE</div>
                        <div className="bubble typing-bubble" role="status" aria-label="Thinking">
                          <span /><span /><span />
                        </div>
                      </div>
                    </article>
                  )}
                  {errorText && (
                    <div className="error-box" role="alert" data-testid="status-chat-error">
                      <span>{errorText}</span>
                      <button
                        className="retry-button"
                        type="button"
                        data-testid="button-retry-message"
                        onClick={() => requestMessages && void ask(requestMessages, true)}
                        disabled={!requestMessages || mutation.isPending}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="composer-wrap">
              <form className="composer" onSubmit={onSubmit}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask about a hero, comic, or film..."
                  aria-label="Ask a Marvel question"
                  maxLength={2000}
                  disabled={mutation.isPending}
                  data-testid="input-chat-message"
                />
                <button
                  className="send-button"
                  type="submit"
                  aria-label="Send message"
                  title="Send message"
                  disabled={!draft.trim() || mutation.isPending}
                  data-testid="button-send-message"
                >
                  <ArrowUp size={19} strokeWidth={2.5} />
                </button>
              </form>
              <div className="composer-foot">
                <span>Enter to send · Shift + Enter for a new line</span>
                <span data-testid="text-character-count">{draft.length}/2000</span>
              </div>
            </div>
          </section>
          <div className="footer"><MessageCircle size={11} style={{ verticalAlign: '-2px', marginRight: 6 }} />A little lore goes a long way <strong>·</strong> Keep the conversation kind</div>
        </section>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
