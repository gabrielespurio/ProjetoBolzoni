import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { MessageSquare, X, Send, Image as ImageIcon, Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export function VirtualAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Olá! Sou o assistente virtual da Bolzoni Produções. Como posso ajudar você hoje?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (messageText: string, attachment?: { data: string, mimeType: string }, audioUrl?: string) => {
    if (!messageText.trim() && !attachment) return;

    const newMessages = [...messages];
    if (messageText || attachment) {
       newMessages.push({ 
         role: "user", 
         content: messageText || (attachment?.mimeType.startsWith('audio') ? "Áudio enviado" : "🖼️ Imagem enviada"),
         audioUrl,
         timestamp: new Date()
       });
    }

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: messageText,
          history: messages,
          attachment
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro na comunicação com o servidor.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, timestamp: new Date() }]);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro de Comunicação",
        description: error.message || "Não foi possível conectar ao assistente. Tente novamente.",
        variant: "destructive"
      });
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${error.message || "Ocorreu um erro inesperado."}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:image/...;base64, part
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Data = await fileToBase64(file);
      await sendMessage("Analise este arquivo", { data: base64Data, mimeType: file.type });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem", error);
      toast({ title: "Erro", description: "Não foi possível carregar a imagem." });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const base64Audio = await blobToBase64(audioBlob);
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Stop all tracks to turn off the microphone
          stream.getTracks().forEach(track => track.stop());
          
          await sendMessage("", { data: base64Audio, mimeType: "audio/webm" }, audioUrl);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Erro ao acessar microfone", error);
        toast({ 
          title: "Microfone indisponível", 
          description: "Não foi possível acessar seu microfone. Verifique as permissões do navegador.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            size="icon"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="flex flex-col w-full max-w-3xl h-[85vh] shadow-2xl border-primary/20 bg-background/95">
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-primary text-primary-foreground rounded-t-xl">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Assistente Bolzoni
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" 
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="flex flex-col gap-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[90%] rounded-xl p-4 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground self-end rounded-tr-none"
                          : "bg-muted self-start rounded-tl-none border border-border/50"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.audioUrl ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs font-medium opacity-80">
                              <Mic className="h-3.5 w-3.5" />
                              Mensagem de voz
                            </div>
                            <audio controls src={msg.audioUrl} className="h-10 max-w-[240px] rounded-md outline-none" />
                          </div>
                        ) : (
                          msg.content
                        )
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                      
                      <div className={`text-[10px] mt-1.5 opacity-60 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-muted self-start rounded-lg p-3 rounded-tl-none flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Digitando...</span>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-background rounded-b-xl">
              <div className="flex items-center w-full gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 shrink-0" 
                  onClick={() => fileInputRef.current?.click()}
                  title="Enviar Imagem"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant={isRecording ? "destructive" : "outline"} 
                  size="icon" 
                  className={`h-9 w-9 shrink-0 ${isRecording ? 'animate-pulse' : ''}`} 
                  onClick={toggleRecording}
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={isLoading || isRecording}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading || isRecording} 
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
