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
  Loader2,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  listAiConversationHistory,
  listAiConversations,
  saveAiInsight,
  sendBusinessAiMessage,
} from '../../services/aiAssistantService.js';
import { listBusinessHealthSnapshots } from '../../services/businessHealthService.js';
import { getReportStats, loadReportData } from '../../services/reportService.js';
import { formatCurrency, truncateText } from '../../utils/formatters.js';

const suggestedQuestions = [
  'Which products should I reorder?',
  'Which customers have pending payments?',
  'Why are my sales increasing?',
  'What is my profit this month?',
  'How can I improve my business health score?',
  'Generate today’s business summary.',
  'Which supplier payment is due?',
  'What should I do before the weekend?',
  'Show low stock products.',
  'Explain this month’s report.',
  'What invoices need review?',
  'What are my biggest risks today?',
];

const initialAssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I’m your MSME Pilot AI Assistant. Ask me about inventory, sales, payments, reports, invoices, or business health.',
};

const toolCards = [
  ['Reorder Planning', 'Know what to restock and why.', PackageSearch],
  ['Payment Recovery', 'Prioritize customer dues and follow-ups.', WalletCards],
  ['Sales Analysis', 'Understand revenue and product movement.', TrendingUp],
  ['Profit Explanation', 'Review margins and cost pressure.', IndianRupee],
  ['GST Guidance', 'Get estimate-focused GST context.', FileText],
  ['Report Generation', 'Explain monthly business reports.', Activity],
  ['Supplier Insights', 'Review supplier dues and purchase flow.', Boxes],
  ['Customer Insights', 'Spot loyal customers and pending dues.', Users],
];

function DemoModeNotice() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
      Secure AI mode: questions are sent to an Appwrite Function. OpenRouter and Appwrite API keys stay server-side.
    </div>
  );
}

function AiHeroCard({ disabled, onAskToday }) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
          <WandSparkles className="h-6 w-6" />
        </div>
        <div>
          <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
            Appwrite Function AI
          </Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight">Your 24/7 AI Business Manager</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Ask MSME Pilot what to reorder, which customers have pending dues, why sales changed, or how to improve your business score.
          </p>
        </div>
        <Button disabled={disabled} onClick={onAskToday} variant="secondary">
          <Sparkles className="h-4 w-4" />
          Ask today’s question
        </Button>
      </div>
    </Card>
  );
}

