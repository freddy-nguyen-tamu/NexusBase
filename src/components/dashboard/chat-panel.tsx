import { MessageSquare, Send } from "lucide-react";

type ChatPanelMessage = {
  author: string;
  body: string;
  time: string;
};

export function ChatPanel({ messages = [] }: { messages?: ChatPanelMessage[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#2563eb]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Team Chat</h2>
          <p className="text-sm text-slate-500">Realtime-ready channels and comments.</p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <article key={`${message.author}-${message.time}`} className="rounded-lg bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">{message.author}</p>
              <p className="text-xs text-slate-500">{message.time}</p>
            </div>
            <p className="text-sm leading-5 text-slate-600">{message.body}</p>
          </article>
        ))}
      </div>

      <form className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="chat-message">Message</label>
        <input
          id="chat-message"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
          placeholder="Write a message..."
        />
        <button className="grid h-10 w-10 place-items-center rounded-lg bg-[#0f766e] text-white hover:bg-[#115e59]" type="button" title="Send message">
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
