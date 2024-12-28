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
import { ScrollArea } from "./ui/ScrollArea.tsx"
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

    const formatText = (content: string) => {
        if (!content.includes('#') && !content.includes('```')) return <p className="whitespace-pre-wrap">{content}</p>

        const lines = content.split('\n')
        let formattedContent: JSX.Element[] = []
        let codeBlock: string[] = []
        let inCodeBlock = false

        lines.forEach((line, index) => {
            // Manejo de bloques de código
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    formattedContent.push(
                        <div key={`code-${index}`} className="my-4">
                            {formatCode(codeBlock.join('\n'))}
                        </div>
                    )
                    codeBlock = []
                }
                inCodeBlock = !inCodeBlock
                return
            }

            if (inCodeBlock) {
                codeBlock.push(line)
                return
            }

            // Manejo de títulos
            if (line.startsWith('# ')) {
                formattedContent.push(
                    <h1 key={index} className="text-2xl font-bold mt-6 mb-4">
                        {line.slice(2)}
                    </h1>
                )
            } else if (line.startsWith('## ')) {
                formattedContent.push(
                    <h2 key={index} className="text-xl font-semibold mt-5 mb-3">
                        {line.slice(3)}
                    </h2>
                )
            } else if (line.startsWith('### ')) {
                formattedContent.push(
                    <h3 key={index} className="text-lg font-medium mt-4 mb-2">
                        {line.slice(4)}
                    </h3>
                )
            } else if (line.startsWith('- ')) {
                // Manejo de listas
                formattedContent.push(
                    <ul key={index} className="list-disc list-inside my-2 ml-4">
                        <li>{line.slice(2)}</li>
                    </ul>
                )
            } else if (line.match(/^\d+\. /)) {
                // Manejo de listas numeradas
                formattedContent.push(
                    <ol key={index} className="list-decimal list-inside my-2 ml-4">
                        <li>{line.slice(line.indexOf(' ') + 1)}</li>
                    </ol>
                )
            } else if (line.trim() === '') {
                // Espaciado entre párrafos
                formattedContent.push(<div key={index} className="h-4" />)
            } else {
                // Párrafos normales
                formattedContent.push(
                    <p key={index} className="my-2">
                        {line}
                    </p>
                )
            }
        })

        return <div className="space-y-2">{formattedContent}</div>
    }

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
        const [possibleLang, ...codeLines] = content.split('\n')
        const code = possibleLang.match(/^[a-zA-Z]+$/) ? codeLines.join('\n') : content
        const language = possibleLang.match(/^[a-zA-Z]+$/) ? possibleLang : 'code'

        return (
            <div className="relative my-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-800 p-2 sm:px-4 rounded-t-lg">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0">
                        <Code className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-400 uppercase">{language}</span>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code, `code-${Math.random()}`)}
                        className="h-8 px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 w-full sm:w-auto"
                    >
                        {copied === `code-${code}` ? (
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
    }

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Avatar>
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>Tu asistente privado de código con AI</CardTitle>
                        <CardDescription>Powered by Hugging Face Inference API</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3 w-full",
                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                            >
                                {message.role === 'assistant' && (
                                    <Avatar className="flex-shrink-0">
                                        <AvatarImage src="/placeholder.svg" />
                                        <AvatarFallback>AI</AvatarFallback>
                                    </Avatar>
                                )}
                                {message.role === 'user' && (
                                    <Avatar className="flex-shrink-0">
                                        <AvatarFallback>TÚ</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn(
                                    "flex flex-col gap-2",
                                    message.role === 'user' ? 'items-end' : 'items-start',
                                    "max-w-[80%]"
                                )}>
                                    <div
                                        style={{backgroundColor: 'hsl(240 4.8% 95.9%)'}}
                                        className={cn(
                                            "rounded-lg px-4 py-2 break-words",
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-background border'
                                        )}
                                    >
                                        {formatText(message.content)}
                                    </div>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <time>{formatTimestamp(message.timestamp)}</time>
                                        {message.role === 'assistant' && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon"
                                                        className="h-4 w-4 hover:text-primary">
                                                    <ThumbsUp className="h-3 w-3"/>
                                                </Button>
                                                <Button variant="ghost" size="icon"
                                                        className="h-4 w-4 hover:text-primary">
                                                    <ThumbsDown className="h-3 w-3"/>
                                                </Button>
                                                <Button variant="ghost" size="icon"
                                                        className="h-4 w-4 hover:text-primary">
                                                    <RefreshCw className="h-3 w-3"/>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <Avatar>
                                    <AvatarImage src="/placeholder.svg"/>
                                    <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg px-4 py-2">
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
            <CardFooter className="border-t pt-6">
                <form onSubmit={handleSubmit} className="flex gap-2 w-full">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="¿Cómo puede ayudarte Qwen hoy?"
                        className="min-h-[60px]"
                    />
                    <Button type="submit" size="icon" className="h-[60px] w-[60px] bg-black" disabled={isTyping}>
                        <Send className="h-5 w-5 " color={"white"}/>
                        <span className="sr-only">Send message</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}