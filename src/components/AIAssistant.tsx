'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AIAssistant() {
    const { messages, sendMessage, status } = useChat();
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isLoading = status === 'submitted' || status === 'streaming';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        await sendMessage({ text: input });
        setInput('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-xl hover:shadow-2xl transition-all duration-300"
                size="icon"
                aria-label="Otvori AI Pomoćnika"
                title="Otvori AI Pomoćnika"
            >
                <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-[350px] md:w-[400px] shadow-2xl z-50 flex flex-col h-[550px] border-primary/20 animate-in slide-in-from-bottom-5">
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b bg-card">
                <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary fill-primary/20" />
                        AI Pomoćnik
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Stručnjak za kamenoklesarstvo
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full -mr-2"
                    onClick={() => setIsOpen(false)}
                    aria-label="Zatvori AI Pomoćnika"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-muted/10">
                <ScrollArea
                    className="flex-1 p-4"
                    ref={scrollRef}
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                    aria-label="Povijest razgovora s AI pomoćnikom"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 mt-12 opacity-80">
                            <div className="bg-primary/10 p-4 rounded-full">
                                <MessageSquare className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Kako Vam mogu pomoći?</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                                    Pitajte me o vrstama kamena, tehnikama obrade, dimenzijama i nosivosti materijala.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 flex flex-col pb-2">
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                                            : 'bg-card border text-card-foreground rounded-bl-sm'
                                            }`}
                                    >
                                        {m.parts?.map((part, i) => {
                                            if (part.type === 'text') {
                                                return <span key={i}>{part.text}</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-card border text-muted-foreground w-16 rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex justify-center items-center gap-1 shadow-sm">
                                        <div className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-3 border-t bg-card">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Upišite vaše pitanje..."
                            className="flex-1 rounded-full px-4"
                            autoFocus
                            aria-label="Vaše pitanje AI pomoćniku"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-full shrink-0"
                            disabled={isLoading || !input.trim()}
                            aria-label="Pošalji pitanje"
                        >
                            <Send className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
