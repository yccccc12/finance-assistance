import Header from '@/components/common/Header';
import AIAssistantInteractive from './components/AIAssistantInteractive';

export const metadata = {
  title: 'AI Assistant Chat - FinanceAssist',
  description: 'Get conversational financial insights through natural language queries with RAG-powered data retrieval and personalized recommendations'
};

export default function AIAssistantChatPage() {
  const initialMessages = [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          {/* Page Header */}
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">AI Financial Assistant</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask questions about your finances and get instant insights
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-success">AI Online</span>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <AIAssistantInteractive initialMessages={initialMessages} />
          </div>
        </div>
      </main>
    </div>
  );
}