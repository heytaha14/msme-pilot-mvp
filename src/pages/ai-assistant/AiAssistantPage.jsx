import {
  Activity,
  Bot,
  Boxes,
  BrainCircuit,
  Check,
  Copy,
  FileText,
  Gauge,
  IndianRupee,
  Lightbulb,
  MessageSquarePlus,
  PackageSearch,
  Save,
  Send,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  WalletCards,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  aiBusinessContext,
  aiConversationHistory,
  aiSuggestedQuestions,
  aiToolCards,
} from '../../data/mockData.js';
import { getAiResponseForPrompt, truncateText } from '../../utils/formatters.js';

const initialAssistantMessage = {
  id: 1,
  role: 'assistant',
  content:
    'Hi Taha, I’m your MSME Pilot AI Assistant. I can help with inventory, sales, customers, suppliers, payments, reports, and business health.',
};

const toolIcons = {
  'Reorder Planning': PackageSearch,
  'Payment Recovery': WalletCards,
  'Sales Analysis': TrendingUp,
  'Profit Explanation': IndianRupee,
  'GST Guidance': FileText,
  'Report Generation': Activity,
  'Supplier Insights': Boxes,
  'Customer Insights': Users,
};

const contextIcons = {
  'Inventory Alert': TriangleAlert,
  'Payment Focus': WalletCards,
  'Sales Snapshot': TrendingUp,
  'Health Score': Gauge,
};

function DemoModeNotice() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
      Demo mode: responses are simulated. Real AI will be connected through
      secure Appwrite Functions later.
    </div>
  );
}

function AiHeroCard({ onAskToday }) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
          <WandSparkles className="h-6 w-6" />
        </div>
        <div>
          <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
            GPT-5 Nano Ready
          </Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Your 24/7 AI Business Manager
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Ask MSME Pilot what to reorder, which customers have pending dues,
            why sales changed, or how to improve your business score.
          </p>
        </div>
        <Button onClick={onAskToday} variant="secondary">
          <Sparkles className="h-4 w-4" />
          Ask today’s question
        </Button>
      </div>
    </Card>
  );
}

function SuggestedQuestions({ onAsk }) {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Suggested questions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {aiSuggestedQuestions.map((question) => (
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            key={question}
            onClick={() => onAsk(question)}
            type="button"
          >
            {question}
          </button>
        ))}
      </div>
    </Card>
  );
}

function ChatMessage({ message, onMicroAction }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}
      <div className={`max-w-[86%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? 'bg-slate-950 text-white'
              : 'border border-slate-100 bg-slate-50 text-slate-700'
          }`}
        >
          {message.content}
        </div>
        {!isUser ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ['Copy', Copy],
              ['Save Insight', Save],
              ['Create Task', Check],
            ].map(([label, Icon]) => (
              <button
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                key={label}
                onClick={() => onMicroAction(label)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isUser ? (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
          T
        </div>
      ) : null}
    </div>
  );
}