function SuggestedQuestions({ disabled, onAsk }) {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Suggested questions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestedQuestions.map((question) => (
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
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

function SuggestedActionCards({ actions = [] }) {
  const navigate = useNavigate();
  if (!actions.length) return null;

  return (
    <div className="mt-3 grid gap-2">
      {actions.map((action, index) => (
        <div className="rounded-2xl border border-indigo-100 bg-white p-3" key={`${action.title}-${index}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-slate-950">{action.title}</p>
                <Badge variant={action.priority === 'High' ? 'warning' : action.priority === 'Low' ? 'neutral' : 'info'}>
                  {action.priority}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{action.reason}</p>
            </div>
            {action.routeTarget ? (
              <Button onClick={() => navigate(action.routeTarget)} size="sm" variant="secondary">
                Open
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RelatedMetrics({ metrics = [] }) {
  if (!metrics.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {metrics.map((metric) => (
        <Badge key={`${metric.label}-${metric.value}`} variant="info">
          {metric.label}: {metric.value}
        </Badge>
      ))}
    </div>
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
        <div className={`rounded-3xl px-4 py-3 text-sm leading-6 ${isUser ? 'bg-slate-950 text-white' : message.error ? 'border border-rose-100 bg-rose-50 text-rose-700' : 'border border-slate-100 bg-slate-50 text-slate-700'}`}>
          {message.content}
        </div>
        {!isUser && !message.error ? (
          <>
            <RelatedMetrics metrics={message.relatedMetrics} />
            <SuggestedActionCards actions={message.suggestedActions} />
            {message.warnings?.length ? (
              <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                {message.warnings.join(' ')}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['Copy', Copy],
                ['Save Insight', Save],
                ['Create Task', Check],
              ].map(([label, Icon]) => (
                <button
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                  key={label}
                  onClick={() => onMicroAction(label, message)}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {isUser ? (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">T</div>
      ) : null}
    </div>
  );
}

function ChatInput({ disabled, onSend }) {
  const [value, setValue] = useState('');

  function submit() {
    if (!value.trim() || disabled) return;
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
          placeholder={disabled ? 'MSME Pilot AI is analyzing your business data...' : 'Ask about stock, sales, payments, reports...'}
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

function TypingIndicator() {
  const steps = ['Analyzing inventory...', 'Checking payments...', 'Reviewing sales...', 'Preparing recommendation...'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % steps.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Bot className="h-5 w-5" />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {steps[step]}
      </div>
    </div>
  );
}

function ChatPanel({ messages, microMessage, onMicroAction, onSend, typing }) {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">MSME Pilot AI</h2>
              <p className="text-sm text-slate-500">Secure Appwrite Function backend</p>
            </div>
          </div>
          <Badge variant="success">Server-side AI</Badge>
        </div>
        <div className="mt-4">
          <DemoModeNotice />
        </div>
      </div>

      <div className="max-h-[620px] min-h-[420px] space-y-5 overflow-y-auto p-5">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onMicroAction={onMicroAction} />
        ))}
        {typing ? <TypingIndicator /> : null}
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

function BusinessContextPanel({ context, loading }) {
  const cards = [
    {
      title: 'Inventory Alert',
      icon: TriangleAlert,
      items: [
        `Low stock: ${context.lowStockCount} items`,
        `Inventory value: ${formatCurrency(context.inventoryValue)}`,
      ],
    },
    {
      title: 'Payment Focus',
      icon: WalletCards,
      items: [
        `Customer dues: ${formatCurrency(context.pendingDues)}`,
        `Supplier dues: ${formatCurrency(context.supplierDues)}`,
      ],
    },
    {
      title: 'Sales Snapshot',
      icon: TrendingUp,
      items: [
        `Monthly: ${formatCurrency(context.monthlyRevenue)}`,
        `Profit: ${formatCurrency(context.monthlyProfit)}`,
      ],
    },
    {
      title: 'Health Score',
      icon: Gauge,
      items: [
        `Score: ${context.healthScore || 'Not calculated'}`,
        `Pending invoices: ${context.pendingInvoices}`,
      ],
    },
  ];

  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Business Context</h2>
      {loading ? (
        <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
          Loading local context summary...
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {cards.map((card) => {
            const Icon = card.icon || Lightbulb;
            return (
              <div className="rounded-3xl bg-slate-50 p-4" key={card.title}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-black text-slate-950">{card.title}</p>
                </div>
                <div className="mt-3 space-y-2">
                  {card.items.map((item) => (
                    <p className="text-sm font-semibold text-slate-600" key={item}>{item}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AiToolsGrid() {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">AI can help with</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {toolCards.map(([title, description, Icon]) => (
          <div className="rounded-3xl bg-slate-50 p-4" key={title}>
            <Icon className="h-5 w-5 text-indigo-600" />
            <p className="mt-4 font-black text-slate-950">{title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConversationHistory({ conversations, loading, onLoad }) {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Conversation history</h2>
      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Loading conversations...</p>
        ) : null}
        {!loading && !conversations.length ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No saved AI conversations yet.</p>
        ) : null}
        {conversations.map((item) => (
          <button
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
            key={item.conversationId}
            onClick={() => onLoad(item.conversationId)}
            type="button"
          >
            <MessageSquarePlus className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-700">{truncateText(item.title, 42)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState([]);
  const [typing, setTyping] = useState(false);
  const [microMessage, setMicroMessage] = useState('');
  const [contextLoading, setContextLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [context, setContext] = useState({
    lowStockCount: 0,
    inventoryValue: 0,
    pendingDues: 0,
    supplierDues: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    healthScore: '',
    pendingInvoices: 0,
  });

  const loadContext = useCallback(async () => {
    if (!user?.$id) return;
    setContextLoading(true);
    try {
      const [reportData, snapshots] = await Promise.all([
        loadReportData(user.$id),
        listBusinessHealthSnapshots(user.$id, { limit: 1 }).catch(() => []),
      ]);
      const stats = getReportStats(reportData);
      setContext({
        lowStockCount: stats.lowStockItems,
        inventoryValue: stats.inventoryValue,
        pendingDues: stats.pendingPayments,
        supplierDues: stats.supplierDue,
        monthlyRevenue: stats.monthlyRevenue,
        monthlyProfit: stats.monthlyProfit,
        healthScore: snapshots[0] ? `${snapshots[0].score}/100` : '',
        pendingInvoices: (reportData.purchaseInvoices || []).filter((invoice) => invoice.status === 'Pending Review').length,
      });
    } finally {
      setContextLoading(false);
    }
  }, [user?.$id]);

  const loadConversations = useCallback(async () => {
    if (!user?.$id) return;
    setHistoryLoading(true);
    try {
      setConversations(await listAiConversations(user.$id));
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadContext();
    loadConversations();
  }, [loadContext, loadConversations]);

  const overviewCards = useMemo(
    () => [
      {
        title: 'Business Health',
        value: context.healthScore || 'Not set',
        trend: context.healthScore ? 'Latest saved snapshot' : 'Recalculate score first',
        status: context.healthScore ? 'success' : 'warning',
        icon: Activity,
      },
      {
        title: 'Low Stock Items',
        value: String(context.lowStockCount),
        trend: context.lowStockCount ? 'Ask for reorder planning' : 'Inventory looks stable',
        status: context.lowStockCount ? 'warning' : 'success',
        icon: TriangleAlert,
      },
      {
        title: 'Pending Payments',
        value: formatCurrency(context.pendingDues),
        trend: context.pendingDues ? 'Payment recovery opportunity' : 'Customer dues clear',
        status: context.pendingDues ? 'danger' : 'success',
        icon: WalletCards,
      },
      {
        title: 'Monthly Revenue',
        value: formatCurrency(context.monthlyRevenue),
        trend: `${formatCurrency(context.monthlyProfit)} profit`,
        status: 'info',
        icon: TrendingUp,
      },
    ],
    [context],
  );

  function addMicroMessage(message) {
    setMicroMessage(message);
    window.setTimeout(() => setMicroMessage(''), 1800);
  }

  async function sendPrompt(prompt) {
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setTyping(true);

    try {
      const response = await sendBusinessAiMessage(prompt, { conversationId });
      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: response.assistantMessageId || `assistant-${Date.now()}`,
          messageId: response.assistantMessageId || '',
          role: 'assistant',
          content: response.answer,
          suggestedActions: response.suggestedActions || [],
          relatedMetrics: response.relatedMetrics || [],
          warnings: response.warnings || [],
        },
      ]);
      loadConversations();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error.message || 'AI Assistant is temporarily unavailable. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function startNewChat() {
    setConversationId('');
    setMessages([initialAssistantMessage]);
  }

  function addBusinessSummary() {
    sendPrompt('Summarize today’s business performance using my current business data.');
  }

  async function loadConversation(conversation) {
    if (!user?.$id) return;
    try {
      const history = await listAiConversationHistory(user.$id, conversation);
      setConversationId(conversation);
      setMessages(history.length ? history : [initialAssistantMessage]);
    } catch {
      addMicroMessage('Could not load conversation history.');
    }
  }

  async function handleMicroAction(label, message) {
    if (label === 'Copy') {
      await navigator.clipboard?.writeText(message.content);
      addMicroMessage('Copied.');
      return;
    }

    if (label === 'Save Insight') {
      try {
        await saveAiInsight(user?.$id, message.messageId);
        addMicroMessage('Insight saved.');
      } catch (error) {
        addMicroMessage(error.message || 'Insight will be saved after history sync.');
      }
      return;
    }

    addMicroMessage('Task creation will be connected later.');
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={typing} onClick={addBusinessSummary} variant="secondary">
              <FileText className="h-4 w-4" />
              Business Summary
            </Button>
            <Button disabled={typing} onClick={startNewChat}>
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        }
        subtitle="Ask questions about inventory, sales, customers, suppliers, reports, and business decisions."
        title="AI Assistant"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => <StatCard key={card.title} {...card} />)}
      </section>

      <AiHeroCard disabled={typing} onAskToday={addBusinessSummary} />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <div className="space-y-6">
          <ChatPanel
            messages={messages}
            microMessage={microMessage}
            onMicroAction={handleMicroAction}
            onSend={sendPrompt}
            typing={typing}
          />
          <SuggestedQuestions disabled={typing} onAsk={sendPrompt} />
        </div>
        <div className="space-y-6">
          <BusinessContextPanel context={context} loading={contextLoading} />
          <ConversationHistory conversations={conversations} loading={historyLoading} onLoad={loadConversation} />
        </div>
      </section>

      <AiToolsGrid />
    </div>
  );
}
