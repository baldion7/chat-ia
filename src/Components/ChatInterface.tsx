import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { HfInference } from "@huggingface/inference"
import {  Send, Code, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react'
// @ts-ignore
import { Button } from "./ui/Button.tsx"
// @ts-ignore
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/Card.tsx"
// @ts-ignore
import { Avatar, AvatarFallback, AvatarImage } from "./ui/Avatar.tsx"
// @ts-ignore
import { ScrollArea } from "./ui/ScrollAreatsx"
// @ts-ignore
import { Textarea } from "./ui/TextArea.tsx"
// @ts-ignore
import { cn } from "../lib/utils.ts"

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

// Initialize the Hugging Face Inference client
const client = new HfInference("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");

export const ChatInterface = () => {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isTyping) return

        const newMessage: Message = {
            id: Math.random().toString(36).slice(2),
            role: 'user',
            content: input,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, newMessage])
        setInput('')
        setIsTyping(true)

        try {
            const assistantMessage: Message = {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, assistantMessage])

            const stream = client.chatCompletionStream({
                model: "Qwen/Qwen2.5-Coder-32B-Instruct",
                messages: [
                    ...messages.map(msg => ({ role: msg.role, content: msg.content })),
                    { role: "user", content: input }
                ],
                max_tokens: 500
            });

            for await (const chunk of stream) {
                if (chunk.choices && chunk.choices.length > 0) {
                    const newContent = chunk.choices[0].delta.content || '';
                    setMessages(prev => {
                        const lastMessage = prev[prev.length - 1];
                        if (lastMessage.role === 'assistant') {
                            return [
                                ...prev.slice(0, -1),
                                { ...lastMessage, content: lastMessage.content + newContent }
                            ];
                        }
                        return prev;
                    });
                }
            }
        } catch (error) {
            console.error('Error generating response:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: 'Sorry, I encountered an error while generating a response. Please try again.',
                    timestamp: new Date(),
                }
            ]);
        } finally {
            setIsTyping(false)
        }
    }

    const formatTimestamp = (date: Date) => {
        return new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            minute: 'numeric',
        }).format(date)
    }
    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(id)
            setTimeout(() => setCopied(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const formatCode = (content: string) => {
        if (!content.includes('```')) return content

        const parts = content.split('```')
        return parts.map((part, i) => {
            if (i % 2 === 0) return <p key={i} className="whitespace-pre-wrap mb-4">{part}</p>

            const [possibleLang, ...codeLines] = part.split('\n')
            const code = possibleLang.match(/^[a-zA-Z]+$/) ? codeLines.join('\n') : part
            const language = possibleLang.match(/^[a-zA-Z]+$/) ? possibleLang : 'code'

            return (
                <div key={i} className="relative my-4 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-800 p-2 sm:px-4 rounded-t-lg">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                            <Code className="h-4 w-4 text-zinc-400" />
                            <span className="text-xs font-medium text-zinc-400 uppercase">{language}</span>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(code, `code-${i}`)}
                            className="h-8 px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 w-full sm:w-auto"
                        >
                            {copied === `code-${i}` ? (
                                <>
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    <span className="text-xs">Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    <span className="text-xs">Copiar</span>
                                </>
                            )}
                        </Button>
                    </div>
                    <div className="relative">
                        <pre className="bg-zinc-900 p-2 sm:p-4 rounded-b-lg overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed">
                            <code className="text-zinc-100">
                                {code}
                            </code>
                        </pre>
                    </div>
                </div>
            )
        })
    }

    return (
        <Card className="w-full max-w-5xl mx-auto h-[100dvh] sm:h-auto flex flex-col">
            <CardHeader className="px-4 py-3 sm:p-6">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg sm:text-2xl">Tu asistente privado de código</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Powered by Hugging Face Inference API</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 sm:p-6 overflow-hidden">
                <ScrollArea className="h-full pr-2 sm:pr-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-2 sm:gap-3 w-full",
                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                {message.role === 'assistant' && (
                                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                        <AvatarImage src="/placeholder.svg" />
                                        <AvatarFallback>AI</AvatarFallback>
                                    </Avatar>
                                )}
                                {message.role === 'user' && (
                                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                        <AvatarFallback>TÚ</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn(
                                    "flex flex-col gap-1 sm:gap-2",
                                    message.role === 'user' ? 'items-end' : 'items-start',
                                    "max-w-[85%] sm:max-w-[80%]"
                                )}>
                                    <div
                                        className={cn(
                                            "rounded-lg px-3 py-2 sm:px-4 break-words text-sm sm:text-base",
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-background border'
                                        )}
                                    >
                                        {formatCode(message.content)}
                                    </div>
                                    <div className="flex gap-2 text-[10px] sm:text-xs text-muted-foreground">
                                        <time>{formatTimestamp(message.timestamp)}</time>
                                        {message.role === 'assistant' && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-primary">
                                                    <ThumbsUp className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-primary">
                                                    <ThumbsDown className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 hover:text-primary">
                                                    <RefreshCw className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-2 sm:gap-3">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                    <AvatarImage src="/placeholder.svg" />
                                    <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg px-3 py-2 sm:px-4">
                                    <div className="flex gap-1">
                                        <span className="animate-bounce">●</span>
                                        <span className="animate-bounce delay-100">●</span>
                                        <span className="animate-bounce delay-200">●</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-2 sm:p-6">
                <form onSubmit={handleSubmit} className="flex gap-2 w-full">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="¿Cómo puede ayudarte?"
                        className="min-h-[45px] sm:min-h-[60px] text-sm sm:text-base"
                    />
                    <Button type="submit" size="icon" className="h-[45px] w-[45px] sm:h-[60px] sm:w-[60px]" disabled={isTyping}>
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="sr-only">Enviar mensaje</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}