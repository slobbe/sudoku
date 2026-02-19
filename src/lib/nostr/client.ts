import type { Event, Filter } from "nostr-tools";
import { SimplePool, verifyEvent } from "nostr-tools";
import type { NostrIdentity } from "./identity";

export type NostrMessageSubscription<Message> = {
  onMessage: (message: Message, event: Event) => void;
  onClose?: (reasons: string[]) => void;
};

export type NostrParsedMessagePredicate<Message> = (message: Message, event: Event) => boolean;

export type NostrClientOptions<Message> = {
  relays: string[];
  identity: NostrIdentity;
  parseMessage: (content: string) => Message | null;
  serializeMessage: (message: Message) => string;
  buildTags: (message: Message) => string[][];
  kind: number;
};

export class NostrRelayClient<Message> {
  private readonly pool = new SimplePool();

  private readonly relays: string[];

  private readonly identity: NostrIdentity;

  private readonly parseMessage: (content: string) => Message | null;

  private readonly serializeMessage: (message: Message) => string;

  private readonly buildTags: (message: Message) => string[][];

  private readonly kind: number;

  private subscription: { close: (reason?: string) => void } | null = null;

  private readonly seenEventIds = new Set<string>();

  constructor(options: NostrClientOptions<Message>) {
    this.relays = Array.from(new Set(options.relays));
    this.identity = options.identity;
    this.parseMessage = options.parseMessage;
    this.serializeMessage = options.serializeMessage;
    this.buildTags = options.buildTags;
    this.kind = options.kind;
  }

  subscribe(filter: Filter, subscription: NostrMessageSubscription<Message>, shouldAccept?: NostrParsedMessagePredicate<Message>): void {
    this.stopSubscription();

    this.subscription = this.pool.subscribeMany(this.relays, filter, {
      onevent: (event: Event) => {
        if (this.seenEventIds.has(event.id)) {
          return;
        }

        this.seenEventIds.add(event.id);
        if (!verifyEvent(event) || event.pubkey === this.identity.pubkey) {
          return;
        }

        const message = this.parseMessage(event.content);
        if (!message) {
          return;
        }

        if (shouldAccept && !shouldAccept(message, event)) {
          return;
        }

        subscription.onMessage(message, event);
      },
      onclose: (reasons) => {
        subscription.onClose?.(reasons);
      },
    });
  }

  async publish(message: Message): Promise<void> {
    const eventTemplate = {
      kind: this.kind,
      tags: this.buildTags(message),
      content: this.serializeMessage(message),
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedEvent = await this.identity.signEvent(eventTemplate);
    const publishResults = await Promise.allSettled(this.pool.publish(this.relays, signedEvent));
    const hasSuccess = publishResults.some((result) => result.status === "fulfilled");
    if (hasSuccess) {
      return;
    }

    throw new Error("Could not publish signaling event to any relay.");
  }

  stopSubscription(): void {
    if (this.subscription) {
      this.subscription.close("nostr subscription reset");
      this.subscription = null;
    }
  }

  destroy(): void {
    this.stopSubscription();
    this.pool.destroy();
  }

  createFilter(partial: Omit<Filter, "kinds">): Filter {
    return {
      ...partial,
      kinds: [this.kind],
    };
  }
}
