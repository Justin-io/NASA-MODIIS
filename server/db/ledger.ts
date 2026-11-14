import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface LedgerEvent<T = any> {
  id: string;
  sequence: number;
  timestamp: string;
  eventType:
    | 'system_init'
    | 'observation_ingested'
    | 'incident_created'
    | 'incident_status_changed'
    | 'agent_executed'
    | 'decision_recorded'
    | 'voice_call_initiated'
    | 'call_state_changed'
    | 'dispatch_transition'
    | 'route_recalculated'
    | 'model_evaluated'
    | 'diagnostic_event'
    | 'operator_override';
  actor: string;
  payload: T;
  prevHash: string;
  hash: string;
}

export interface DecisionTraceRecord {
  decisionId: string;
  timestamp: string;
  recommendation: string;
  actor: string;
  inputEvidenceIds: string[];
  assumptions: string[];
  invalidatedAssumptions: string[];
  contradictoryEvidence: string[];
  operatorApproval: {
    approvedBy: string | null;
    approvedAt: string | null;
    status: 'pending' | 'authorized' | 'rejected';
  };
  outcome: {
    observedOutcome: string | null;
    predictionAccuracy: number | null; // 0.0 to 1.0
    verifiedAt: string | null;
  };
}

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class CryptographicLedger {
  private events: LedgerEvent[] = [];
  private ledgerFilePath: string;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private writeQueue: Promise<any> = Promise.resolve();

  constructor(filePath?: string) {
    this.ledgerFilePath =
      filePath || path.resolve(
        process.cwd(),
        'data',
        process.env.NODE_ENV === 'test' ? `ledger.test-${process.pid}.jsonl` : 'ledger.jsonl'
      );
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await fs.mkdir(path.dirname(this.ledgerFilePath), { recursive: true });
        const content = await fs.readFile(this.ledgerFilePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        this.events = lines.map((l) => JSON.parse(l));
        const verification = this.verifyIntegrity();
        if (!verification.valid) {
          console.error('Ledger integrity warning on load:', verification.reason);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Error reading ledger file:', err);
        }
        this.events = [];
      }

      this.isInitialized = true;

      // Initialize with Genesis Block if empty
      if (this.events.length === 0) {
        await this.appendEventInternal(
          'system_init',
          'ALEX_BOOTSTRAP_CONDUCTOR',
          {
            version: '2.4.0',
            system: 'ALEX — Autonomous Live Environmental eXpert',
            policy: 'NO_MOCK_DATA_VERIFIABLE_PROVENANCE_LEDGER',
          }
        );
      }
    })();

    return this.initPromise;
  }

  public async appendEvent<T = any>(
    eventType: LedgerEvent['eventType'],
    actor: string,
    payload: T
  ): Promise<LedgerEvent<T>> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.appendEventInternal(eventType, actor, payload);
  }

  private async appendEventInternal<T = any>(
    eventType: LedgerEvent['eventType'],
    actor: string,
    payload: T
  ): Promise<LedgerEvent<T>> {
    const runWrite = async (): Promise<LedgerEvent<T>> => {
      const sequence = this.events.length;
      const prevHash =
        sequence === 0 ? GENESIS_PREV_HASH : this.events[sequence - 1].hash;
      const timestamp = new Date().toISOString();
      const id = `EVT-${sequence.toString().padStart(6, '0')}-${crypto.randomBytes(4).toString('hex')}`;

      const canonicalPayload = JSON.stringify(payload, Object.keys(payload || {}).sort());
      const hashData = `${sequence}|${timestamp}|${eventType}|${actor}|${prevHash}|${canonicalPayload}`;
      const hash = crypto.createHash('sha256').update(hashData).digest('hex');

      const event: LedgerEvent<T> = {
        id,
        sequence,
        timestamp,
        eventType,
        actor,
        payload,
        prevHash,
        hash,
      };

      this.events.push(event);

      try {
        await fs.appendFile(this.ledgerFilePath, JSON.stringify(event) + '\n', 'utf-8');
      } catch (err) {
        console.error('Failed to append event to ledger file:', err);
      }

      return event;
    };

    const nextWrite = this.writeQueue.then(runWrite, runWrite);
    this.writeQueue = nextWrite;
    return nextWrite;
  }

  public getEvents(limit = 100, offset = 0): LedgerEvent[] {
    return this.events.slice(-limit);
  }

  public getAllEvents(): LedgerEvent[] {
    return [...this.events];
  }

  public getEventById(id: string): LedgerEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  public verifyIntegrity(): {
    valid: boolean;
    totalEvents: number;
    errorIndex?: number;
    reason?: string;
  } {
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      const expectedPrevHash = i === 0 ? GENESIS_PREV_HASH : this.events[i - 1].hash;
      if (e.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          totalEvents: this.events.length,
          errorIndex: i,
          reason: `Broken hash chain at sequence ${i}: prevHash ${e.prevHash} does not match previous hash ${expectedPrevHash}`,
        };
      }

      const canonicalPayload = JSON.stringify(
        e.payload,
        Object.keys(e.payload || {}).sort()
      );
      const hashData = `${e.sequence}|${e.timestamp}|${e.eventType}|${e.actor}|${e.prevHash}|${canonicalPayload}`;
      const computedHash = crypto.createHash('sha256').update(hashData).digest('hex');

      if (e.hash !== computedHash) {
        return {
          valid: false,
          totalEvents: this.events.length,
          errorIndex: i,
          reason: `Tampered payload or invalid hash at sequence ${i}: stored hash ${e.hash} does not match computed ${computedHash}`,
        };
      }
    }

    return {
      valid: true,
      totalEvents: this.events.length,
    };
  }

  /**
   * Replays system state up to a specific timestamp or sequence number.
   * Enables historical reconstructability: what did ALEX know at time T?
   */
  public replayLedgerAt(cutoffTimestampOrSeq: string | number): LedgerEvent[] {
    if (typeof cutoffTimestampOrSeq === 'number') {
      return this.events.filter((e) => e.sequence <= cutoffTimestampOrSeq);
    }
    const cutoffTime = new Date(cutoffTimestampOrSeq).getTime();
    return this.events.filter(
      (e) => new Date(e.timestamp).getTime() <= cutoffTime
    );
  }

  /**
   * Reconstructs the complete decision tree for a decision ID.
   * Traces inputs, contradictory evidence, invalidated assumptions, and approvals.
   */
  public backtrackDecision(decisionId: string): {
    decisionEvent?: LedgerEvent;
    relatedEvents: LedgerEvent[];
    timeline: { time: string; actor: string; summary: string }[];
  } {
    const decisionEvent = this.events.find(
      (e) =>
        e.eventType === 'decision_recorded' &&
        (e.payload?.decisionId === decisionId || e.id === decisionId)
    );

    const relatedEvents = this.events.filter((e) => {
      const payloadStr = JSON.stringify(e.payload || {});
      return payloadStr.includes(decisionId);
    });

    const timeline = relatedEvents.map((e) => ({
      time: e.timestamp,
      actor: e.actor,
      summary: `${e.eventType}: ${JSON.stringify(e.payload).slice(0, 100)}`,
    }));

    return {
      decisionEvent,
      relatedEvents,
      timeline,
    };
  }
}

export const globalLedger = new CryptographicLedger();
