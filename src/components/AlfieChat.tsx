import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Send, Sparkles, Zap, Palette } from 'lucide-react';
import { toast } from 'sonner';
import alfieMain from '@/assets/alfie-main.png';
import { useBrandKit } from '@/hooks/useBrandKit';
import { useAlfieCredits } from '@/hooks/useAlfieCredits';
import { useTemplateLibrary } from '@/hooks/useTemplateLibrary';
import { openInCanva } from '@/services/canvaLinker';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AlfieChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Salut ! Je suis Alfie Designer, ton assistant créatif IA 🎨\n\nJe peux t'aider à :\n• Trouver des templates Canva inspirants\n• Les adapter à ton Brand Kit\n• Créer des versions IA stylisées (Nano-Banana)\n• Ouvrir directement dans Canva\n\nQue veux-tu créer aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { brandKit } = useBrandKit();
  const { credits, decrementCredit } = useAlfieCredits();
  const { searchTemplates } = useTemplateLibrary();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToolCall = async (toolName: string, args: any) => {
    console.log('Tool call:', toolName, args);
    
    switch (toolName) {
      case 'browse_templates': {
        const templates = await searchTemplates({
          category: args.category,
          keywords: args.keywords,
          ratio: args.ratio,
          limit: args.limit || 5
        });
        return {
          templates: templates.map(t => ({
            id: t.id,
            title: t.title,
            image_url: t.image_url,
            canva_url: t.canva_url,
            category: t.category,
            fit_score: t.fit_score
          }))
        };
      }
      
      case 'show_brandkit': {
        return { brandKit: brandKit || { message: "Aucun Brand Kit configuré" } };
      }
      
      case 'open_canva': {
        openInCanva({
          templateUrl: args.template_url,
          brandKit: brandKit || undefined
        });
        return { success: true, message: "Canva ouvert dans un nouvel onglet" };
      }
      
      case 'generate_ai_version': {
        if (credits <= 0) {
          return { error: "Crédits insuffisants", credits: 0 };
        }
        
        try {
          const { data, error } = await supabase.functions.invoke('alfie-generate-ai-image', {
            body: {
              templateImageUrl: args.template_image_url,
              brandKit: brandKit,
              prompt: args.style_instructions
            }
          });
          
          if (error) throw error;
          
          const newCredits = decrementCredit();
          return {
            success: true,
            imageUrl: data.imageUrl,
            creditsRemaining: newCredits
          };
        } catch (error: any) {
          console.error('AI generation error:', error);
          return { error: error.message || "Erreur de génération" };
        }
      }
      
      case 'check_credits': {
        return { credits };
      }
      
      default:
        return { error: "Tool not found" };
    }
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alfie-chat`;
    
    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Trop de requêtes, patiente un instant !");
          return;
        }
        if (response.status === 402) {
          toast.error("Crédit insuffisant.");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.function?.name && toolCall.function?.arguments) {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = await handleToolCall(toolCall.function.name, args);
                    console.log('Tool result:', result);
                    // Tool results are handled internally, Gemini will respond based on them
                  } catch (e) {
                    console.error('Tool call error:', e);
                  }
                }
              }
            }
            
            // Handle regular content
            const content = delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        const lines = textBuffer.split('\n');
        for (let line of lines) {
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error("Oups, une erreur est survenue !");
      // Remove the empty assistant message if error
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Stream AI response
    await streamChat(userMessage);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Credits & Brand Kit Status Bar */}
      <div className="flex items-center justify-between p-3 mb-2 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium">{credits}</span>
            <span className="text-muted-foreground">crédits IA</span>
          </div>
          
          {brandKit && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Palette className="h-4 w-4" />
              <span className="text-xs">Brand Kit actif</span>
            </div>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <img src={alfieMain} alt="Alfie" className="object-cover" />
                </Avatar>
              )}
              <Card
                className={`p-4 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </Card>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0 bg-secondary">
                  <div className="flex items-center justify-center h-full text-secondary-foreground">
                    👤
                  </div>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <img src={alfieMain} alt="Alfie" className="object-cover" />
            </Avatar>
              <Card className="p-4 bg-muted">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Textarea
          placeholder="Décris ton idée à Alfie..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="lg"
          className="gap-2"
        >
          {isLoading ? (
            <Sparkles className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