function ChatInput({ disabled, onSend }) {
  const [value, setValue] = useState('');

  function submit() {
    if (!value.trim()) {
      return;
    }

    onSend(value.trim());
    setValue('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-slate-100 p-4">
      <div className="flex gap-3">
        <textarea
          className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about stock, sales, payments, reports..."
          rows={1}
          value={value}
        />
        <Button disabled={!value.trim() || disabled} onClick={submit} rounded="2xl">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChatPanel({
  messages,
  onMicroAction,
  onSend,
  typing,
  microMessage,
}) {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">MSME Pilot AI</h2>
                <p className="text-sm text-slate-500">Mock responses now</p>
              </div>
            </div>
          </div>
          <Badge variant="info">Demo mode</Badge>
        </div>
        <div className="mt-4">
          <DemoModeNotice />
        </div>
      </div>

      <div className="max-h-[620px] min-h-[420px] space-y-5 overflow-y-auto p-5">
        {messages.length ? (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onMicroAction={onMicroAction}
            />
          ))
        ) : (
          <div className="grid min-h-80 place-items-center text-center">
            <div>
              <Bot className="mx-auto h-12 w-12 text-indigo-500" />
              <h3 className="mt-4 text-2xl font-black text-slate-950">
                Ask your AI business manager
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Start with inventory, payments, sales, reports, or business health.
              </p>
            </div>
          </div>
        )}

        {typing ? (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      {microMessage ? (
        <div className="mx-4 mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {microMessage}
        </div>
      ) : null}

      <ChatInput disabled={typing} onSend={onSend} />
    </Card>
  );
}

function BusinessContextPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-black text-slate-950">Business Context</h2>
        <div className="mt-5 space-y-3">
          {aiBusinessContext.map((context) => {
            const Icon = contextIcons[context.title] || Lightbulb;
            return (
              <div className="rounded-3xl bg-slate-50 p-4" key={context.title}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-black text-slate-950">{context.title}</p>
                </div>
                <div className="mt-3 space-y-2">
                  {context.items.map((item) => (
                    <p className="text-sm font-semibold text-slate-600" key={item}>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function AiToolsGrid() {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">AI can help with</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {aiToolCards.map((tool) => {
          const Icon = toolIcons[tool.title] || Sparkles;
          return (
            <div className="rounded-3xl bg-slate-50 p-4" key={tool.title}>
              <Icon className="h-5 w-5 text-indigo-600" />
              <p className="mt-4 font-black text-slate-950">{tool.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {tool.description}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ConversationHistory({ onLoad }) {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Conversation history</h2>
      <div className="mt-5 space-y-2">
        {aiConversationHistory.map((item) => (
          <button
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
            key={item}
            onClick={() => onLoad(item)}
            type="button"
          >
            <MessageSquarePlus className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-700">
              {truncateText(item, 42)}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [typing, setTyping] = useState(false);
  const [microMessage, setMicroMessage] = useState('');

  const overviewCards = useMemo(
    () => [
      {
        title: 'Business Health',
        value: '84/100',
        trend: 'Strong, payment recovery can improve',
        status: 'success',
        icon: Activity,
      },
      {
        title: 'Low Stock Items',
        value: '7',
        trend: 'Sugar is critical',
        status: 'warning',
        icon: TriangleAlert,
      },
      {
        title: 'Pending Payments',
        value: '₹58,000',
        trend: 'Follow up this week',
        status: 'danger',
        icon: WalletCards,
      },
      {
        title: 'Monthly Revenue',
        value: '₹3,48,000',
        trend: '+14.2% growth',
        status: 'info',
        icon: TrendingUp,
      },
    ],
    [],
  );

  function addMicroMessage(message) {
    setMicroMessage(message);
    window.setTimeout(() => setMicroMessage(''), 1800);
  }

  function sendPrompt(prompt) {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setTyping(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: getAiResponseForPrompt(prompt),
        },
      ]);
      setTyping(false);
    }, 800);
  }

  function startNewChat() {
    setMessages([initialAssistantMessage]);
  }

  function addBusinessSummary() {
    sendPrompt('Summarize today’s business performance.');
  }

  function handleMicroAction(label) {
    if (label === 'Copy') {
      addMicroMessage('Response copied locally.');
      return;
    }

    if (label === 'Save Insight') {
      addMicroMessage('Insight saved locally.');
      return;
    }

    addMicroMessage('Task created in demo mode.');
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={addBusinessSummary} variant="secondary">
              <FileText className="h-4 w-4" />
              Business Summary
            </Button>
            <Button onClick={startNewChat}>
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        }
        subtitle="Ask questions about inventory, sales, customers, suppliers, reports, and business decisions."
        title="AI Assistant"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <AiHeroCard onAskToday={() => sendPrompt('Summarize today’s business performance.')} />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="space-y-6">
          <ChatPanel
            messages={messages}
            microMessage={microMessage}
            onMicroAction={handleMicroAction}
            onSend={sendPrompt}
            typing={typing}
          />
          <SuggestedQuestions onAsk={sendPrompt} />
        </div>
        <div className="space-y-6">
          <BusinessContextPanel />
          <ConversationHistory onLoad={(item) => sendPrompt(item)} />
        </div>
      </section>

      <AiToolsGrid />
    </div>
  );
}
